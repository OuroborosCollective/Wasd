import type { LineageRuntimeStateProvider } from './LineageBirthSnapshotBridge.js';
import { LineagePoiRuntimeStateProvider } from './LineagePoiRuntimeStateProvider.js';

const defaultProvider = new LineagePoiRuntimeStateProvider();
let registeredProvider: LineageRuntimeStateProvider | null = null;

export function registerLineageRuntimeStateProvider(provider: LineageRuntimeStateProvider): void {
  registeredProvider = provider;
}

export function clearLineageRuntimeStateProvider(): void {
  registeredProvider = null;
}

export function getLineageRuntimeStateProvider(): LineageRuntimeStateProvider {
  return registeredProvider ?? defaultProvider;
}

export function hasLineageRuntimeStateProvider(): boolean {
  return true;
}

export function hasCustomLineageRuntimeStateProvider(): boolean {
  return registeredProvider !== null;
}
