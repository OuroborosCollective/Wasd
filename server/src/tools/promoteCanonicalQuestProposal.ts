import fs from "node:fs";
import path from "node:path";
import { loadRootEnvFiles } from "../config/loadRootEnv.js";
import {
  getContentDataRoot,
  getContentDataSourceLabel,
} from "../modules/content/contentDataRoot.js";
import { validateAuthoringContentRoot } from "../modules/content/validateAuthoringContent.js";
import {
  validateQuestContentDefinitionAgainstContext,
  type QuestContentReferenceContext,
} from "../modules/content/questContentContract.js";
import { sha256Receipt } from "../devtools/genkit/contracts.js";
import { loadAreloriaAuthoringContext } from "../devtools/genkit/worldContext.js";

loadRootEnvFiles();

type ProposalEnvelope = {
  proposalType: string;
  truthClass: string;
  authoritativeMutationAllowed: boolean;
  requiresReadback: boolean;
  effectClass: string;
  approval: string;
  payload: {
    sourceContentHash?: string;
    sourceMode?: string;
    quest?: unknown;
    promotion?: {
      targetContentPath?: string;
      requiresOwnerReview?: boolean;
      writePerformed?: boolean;
    };
  };
  receipt?: {
    algorithm?: string;
    sha256?: string;
  };
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function die(message: string): never {
  console.error(`[quest-promotion] ${message}`);
  process.exit(1);
}

function parseProposal(filePath: string): ProposalEnvelope {
  const absolute = path.resolve(filePath);
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    die("Proposal file must contain a JSON object.");
  }
  return parsed as ProposalEnvelope;
}

function verifyEnvelope(proposal: ProposalEnvelope, approvedReceipt: string): void {
  if (proposal.proposalType !== "CANONICAL_QUEST_PROPOSAL") die("Unsupported proposalType.");
  if (proposal.truthClass !== "SIDE_CHANNEL_PROPOSAL") die("Proposal truthClass is not SIDE_CHANNEL_PROPOSAL.");
  if (proposal.authoritativeMutationAllowed !== false) die("Proposal claims authoritative mutation permission.");
  if (proposal.requiresReadback !== true) die("Proposal does not require readback.");
  if (proposal.effectClass !== "CONTENT_PROPOSAL") die("Proposal effectClass is not CONTENT_PROPOSAL.");
  if (proposal.approval !== "REVIEW_REQUIRED") die("Proposal approval class is unexpected.");
  if (proposal.receipt?.algorithm !== "sha256") die("Proposal receipt algorithm is not sha256.");
  if (!proposal.receipt?.sha256 || proposal.receipt.sha256 !== approvedReceipt) {
    die("--approve-receipt must exactly match the proposal receipt.");
  }
  if (proposal.payload?.promotion?.targetContentPath !== "quests/quests.json") {
    die("Proposal targetContentPath is not quests/quests.json.");
  }
  if (proposal.payload?.promotion?.requiresOwnerReview !== true) die("Proposal is missing owner review gate.");
  if (proposal.payload?.promotion?.writePerformed !== false) die("Proposal already claims a write occurred.");

  const receiptInput = {
    proposalType: proposal.proposalType,
    truthClass: proposal.truthClass,
    authoritativeMutationAllowed: proposal.authoritativeMutationAllowed,
    requiresReadback: proposal.requiresReadback,
    effectClass: proposal.effectClass,
    approval: proposal.approval,
    payload: proposal.payload,
  };
  const recomputed = sha256Receipt(receiptInput);
  if (recomputed !== approvedReceipt) {
    die(`Receipt verification failed: recomputed ${recomputed}, provided ${approvedReceipt}.`);
  }
}

function buildReferenceContext(): QuestContentReferenceContext {
  const context = loadAreloriaAuthoringContext();
  return {
    npcIds: new Set(context.npcs.map((npc) => npc.id)),
    itemIds: new Set(context.items.map((item) => item.id)),
    questIds: new Set(context.quests.map((quest) => quest.id)),
  };
}

function main(): void {
  const proposalPath = argValue("--proposal");
  const approvedReceipt = argValue("--approve-receipt");
  if (!proposalPath || !approvedReceipt) {
    die("Usage: tsx src/tools/promoteCanonicalQuestProposal.ts --proposal <proposal.json> --approve-receipt <sha256>");
  }
  if (!/^[a-f0-9]{64}$/.test(approvedReceipt)) die("--approve-receipt must be a lowercase sha256 hex digest.");

  const source = getContentDataSourceLabel();
  if (source.mode !== "legacy") {
    die(`Promotion is restricted to the legacy authoring root; selected content mode is ${source.mode}.`);
  }

  const before = loadAreloriaAuthoringContext();
  const proposal = parseProposal(proposalPath);
  verifyEnvelope(proposal, approvedReceipt);
  if (proposal.payload.sourceMode !== source.mode) die("Proposal source mode does not match the current authoring source.");
  if (proposal.payload.sourceContentHash !== before.sourceContentHash) {
    die("Proposal was authored against stale content. Re-run the Genkit flow against current game-data.");
  }

  const quest = proposal.payload.quest;
  const errors = validateQuestContentDefinitionAgainstContext(
    quest,
    buildReferenceContext(),
    { allowExistingId: false },
    "proposal.quest",
  );
  if (errors.length > 0) die(`Quest failed promotion validation: ${errors.join("; ")}`);

  const root = getContentDataRoot();
  const questPath = path.join(root, "quests", "quests.json");
  const originalRaw = fs.readFileSync(questPath, "utf8");
  const existing = JSON.parse(originalRaw);
  if (!Array.isArray(existing)) die("quests/quests.json is not an array.");

  const next = [...existing, quest];
  fs.writeFileSync(questPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const readback = validateAuthoringContentRoot(root);
  if (!readback.ok) {
    fs.writeFileSync(questPath, originalRaw, "utf8");
    die(`Post-write authoring validation failed; original file restored: ${readback.errors.join("; ")}`);
  }

  let after: ReturnType<typeof loadAreloriaAuthoringContext>;
  try {
    after = loadAreloriaAuthoringContext();
  } catch (error) {
    fs.writeFileSync(questPath, originalRaw, "utf8");
    die(`Post-write context readback failed; original file restored: ${error instanceof Error ? error.message : String(error)}`);
  }
  const questId = String((quest as any)?.id ?? "");
  if (!after.quests.some((entry) => entry.id === questId)) {
    fs.writeFileSync(questPath, originalRaw, "utf8");
    die("Post-write readback did not contain the promoted quest; original file restored.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        promotedQuestId: questId,
        approvedProposalReceipt: approvedReceipt,
        previousContentHash: before.sourceContentHash,
        readbackContentHash: after.sourceContentHash,
        validationErrors: 0,
        targetContentPath: "quests/quests.json",
      },
      null,
      2,
    ),
  );
}

main();
