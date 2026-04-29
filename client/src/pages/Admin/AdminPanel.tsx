import React, { useState, useEffect, useCallback } from 'react';

interface Faction {
  id: string;
  name: string;
  evolutionLevel: number;
  fitnessScore: number;
  mutationRate: number;
  status: 'active' | 'stagnant' | 'extinct';
  lastMutation: string;
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessKey, setAccessKey] = useState<string>('');
  const [factions, setFactions] = useState<Faction[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [systemOverride, setSystemOverride] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      const factionRes = await fetch('/api/admin/factions', {
        headers: { 'Authorization': `Bearer ${accessKey}` }
      });
      const logRes = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${accessKey}` }
      });
      
      if (factionRes.ok && logRes.ok) {
        setFactions(await factionRes.json());
        setLogs(await logRes.json());
      }
    } catch (error) {
      console.error("Data synchronization failure");
    }
  }, [accessKey]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey.length > 16) setIsAuthenticated(true);
  };

  const updateMutationRate = async (id: string, rate: number) => {
    await fetch(`/api/admin/factions/${id}/mutation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessKey}` },
      body: JSON.stringify({ mutationRate: rate })
    });
    fetchData();
  };

  const triggerEmergencyReset = async () => {
    if (window.confirm("CRITICAL: CONFIRM TOTAL EVOLUTIONARY RESET?")) {
      await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessKey}` }
      });
      fetchData();
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#050505', color: '#00ff00', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <form onSubmit={handleLogin} style={{ border: '1px solid #00ff00', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>CORE_SYSTEM_ACCESS_REQUIRED</label>
          <input 
            type="password" 
            value={accessKey} 
            onChange={(e) => setAccessKey(e.target.value)}
            style={{ backgroundColor: '#000', border: '1px solid #00ff00', color: '#00ff00', padding: '0.5rem', outline: 'none' }}
            placeholder="ACCESS_KEY"
          />
          <button type="submit" style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
            AUTHENTICATE
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', color: '#00ff00', minHeight: '100vh', padding: '2rem', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>SYSTEM_ADMIN_INTERFACE v4.0.2</h1>
        <button 
          onClick={triggerEmergencyReset}
          style={{ backgroundColor: '#ff0000', color: '#fff', border: 'none', padding: '0.5rem 1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          EMERGENCY_KILL_SWITCH
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <section>
          <h2>FACTION_EVOLUTION_MONITOR</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #333' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #00ff00' }}>
                <th style={{ padding: '0.5rem' }}>FACTION_ID</th>
                <th style={{ padding: '0.5rem' }}>EVO_LVL</th>
                <th style={{ padding: '0.5rem' }}>FITNESS</th>
                <th style={{ padding: '0.5rem' }}>MUTATION_RATE</th>
                <th style={{ padding: '0.5rem' }}>STATUS</th>
                <th style={{ padding: '0.5rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {factions.map(faction => (
                <tr key={faction.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '0.5rem' }}>{faction.name}</td>
                  <td style={{ padding: '0.5rem' }}>{faction.evolutionLevel}</td>
                  <td style={{ padding: '0.5rem' }}>{faction.fitnessScore.toFixed(4)}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={faction.mutationRate}
                      onChange={(e) => updateMutationRate(faction.id, parseFloat(e.target.value))}
                    />
                    {faction.mutationRate}
                  </td>
                  <td style={{ padding: '0.5rem', color: faction.status === 'active' ? '#00ff00' : '#ff0000' }}>
                    {faction.status.toUpperCase()}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <button style={{ background: 'transparent', border: '1px solid #00ff00', color: '#00ff00', fontSize: '10px' }}>FORCE_MUTATION</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>SYSTEM_LOGS</h2>
          <div style={{ height: '500px', overflowY: 'auto', border: '1px solid #333', padding: '1rem', backgroundColor: '#0a0a0a' }}>
            {logs.map(log => (
              <div key={log.id} style={{ marginBottom: '0.5rem', fontSize: '0.8rem', borderLeft: `3px solid ${log.level === 'CRITICAL' ? '#ff0000' : '#00ff00'}`, paddingLeft: '0.5rem' }}>
                <span style={{ opacity: 0.5 }}>[{log.timestamp}]</span> <strong>{log.level}:</strong> {log.message}
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #ff0000' }}>
            <h3>OVERRIDE_CONTROLS</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>SYSTEM_LOCK: {systemOverride ? 'OFF' : 'ON'}</span>
              <button 
                onClick={() => setSystemOverride(!systemOverride)}
                style={{ backgroundColor: systemOverride ? '#ff0000' : '#333', color: '#fff', border: 'none', padding: '0.3rem' }}
              >
                TOGGLE_OVERRIDE
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;