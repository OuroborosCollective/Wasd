export class FriendsSystem {
  private friends = new Map<string, Set<string>>();

  addFriend(a: string, b: string) {
    if (!this.friends.has(a)) this.friends.set(a, new Set());
    if (!this.friends.has(b)) this.friends.set(b, new Set());
    this.friends.get(a)!.add(b);
    this.friends.get(b)!.add(a);
  }

  list(playerId: string) {
    return [...(this.friends.get(playerId) || new Set())];
  }
}