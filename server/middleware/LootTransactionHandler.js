'use strict';

const { Database } = require('../database/Connection');
const { SecurityProvider } = require('../security/SecurityProvider');

/**
 * LootTransactionHandler
 *
 * Gehärtete deterministische, ACID-konforme Loot-Verteilung für ARELogic/MMORPG.
 *
 * Regeln:
 * - Keine Math.random(), kein Date.now() im deterministischen Rückgabe-/Key-Pfad.
 * - transactionKey ist echte Idempotenz-ID.
 * - Payload-Mismatch bei gleicher transactionKey wird blockiert.
 * - Teilnehmer werden serverseitig aus session_participants ermittelt.
 * - Client-Teilnehmer sind nur optionaler Sanity-Check, niemals Autorität.
 * - Session, Teilnehmer und bestehende Loot-Transaktion werden per FOR UPDATE gesperrt.
 * - Wallet-Updates und Inventory-Inserts laufen atomar in derselben DB-Transaktion.
 * - Audit-Logs entstehen innerhalb derselben DB-Transaktion.
 * - Resttoken werden deterministisch über Stable-Hash-Reihenfolge verteilt.
 */
class LootTransactionHandler {
  static STATUS_ACTIVE = 'ACTIVE';

  static TX_PROCESSING = 'PROCESSING';
  static TX_COMPLETED = 'COMPLETED';
  static TX_FAILED = 'FAILED';

  static MAX_ITEMS_PER_LOOT = 256;
  static MAX_PARTICIPANTS = 128;
  static MAX_TOKENS = 2_147_483_647;
  static MAX_SAFE_ID_LENGTH = 128;
  static MAX_RARITY_LENGTH = 64;
  static MAX_SEED_LENGTH = 128;

  static async handleLootDistribution(sessionId, lootPayload, requestedParticipantIds) {
    let connection;
    let transactionKey = null;
    let payloadHash = null;

    try {
      this.assertValidSessionId(sessionId);

      const normalizedLoot = this.normalizeLootPayload(lootPayload);
      const requestedParticipants = this.normalizeParticipantIds(requestedParticipantIds, {
        allowEmpty: true
      });

      connection = await Database.getConnection();
      await connection.beginTransaction();

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

      const authorizedParticipants = await this.loadAuthorizedParticipants(
        connection,
        sessionId,
        requestedParticipants
      );

      if (authorizedParticipants.length === 0) {
        throw new LootError('NO_AUTHORIZED_PARTICIPANTS', 400);
      }

      payloadHash = this.buildPayloadHash(sessionId, normalizedLoot, authorizedParticipants);
      transactionKey = this.buildTransactionKey(sessionId, normalizedLoot, payloadHash);

      const existingTx = await this.queryOne(
        connection,
        `
          SELECT
            id,
            status,
            payload_hash,
            tokens_distributed,
            items_distributed
          FROM loot_transactions
          WHERE transaction_key = ?
          FOR UPDATE
        `,
        [transactionKey]
      );

      if (existingTx && existingTx.payload_hash && existingTx.payload_hash !== payloadHash) {
        throw new LootError('LOOT_TRANSACTION_KEY_PAYLOAD_MISMATCH', 409);
      }

      if (existingTx && existingTx.status === this.TX_COMPLETED) {
        await connection.commit();

        return {
          success: true,
          idempotent: true,
          sessionId,
          transactionKey,
          payloadHash,
          tokensDistributed: Number(existingTx.tokens_distributed || 0),
          itemsDistributed: Number(existingTx.items_distributed || 0),
          timestamp: this.deterministicTimestamp(`${transactionKey}:IDEMPOTENT`)
        };
      }

      if (existingTx && existingTx.status === this.TX_PROCESSING) {
        throw new LootError('LOOT_TRANSACTION_ALREADY_PROCESSING', 409);
      }

      await this.putProcessingTransaction(connection, {
        hasExistingFailedTx: Boolean(existingTx && existingTx.status === this.TX_FAILED),
        sessionId,
        transactionKey,
        requestedParticipants,
        authorizedParticipants,
        payloadHash
      });

      const tokensDistributed = await this.distributeTokens(
        connection,
        sessionId,
        normalizedLoot.tokens,
        authorizedParticipants,
        transactionKey
      );

      const itemsDistributed = await this.distributeItems(
        connection,
        sessionId,
        normalizedLoot.items,
        authorizedParticipants,
        transactionKey
      );

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
        payloadHash,
        tokensDistributed,
        itemsDistributed,
        timestamp: this.deterministicTimestamp(`${transactionKey}:COMPLETED`)
      };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (_) {
          // Rollback-Fehler darf den eigentlichen Fehler nicht überschreiben.
        }
      }

      return {
        success: false,
        sessionId: this.isSafeId(sessionId) ? sessionId : undefined,
        transactionKey: transactionKey || undefined,
        payloadHash: payloadHash || undefined,
        statusCode: error && error.statusCode ? error.statusCode : 500,
        error: error && error.message ? error.message : 'LOOT_TRANSACTION_FAILED',
        timestamp: this.deterministicTimestamp(
          `${this.safeText(sessionId)}:${transactionKey || 'NO_TX'}:${error && error.message ? error.message : 'FAILED'}`
        )
      };
    } finally {
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  }

  /**
   * Serverautoritär: lädt alle aktuell berechtigten Teilnehmer.
   * requestedParticipantIds sind nur ein optionaler Sanity-Check.
   * Dadurch kann ein Client keine anderen Spieler aus dem Shared Loot herausfiltern.
   */
  static async loadAuthorizedParticipants(connection, sessionId, requestedParticipantIds) {
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

    const serverParticipants = this.normalizeParticipantIds(
      rows.map((row) => String(row.user_id)),
      { allowEmpty: true }
    );

    if (serverParticipants.length === 0) {
      return [];
    }

    if (requestedParticipantIds.length > 0) {
      const serverSet = new Set(serverParticipants);

      for (const requestedUserId of requestedParticipantIds) {
        if (!serverSet.has(requestedUserId)) {
          throw new LootError(`REQUESTED_PARTICIPANT_NOT_AUTHORIZED:${requestedUserId}`, 403);
        }
      }
    }

    if (serverParticipants.length > this.MAX_PARTICIPANTS) {
      throw new LootError('TOO_MANY_AUTHORIZED_PARTICIPANTS', 400);
    }

    return serverParticipants;
  }

  static async putProcessingTransaction(connection, input) {
    if (input.hasExistingFailedTx) {
      await this.execute(
        connection,
        `
          UPDATE loot_transactions
          SET
            status = ?,
            requested_participants_json = ?,
            authorized_participants_json = ?,
            payload_hash = ?,
            tokens_distributed = 0,
            items_distributed = 0,
            processed_at = NULL
          WHERE transaction_key = ?
        `,
        [
          this.TX_PROCESSING,
          JSON.stringify(input.requestedParticipants),
          JSON.stringify(input.authorizedParticipants),
          input.payloadHash,
          input.transactionKey
        ]
      );

      return;
    }

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
            tokens_distributed,
            items_distributed,
            created_at
          )
        VALUES
          (?, ?, ?, ?, ?, ?, 0, 0, NOW())
      `,
      [
        input.sessionId,
        input.transactionKey,
        this.TX_PROCESSING,
        JSON.stringify(input.requestedParticipants),
        JSON.stringify(input.authorizedParticipants),
        input.payloadHash
      ]
    );
  }

  static async distributeTokens(connection, sessionId, totalTokens, participantIds, transactionKey) {
    if (totalTokens <= 0) {
      return 0;
    }

    if (!Array.isArray(participantIds) || participantIds.length <= 0) {
      throw new LootError('NO_PARTICIPANTS_FOR_TOKEN_DISTRIBUTION', 400);
    }

    const deterministicOrder = this.deterministicOrder(
      participantIds,
      `${transactionKey}:TOKEN_ORDER`
    );

    const participantCount = deterministicOrder.length;
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
          remainder,
          orderIndex: i,
          participantCount
        }
      });

      distributed += amount;
    }

    return distributed;
  }

  static async distributeItems(connection, sessionId, items, participantIds, transactionKey) {
    if (!Array.isArray(items) || items.length === 0) {
      return 0;
    }

    if (!Array.isArray(participantIds) || participantIds.length <= 0) {
      throw new LootError('NO_PARTICIPANTS_FOR_ITEM_DISTRIBUTION', 400);
    }

    let distributed = 0;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const recipientId = this.determineRecipient(item, participantIds, `${transactionKey}:ITEM:${index}`);
      const instanceId = this.generateDeterministicInstanceId(transactionKey, item, index, recipientId);

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
          instanceId,
          recipientId
        }
      });

      distributed += 1;
    }

    return distributed;
  }

  static determineRecipient(item, participantIds, seed) {
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      throw new LootError('NO_PARTICIPANTS', 400);
    }

    if (item && item.designatedRecipient) {
      const designatedRecipient = String(item.designatedRecipient);

      if (participantIds.includes(designatedRecipient)) {
        return designatedRecipient;
      }

      throw new LootError(`DESIGNATED_RECIPIENT_NOT_AUTHORIZED:${designatedRecipient}`, 403);
    }

    return this.deterministicOrder(participantIds, seed)[0];
  }

  static deterministicOrder(values, seed) {
    return [...values].sort((a, b) => {
      const left = String(a);
      const right = String(b);
      const hashA = this.stableDigest(`${seed}:${left}`);
      const hashB = this.stableDigest(`${seed}:${right}`);

      if (hashA < hashB) return -1;
      if (hashA > hashB) return 1;

      return left.localeCompare(right, 'en', { sensitivity: 'variant' });
    });
  }

  static buildPayloadHash(sessionId, normalizedLoot, authorizedParticipants) {
    return this.stableDigest({
      version: 2,
      sessionId,
      tokens: normalizedLoot.tokens,
      items: normalizedLoot.items,
      authorizedParticipants
    });
  }

  static buildTransactionKey(sessionId, normalizedLoot, payloadHash) {
    const sessionHash = this.stableDigest(sessionId).slice(0, 16);

    if (normalizedLoot.transactionKey) {
      const externalHash = this.stableDigest(normalizedLoot.transactionKey).slice(0, 24);
      return `loot:${sessionHash}:${externalHash}`;
    }

    return `loot:${sessionHash}:${payloadHash.slice(0, 32)}`;
  }

  static generateDeterministicInstanceId(transactionKey, item, index, recipientId) {
    const raw = this.stableStringify({
      version: 2,
      transactionKey,
      templateId: item.templateId,
      rarity: item.rarity || null,
      seed: item.seed || null,
      index,
      recipientId
    });

    if (
      SecurityProvider &&
      typeof SecurityProvider.generateDeterministicUUID === 'function'
    ) {
      return SecurityProvider.generateDeterministicUUID(raw);
    }

    return `loot_${this.stableDigest(raw).slice(0, 32)}`;
  }

  static normalizeLootPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new LootError('INVALID_LOOT_PAYLOAD', 400);
    }

    const tokens = payload.tokens === undefined || payload.tokens === null
      ? 0
      : Number(payload.tokens);

    if (!Number.isInteger(tokens) || tokens < 0 || tokens > this.MAX_TOKENS) {
      throw new LootError('INVALID_TOKEN_AMOUNT', 400);
    }

    const items = payload.items === undefined || payload.items === null
      ? []
      : payload.items;

    if (!Array.isArray(items)) {
      throw new LootError('INVALID_LOOT_ITEMS', 400);
    }

    if (items.length > this.MAX_ITEMS_PER_LOOT) {
      throw new LootError('TOO_MANY_LOOT_ITEMS', 400);
    }

    const normalizedItems = items.map((item, index) => this.normalizeLootItem(item, index));

    let transactionKey = null;

    if (payload.transactionKey !== undefined && payload.transactionKey !== null) {
      if (!this.isSafeId(payload.transactionKey)) {
        throw new LootError('INVALID_TRANSACTION_KEY', 400);
      }

      transactionKey = String(payload.transactionKey);
    }

    if (tokens === 0 && normalizedItems.length === 0) {
      throw new LootError('EMPTY_LOOT_PAYLOAD', 400);
    }

    return {
      transactionKey,
      tokens,
      items: normalizedItems
    };
  }

  static normalizeLootItem(item, index) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
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
      if (!this.isBoundedSafeText(item.rarity, this.MAX_RARITY_LENGTH)) {
        throw new LootError(`INVALID_RARITY_AT_INDEX:${index}`, 400);
      }

      normalized.rarity = String(item.rarity).toUpperCase();
    }

    if (item.seed !== undefined && item.seed !== null) {
      if (!this.isBoundedSafeText(item.seed, this.MAX_SEED_LENGTH)) {
        throw new LootError(`INVALID_SEED_AT_INDEX:${index}`, 400);
      }

      normalized.seed = String(item.seed);
    }

    return normalized;
  }

  static normalizeParticipantIds(participantIds, options = {}) {
    const allowEmpty = Boolean(options.allowEmpty);

    if (participantIds === undefined || participantIds === null) {
      if (allowEmpty) return [];
      throw new LootError('INVALID_PARTICIPANTS', 400);
    }

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

    if (unique.length === 0 && !allowEmpty) {
      throw new LootError('EMPTY_PARTICIPANTS', 400);
    }

    if (unique.length > this.MAX_PARTICIPANTS) {
      throw new LootError('TOO_MANY_PARTICIPANTS', 400);
    }

    return unique.sort((a, b) => String(a).localeCompare(String(b), 'en', { sensitivity: 'variant' }));
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

    if (value.length < 1 || value.length > this.MAX_SAFE_ID_LENGTH) {
      return false;
    }

    return /^[a-zA-Z0-9:_-]+$/.test(value);
  }

  static isBoundedSafeText(value, maxLength) {
    if (value === undefined || value === null) {
      return false;
    }

    const text = String(value);

    if (text.length < 1 || text.length > maxLength) {
      return false;
    }

    return /^[a-zA-Z0-9:_./-]+$/.test(text);
  }

  static safeText(value) {
    if (value === undefined || value === null) {
      return 'NULL';
    }

    return String(value).slice(0, 256);
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
        this.stableStringify(entry.detail)
      ]
    );
  }

  static stableDigest(input) {
    const canonical = typeof input === 'string' ? input : this.stableStringify(input);

    return [
      this.stableHash32(`a:${canonical}`),
      this.stableHash32(`b:${canonical}`),
      this.stableHash32(`c:${canonical}`),
      this.stableHash32(`d:${canonical}`)
    ].join('');
  }

  static stableHash(input) {
    return this.stableHash32(input);
  }

  static stableHash32(input) {
    const str = String(input);
    let hash = 0x811c9dc5;

    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  static deterministicTimestamp(seed) {
    return parseInt(this.stableHash32(seed), 16);
  }

  static stableStringify(value) {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new LootError('NON_FINITE_NUMBER_IN_STABLE_STRINGIFY', 400);
      }

      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableStringify(entry)).join(',')}]`;
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value).sort();
      return `{${keys
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`)
        .join(',')}}`;
    }

    return JSON.stringify(String(value));
  }

  static async queryRows(connection, sql, params) {
    const result = await this.execute(connection, sql, params);

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
    if (typeof connection.execute === 'function') {
      return connection.execute(sql, params);
    }

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

  static async middleware(req, res, next) {
    try {
      const { sessionId, lootData, participants } = req.body || {};

      const effectiveParticipants = Array.isArray(participants)
        ? participants
        : (req.user && req.user.id ? [String(req.user.id)] : []);

      const result = await LootTransactionHandler.handleLootDistribution(
        sessionId,
        lootData,
        effectiveParticipants
      );

      if (result.success) {
        return res.status(200).json(result);
      }

      return res.status(result.statusCode || 409).json(result);
    } catch (error) {
      if (typeof next === 'function') {
        return next(error);
      }

      return res.status(500).json({
        success: false,
        error: 'LOOT_MIDDLEWARE_FATAL',
        timestamp: LootTransactionHandler.deterministicTimestamp('LOOT_MIDDLEWARE_FATAL')
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
module.exports.LootError = LootError;
