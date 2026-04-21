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
      `${attackerName} hits ${targetName} for ${amount} damage.`,
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
      `${killerName} defeated ${victimName}!`,
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
      `${playerName} reached level ${newLevel}!`,
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
