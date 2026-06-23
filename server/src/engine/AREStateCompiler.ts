export class AREStateCompiler {
    private commitSequence = 0;

    private hashCommitSeed(seed: string): string {
        let hash = 0x811c9dc5;

        for (let index = 0; index < seed.length; index += 1) {
            hash ^= seed.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }

        return hash.toString(36).padStart(7, "0");
    }

    public async validateTransition(a: any, b: any): Promise<any> {
        void a;
        void b;
        return { success: true, merkleRoot: "0x0" };
    }

    public async commitOrderToState(order: any): Promise<string> {
        this.commitSequence += 1;
        const orderSeed = JSON.stringify(order ?? null);
        return `tx_${this.commitSequence}_${this.hashCommitSeed(`${this.commitSequence}|${orderSeed}`)}`;
    }

    public async queryOrderState(id: string): Promise<any> {
        void id;
        return { status: "COMMITTED" };
    }
}
