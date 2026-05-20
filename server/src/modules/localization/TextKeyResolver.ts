// @ARE-GUARD-EXEMPT: non-sim module
export class TextKeyResolver {
  resolve(dict: Record<string, string>, key: string) {
    return dict[key] || key;
  }
}