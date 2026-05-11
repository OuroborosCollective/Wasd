/**
 * @file client/src/dashboard/components/RegionGrid.tsx
 * @description Grid of region cards with corruption visualization
 */

import { useState } from 'react';
import { useWorld } from '../context/WorldContext';

export function RegionGrid() {
  const { worldState } = useWorld();
  const [injecting, setInjecting] = useState<string | null>(null);

  const handleRestore = async (regionId: string) => {
    setInjecting(regionId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/v1/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId, amount: 100 }),
      });
      
      if (response.ok) {
        console.log(`[restore] Injected energy into ${regionId}`);
      }
    } catch (error) {
      console.error('[restore] Error:', error);
    } finally {
      setInjecting(null);
    }
  };

  const getStabilityColor = (stability: string): string => {
    switch (stability) {
      case 'STABLE': return 'text-green-400';
      case 'UNSTABLE': return 'text-yellow-400';
      case 'CONTESTED': return 'text-orange-400';
      case 'CRITICAL': return 'text-red-400';
      case 'PARTIAL_COLLAPSE': return 'text-red-600';
      case 'TOTAL_COLLAPSE': return 'text-red-800';
      default: return 'text-gray-400';
    }
  };

  const getCorruptionFilter = (corruption: number): string => {
    // Higher corruption = more grayscale, more opacity variation
    const grayscale = Math.floor(corruption * 100);
    const brightness = 1 - (corruption * 0.5);
    return `grayscale(${grayscale}%) brightness(${brightness})`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {worldState?.regions?.map((region) => (
        <div
          key={region.id}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 transition-all hover:border-gray-600 relative overflow-hidden"
          style={{ filter: getCorruptionFilter(region.corruption) }}
        >
          {/* Background corruption indicator */}
          <div 
            className="absolute inset-0 bg-red-900/20 pointer-events-none"
            style={{ opacity: region.corruption }}
          />
          
          <div className="relative z-10">
            {/* Region ID */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-white truncate">
                {region.id}
              </h3>
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                region.stability === 'STABLE' ? 'bg-green-900/50 text-green-400' :
                region.stability === 'TOTAL_COLLAPSE' ? 'bg-red-900/50 text-red-400' :
                'bg-yellow-900/50 text-yellow-400'
              }`}>
                {region.stability}
              </span>
            </div>

            {/* Energy Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Energy</span>
                <span className="font-mono">{region.energy.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, region.energy)}%` }}
                />
              </div>
            </div>

            {/* Corruption Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Corruption</span>
                <span className="font-mono">{(region.corruption * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    region.corruption > 0.7 ? 'bg-red-600' :
                    region.corruption > 0.4 ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`}
                  style={{ width: `${region.corruption * 100}%` }}
                />
              </div>
            </div>

            {/* Restore Button */}
            <button
              onClick={() => handleRestore(region.id)}
              disabled={injecting === region.id}
              className="w-full py-2 px-4 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {injecting === region.id ? 'Injecting...' : '+ Inject Energy'}
            </button>
          </div>
        </div>
      ))}

      {(!worldState?.regions || worldState.regions.length === 0) && (
        <div className="col-span-full text-center py-12 text-gray-500">
          No regions available
        </div>
      )}
    </div>
  );
}