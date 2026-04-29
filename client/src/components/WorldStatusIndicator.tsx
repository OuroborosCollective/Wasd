import React, { useState, useEffect } from 'react';

export type WorldStatus = 'NORMAL' | 'WARFRONT_ACTIVE' | 'EMERGENCY' | 'MAINTENANCE';

interface WorldEvent {
    type: string;
    payload: {
        status: WorldStatus;
        message?: string;
    };
}

// Mocking the interface for WorldEventBus if not already globally defined
// In a real scenario, this would be imported from a shared event system
declare const WorldEventBus: {
    subscribe: (callback: (event: WorldEvent) => void) => () => void;
    getCurrentStatus: () => WorldStatus;
};

const WorldStatusIndicator: React.FC = () => {
    const [status, setStatus] = useState<WorldStatus>('NORMAL');
    const [message, setMessage] = useState<string>('Systeme Nominal');

    useEffect(() => {
        // Initialer Fetch falls Methode vorhanden
        if (typeof WorldEventBus !== 'undefined' && WorldEventBus.getCurrentStatus) {
            setStatus(WorldEventBus.getCurrentStatus());
        }

        // Subscription auf den EventBus
        const unsubscribe = WorldEventBus.subscribe((event: WorldEvent) => {
            if (event.type === 'WORLD_STATUS_CHANGED') {
                setStatus(event.payload.status);
                if (event.payload.message) {
                    setMessage(event.payload.message);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const getStatusStyles = (currentStatus: WorldStatus): React.CSSProperties => {
        switch (currentStatus) {
            case 'WARFRONT_ACTIVE':
                return {
                    backgroundColor: '#ff4d4f',
                    color: '#fff',
                    boxShadow: '0 0 10px rgba(255, 77, 79, 0.8)',
                    animation: 'pulse 1.5s infinite'
                };
            case 'EMERGENCY':
                return {
                    backgroundColor: '#faad14',
                    color: '#000',
                    fontWeight: 'bold'
                };
            case 'MAINTENANCE':
                return {
                    backgroundColor: '#8c8c8c',
                    color: '#fff'
                };
            case 'NORMAL':
            default:
                return {
                    backgroundColor: '#52c41a',
                    color: '#fff'
                };
        }
    };

    const containerStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.3s ease',
        ...getStatusStyles(status)
    };

    const dotStyle: React.CSSProperties = {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: 'currentColor'
    };

    return (
        <div className="world-status-indicator" style={containerStyle}>
            <style>
                {`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
                `}
            </style>
            <div style={dotStyle} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>WELTLAGE:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {status.replace('_', ' ')}
                </span>
                {status === 'WARFRONT_ACTIVE' && (
                    <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                        {message}
                    </span>
                )}
            </div>
        </div>
    );
};

export default WorldStatusIndicator;