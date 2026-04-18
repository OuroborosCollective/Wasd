/**
 * StatusEmitter — auto-generates STATUS channel messages for game events.
 *
 * Emits proximity-scoped status messages for:
 * - Damage events
 * - Kill events
 * - Level-up messages
 * - Monster actions
 * - NPC agent thinking logs
 */

import { type ChatChannelRouter, type ChatRecipient, type SendToPlayerFn, type ResolveSocketIdFn } from "./ChatChannelRouter.js";

export class StatusEmitter {
  constructor(
    private router: ChatChannelRouter,
    private getRecipients: () => ChatRecipient[],
    private sendToPlayer: SendToPlayerFn,
    private resolveSocketId: ResolveSocketIdFn,
  ) {}

  /** Entity took damage. */
  emitDamage(
    targetName: string,
    attackerName: string,
    amount: number,
    position: { x: number; y: number; z?: number },
  ): void {
    this.router.emitStatus(
      `${attackerName} trifft ${targetName} für ${amount} Schaden.`,
      position,
      this.getRecipients(),
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  /** Entity was killed. */
  emitKill(
    victimName: string,
    killerName: string,
    position: { x: number; y: number; z?: number },
  ): void {
    this.router.emitStatus(
      `${killerName} hat ${victimName} besiegt!`,
      position,
      this.getRecipients(),
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  /** Player leveled up. */
  emitLevelUp(
    playerName: string,
    newLevel: number,
    position: { x: number; y: number; z?: number },
  ): void {
    this.router.emitStatus(
      `${playerName} hat Level ${newLevel} erreicht!`,
      position,
      this.getRecipients(),
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  /** Monster performed an action. */
  emitMonsterAction(
    monsterName: string,
    action: string,
    position: { x: number; y: number; z?: number },
  ): void {
    this.router.emitStatus(
      `${monsterName}: ${action}`,
      position,
      this.getRecipients(),
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }

  /** NPC agent thinking log (brief status line surfacing reasoning). */
  emitNpcThinking(
    npcName: string,
    thought: string,
    position: { x: number; y: number; z?: number },
  ): void {
    this.router.emitStatus(
      `[${npcName}] ${thought}`,
      position,
      this.getRecipients(),
      this.sendToPlayer,
      this.resolveSocketId,
    );
  }
}
