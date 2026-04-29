import React, { useState, useEffect, useCallback } from 'react';

interface GMPanelProps {
    liHash: string;
    isMoving: boolean;
    chainStrings: string[];
    currentChainId: string;
    previousChainId: string;
}

const GMPanel: React.FC<GMPanelProps> = ({ 
    liHash, 
    isMoving, 
    chainStrings, 
    currentChainId, 
    previousChainId 
}) => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [lastStableHash, setLastStableHash] = useState<string | null>(null);
    const [stabilityError, setStabilityError] = useState<boolean>(false);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'F1') {
            event.preventDefault();
            setIsVisible(prev => !prev);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (!isMoving) {
            if (lastStableHash === null) {
                setLastStableHash(liHash);
                setStabilityError(false);
            } else if (lastStableHash !== liHash) {
                setStabilityError(true);
            }
        } else {
            setLastStableHash(null);
            setStabilityError(false);
        }
    }, [liHash, isMoving, lastStableHash]);

    if (!isVisible) return null;

    const panelStyle: React.CSSProperties = {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '350px',
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        color: '#00FF41',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '15px',
        border: '1px solid #00FF41',
        borderRadius: '4px',
        boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    };

    const sectionTitleStyle: React.CSSProperties = {
        borderBottom: '1px solid #00FF41',
        paddingBottom: '4px',
        marginBottom: '6px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    };

    const hashBoxStyle: React.CSSProperties = {
        wordBreak: 'break-all',
        backgroundColor: 'rgba(0, 255, 65, 0.1)',
        padding: '5px',
        marginTop: '4px'
    };

    const chainVisualizerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginTop: '8px'
    };

    const chainLinkStyle = (active: boolean): React.CSSProperties => ({
        padding: '2px 4px',
        border: '1px solid #00FF41',
        backgroundColor: active ? '#00FF41' : 'transparent',
        color: active ? '#000' : '#00FF41',
        fontSize: '10px'
    });

    const statusStyle = (error: boolean): React.CSSProperties => ({
        color: error ? '#FF3131' : '#00FF41',
        fontWeight: 'bold'
    });

    return (
        <div style={panelStyle}>
            <div style={{ textAlign: 'center', fontSize: '14px', marginBottom: '5px' }}>
                DEBUG MONITOR [ACTIVE]
            </div>

            <div>
                <div style={sectionTitleStyle}>Integrity Status</div>
                <div>Movement: {isMoving ? 'DYNAMIC' : 'STILLSTAND'}</div>
                <div>
                    li-Hash Stability:{' '}
                    <span style={statusStyle(stabilityError)}>
                        {isMoving ? 'WAITING' : stabilityError ? 'CRITICAL - DRIFT DETECTED' : 'STABLE'}
                    </span>
                </div>
                <div style={hashBoxStyle}>{liHash}</div>
            </div>

            <div>
                <div style={sectionTitleStyle}>Chain Visualization</div>
                <div>Current: {currentChainId.substring(0, 8)}...</div>
                <div>Previous: {previousChainId.substring(0, 8)}...</div>
                <div style={chainVisualizerStyle}>
                    {chainStrings.map((str, index) => (
                        <div 
                            key={`${index}-${str}`} 
                            style={chainLinkStyle(str === currentChainId)}
                        >
                            {str.substring(0, 4)}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: 'auto', fontSize: '10px', opacity: 0.7 }}>
                F1 to toggle visibility
            </div>
        </div>
    );
};

export default GMPanel;