import { afterEach, describe, expect, it } from 'vitest';
import type { LineageRuntimeStateProvider } from './LineageBirthSnapshotBridge';
import {
  clearLineageRuntimeStateProvider,
  getLineageRuntimeStateProvider,
  hasLineageRuntimeStateProvider,
  registerLineageRuntimeStateProvider,
} from './LineageRuntimeStateProviderRegistry';

const provider: LineageRuntimeStateProvider = {
  getLineageRuntimeState: () => null,
};

describe('LineageRuntimeStateProviderRegistry', () => {
  afterEach(() => {
    clearLineageRuntimeStateProvider();
  });

  it('starts empty so no fake birth source exists by default', () => {
    expect(hasLineageRuntimeStateProvider()).toBe(false);
    expect(getLineageRuntimeStateProvider()).toBeUndefined();
  });

  it('registers and clears a real runtime state provider', () => {
    registerLineageRuntimeStateProvider(provider);

    expect(hasLineageRuntimeStateProvider()).toBe(true);
    expect(getLineageRuntimeStateProvider()).toBe(provider);

    clearLineageRuntimeStateProvider();
    expect(hasLineageRuntimeStateProvider()).toBe(false);
  });
});
