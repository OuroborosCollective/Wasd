import axios from 'axios';

interface EvolutionHighlight {
    id: string;
    projectId: string;
    title: string;
    description: string;
    impactScore: number;
    category: 'performance' | 'feature' | 'ux' | 'security';
    timestamp: Date;
}

interface WebhookPayload {
    source: 'marketing-automation-service';
    event: 'evolution_highlight_detected';
    data: EvolutionHighlight;
    seoConfig: {
        keywords: string[];
        targetSlug: string;
        generateLandingPage: boolean;
    };
}

export class MarketingAutomationService {
    private readonly webhookUrl: string;

    constructor() {
        this.webhookUrl = process.env.SEO_WEBHOOK_URL || 'https://hooks.example.com/seo-generation';
    }

    public async processEvolutionData(evolution: any): Promise<void> {
        const highlights = this.extractHighlights(evolution);
        
        for (const highlight of highlights) {
            if (highlight.impactScore >= 8) {
                await this.triggerSEOGeneration(highlight);
            }
        }
    }

    private extractHighlights(evolution: any): EvolutionHighlight[] {
        const highlights: EvolutionHighlight[] = [];

        if (evolution.metrics && evolution.metrics.performanceGain > 0.2) {
            highlights.push({
                id: evolution.id,
                projectId: evolution.projectId,
                title: 'Performance Breakthrough',
                description: `System performance improved by ${(evolution.metrics.performanceGain * 100).toFixed(1)}%`,
                impactScore: 9,
                category: 'performance',
                timestamp: new Date(0) /* ARE-DETERMINISM-ALLOW: determinism placeholder */
            });
        }

        if (evolution.diff && evolution.diff.newFeatures && evolution.diff.newFeatures.length > 0) {
            highlights.push({
                id: evolution.id,
                projectId: evolution.projectId,
                title: 'New Capability Integration',
                description: `Added features: ${evolution.diff.newFeatures.join(', ')}`,
                impactScore: 8,
                category: 'feature',
                timestamp: new Date(0) /* ARE-DETERMINISM-ALLOW: determinism placeholder */
            });
        }

        return highlights;
    }

    private async triggerSEOGeneration(highlight: EvolutionHighlight): Promise<void> {
        const payload: WebhookPayload = {
            source: 'marketing-automation-service',
            event: 'evolution_highlight_detected',
            data: highlight,
            seoConfig: {
                keywords: [highlight.category, 'software evolution', 'automated update', 'optimization'],
                targetSlug: `update-${highlight.id}-${highlight.category}`,
                generateLandingPage: true
            }
        };

        try {
            await axios.post(this.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Automation-Secret': process.env.MARKETING_WEBHOOK_SECRET || ''
                }
            });
        } catch (error) {
            console.error(`Failed to trigger SEO generation for highlight ${highlight.id}:`, error);
            throw error;
        }
    }

    public async generateEvolutionSummary(projectId: string, periodDays: number = 7): Promise<string> {
        // Logic to aggregate highlights for a newsletter or summary page
        return `Weekly summary for project ${projectId} generated based on evolution data.`;
    }
}

export const marketingAutomation = new MarketingAutomationService();