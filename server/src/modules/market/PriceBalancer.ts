export class PriceBalancer {
  balance(basePrice:number, supply:number, demand:number) {
    return Math.max(1, basePrice * (demand / Math.max(1, supply)));
  }
}