import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../store/storeContext';

interface Mentee {
    id: string | number;
    name: string;
    isActive: boolean;
    isOnline: boolean;
    relationshipDuration: string;
    class: string;
    level: number;
    xpMultiplier: number;
    syncRate: number;
}

interface Token {
    id: string | number;
    name: string;
    tier: number;
}

interface Bonus {
    id: string | number;
    name: string;
    value: number;
}

const MentorDashboard: React.FC = observer(() => {
    const { mentorStore } = useStore();

    useEffect(() => {
        mentorStore.fetchMentorData();
        const interval = setInterval(() => mentorStore.refreshSynergyBones(), 5000);
        return () => clearInterval(interval);
    }, [mentorStore]);

    const calculateAuraColor = (efficiency: number) => {
        if (efficiency > 80) return 'text-emerald-400 border-emerald-400';
        if (efficiency > 50) return 'text-sky-400 border-sky-400';
        return 'text-amber-400 border-amber-400';
    };

    return (
        <div className="p-6 bg-slate-900 text-slate-100 min-h-screen font-sans">
            <header className="mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                        Mentor Hub: Astral Connection
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time Synchronization Engine v4.2.0</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                        <span className="block text-xs uppercase text-slate-500 font-bold">Total Synergy</span>
                        <span className="text-xl font-mono text-pink-500">+{mentorStore.totalSynergy}%</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl">
                    <h3 className="text-slate-400 font-semibold mb-4 flex items-center">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                        XP Aura Efficiency
                    </h3>
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-emerald-900 text-emerald-200">
                                    Resonance level
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-emerald-400">
                                    {mentorStore.xpAuraEfficiency}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                            <div 
                                style={{ width: `${mentorStore.xpAuraEfficiency}%` }} 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-1000"
                            ></div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 italic text-center">
                        Active Radius: {mentorStore.auraRadius}m | Harmonic Dampening: 0.04%
                    </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl">
                    <h3 className="text-slate-400 font-semibold mb-4 flex items-center">
                        <span className="w-2 h-2 bg-sky-500 rounded-full mr-2"></span>
                        Tokens of Guidance
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {mentorStore.tokensOfGuidance.map((token: Token) => (
                            <div 
                                key={token.id} 
                                className="group relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-sky-500/50 bg-sky-900/20 cursor-help transition-all hover:scale-110 hover:border-sky-400"
                                title={token.name}
                            >
                                <span className="text-sky-400 text-xs font-bold">T{token.tier}</span>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-sky-500 rounded-full animate-pulse"></div>
                            </div>
                        ))}
                        {mentorStore.tokensOfGuidance.length === 0 && (
                            <div className="text-slate-600 italic text-sm py-2">No active guidance tokens found...</div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl">
                    <h3 className="text-slate-400 font-semibold mb-4 flex items-center">
                        <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                        Active Synergy Bonuses
                    </h3>
                    <ul className="space-y-3">
                        {mentorStore.synergyBones.map((bonus: Bonus) => (
                            <li key={bonus.id} className="flex justify-between items-center text-sm border-l-2 border-pink-500 pl-3">
                                <span className="text-slate-300">{bonus.name}</span>
                                <span className="text-pink-400 font-mono">+{bonus.value}%</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-700/50">
                            <th className="p-4 text-xs font-bold uppercase text-slate-400">Mentee Status</th>
                            <th className="p-4 text-xs font-bold uppercase text-slate-400">Class & Level</th>
                            <th className="p-4 text-xs font-bold uppercase text-slate-400 text-center">XP Multiplier</th>
                            <th className="p-4 text-xs font-bold uppercase text-slate-400 text-right">Synchronization</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(mentorStore.mentees as Mentee[]).map((mentee: Mentee) => (
                            <tr key={mentee.id} className="border-t border-slate-700 hover:bg-slate-750 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-3 ${mentee.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
                                        <div>
                                            <div className="font-bold text-slate-200">{mentee.name}</div>
                                            <div className="text-xs text-slate-500">{mentee.relationshipDuration} linked</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm text-slate-300">{mentee.class}</span>
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">LVL {mentee.level}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-emerald-400 font-mono font-bold">x{mentee.xpMultiplier.toFixed(2)}</span>
                                </td>
                                <td className="p-4 text-right font-mono">
                                    <span className={`px-3 py-1 rounded-full border text-xs ${calculateAuraColor(mentee.syncRate)}`}>
                                        {mentee.syncRate}% SYNC
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-slate-800 to-indigo-900/30 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                    <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Passive Aura: Mentor's Resolve</span>
                    <span className="text-indigo-400 animate-pulse text-xs">STATUS: ACTIVE</span>
                </div>
                <div className="bg-gradient-to-r from-slate-800 to-amber-900/30 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                    <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Inheritance Multiplier</span>
                    <span className="text-amber-400 font-mono">1.15x</span>
                </div>
            </footer>
        </div>
    );
});

export default MentorDashboard;