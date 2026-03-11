export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  },
  first_steps: {
    id: "first_steps",
    name: "First Steps",
    giver: "npc_1",
    objective: "talk_to_dummy",
    reward: { xp: 100, gold: 50, itemId: "starter_sword" }
  }
};