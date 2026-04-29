class SocialDynamics {
    constructor(initialState = {}) {
        this.faith_avg = initialState.faith_avg || 0.5;
        this.aggression = initialState.aggression || 0.1;
        this.density = initialState.density || 0;
        this.resourceScarcity = initialState.resourceScarcity || 0;
        this.aggressionThreshold = 0.75;
        this.safetyBaseCost = 1000;
        this.eventHistory = [];
    }

    update(cityData) {
        this.density = cityData.density || 0;
        this.resourceScarcity = cityData.resourceScarcity || 0;
        this.faith_avg = cityData.faith_avg || this.faith_avg;

        this._updateAggression();
        this._checkHarmonyThresholds();

        return {
            faith_avg: this.faith_avg,
            aggression: this.aggression,
            safetyCost: this.calculateSafetyCosts(),
            activeEvents: this.eventHistory
        };
    }

    _updateAggression() {
        const densityFactor = this.density * 0.15;
        const scarcityFactor = this.resourceScarcity * 0.45;
        const faithMitigation = this.faith_avg * 0.1;

        const growth = (densityFactor + scarcityFactor) - faithMitigation;
        this.aggression = Math.max(0, Math.min(1, this.aggression + (growth * 0.01)));
    }

    calculateSafetyCosts() {
        const reductionFactor = this.faith_avg * 0.5;
        const aggressionPremium = this.aggression * 0.8;
        
        const multiplier = (1 - reductionFactor) + aggressionPremium;
        return this.safetyBaseCost * multiplier;
    }

    _checkHarmonyThresholds() {
        if (this.aggression > this.aggressionThreshold) {
            this._triggerNegativeEvent();
        }
    }

    _triggerNegativeEvent() {
        const timestamp = Date.now();
        const event = {
            id: `social_unrest_${timestamp}`,
            type: "SOCIAL_UNREST",
            severity: this.aggression,
            description: "High social tension detected in Harmony Mapper"
        };
        
        this.eventHistory.push(event);
        if (this.eventHistory.length > 10) this.eventHistory.shift();
        
        if (typeof window !== 'undefined' && window.HarmonyMapper) {
            window.HarmonyMapper.reportEvent(event);
        }
    }

    getSafetyModifier() {
        return 1 - (this.faith_avg * 0.4);
    }
}

export default SocialDynamics;