import { TraitResonanceEngine, TensionUpdate } from '../services/TraitResonanceEngine';

export interface CampaignConfig {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'THROTTLED';
    tensionThresholds: {
        critical: number;
        warning: number;
        optimal: number;
    };
    adjustmentFactor: number;
}

export interface MarketingAnalyticsState {
    timestamp: number;
    activeCampaigns: Map<string, CampaignConfig>;
    globalTensionLevel: number;
}

export class MarketingTriggerController {
    private engine: TraitResonanceEngine;
    private campaigns: Map<string, CampaignConfig>;
    private currentState: MarketingAnalyticsState;

    constructor(engine: TraitResonanceEngine) {
        this.engine = engine;
        this.campaigns = new Map<string, CampaignConfig>();
        this.currentState = {
            timestamp: Date.now(),
            activeCampaigns: this.campaigns,
            globalTensionLevel: 0
        };

        this.initializeListeners();
    }

    private initializeListeners(): void {
        this.engine.on('tensionUpdate', (update: TensionUpdate) => {
            this.processTensionUpdate(update);
        });
    }

    public registerCampaign(config: CampaignConfig): void {
        this.campaigns.set(config.id, config);
    }

    public processTensionUpdate(update: TensionUpdate): void {
        const tension = update.normalizedValue;
        this.currentState.globalTensionLevel = tension;
        this.currentState.timestamp = Date.now();

        this.campaigns.forEach((campaign, id) => {
            this.evaluateTrigger(campaign, tension);
        });
    }

    private evaluateTrigger(campaign: CampaignConfig, currentTension: number): void {
        if (currentTension >= campaign.tensionThresholds.critical) {
            this.deactivateCampaign(campaign.id);
        } else if (currentTension >= campaign.tensionThresholds.warning) {
            this.throttleCampaign(campaign.id, currentTension);
        } else if (currentTension <= campaign.tensionThresholds.optimal) {
            this.optimizeCampaign(campaign.id);
        }
    }

    private deactivateCampaign(campaignId: string): void {
        const campaign = this.campaigns.get(campaignId);
        if (campaign && campaign.status !== 'PAUSED') {
            campaign.status = 'PAUSED';
            this.logTriggerAction(campaignId, 'DEACTIVATE', 'Critical tension threshold exceeded');
            this.dispatchCampaignUpdate(campaign);
        }
    }

    private throttleCampaign(campaignId: string, tension: number): void {
        const campaign = this.campaigns.get(campaignId);
        if (campaign) {
            campaign.status = 'THROTTLED';
            const reduction = (tension - campaign.tensionThresholds.warning) * campaign.adjustmentFactor;
            const newIntensity = Math.max(0.1, 1.0 - reduction);
            
            this.logTriggerAction(campaignId, 'THROTTLE', `Tension warning: intensity reduced to ${newIntensity}`);
            this.dispatchCampaignUpdate(campaign, newIntensity);
        }
    }

    private optimizeCampaign(campaignId: string): void {
        const campaign = this.campaigns.get(campaignId);
        if (campaign && (campaign.status === 'PAUSED' || campaign.status === 'THROTTLED')) {
            campaign.status = 'ACTIVE';
            this.logTriggerAction(campaignId, 'REACTIVATE', 'Tension returned to optimal levels');
            this.dispatchCampaignUpdate(campaign);
        }
    }

    private logTriggerAction(id: string, action: string, reason: string): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            campaignId: id,
            action: action,
            reason: reason,
            tensionLevel: this.currentState.globalTensionLevel
        };
        // Internal analytics stream output
        console.log(JSON.stringify(logEntry));
    }

    private dispatchCampaignUpdate(campaign: CampaignConfig, intensity: number = 1.0): void {
        // Interface to external Ad-Server or Delivery-API
        const payload = {
            id: campaign.id,
            status: campaign.status,
            intensity: intensity,
            lastUpdate: Date.now()
        };
        // Mocking external dispatch
    }

    public getAnalyticsSnapshot(): MarketingAnalyticsState {
        return { ...this.currentState };
    }
}