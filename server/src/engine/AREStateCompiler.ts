export class AREStateCompiler {
    public async validateTransition(a: any, b: any): Promise<any> {
        return { success: true, merkleRoot: '0x0' };
    }
    public async commitOrderToState(order: any): Promise<string> {
        return "tx_" + Date.now();
    }
    public async queryOrderState(id: string): Promise<any> {
        return { status: 'COMMITTED' };
    }
}
