import { test, expect } from '@playwright/test';

const proofPacket = Object.freeze({
  type: 'npc_dialogue',
  payload: {
    npcId: 'npc_guide',
    npcName: 'Linnea',
    name: 'Linnea',
    role: 'Village Guide',
    faction: 'Neutral',
    text: 'Wacht Handel Auftrag',
    message: 'Wacht Handel Auftrag',
    currentText: 'Wacht Handel Auftrag',
    intent: 'greet',
    truthMode: 'known_fact',
    speechHash: 'proof_hash_1200_7',
    phraseGenomeId: 'proof_genome_greet',
    selectedLexemeIds: ['arel_greeting_wacht', 'arel_trade_handel', 'arel_quest_auftrag'],
    tick: 1200,
    sequenceId: 7,
    openContext: true,
    source: 'runtime_npc_system',
  },
});

function dispatchNetworkPacket(packet: unknown) {
  window.dispatchEvent(new CustomEvent('wasd:network-packet', { detail: packet }));
}

test.describe('NPC Living Duden runtime proof', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/2d', { waitUntil: 'domcontentloaded' });
  });

  test('renders a runtime npc_dialogue packet in speech bubble and context window', async ({ page }) => {
    await page.evaluate(dispatchNetworkPacket, proofPacket);

    await expect(page.getByText('Linnea').first()).toBeVisible();
    await expect(page.getByText('Wacht Handel Auftrag').first()).toBeVisible();
    await expect(page.getByText('Village Guide').first()).toBeVisible();
    await expect(page.getByText('TALK')).toBeVisible();
    await expect(page.getByText('GOODBYE')).toBeVisible();
  });

  test('keeps context closed after goodbye while still allowing final NPC text', async ({ page }) => {
    await page.evaluate(dispatchNetworkPacket, proofPacket);
    await expect(page.getByText('GOODBYE')).toBeVisible();
    await page.getByText('GOODBYE').click();
    await expect(page.getByText('TALK')).not.toBeVisible();

    await page.evaluate(dispatchNetworkPacket, {
      ...proofPacket,
      payload: {
        ...proofPacket.payload,
        text: 'Safe travels, Architect.',
        message: 'Safe travels, Architect.',
        currentText: 'Safe travels, Architect.',
        intent: 'farewell',
        openContext: false,
        sequenceId: 8,
      },
    });

    await expect(page.getByText('Safe travels, Architect.')).toBeVisible();
    await expect(page.getByText('TALK')).not.toBeVisible();
  });
});
