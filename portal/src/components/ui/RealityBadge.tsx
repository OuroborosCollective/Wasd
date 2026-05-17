import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

/**
 * RealityValidator Mock/Interface for UI integration
 * In a real application, this would be imported from a core logic module.
 */
interface RealityStatus {
  isValid: boolean;
  integrityScore: number;
  drift: number;
  timestamp: number;
}

// Simulated hook for the subscription
const useRealityValidator = (): RealityStatus => {
  const [status, setStatus] = useState<RealityStatus>({
    isValid: true,
    integrityScore: 1.0,
    drift: 0.0,
    timestamp: Date.now()
  });

  useEffect(() => {
    // Subscription logic would go here
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        timestamp: Date.now(),
        // Mocking slight fluctuations
        drift: Math.random() * 0.0001
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return status;
};

export const RealityBadge: React.FC = () => {
  const { isValid, integrityScore, drift, timestamp } = useRealityValidator();

  const baseStyles = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-300 ease-in-out shadow-sm";
  
  const statusStyles = isValid 
    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-cyan-500/20" 
    : "bg-red-500/10 border-red-500/50 text-red-400 shadow-red-500/20 animate-pulse";

  return (
    <div className="flex flex-col gap-1 items-end" role="status" aria-live="polite">
      <div className={`${baseStyles} ${statusStyles}`}>
        {isValid ? (
          <ShieldCheck size={14} className="text-cyan-400" aria-hidden="true" />
        ) : (
          <ShieldAlert size={14} className="text-red-400" aria-hidden="true" />
        )}
        
        <div className="flex flex-col">
          <span className="font-bold tracking-wider uppercase">
            {isValid ? 'Reality Verified' : 'Integrity Breach'}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-current opacity-30 mx-1" />

        <div className="flex items-center gap-1.5">
          <Activity size={12} className={isValid ? "text-cyan-500" : "text-red-500"} aria-hidden="true" />
          <span>{(integrityScore * 100).toFixed(4)}%</span>
        </div>
      </div>
      
      <div className="px-2 text-[10px] text-gray-500 font-mono flex gap-3">
        <span>DRIFT: {drift.toFixed(8)}</span>
        <span>SEQ: {timestamp.toString(16).toUpperCase()}</span>
      </div>
    </div>
  );
};

export default RealityBadge;