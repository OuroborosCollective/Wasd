import React, { useState, useEffect } from 'react';

export const RobotArm: React.FC = () => {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setPos({
        x: Math.round(Math.random() * 100),
        y: Math.round(Math.random() * 100),
        z: Math.round(Math.random() * 100)
      });
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <span>🦾</span> Robot Arm Control
        </h3>
        <button
          onClick={() => setActive(!active)}
          className={`px-4 py-2 rounded font-bold transition-colors ${active ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'}`}
        >
          {active ? 'EMERGENCY STOP' : 'System Online'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
            <h4 className="text-sm font-semibold text-slate-400 uppercase mb-2">Telemetry</h4>
            <div className="font-mono text-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">X-Axis:</span>
                <span className={active ? 'text-green-400' : 'text-slate-600'}>{pos.x.toString().padStart(3, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Y-Axis:</span>
                <span className={active ? 'text-green-400' : 'text-slate-600'}>{pos.y.toString().padStart(3, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Z-Axis:</span>
                <span className={active ? 'text-green-400' : 'text-slate-600'}>{pos.z.toString().padStart(3, '0')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm">
          <h4 className="text-sm font-semibold text-slate-400 uppercase mb-2">System Log</h4>
          <div className="h-32 overflow-y-auto space-y-1 text-xs">
            {active ? (
              <>
                <div className="text-slate-500">[{new Date().toLocaleTimeString()}] SYS_INIT</div>
                <div className="text-green-400">[{new Date().toLocaleTimeString()}] MOTORS_ENGAGED</div>
                <div className="text-cyan-400">[{new Date().toLocaleTimeString()}] CALIBRATION_OK</div>
                <div className="text-slate-300">[{new Date().toLocaleTimeString()}] AWAITING_CMD</div>
              </>
            ) : (
              <div className="text-red-400">SYSTEM OFFLINE</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotArm;
