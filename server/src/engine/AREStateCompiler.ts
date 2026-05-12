export class AREStateCompiler {
    public async validateTransition(_args: any): Promise<any> {
      return { isValid: true, merkleRoot: "stub", rejectionReason: "" };
    }
    public async commitOrderToState(_order: any): Promise<string> { return "transition_stub"; }
    public async queryOrderState(_id: string): Promise<any> { return null; }
}
