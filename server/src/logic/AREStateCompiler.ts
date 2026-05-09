export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    merkleRoot: string;
}
export class AREStateCompiler {
    public compileEntity(entity: any, tick: number): any { return {}; }
    public validateTransition(state: any, action: any): ValidationResult {
        return { isValid: true, merkleRoot: "0x0" };
    }
    public commitOrderToState(order: any): void {}
    public queryOrderState(orderId: string): any { return { status: "committed" }; }
}
