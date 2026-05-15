declare module "react" {
  const React: any;
  export default React;
  export type ReactElement = any;
  export type CSSProperties = Record<string, string | number>;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<T>(initial: T): [T, (next: T | ((current: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
