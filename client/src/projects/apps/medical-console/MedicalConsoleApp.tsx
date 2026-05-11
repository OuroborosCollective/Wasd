/**
 * Medical Console - ARE-Logic Powered
 * Real-time medical data visualization
 */

import React, { useState, useEffect } from 'react';

interface Patient {
  id: string;
  name: string;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  temperature: number;
  oxygen: number;
  status: 'stable' | 'warning' | 'critical';
}

const initialPatients: Patient[] = [
  { id: 'P001', name: 'Hans Mueller', heartRate: 72, bloodPressure: { systolic: 120, diastolic: 80 }, temperature: 36.6, oxygen: 98, status: 'stable' },
  { id: 'P002', name: 'Anna Schmidt', heartRate: 95, bloodPressure: { systolic: 145, diastolic: 95 }, temperature: 37.8, oxygen: 94, status: 'warning' },
  { id: 'P003', name: 'Klaus Weber', heartRate: 110, bloodPressure: { systolic: 160, diastolic: 100 }, temperature: 38.2, oxygen: 89, status: 'critical' },
  { id: 'P004', name: 'Maria Fischer', heartRate: 68, bloodPressure: { systolic: 115, diastolic: 75 }, temperature: 36.5, oxygen: 99, status: 'stable' },
];

export function MedicalConsoleApp() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  // Simulate real-time updates at 10-Hz (ARE-Logic tick)
  useEffect(() => {
    const interval = setInterval(() => {
      setPatients(prev => prev.map(p => {
        const variation = () => (Math.random() - 0.5) * 4;
        const newHR = Math.max(50, Math.min(150, p.heartRate + variation()));
        const newBP = {
          systolic: Math.max(90, Math.min(200, p.bloodPressure.systolic + variation())),
          diastolic: Math.max(50, Math.min(120, p.bloodPressure.diastolic + variation()))
        };
        const newTemp = p.temperature + (Math.random() - 0.5) * 0.2;
        const newOxy = Math.max(85, Math.min(100, p.oxygen + (Math.random() - 0.5) * 2));
        
        let status: Patient['status'] = 'stable';
        if (newHR > 100 || newBP.systolic > 150 || newOxy < 92) status = 'warning';
        if (newHR > 120 || newBP.systolic > 180 || newOxy < 88) status = 'critical';
        
        return {
          ...p,
          heartRate: Math.round(newHR),
          bloodPressure: newBP,
          temperature: Math.round(newTemp * 10) / 10,
          oxygen: Math.round(newOxy),
          status
        };
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: patients.length,
    stable: patients.filter(p => p.status === 'stable').length,
    warning: patients.filter(p => p.status === 'warning').length,
    critical: patients.filter(p => p.status === 'critical').length,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
            🏥 Medical Console
          </h1>
          <p className="text-slate-400 mt-2">Real-time Patient Monitoring • ARE-Logic Powered</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl">
            <div className="text-sm text-slate-400">Total Patients</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-xl">
            <div className="text-sm text-green-400">Stable</div>
            <div className="text-3xl font-bold text-green-400">{stats.stable}</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500/30 p-4 rounded-xl">
            <div className="text-sm text-yellow-400">Warning</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.warning}</div>
          </div>
          <div className="bg-red-900/30 border border-red-500/30 p-4 rounded-xl">
            <div className="text-sm text-red-400">Critical</div>
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
          </div>
        </div>

        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {patients.map(patient => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                patient.status === 'critical' ? 'bg-red-900/20 border-2 border-red-500' :
                patient.status === 'warning' ? 'bg-yellow-900/20 border-2 border-yellow-500' :
                'bg-slate-800 border-2 border-transparent hover:border-cyan-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold">{patient.name}</div>
                  <div className="text-sm text-slate-400">{patient.id}</div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  patient.status === 'critical' ? 'bg-red-500 text-white' :
                  patient.status === 'warning' ? 'bg-yellow-500 text-black' :
                  'bg-green-500 text-white'
                }`}>
                  {patient.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">❤️ Heart Rate</span>
                  <span className={patient.heartRate > 100 ? 'text-red-400' : ''}>{patient.heartRate} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">💉 Blood Pressure</span>
                  <span className={patient.bloodPressure.systolic > 140 ? 'text-red-400' : ''}>
                    {patient.bloodPressure.systolic}/{patient.bloodPressure.diastolic}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">🌡️ Temperature</span>
                  <span>{patient.temperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">🫁 Oxygen</span>
                  <span className={patient.oxygen < 95 ? 'text-red-400' : ''}>{patient.oxygen}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Patient Detail */}
        {selectedPatient && (
          <div className="mt-8 bg-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Patient Details</h2>
            {(() => {
              const p = patients.find(p => p.id === selectedPatient);
              if (!p) return null;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="text-4xl mb-2">❤️</div>
                    <div className="text-2xl font-bold">{p.heartRate}</div>
                    <div className="text-sm text-slate-400">bpm</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="text-4xl mb-2">💉</div>
                    <div className="text-2xl font-bold">{p.bloodPressure.systolic}/{p.bloodPressure.diastolic}</div>
                    <div className="text-sm text-slate-400">mmHg</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="text-4xl mb-2">🌡️</div>
                    <div className="text-2xl font-bold">{p.temperature}°</div>
                    <div className="text-sm text-slate-400">Celsius</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="text-4xl mb-2">🫁</div>
                    <div className="text-2xl font-bold">{p.oxygen}%</div>
                    <div className="text-sm text-slate-400">SpO2</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ARE-Logic Badge */}
        <div className="mt-8 p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl text-center">
          <p className="text-sm text-slate-400">
            🟦 Powered by ARE-Logic • O(1) Real-time Processing • 10-Hz Tick System
          </p>
        </div>
      </div>
    </div>
  );
}

export default MedicalConsoleApp;
