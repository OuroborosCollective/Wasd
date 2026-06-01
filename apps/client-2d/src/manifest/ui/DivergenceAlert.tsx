/**
 * DivergenceAlert - Military-Grade Desync Warning UI
 * 
 * Zero-Trust architecture: When the manifest system detects divergence,
 * this component blocks ALL player input and displays the critical state.
 * 
 * Design: Brutalist, Panzerschrank (armored safe) aesthetic.
 * Pure React + Native CSS, no Tailwind.
 */

import React, { useState, useEffect } from 'react';
import './DivergenceAlert.css';

export interface DivergenceAlertProps {
  /** Current server tick from manifest */
  currentTick: number;
  /** Last verified state hash */
  lastStateHash: string;
  /** Whether resync is in progress */
  isResyncing?: boolean;
  /** Error message if resync failed */
  errorMessage?: string;
  /** Number of retry attempts */
  retryCount?: number;
  /** Max retries before giving up */
  maxRetries?: number;
  /** Custom className for override styling */
  className?: string;
}

export const DivergenceAlert: React.FC<DivergenceAlertProps> = ({
  currentTick,
  lastStateHash,
  isResyncing = false,
  errorMessage,
  retryCount = 0,
  maxRetries = 3,
  className = '',
}) => {
  const [pulseText, setPulseText] = useState('RE-ESTABLISHING CRYPTOGRAPHIC LINK');
  const [pulseVisible, setPulseVisible] = useState(true);

  // Pulsing text animation for "re-establishing" state
  useEffect(() => {
    if (!isResyncing) {
      setPulseText('RE-ESTABLISHING CRYPTOGRAPHIC LINK');
      setPulseVisible(true);
      return;
    }

    const texts = [
      'CONNECTING TO SERVER AUTHORITY',
      'VERIFYING STATE INTEGRITY',
      'RECONSTRUCTING MANIFEST CHAIN',
      'RE-SYNCHRONIZING SIMULATION TIME',
      'RE-ESTABLISHING CRYPTOGRAPHIC LINK',
    ];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setPulseText(texts[index]);
      setPulseVisible(true);
      
      // Flash effect
      setTimeout(() => setPulseVisible(false), 200);
    }, 800);

    return () => clearInterval(interval);
  }, [isResyncing]);

  // Truncate hash for display (show first 16 + last 16)
  const displayHash = lastStateHash.length > 32
    ? `${lastStateHash.slice(0, 16)}...${lastStateHash.slice(-16)}`
    : lastStateHash || 'UNKNOWN';

  const isTerminalError = errorMessage && retryCount >= maxRetries;

  return (
    <div className={`divergence-alert-overlay ${className}`}>
      <div className="divergence-alert-panel">
        {/* Header - Critical Warning */}
        <div className="divergence-alert-header">
          <div className="divergence-alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 className="divergence-alert-title">CRITICAL DESYNC DETECTED</h1>
          <div className="divergence-alert-subtitle">ARE-Kausalität unterbrochen</div>
        </div>

        {/* State Information */}
        <div className="divergence-alert-state">
          <div className="divergence-alert-state-row">
            <span className="divergence-alert-label">SERVER TICK</span>
            <span className="divergence-alert-value">{currentTick}</span>
          </div>
          <div className="divergence-alert-state-row">
            <span className="divergence-alert-label">STATE HASH</span>
            <span className="divergence-alert-value hash">{displayHash}</span>
          </div>
        </div>

        {/* Resync Status */}
        <div className="divergence-alert-status">
          {isResyncing ? (
            <>
              <div className={`divergence-alert-pulse ${pulseVisible ? 'visible' : ''}`}>
                {pulseText}
              </div>
              <div className="divergence-alert-spinner">
                <div className="spinner-ring"></div>
              </div>
            </>
          ) : errorMessage ? (
            <div className="divergence-alert-error">
              <span className="error-label">ERROR:</span>
              <span className="error-message">{errorMessage}</span>
              {retryCount < maxRetries && (
                <span className="retry-info">Retrying... ({retryCount}/{maxRetries})</span>
              )}
            </div>
          ) : isTerminalError ? (
            <div className="divergence-alert-terminal-error">
              <span className="terminal-label">FATAL:</span>
              <span>Maximum retries exceeded. Contact administrator.</span>
            </div>
          ) : (
            <div className="divergence-alert-waiting">
              Initializing resync protocol...
            </div>
          )}
        </div>

        {/* Footer - System Lock Status */}
        <div className="divergence-alert-footer">
          <div className="divergence-alert-lock">
            <div className="lock-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span>INPUT LOCKDOWN ACTIVE</span>
          </div>
          <div className="divergence-alert-timestamp">
            {new Date().toISOString()}
          </div>
        </div>

        {/* Decorative Elements - Military Grid */}
        <div className="divergence-alert-grid">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="grid-cell" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DivergenceAlert;