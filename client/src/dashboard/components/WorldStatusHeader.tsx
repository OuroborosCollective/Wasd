/**
 * @file client/src/dashboard/components/WorldStatusHeader.tsx
 * @description Header showing global world status
 */

import { useWorld } from '../context/WorldContext';

export function WorldStatusHeader() {
  const { worldState, connected, lastUpdate } = useWorld();
  
  const uptime = lastUpdate 
    ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const totalEnergy = worldState?.regions?.reduce((sum, r) => sum + r.energy, 0) || 0;
  const avgCorruption = worldState?.regions?.length 
    ? worldState.regions.reduce((sum, r) => sum + r.corruption, 0) / worldState.regions.length 
    : 0;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-300 text-sm">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Tick Info */}
        <div className="text-center">
          <div className="text-2xl font-mono text-cyan-400">
            Tick {worldState?.tick?.toLocaleString() || '---'}
          </div>
          <div className="text-xs text-gray-500">
            {worldState?.tickRate || 10} TPS
          </div>
        </div>

        {/* Uptime */}
        <div className="text-center">
          <div className="text-xl font-mono text-purple-400">
            {formatTime(uptime)}
          </div>
          <div className="text-xs text-gray-500">Uptime</div>
        </div>

        {/* Total Energy */}
        <div className="text-center">
          <div className="text-xl font-mono text-yellow-400">
            {totalEnergy.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Total Energy</div>
        </div>

        {/* Avg Corruption */}
        <div className="text-center">
          <div className={`text-xl font-mono ${
            avgCorruption > 0.7 ? 'text-red-400' : 
            avgCorruption > 0.4 ? 'text-orange-400' : 
            'text-green-400'
          }`}>
            {(avgCorruption * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Avg Corruption</div>
        </div>

        {/* Region Count */}
        <div className="text-center">
          <div className="text-xl font-mono text-blue-400">
            {worldState?.regions?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Regions</div>
        </div>
      </div>
    </div>
  );
}