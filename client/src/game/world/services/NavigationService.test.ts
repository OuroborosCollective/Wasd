import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavigationService } from './NavigationService';
import { Vector3 } from '@babylonjs/core';
import { worldGenerator } from './WorldGeneratorService';

vi.mock('./WorldGeneratorService', () => ({
  worldGenerator: {
    getHeightAt: vi.fn(),
  },
}));

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    service = new NavigationService();
    vi.clearAllMocks();
  });

  it('should return true when not initialized', () => {
    expect(service.isWalkable(0, 0)).toBe(true);
  });

  it('should return true when navMesh is null', async () => {
    // Manually mark as initialized but keep navMesh null
    (service as any).initialized = true;
    expect(service.isWalkable(0, 0)).toBe(true);
  });

  it('should return true when point is close to navmesh', () => {
    (service as any).initialized = true;
    const mockNavMesh = {
      getClosestPoint: vi.fn().mockReturnValue(new Vector3(0.1, 5, 0)),
    };
    (service as any).navMesh = mockNavMesh;
    vi.mocked(worldGenerator.getHeightAt).mockReturnValue(5);

    expect(service.isWalkable(0, 0)).toBe(true);
    expect(worldGenerator.getHeightAt).toHaveBeenCalledWith(0, 0);
    expect(mockNavMesh.getClosestPoint).toHaveBeenCalled();
  });

  it('should return false when point is far from navmesh', () => {
    (service as any).initialized = true;
    const mockNavMesh = {
      getClosestPoint: vi.fn().mockReturnValue(new Vector3(1, 5, 0)),
    };
    (service as any).navMesh = mockNavMesh;
    vi.mocked(worldGenerator.getHeightAt).mockReturnValue(5);

    expect(service.isWalkable(0, 0)).toBe(false);
  });

  it('should return true as fallback if query throws', () => {
    (service as any).initialized = true;
    const mockNavMesh = {
      getClosestPoint: vi.fn().mockImplementation(() => {
        throw new Error('Navmesh error');
      }),
    };
    (service as any).navMesh = mockNavMesh;
    vi.mocked(worldGenerator.getHeightAt).mockReturnValue(5);

    expect(service.isWalkable(0, 0)).toBe(true);
  });
});
