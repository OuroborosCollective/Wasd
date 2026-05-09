import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus, Activity, LucideProps } from 'lucide-react';

/**
 * ARE-ENGINE VISIONS-GEBUNDENER UMSETZUNGS-AGENT
 * Datei: client/src/components/DynamicStatInspector.tsx
 * Fokus: Behebung von 'never' Typ-Inferenz-Fehlern durch explizite Records.
 */

type LucideIconComponent = React.ComponentType<LucideProps>;

interface Stat {
    key: string;
    label: string;
    value: number;
    icon?: LucideIconComponent;
    higherIsBetter?: boolean;
}

interface Item {
    id: string;
    name: string;
    rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
    stats: Stat[];
}

interface DynamicStatInspectorProps {
    baseItem: Item;
    comparisonItem: Item;
}

interface DiffResult {
    diff: number;
    percent: number;
    isBetter: boolean;
    isNeutral: boolean;
}

const DynamicStatInspector: React.FC<DynamicStatInspectorProps> = ({ baseItem, comparisonItem }) => {
    // Cast icons to React.ElementType to resolve TS2786
    const IconActivity = Activity as React.ElementType;
    const IconArrowUp = ArrowUp as React.ElementType;
    const IconArrowDown = ArrowDown as React.ElementType;
    const IconMinus = Minus as React.ElementType;

    /**
     * Berechnet die Differenz zwischen zwei Werten unter Berücksichtigung von Kappa-Determinismus.
     * Hinweis: Werte werden hier als Floats für die Anzeige behandelt, 
     * stammen aber idealerweise aus dem Fixed-Point System (Kappa=1000).
     */
    const calculateDiff = (oldVal: number, newVal: number, higherIsBetter: boolean = true): DiffResult => {
        const diff = newVal - oldVal;
        const percent = oldVal !== 0 ? (diff / oldVal) * 100 : 0;
        const isPositive = diff > 0;
        const isBetter = higherIsBetter ? isPositive : !isPositive;
        const isNeutral = diff === 0;

        return {
            diff,
            percent,
            isBetter,
            isNeutral
        };
    };

    /**
     * Erstellt eine Map der Basis-Stats, um 'never' Typ-Fehler bei Lookups zu vermeiden.
     * Nutzt Record<string, number | string> gemäß Anforderung.
     */
    const baseStatsMap: Record<string, number | string> = useMemo(() => {
        return baseItem.stats.reduce((acc: Record<string, number | string>, stat: Stat) => {
            acc[stat.key] = stat.value;
            return acc;
        }, {} as Record<string, number | string>);
    }, [baseItem.stats]);

    const diffData = useMemo(() => {
        return comparisonItem.stats.map(newStat => {
            // Sicherer Zugriff auf den Record zur Vermeidung von impliziter never-Inferenz
            const baseValRaw = baseStatsMap[newStat.key];
            const baseValue = typeof baseValRaw === 'number' ? baseValRaw : 0;
            
            return {
                ...newStat,
                ...calculateDiff(baseValue, newStat.value, newStat.higherIsBetter ?? true)
            };
        });
    }, [comparisonItem.stats, baseStatsMap]);

    const getRarityColor = (rarity: string) => {
        const colors: Record<string, string> = {
            'Legendary': 'text-orange-500',
            'Epic': 'text-purple-500',
            'Rare': 'text-blue-500',
            'Uncommon': 'text-green-500'
        };
        return colors[rarity] || 'text-gray-400';
    };

    return (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl font-sans">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Stat Comparison</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded bg-slate-700 ${getRarityColor(comparisonItem.rarity)}`}>
                        {comparisonItem.rarity}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-white truncate">{comparisonItem.name}</h3>
                <p className="text-xs text-slate-400">Comparing against: {baseItem.name}</p>
            </div>

            <div className="p-4 space-y-4">
                {diffData.map((stat) => {
                    const CustomIcon = (stat.icon as React.ElementType) || IconActivity;
                    const baseValRaw = baseStatsMap[stat.key];
                    const baseDisplayValue = typeof baseValRaw === 'number' ? baseValRaw : 0;

                    return (
                        <div key={stat.key} className="flex items-center justify-between group">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-md bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                                    <CustomIcon size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-300">{stat.label}</div>
                                    <div className="text-xs text-slate-500">Base: {baseDisplayValue}</div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    <span className="text-sm font-bold text-white">
                                        {stat.value}
                                    </span>
                                    {!stat.isNeutral && (
                                        <span className={`flex items-center text-xs font-bold ${stat.isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {stat.isBetter ? <IconArrowUp size={12} className="mr-0.5" /> : <IconArrowDown size={12} className="mr-0.5" />}
                                            {Math.abs(stat.percent).toFixed(1)}%
                                        </span>
                                    )}
                                    {stat.isNeutral && <IconMinus size={12} className="text-slate-600" />}
                                </div>
                                <div className={`text-[10px] font-mono ${stat.isNeutral ? 'text-slate-600' : (stat.isBetter ? 'text-emerald-500/70' : 'text-rose-500/70')}`}>
                                    {stat.diff > 0 ? '+' : ''}{stat.diff.toFixed(1)} absolute
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Combat Power</div>
                        <div className="text-sm font-mono text-white">
                            {comparisonItem.stats.reduce((acc, curr) => acc + curr.value, 0).toFixed(0)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Efficiency</div>
                        <div className={`text-sm font-mono ${
                            diffData.filter(d => d.isBetter).length > diffData.filter(d => !d.isBetter && !d.isNeutral).length 
                            ? 'text-emerald-400' 
                            : 'text-rose-400'
                        }`}>
                            {diffData.length > 0 ? ((diffData.filter(d => d.isBetter).length / diffData.length) * 100).toFixed(0) : 0}% Upgrade
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DynamicStatInspector;