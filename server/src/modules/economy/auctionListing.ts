/**
 * Minimal listing shape for a light auction house (listing fee / expiry / buyout — implement service separately).
 */
export type Listing = {
  id: string;
  sellerId: string;
  itemUid: string;
  price: number;
  createdAt: number;
  expiresAt: number;
};
