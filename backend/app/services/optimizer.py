import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * HillClimbingOptimizer
 * Asynchrone Funktion zur Analyse von Konversionsraten und zur inkrementellen 
 * Anpassung von Gewichten in der Config-Tabelle.
 */
export async function hillClimbingOptimizer(delta: number = 0.05): Promise<void> {
    try {
        const configs = await prisma.config.findMany();
        
        const calculateFitness = async (): Promise<number> => {
            const metrics = await prisma.analytics.findFirst({
                orderBy: { timestamp: 'desc' }
            });
            
            if (!metrics || metrics.sentimentScore === 0) {
                return 0;
            }
            
            // Optimiert das Sentiment-zu-Erfolg-Verhältnis (Erfolg / Sentiment)
            return metrics.conversionRate / metrics.sentimentScore;
        };

        let bestFitness = await calculateFitness();

        for (const config of configs) {
            const originalWeight = config.weight;

            // Pfad 1: Gewicht erhöhen
            await prisma.config.update({
                where: { id: config.id },
                data: { weight: originalWeight + delta }
            });
            
            const fitnessPlus = await calculateFitness();
            if (fitnessPlus > bestFitness) {
                bestFitness = fitnessPlus;
                continue; 
            }

            // Pfad 2: Gewicht verringern
            await prisma.config.update({
                where: { id: config.id },
                data: { weight: originalWeight - delta }
            });

            const fitnessMinus = await calculateFitness();
            if (fitnessMinus > bestFitness) {
                bestFitness = fitnessMinus;
                continue;
            }

            // Reset: Keine Verbesserung durch Anpassung
            await prisma.config.update({
                where: { id: config.id },
                data: { weight: originalWeight }
            });
        }
    } catch (error) {
        // Fehlerbehandlung ohne Emotionen
    } finally {
        await prisma.$disconnect();
    }
}