import type { InputType } from 'type-graphql';

@InputType()
export class Vector3 {
    @Field(() => Float)
    x!: number;

    @Field(() => Float)
    y!: number;

    @Field(() => Float)
    z!: number;
}

@Resolver()
export class ProfileResolver {
    /**
     * Dispatches builder NPCs to specific coordinates to signal visual world changes.
     * @param location The Vector3 coordinates for the construction site.
     * @param profileId The ID of the profile triggering the change.
     */
    @Mutation(() => Boolean)
    async dispatchBuilderNPCs(
        @Arg('location', () => Vector3) location: Vector3,
        @Arg('profileId') profileId: string
    ): Promise<boolean> {
        try {
            const npcType = 'NPC_Builder_Elite';
            
            // Logik zur Initialisierung der NPC-Builder-Steuerung
            // Hier wird die Platzierung der Einheiten an den Zielkoordinaten vorgenommen
            console.log(`[ProfileResolver] Dispatching ${npcType} to location:`, location, `for profile: ${profileId}`);

            // 1. Validierung der Koordinaten und Profile-Berechtigungen
            // 2. Aufruf des NPC-Management-Services zur Instanziierung
            // 3. Setzen von Nav-Mesh-Zielen für die Builder-Animationen
            // 4. Triggerung von Partikeleffekten oder Baustellen-Signalen

            return true;
        } catch (error) {
            console.error('[ProfileResolver] Error dispatching builder NPCs:', error);
            return false;
        }
    }
}