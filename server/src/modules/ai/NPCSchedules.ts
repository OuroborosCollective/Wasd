export const NPCSchedules = {
  merchant: [
    { hour: 6, action: "wake" },
    { hour: 8, action: "open_shop" },
    { hour: 18, action: "close_shop" },
    { hour: 22, action: "sleep" }
  ],
  guard: [
    { hour: 6, action: "patrol" },
    { hour: 20, action: "rest" },
    { hour: 23, action: "sleep" }
  ]
};