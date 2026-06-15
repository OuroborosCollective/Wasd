import type { LineageRuntimeStateProvider } from './LineageBirthSnapshotBridge.js';

let registeredProvider: LineageRuntimeStateProvider | null = null;

export function registerLineageRuntimeStateProvider(provider: LineageRuntimeStateProvider): void {
  registeredProvider = provider;
}

export function clearLineageRuntimeStateProvider(): void {
  registeredProvider = null;
}

export function getLineageRuntimeStateProvider(): LineageRuntimeStateProvider | undefined {
  return registeredProvider ?? undefined;
}

export function hasLineageRuntimeStateProvider(): boolean {
  return registeredProvider !== null;
}
