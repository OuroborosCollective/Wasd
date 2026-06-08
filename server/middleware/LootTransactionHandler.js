'use strict';

const { Database } = require('../database/Connection');
const { SecurityProvider } = require('../security/SecurityProvider');

/**
 * LootTransactionHandler
 *
 * Deterministische, ACID-konforme Loot-Verteilung.
 *
 * Kernregeln:
 * - Keine nicht-deterministische Randomness.
 * - Keine direkte Client-Vertrauensbasis für Teilnehmer.
 * - Idempotenz über transactionKey.
 * - Session-Lock via SELECT ... FOR UPDATE.
 * - Wallet-Updates atomar.
 * - Item-Ownership deterministisch.
 * - Audit-Log innerhalb derselben DB-Transaktion.
 * - Resttoken werden deterministisch verteilt.
 */
class LootTransactionHandler {
  static STATUS_ACTIVE = 'ACTIVE';
  static TX_COMPLETED = 'COMPLETED';
  static TX_FAILED = 'FAILED';

  static MAX_ITEMS_PER_LOOT = 256;
  static MAX_PARTICIPANTS = 128;
  static MAX_TOKENS = 2_147_483_647;

  /**
   * Hauptmethode für Shared-Loot-Verteilung.
   *
   * @param {string} sessionId
   * @param {{
   *   transactionKey?: string,
   *   tokens?: number,
   *   items?: Array<{
   *     templateId: string,
   *     designatedRecipient?: string,
   *     rarity?: string,
   *     seed?: string|number
   *   }>
   * }} lootPayload
   * @param {Array<string>} requestedParticipantIds
   * @returns {Promise<{
   *   success: boolean,
   *   idempotent?: boolean,
   *   sessionId?: string,
   *   transactionKey?: string,
   *   tokensDistributed?: number,
   *   itemsDistributed?: number,
   *   timestamp: number,
   *   error?: string
   * }>}
   */
  static async handleLootDistribution(sessionId, lootPayload, requestedParticipantIds) {
    const now = Date.now();

    let connection;

    try {
      this.assertValidSessionId(sessionId);
      const normalizedLoot = this.normalizeLootPayload(lootPayload);
      const clientParticipants = this.normalizeParticipantIds(requestedParticipantIds);

      const transactionKey = this.buildTransactionKey(
        sessionId,
        normalizedLoot,
        clientParticipants
      );

      connection = await Database.getConnection();
      await connection.beginTransaction();

      /**
       * 1. Session exklusiv sperren.
       *
       * Wichtig:
       * queryOne() abstrahiert mysql2/promise-Formate.
       */
      const sessionState = await this.queryOne(
        connection,
        `
          SELECT
            session_id,
            status,
            locked
          FROM game_sessions
          WHERE session_id = ?
          FOR UPDATE
        `,
        [sessionId]
      );

      if (!sessionState) {
        throw new LootError('SESSION_NOT_FOUND', 404);
      }

      if (sessionState.status !== this.STATUS_ACTIVE || Number(sessionState.locked) === 1) {
        throw new LootError('SESSION_INACCESSIBLE_OR_LOCKED', 409);
      }

      /**
       * 2. Idempotenz prüfen.
       *
       * transactionKey erlaubt mehrere Loot-Events pro Session,
       * verhindert aber doppeltes Ausführen desselben Events.
       */
      const existingTx = await this.queryOne(
        connection,
        `
          SELECT
            id,
            status
          FROM loot_transactions
          WHERE transaction_key = ?
          FOR UPDATE
        `,
        [transactionKey]
      );

      if (existingTx && existingTx.status === this.TX_COMPLETED) {
        await connection.commit();

        return {
          success: true,
          idempotent: true,
          sessionId,
          transactionKey,
          tokensDistributed: 0,
          itemsDistributed: 0,
          timestamp: now
        };
      }

      if (existingTx && existingTx.status !== this.TX_FAILED) {
        throw new LootError('LOOT_TRANSACTION_ALREADY_EXISTS', 409);
      }

      /**
       * 3. Serverseitige Teilnehmer ermitteln.
       *
       * Der Client darf Teilnehmer vorschlagen, aber nicht autoritativ setzen.
       */
      const authorizedParticipants = await this.loadAuthorizedParticipants(
        connection,
        sessionId,
        clientParticipants
      );

      if (authorizedParticipants.length === 0) {
        throw new LootError('NO_AUTHORIZED_PARTICIPANTS', 400);
      }

      /**
       * 4. Transaktion vormerken.
       *
       * Bei Unique-Key auf transaction_key ist das zusätzlich race-safe.
       */
      await this.execute(
        connection,
        `
          INSERT INTO loot_transactions
            (
              session_id,
              transaction_key,
              status,
              requested_participants_json,
              authorized_participants_json,
              payload_hash,
              created_at
            )
          VALUES
            (?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          sessionId,
          transactionKey,
          'PROCESSING',
          JSON.stringify(clientParticipants),
          JSON.stringify(authorizedParticipants),
          this.stableHash(JSON.stringify(normalizedLoot))
        ]
      );

      /**
       * 5. Token deterministisch verteilen.
       *
       * Beispiel:
       * 10 Token, 3 Spieler:
       * baseShare = 3
       * remainder = 1
       * Der deterministisch erste Empfänger bekommt +1.
       */
      const tokensDistributed = await this.distributeTokens(
        connection,
        sessionId,
        normalizedLoot.tokens,
        authorizedParticipants,
        transactionKey
      );

      /**
       * 6. Items deterministisch verteilen.
       */
      const itemsDistributed = await this.distributeItems(
        connection,
        sessionId,
        normalizedLoot.items,
        authorizedParticipants,
        transactionKey
      );

      /**
       * 7. Finalisieren.
       */
      await this.execute(
        connection,
        `
          UPDATE loot_transactions
          SET
            status = ?,
            tokens_distributed = ?,
            items_distributed = ?,
            processed_at = NOW()
          WHERE transaction_key = ?
        `,
        [
          this.TX_COMPLETED,
          tokensDistributed,
          itemsDistributed,
          transactionKey
        ]
      );

      await connection.commit();

      return {
        success: true,
        idempotent: false,
        sessionId,
        transactionKey,
        tokensDistributed,
        itemsDistributed,
        timestamp: Date.now()
      };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (_) {
          // Rollback-Fehler nicht verschlucken, aber auch nicht den echten Fehler überschreiben.
        }
      }

      return {
        success: false,
        error: error && error.message ? error.message : 'LOOT_TRANSACTION_FAILED',
        timestamp: Date.now()
      };
    } finally {
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  }

  /**
   * Lädt serverseitig berechtigte Teilnehmer.
   *
   * Erwartete Tabelle:
   * session_participants(session_id, user_id, eligible, left_at)
   */
  static async loadAuthorizedParticipants(connection, sessionId, requestedParticipantIds) {
    const requestedSet = new Set(requestedParticipantIds);

    const rows = await this.queryRows(
      connection,
      `
        SELECT user_id
        FROM session_participants
        WHERE
          session_id = ?
          AND eligible = 1
          AND left_at IS NULL
        ORDER BY user_id ASC
        FOR UPDATE
      `,
      [sessionId]
    );

    const serverParticipants = rows
      .map((row) => String(row.user_id))
      .filter((userId) => requestedSet.has(userId));

    return this.normalizeParticipantIds(serverParticipants);
  }

  static async distributeTokens(
    connection,
    sessionId,
    totalTokens,
    participantIds,
    transactionKey
  ) {
    if (totalTokens <= 0) {
      return 0;
    }

    const participantCount = participantIds.length;

    if (participantCount <= 0) {
      throw new LootError('NO_PARTICIPANTS_FOR_TOKEN_DISTRIBUTION', 400);
    }

    const deterministicOrder = this.deterministicOrder(
      participantIds,
      `${transactionKey}:TOKEN_ORDER`
    );

    const baseShare = Math.floor(totalTokens / participantCount);
    const remainder = totalTokens % participantCount;

    let distributed = 0;

    for (let i = 0; i < deterministicOrder.length; i += 1) {
      const userId = deterministicOrder[i];
      const amount = baseShare + (i < remainder ? 1 : 0);

      if (amount <= 0) {
        continue;
      }

      const result = await this.execute(
        connection,
        `
          UPDATE user_wallets
          SET
            balance = balance + ?,
            last_update = NOW()
          WHERE user_id = ?
        `,
        [amount, userId]
      );

      const affectedRows = this.getAffectedRows(result);

      if (affectedRows !== 1) {
        throw new LootError(`WALLET_NOT_FOUND_OR_DUPLICATE:${userId}`, 409);
      }

      await this.insertAuditLog(connection, {
        eventType: 'TOKEN_DROP',
        userId,
        sessionId,
        detail: {
          transactionKey,
          amount,
          totalTokens,
          baseShare,
          remainder
        }
      });

      distributed += amount;
    }

    return distributed;
  }

  static async distributeItems(
    connection,
    sessionId,
    items,
    participantIds,
    transactionKey
  ) {
    let distributed = 0;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];

      const recipientId = this.determineRecipient(
        item,
        participantIds,
        `${transactionKey}:ITEM:${index}`
      );

      const instanceId = this.generateDeterministicInstanceId(
        transactionKey,
        item,
        index,
        recipientId
      );

      /**
       * Wichtig:
       * Unique-Key auf instance_id verhindert doppelte Item-Erzeugung.
       */
      await this.execute(
        connection,
        `
          INSERT INTO user_inventory
            (
              user_id,
              item_template_id,
              instance_id,
              acquired_at,
              source_session_id,
              source_transaction_key
            )
          VALUES
            (?, ?, ?, NOW(), ?, ?)
        `,
        [
          recipientId,
          item.templateId,
          instanceId,
          sessionId,
          transactionKey
        ]
      );

      await this.insertAuditLog(connection, {
        eventType: 'ITEM_DROP',
        userId: recipientId,
        sessionId,
        detail: {
          transactionKey,
          index,
          item,
          instanceId
        }
      });

      distributed += 1;
    }

    return distributed;
  }

  /**
   * Deterministische Empfängerwahl.
   *
   * Kein Math.random().
   * Kein Crypto-Random.
   * Gleicher Input => gleicher Empfänger.
   */
  static determineRecipient(item, participantIds, seed) {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      throw new LootError('NO_PARTICIPANTS', 400);
    }

    if (
      item &&
      item.designatedRecipient &&
      participantIds.includes(String(item.designatedRecipient))
    ) {
      return String(item.designatedRecipient);
    }

    const ordered = this.deterministicOrder(participantIds, seed);
    return ordered[0];
  }

  static deterministicOrder(values, seed) {
    return [...values].sort((a, b) => {
      const hashA = this.stableHash(`${seed}:${a}`);
      const hashB = this.stableHash(`${seed}:${b}`);

      if (hashA < hashB) return -1;
      if (hashA > hashB) return 1;

      return String(a).localeCompare(String(b));
    });
  }

  /**
   * Stabiler FNV-1a Hash.
   *
   * Absichtlich kein Node crypto nötig.
   * Für deterministische Sortierung reicht das.
   */
  static stableHash(input) {
    const str = String(input);
    let hash = 0x811c9dc5;

    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  static buildTransactionKey(sessionId, normalizedLoot, participantIds) {
    const canonical = JSON.stringify({
      sessionId,
      tokens: normalizedLoot.tokens,
      items: normalizedLoot.items.map((item) => ({
        templateId: item.templateId,
        designatedRecipient: item.designatedRecipient || null,
        rarity: item.rarity || null,
        seed: item.seed || null
      })),
      participants: [...participantIds].sort()
    });

    if (normalizedLoot.transactionKey) {
      return `${sessionId}:${normalizedLoot.transactionKey}:${this.stableHash(canonical)}`;
    }

    return `${sessionId}:loot:${this.stableHash(canonical)}`;
  }

  static generateDeterministicInstanceId(transactionKey, item, index, recipientId) {
    const raw = JSON.stringify({
      transactionKey,
      templateId: item.templateId,
      index,
      recipientId
    });

    if (
      SecurityProvider &&
      typeof SecurityProvider.generateDeterministicUUID === 'function'
    ) {
      return SecurityProvider.generateDeterministicUUID(raw);
    }

    /**
     * Fallback:
     * Kein echter UUID-v4, aber deterministisch und DB-tauglich.
     */
    return `loot_${this.stableHash(raw)}_${this.stableHash(`${raw}:b`)}`;
  }

  static normalizeLootPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new LootError('INVALID_LOOT_PAYLOAD', 400);
    }

    const tokens = Number.isInteger(payload.tokens) ? payload.tokens : 0;

    if (tokens < 0 || tokens > this.MAX_TOKENS) {
      throw new LootError('INVALID_TOKEN_AMOUNT', 400);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];

    if (items.length > this.MAX_ITEMS_PER_LOOT) {
      throw new LootError('TOO_MANY_LOOT_ITEMS', 400);
    }

    const normalizedItems = items.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new LootError(`INVALID_ITEM_AT_INDEX:${index}`, 400);
      }

      if (!this.isSafeId(item.templateId)) {
        throw new LootError(`INVALID_ITEM_TEMPLATE_ID_AT_INDEX:${index}`, 400);
      }

      const normalized = {
        templateId: String(item.templateId)
      };

      if (item.designatedRecipient !== undefined && item.designatedRecipient !== null) {
        if (!this.isSafeId(item.designatedRecipient)) {
          throw new LootError(`INVALID_DESIGNATED_RECIPIENT_AT_INDEX:${index}`, 400);
        }

        normalized.designatedRecipient = String(item.designatedRecipient);
      }

      if (item.rarity !== undefined && item.rarity !== null) {
        normalized.rarity = String(item.rarity).slice(0, 64);
      }

      if (item.seed !== undefined && item.seed !== null) {
        normalized.seed = String(item.seed).slice(0, 128);
      }

      return normalized;
    });

    return {
      transactionKey:
        typeof payload.transactionKey === 'string'
          ? payload.transactionKey.slice(0, 128)
          : null,
      tokens,
      items: normalizedItems
    };
  }

  static normalizeParticipantIds(participantIds) {
    if (!Array.isArray(participantIds)) {
      throw new LootError('INVALID_PARTICIPANTS', 400);
    }

    const unique = [];

    const seen = new Set();

    for (const raw of participantIds) {
      if (!this.isSafeId(raw)) {
        throw new LootError('INVALID_PARTICIPANT_ID', 400);
      }

      const userId = String(raw);

      if (!seen.has(userId)) {
        seen.add(userId);
        unique.push(userId);
      }
    }

    if (unique.length === 0) {
      throw new LootError('EMPTY_PARTICIPANTS', 400);
    }

    if (unique.length > this.MAX_PARTICIPANTS) {
      throw new LootError('TOO_MANY_PARTICIPANTS', 400);
    }

    return unique.sort();
  }

  static assertValidSessionId(sessionId) {
    if (!this.isSafeId(sessionId)) {
      throw new LootError('INVALID_SESSION_ID', 400);
    }
  }

  static isSafeId(value) {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.length < 1 || value.length > 128) {
      return false;
    }

    return /^[a-zA-Z0-9:_\-]+$/.test(value);
  }

  static async insertAuditLog(connection, entry) {
    await this.execute(
      connection,
      `
        INSERT INTO audit_logs
          (
            event_type,
            user_id,
            session_id,
            detail,
            created_at
          )
        VALUES
          (?, ?, ?, ?, NOW())
      `,
      [
        entry.eventType,
        entry.userId,
        entry.sessionId,
        JSON.stringify(entry.detail)
      ]
    );
  }

  /**
   * Kompatibel mit:
   * - mysql2/promise: query() => [rows, fields]
   * - eigene Wrapper: query() => rows
   */
  static async queryRows(connection, sql, params) {
    const result = await connection.query(sql, params);

    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0];
    }

    if (Array.isArray(result)) {
      return result;
    }

    return [];
  }

  static async queryOne(connection, sql, params) {
    const rows = await this.queryRows(connection, sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  static async execute(connection, sql, params) {
    return connection.query(sql, params);
  }

  static getAffectedRows(result) {
    if (Array.isArray(result) && result[0] && typeof result[0].affectedRows === 'number') {
      return result[0].affectedRows;
    }

    if (result && typeof result.affectedRows === 'number') {
      return result.affectedRows;
    }

    return 0;
  }

  /**
   * Express Middleware.
   *
   * Wichtig:
   * In Produktion sollte req.user/serverseitige Auth hier zusätzlich geprüft werden.
   */
  static async middleware(req, res, next) {
    try {
      const { sessionId, lootData, participants } = req.body || {};

      const result = await LootTransactionHandler.handleLootDistribution(
        sessionId,
        lootData,
        participants
      );

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(409).json(result);
    } catch (error) {
      if (typeof next === 'function') {
        return next(error);
      }

      return res.status(500).json({
        success: false,
        error: 'LOOT_MIDDLEWARE_FATAL',
        timestamp: Date.now()
      });
    }
  }
}

class LootError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'LootError';
    this.statusCode = statusCode || 500;
  }
}

module.exports = LootTransactionHandler;
