const { Database } = require('../database/Connection');
const { SecurityProvider } = require('../security/SecurityProvider');

class LootTransactionHandler {
    /**
     * Verarbeitet die Verteilung von Shared Loot in einer ACID-konformen Transaktion.
     * @param {string} sessionId - Eindeutige ID der Spiel-Session.
     * @param {Object} lootPayload - Enthält Items und Token-Mengen.
     * @param {Array<string>} participantIds - Liste der berechtigten Empfänger.
     */
    static async handleLootDistribution(sessionId, lootPayload, participantIds) {
        const connection = await Database.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Session-Validierung und Lock (Select for Update)
            const sessionState = await connection.query(
                'SELECT status, locked FROM game_sessions WHERE session_id = ? FOR UPDATE',
                [sessionId]
            );

            if (!sessionState || sessionState.status !== 'ACTIVE' || sessionState.locked) {
                throw new Error('SESSION_INACCESSIBLE_OR_LOCKED');
            }

            // 2. Dubletten-Prüfung (Idempotenz)
            const processedCheck = await connection.query(
                'SELECT id FROM loot_transactions WHERE session_id = ? AND status = "COMPLETED"',
                [sessionId]
            );

            if (processedCheck.length > 0) {
                throw new Error('LOOT_ALREADY_PROCESSED');
            }

            // 3. Token Transfer (Atomar)
            if (lootPayload.tokens > 0 && participantIds.length > 0) {
                const sharePerPerson = Math.floor(lootPayload.tokens / participantIds.length);
                if (sharePerPerson > 0) {
                    const placeholders = participantIds.map(() => "?").join(",");
                    await connection.query(
                        `UPDATE user_wallets SET balance = balance + ?, last_update = NOW() WHERE user_id IN (${placeholders})`,
                        [sharePerPerson, ...participantIds]
                    );
                }
            }

            // 4. Item Distribution (Ownership Transfer)
            for (const item of lootPayload.items) {
                const recipientId = this.determineRecipient(item, participantIds);
                
                // Erzeuge Item-Instanz oder verschiebe aus Global Pool
                await connection.query(
                    'INSERT INTO user_inventory (user_id, item_template_id, instance_id, acquired_at) VALUES (?, ?, ?, NOW())',
                    [recipientId, item.templateId, SecurityProvider.generateUUID()]
                );

                // Log Transaction for Audit
                await connection.query(
                    'INSERT INTO audit_logs (event_type, user_id, session_id, detail) VALUES (?, ?, ?, ?)',
                    ['ITEM_DROP', recipientId, sessionId, JSON.stringify(item)]
                );
            }

            // 5. Finalisierung des Session-Status
            await connection.query(
                'INSERT INTO loot_transactions (session_id, status, processed_at) VALUES (?, "COMPLETED", NOW())',
                [sessionId]
            );

            await connection.commit();
            return { success: true, timestamp: Date.now() };

        } catch (error) {
            await connection.rollback();
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Ermittelt den Empfänger basierend auf Loot-Modus (z.B. Round Robin oder Roll).
     */
    static determineRecipient(item, participantIds) {
        if (item.designatedRecipient && participantIds.includes(item.designatedRecipient)) {
            return item.designatedRecipient;
        }
        // Fallback: Random Distribution (Fair Roll Logic)
        const randomIndex = Math.floor(Math.random() * participantIds.length);
        return participantIds[randomIndex];
    }

    /**
     * Middleware-Hook für Peer-Client Requests
     */
    static async middleware(req, res, next) {
        const { sessionId, lootData, participants } = req.body;
        
        const result = await LootTransactionHandler.handleLootDistribution(
            sessionId, 
            lootData, 
            participants
        );

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(409).json(result);
        }
    }
}

module.exports = LootTransactionHandler;
