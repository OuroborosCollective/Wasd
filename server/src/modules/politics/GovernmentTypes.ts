export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};