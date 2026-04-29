import React, { useState, useEffect } from 'react';

interface HealthDisplayProps {
    initialHealth?: number;
    baseDecayRate?: number;
}

const HealthDisplay: React.FC<HealthDisplayProps> = ({ 
    initialHealth = 100, 
    baseDecayRate = 0.5 
}) => {
    const [health, setHealth] = useState<number>(initialHealth);
    const [multiplier, setMultiplier] = useState<number>(1.0);
    const [decayRate, setDecayRate] = useState<number>(baseDecayRate);

    useEffect(() => {
        setDecayRate(baseDecayRate * multiplier);
    }, [multiplier, baseDecayRate]);

    useEffect(() => {
        const interval = setInterval(() => {
            setHealth((prev) => Math.max(0, prev - (decayRate / 10)));
        }, 100);
        return () => clearInterval(interval);
    }, [decayRate]);

    const getHealthColor = (val: number) => {
        if (val > 70) return '#4caf50';
        if (val > 30) return '#ffeb3b';
        return '#f44336';
    };

    const containerStyle: React.CSSProperties = {
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '320px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
        border: '1px solid #333'
    };

    const barContainerStyle: React.CSSProperties = {
        height: '28px',
        width: '100%',
        backgroundColor: '#333',
        borderRadius: '14px',
        overflow: 'hidden',
        margin: '15px 0',
        border: '2px solid #000'
    };

    const barFillStyle: React.CSSProperties = {
        height: '100%',
        width: `${health}%`,
        backgroundColor: getHealthColor(health),
        transition: 'width 0.1s linear, background-color 0.5s ease'
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        marginTop: '20px'
    };

    const getButtonStyle = (m: number): React.CSSProperties => ({
        flex: 1,
        padding: '10px 5px',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: multiplier === m ? '#3b82f6' : '#2d2d2d',
        color: multiplier === m ? 'white' : '#aaa',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        transition: 'all 0.2s ease'
    });

    const restoreButtonStyle: React.CSSProperties = {
        marginTop: '12px',
        width: '100%',
        padding: '12px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: '#10b981',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer'
    };

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>SYSTEM VITALITY</span>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', letterSpacing: '1px' }}>LVL: {multiplier.toFixed(1)}x</span>
            </div>

            <div style={barContainerStyle}>
                <div style={barFillStyle} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round(health)}%</span>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>DECAY RATE</div>
                    <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold' }}>-{decayRate.toFixed(2)} pts/s</div>
                </div>
            </div>

            <div style={buttonGroupStyle}>
                <button style={getButtonStyle(1.0)} onClick={() => setMultiplier(1.0)}>Easy</button>
                <button style={getButtonStyle(1.5)} onClick={() => setMultiplier(1.5)}>Normal</button>
                <button style={getButtonStyle(2.5)} onClick={() => setMultiplier(2.5)}>Hard</button>
                <button style={getButtonStyle(5.0)} onClick={() => setMultiplier(5.0)}>Elite</button>
            </div>

            <button 
                style={restoreButtonStyle} 
                onClick={() => setHealth(100)}
            >
                INITIALIZE RECOVERY
            </button>
        </div>
    );
};

export default HealthDisplay;