export class AuctionSettlement {
  settle(price: number, feePercent: number) {
    const fee = price * feePercent;
    return {
      gross: price,
      fee,
      net: price - fee
    };
  }
}