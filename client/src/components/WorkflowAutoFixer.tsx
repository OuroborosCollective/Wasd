import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Settings, FileDiff, ShieldAlert, ChevronRight } from 'lucide-react';

interface WorkflowDiff {
  file: string;
  original: string;
  modified: string;
}

interface PermissionStatus {
  isCorrect: boolean;
  currentPermissions: string;
  requiredPermissions: string;
  diffs: WorkflowDiff[];
}

const WorkflowAutoFixer: React.FC = () => {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fixing, setFixing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflow/check-permissions');
      if (!response.ok) throw new Error('API Check fehlgeschlagen');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Status der Workflow-Berechtigungen konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    setFixing(true);
    setError(null);
    try {
      const response = await fetch('/api/workflow/fix-permissions', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Automatisierte Korrektur fehlgeschlagen');
      }
      
      await fetchStatus();
    } catch (err) {
      setError('Die automatisierte API-Korrektur ist fehlgeschlagen.');
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900 rounded-xl border border-slate-800">
        <RefreshCw className="animate-spin text-blue-500 mr-3" />
        <span className="text-slate-300 font-medium">Analysiere Workflow-Konfiguration...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-200 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="text-blue-400" size={28} />
            Workflow Permissions Manager
          </h2>
          <p className="text-slate-400 mt-1">Überprüfung und Korrektur von GitHub Actions Schreibrechten</p>
        </div>
        {status?.isCorrect ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm">
            <CheckCircle size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">Status: Optimal</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-2 rounded-full border border-rose-500/20 shadow-sm animate-pulse">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">Korrektur Erforderlich</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Berechtigungs-Matrix</h3>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">Aktuell im Code</div>
              <div className="font-mono bg-slate-950 p-3 rounded border border-slate-800 text-rose-400 break-all">
                {status?.currentPermissions || 'Nicht definiert'}
              </div>
            </div>
            <ChevronRight className="text-slate-700 shrink-0 mt-4" />
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">Erforderlich für CI/CD</div>
              <div className="font-mono bg-slate-950 p-3 rounded border border-slate-800 text-emerald-400 break-all">
                {status?.requiredPermissions}
              </div>
            </div>
          </div>
        </div>

        {status?.diffs && status.diffs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-300">
              <FileDiff size={18} className="text-blue-400" />
              Vorschau der Änderungen (Diff)
            </h3>
            {status.diffs.map((diff, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between">
                  <span>{diff.file}</span>
                  <span className="text-blue-500/50 italic">YAML Patch</span>
                </div>
                <div className="grid grid-cols-2 text-xs font-mono divide-x divide-slate-800">
                  <div className="bg-rose-950/10 p-4">
                    <div className="text-rose-500/50 mb-2 border-b border-rose-900/30 pb-1">ENTFERNEN</div>
                    <pre className="text-rose-300 opacity-80">{diff.original}</pre>
                  </div>
                  <div className="bg-emerald-950/10 p-4">
                    <div className="text-emerald-500/50 mb-2 border-b border-emerald-900/30 pb-1">HINZUFÜGEN</div>
                    <pre className="text-emerald-300">{diff.modified}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-rose-900/20 border border-rose-500/30 p-5 rounded-xl flex items-start gap-4">
            <ShieldAlert className="text-rose-500 shrink-0" size={24} />
            <div className="space-y-3">
              <p className="text-rose-200 font-medium">{error}</p>
              <div className="text-slate-300 text-sm leading-relaxed bg-slate-950/50 p-4 rounded-lg border border-rose-500/10">
                <p className="font-bold mb-2 text-white italic underline">Manuelle Korrektur erforderlich:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Öffne das GitHub Repository im Browser.</li>
                  <li>Navigiere zu <span className="text-blue-400">Settings</span> (oben rechts).</li>
                  <li>Wähle in der Seitenleiste <span className="text-blue-400">Actions</span> &gt; <span className="text-blue-400">General</span>.</li>
                  <li>Scrolle nach unten zu <span className="text-white font-semibold">Workflow permissions</span>.</li>
                  <li>Wähle die Option <span className="text-emerald-400 font-bold">'Read and write permissions'</span>.</li>
                  <li>Setze den Haken bei <span className="italic">'Allow GitHub Actions to create and approve pull requests'</span>.</li>
                  <li>Klicke auf <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">Save</span>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-slate-800">
          <button 
            onClick={fetchStatus}
            className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-2 transition-colors group"
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            Konfiguration neu einlesen
          </button>
          
          <div className="flex gap-4">
            <button
              disabled={status?.isCorrect || fixing}
              onClick={handleFix}
              className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all transform active:scale-95 ${
                status?.isCorrect 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border border-blue-400/50'
              }`}
            >
              {fixing && <RefreshCw className="animate-spin" size={18} />}
              {fixing ? 'Wende Änderungen an...' : 'Automatischer Fix ausführen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowAutoFixer;