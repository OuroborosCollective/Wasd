import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { priceStore } from '../stores/PriceStore';

export const PriceTicker: React.FC = observer(() => {
    const { currentPrice, assetName } = priceStore;
    const [trend, setTrend] = useState<'neutral' | 'up' | 'down'>('neutral');
    const prevPriceRef = useRef<number>(currentPrice);

    useEffect(() => {
        if (currentPrice > prevPriceRef.current) {
            setTrend('up');
        } else if (currentPrice < prevPriceRef.current) {
            setTrend('down');
        }

        const timer = setTimeout(() => {
            setTrend('neutral');
        }, 800);

        prevPriceRef.current = currentPrice;

        return () => clearTimeout(timer);
    }, [currentPrice]);

    const getPriceColor = () => {
        switch (trend) {
            case 'up': return '#22c55e';
            case 'down': return '#ef4444';
            default: return '#f8fafc';
        }
    };

    const containerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'baseline',
        padding: '1rem 1.5rem',
        backgroundColor: '#0f172a',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        minWidth: '200px',
        border: '1px solid #1e293b'
    };

    const labelStyle: React.CSSProperties = {
        color: '#94a3b8',
        fontSize: '0.875rem',
        fontWeight: 600,
        marginRight: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
    };

    const priceStyle: React.CSSProperties = {
        color: getPriceColor(),
        fontSize: '1.5rem',
        fontWeight: 700,
        fontFamily: 'monospace',
        transition: 'color 0.3s ease-in-out'
    };

    return (
        <div style={containerStyle}>
            <span style={labelStyle}>{assetName}</span>
            <span style={priceStyle}>
                {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2
                }).format(currentPrice)}
            </span>
        </div>
    );
});