declare namespace React {
  type ReactElement = unknown;
  type CSSProperties = Record<string, string | number>;
}

declare module "react" {
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<T>(initial: T): [T, (next: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  const React: {
    useEffect: typeof useEffect;
  };
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare namespace JSX {
  interface IntrinsicElements {
    section: Record<string, unknown>;
    div: Record<string, unknown>;
    p: Record<string, unknown>;
    h2: Record<string, unknown>;
    span: Record<string, unknown>;
    input: Record<string, unknown>;
    pre: Record<string, unknown>;
  }
}
