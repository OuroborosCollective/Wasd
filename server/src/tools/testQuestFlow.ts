import { QuestEngine } from "../modules/quest/QuestEngine.ts";

function log(msg: string) { console.log(msg); }

async function run() {
  const engine = new QuestEngine();
  console.log("loaded quests:", Array.from(engine.getQuestDefinitions().keys()));
  const player: any = { inventory: [], quests: [], gold: 0, xp: 0 };

  log("Starting quest help_test_npc");
  const started = engine.startQuest(player, "help_test_npc");
  console.log("started:", started);
  console.log("player quests:", JSON.stringify(player.quests, null, 2));

  log("-- simulate wrong event (combat dummy) --");
  let res = engine.handleObjectiveEvent(player, { type: "combat", targetId: "npc_dummy" });
  console.log("result:", res);
  console.log("state after wrong event:", JSON.stringify(player.quests, null, 2));

  log("-- simulate talk_to npc_1 (step1) --");
  res = engine.handleObjectiveEvent(player, { type: "talk_to", npcId: "npc_1" });
  console.log("result:", res);
  console.log("state after step1:", JSON.stringify(player.quests, null, 2));

  log("-- simulate adding item and collect (step2) --");
  player.inventory.push({ id: "iron_scrap" });
  res = engine.handleObjectiveEvent(player, { type: "collect", npcId: "npc_1" });
  console.log("result:", res);
  console.log("inventory now:", player.inventory);
  console.log("state after step2:", JSON.stringify(player.quests, null, 2));

  log("-- persistence simulation --");
  const saved = JSON.parse(JSON.stringify(player));
  console.log("saved copy:", JSON.stringify(saved.quests, null, 2));

  log("-- resume and complete step3 (talk again) --");
  res = engine.handleObjectiveEvent(saved, { type: "talk_to", npcId: "npc_1" });
  console.log("result:", res);
  console.log("state after completion:", JSON.stringify(saved.quests, null, 2));
  console.log("player gold/xp:", saved.gold, saved.xp);
}

run().catch(console.error);
