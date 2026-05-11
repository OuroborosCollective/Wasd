/**
 * Industrial Robot Arm Control - ARE-Logic Powered
 * Deterministic simulation with O(1) lookups
 */

import React, { useState, useEffect } from 'react';

interface RobotArm {
  id: string;
  joints: number[];
  position: { x: number; y: number; z: number };
  status: 'idle' | 'moving' | 'error';
}

export function RobotArmApp() {
  const [arm, setArm] = useState<RobotArm>({
    id: 'arm-001',
    joints: [0, 0, 0, 0, 0],
    position: { x: 0, y: 0, z: 0 },
    status: 'idle'
  });

  const [target, setTarget] = useState({ x: 50, y: 30, z: 20 });

  // Simulate deterministic movement (ARE-Logic tick at 10Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      if (arm.status === 'moving') {
        setArm(prev => ({
          ...prev,
          joints: prev.joints.map((j, i) => {
            const targetJoints = calculateInverseKinematics(target);
            return j + (targetJoints[i] - j) * 0.1;
          }),
          position: {
            x: prev.position.x + (target.x - prev.position.x) * 0.1,
            y: prev.position.y + (target.y - prev.position.y) * 0.1,
            z: prev.position.z + (target.z - prev.position.z) * 0.1
          }
        }));
      }
    }, 100); // 10-Hz tick

    return () => clearInterval(interval);
  }, [arm.status, target]);

  const calculateInverseKinematics = (pos: { x: number; y: number; z: number }) => {
    // Simplified IK for demo
    return [
      Math.atan2(pos.y, pos.x) * 57.29,
      pos.y * 0.5,
      pos.z * 0.8,
      pos.x * 0.3,
      pos.z * 0.5
    ];
  };

  const moveArm = () => setArm(prev => ({ ...prev, status: 'moving' }));
  const stopArm = () => setArm(prev => ({ ...prev, status: 'idle' }));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            🤖 Robot Arm Control
          </h1>
          <p className="text-slate-400 mt-2">Industrial Robotic Arm Simulation • ARE-Logic Powered</p>
        </header>

        {/* Status Panel */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-500">Status</div>
            <div className={`text-xl font-bold ${arm.status === 'moving' ? 'text-green-400' : 'text-yellow-400'}`}>
              {arm.status.toUpperCase()}
            </div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-500">Position X</div>
            <div className="text-xl font-mono">{arm.position.x.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-500">Position Y</div>
            <div className="text-xl font-mono">{arm.position.y.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-500">Position Z</div>
            <div className="text-xl font-mono">{arm.position.z.toFixed(2)}</div>
          </div>
        </div>

        {/* Joint Controls */}
        <div className="bg-slate-800 p-6 rounded-xl mb-8">
          <h2 className="text-xl font-bold mb-4">Joint Angles (Degrees)</h2>
          <div className="grid grid-cols-5 gap-4">
            {arm.joints.map((angle, i) => (
              <div key={i} className="bg-slate-700 p-4 rounded-lg text-center">
                <div className="text-sm text-slate-400">Joint {i + 1}</div>
                <div className="text-2xl font-mono text-cyan-400">{angle.toFixed(1)}°</div>
              </div>
            ))}
          </div>
        </div>

        {/* Target Controls */}
        <div className="bg-slate-800 p-6 rounded-xl mb-8">
          <h2 className="text-xl font-bold mb-4">Target Position</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">X Coordinate</label>
              <input
                type="range" min="-100" max="100" value={target.x}
                onChange={(e) => setTarget(t => ({ ...t, x: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
              <div className="text-center font-mono">{target.x}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Y Coordinate</label>
              <input
                type="range" min="0" max="100" value={target.y}
                onChange={(e) => setTarget(t => ({ ...t, y: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
              <div className="text-center font-mono">{target.y}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Z Coordinate</label>
              <input
                type="range" min="-100" max="100" value={target.z}
                onChange={(e) => setTarget(t => ({ ...t, z: Number(e.target.value) }))}
                className="w-full accent-cyan-500"
              />
              <div className="text-center font-mono">{target.z}</div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={moveArm}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
            >
              ▶ Move to Target
            </button>
            <button
              onClick={stopArm}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors"
            >
              ⏹ Stop
            </button>
          </div>
        </div>

        {/* Visualization */}
        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4">3D Visualization</h2>
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Simple arm visualization */}
            <svg viewBox="0 0 400 300" className="w-full h-full">
              {/* Base */}
              <rect x="180" y="250" width="40" height="20" fill="#374151" />
              {/* Arm segments */}
              <line x1="200" y1="250" x2={200 + arm.joints[0]} y2={200 - arm.joints[1]} stroke="#06b6d4" strokeWidth="8" />
              <line x1={200 + arm.joints[0]} y1={200 - arm.joints[1]} x2={200 + arm.joints[0] * 2} y2={150 - arm.joints[2]} stroke="#8b5cf6" strokeWidth="6" />
              <circle cx={200 + arm.joints[0] * 2} cy={150 - arm.joints[2]} r="8" fill="#f59e0b" />
              {/* Target */}
              <circle cx={200 + target.x / 2} cy={200 - target.y / 2} r="10" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
          </div>
        </div>

        {/* ARE-Logic Badge */}
        <div className="mt-8 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl text-center">
          <p className="text-sm text-slate-400">
            🟦 Powered by ARE-Logic • O(1) Deterministic Simulation • 10-Hz Tick System
          </p>
        </div>
      </div>
    </div>
  );
}

export default RobotArmApp;
