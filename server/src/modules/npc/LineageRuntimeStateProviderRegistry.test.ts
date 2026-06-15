import { afterEach, describe, expect, it } from 'vitest';
import type { LineageRuntimeStateProvider } from './LineageBirthSnapshotBridge';
import {
  clearLineageRuntimeStateProvider,
  getLineageRuntimeStateProvider,
  hasCustomLineageRuntimeStateProvider,
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

  it('starts with a real default provider that creates no fake state without context', async () => {
    expect(hasLineageRuntimeStateProvider()).toBe(true);
    expect(hasCustomLineageRuntimeStateProvider()).toBe(false);
    expect(await getLineageRuntimeStateProvider().getLineageRuntimeState('player_1', 10)).toBeNull();
  });

  it('registers and clears a custom runtime state provider override', () => {
    registerLineageRuntimeStateProvider(provider);

    expect(hasLineageRuntimeStateProvider()).toBe(true);
    expect(hasCustomLineageRuntimeStateProvider()).toBe(true);
    expect(getLineageRuntimeStateProvider()).toBe(provider);

    clearLineageRuntimeStateProvider();
    expect(hasLineageRuntimeStateProvider()).toBe(true);
    expect(hasCustomLineageRuntimeStateProvider()).toBe(false);
  });
});
