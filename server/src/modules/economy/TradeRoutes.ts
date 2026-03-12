export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}