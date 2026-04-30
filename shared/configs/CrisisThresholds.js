export const CRITICAL_MARKET_SHIFT_LIMIT = 0.25;
export const INFLATION_ALERT_THRESHOLD = 0.10;
export const DEBT_TO_GDP_CRITICAL_RATIO = 0.90;
export const UNEMPLOYMENT_CRISIS_THRESHOLD = 0.15;
export const GDP_CONTRACTION_LIMIT = -0.05;
export const CURRENCY_VOLATILITY_MAX = 0.20;
export const LIQUIDITY_SHORTAGE_THRESHOLD = 0.12;
export const CRISIS_EVALUATION_INTERVAL_MS = 86400000;
export const GLOBAL_CRISIS_CONFIG = {
    triggerLimit: CRITICAL_MARKET_SHIFT_LIMIT,
    autoStabilizeEnabled: false,
    cascadeEffectMultiplier: 1.5,
    recoveryRateBaseline: 0.02
};
