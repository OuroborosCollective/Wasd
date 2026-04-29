const Redis = require('ioredis');
const WebSocket = require('ws');

class MentorService {
    constructor(redisConfig, dbConnection) {
        this.redis = new Redis(redisConfig);
        this.db = dbConnection;
        this.wss = null;
        this.proximityKey = 'mentor:proximity:positions';
        this.auraConfig = {
            baseRadius: 50,
            multiplierPerLevel: 5
        };
    }

    setWebSocketServer(wss) {
        this.wss = wss;
    }

    async updatePosition(userId, lat, lng, role, level = 1) {
        await this.redis.geoadd(this.proximityKey, lng, lat, userId);
        await this.redis.hset(`user:${userId}:meta`, {
            role,
            level,
            lastUpdate: Date.now()
        });
    }

    async calculateXPAuraRadius(mentorId) {
        const level = await this.redis.hget(`user:${mentorId}:meta`, 'level');
        const mentorLevel = parseInt(level) || 1;
        return this.auraConfig.baseRadius + (mentorLevel * this.auraConfig.multiplierPerLevel);
    }

    async getStudentsInAura(mentorId) {
        const pos = await this.redis.geopos(this.proximityKey, mentorId);
        if (!pos || !pos[0]) return [];

        const radius = await this.calculateXPAuraRadius(mentorId);
        const nearbyIds = await this.redis.georadius(
            this.proximityKey,
            pos[0][0],
            pos[0][1],
            radius,
            'm'
        );

        const students = [];
        for (const id of nearbyIds) {
            if (id === mentorId) continue;
            const meta = await this.redis.hgetall(`user:${id}:meta`);
            if (meta.role === 'student') {
                students.push({ id, ...meta });
            }
        }
        return students;
    }

    async distributeSharedLoot(mentorId, lootData) {
        const students = await this.getStudentsInAura(mentorId);
        const distribution = {
            type: 'SHARED_LOOT_DISTRIBUTION',
            sourceMentor: mentorId,
            loot: lootData,
            timestamp: Date.now()
        };

        if (this.wss) {
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    const isTarget = students.find(s => s.id === client.userId);
                    if (isTarget) {
                        client.send(JSON.stringify(distribution));
                    }
                }
            });
        }
        return students.length;
    }

    async transferTokensOfGuidance(mentorId, studentId, amount) {
        const session = await this.db.startSession();
        session.startTransaction();
        try {
            const senderUpdate = await this.db.collection('users').updateOne(
                { _id: mentorId, tokensOfGuidance: { $gte: amount } },
                { $inc: { tokensOfGuidance: -amount } },
                { session }
            );

            if (senderUpdate.modifiedCount === 0) {
                throw new Error('Insufficient tokens or mentor not found');
            }

            await this.db.collection('users').updateOne(
                { _id: studentId },
                { $inc: { tokensOfGuidance: amount } },
                { session }
            );

            await session.commitTransaction();
            
            this.notifyTokenTransfer(mentorId, studentId, amount);
            return true;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    notifyTokenTransfer(from, to, amount) {
        if (!this.wss) return;
        const payload = JSON.stringify({
            type: 'TOKEN_TRANSFER_CONFIRMED',
            from,
            to,
            amount,
            timestamp: Date.now()
        });

        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && (client.userId === from || client.userId === to)) {
                client.send(payload);
            }
        });
    }

    handleWebSocketHandler(ws, req) {
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                switch (data.type) {
                    case 'POSITION_UPDATE':
                        await this.updatePosition(ws.userId, data.lat, data.lng, data.role, data.level);
                        const studentsInRange = await this.getStudentsInAura(ws.userId);
                        ws.send(JSON.stringify({
                            type: 'AURA_STATUS',
                            activeStudents: studentsInRange.length,
                            radius: await this.calculateXPAuraRadius(ws.userId)
                        }));
                        break;
                    
                    case 'INITIATE_TRANSFER':
                        await this.transferTokensOfGuidance(ws.userId, data.targetId, data.amount);
                        break;
                }
            } catch (err) {
                ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
            }
        });
    }
}

module.exports = MentorService;