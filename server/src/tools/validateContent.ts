import fs from "fs";
import path from "path";
import { getContentDataRoot } from "../modules/content/contentDataRoot.js";
import { validateContentRoot } from "../modules/content/validateContentCore.js";

function validate() {
  const dataDir = getContentDataRoot();

  console.log(`Validating content in: ${dataDir}`);
  const result = validateContentRoot(dataDir);

  if (!result.ok) {
    console.error("Validation failed:");
    result.errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  }

  console.log("Validation passed!");

  const npcs = JSON.parse(fs.readFileSync(path.join(dataDir, "npc/npcs.json"), "utf-8"));
  const dialogues = JSON.parse(fs.readFileSync(path.join(dataDir, "dialogue/dialogues.json"), "utf-8"));
  const quests = JSON.parse(fs.readFileSync(path.join(dataDir, "quests/quests.json"), "utf-8"));
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, "items/items.json"), "utf-8"));
  const manifest = {
    contentPacks: [
      {
        name: "Core Content",
        npcIds: npcs.map((n: { id: string }) => n.id),
        questIds: quests.map((q: { id: string }) => q.id),
        dialogueIds: dialogues.map((d: { id: string }) => d.id),
        itemIds: items.map((i: { id: string }) => i.id),
        validationResult: "passed",
      },
    ],
  };
  fs.writeFileSync(path.join(dataDir, "content-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Manifest generated.");
}

validate();
