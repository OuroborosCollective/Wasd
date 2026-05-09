/**
 * @file client/src/dashboard/components/EventLog.tsx
 * @description Scrollable event log for system events
 */

import { useWorld } from '../context/WorldContext';

export function EventLog() {
  const { events } = useWorld();

  const getEventColor = (event: any): string => {
    const newPhase = event.newPhase?.toLowerCase() || '';
    const oldPhase = event.previousPhase?.toLowerCase() || '';
    
    if (newPhase.includes('collapse')) return 'text-red-400';
    if (newPhase.includes('critical')) return 'text-orange-400';
    if (newPhase.includes('contested')) return 'text-yellow-400';
    if (newPhase.includes('stable')) return 'text-green-400';
    return 'text-gray-400';
  };

  const getEventIcon = (event: any): string => {
    const newPhase = event.newPhase?.toLowerCase() || '';
    
    if (newPhase.includes('collapse')) return '💀';
    if (newPhase.includes('critical')) return '⚠️';
    if (newPhase.includes('contested')) return '⚔️';
    if (newPhase.includes('stable')) return '✅';
    return '📡';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-96 flex flex-col">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="text-xl">📋</span>
        Event Log
        <span className="text-xs text-gray-500 ml-auto">{events.length} events</span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {events.map((event, index) => (
          <div 
            key={`${event.regionId}-${index}`}
            className="bg-gray-800/50 rounded p-2 flex items-start gap-2"
          >
            <span className="text-lg">{getEventIcon(event)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {event.regionId}
                </span>
                <span className={`text-xs font-mono ${getEventColor(event)}`}>
                  {event.previousPhase} → {event.newPhase}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-mono">
                Tick {event.tick?.toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No events yet
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}