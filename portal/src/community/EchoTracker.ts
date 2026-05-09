export class EchoTracker {
    public getSignalStrength(type: string) { return 0.5; }
    public renderSignalWave(type: string, strength: number) { return { label: 'Signal', css: '' }; }
}
