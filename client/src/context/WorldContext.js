import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const WorldContext = createContext(null);

export const WorldProvider = ({ children }) => {
    const [mapData, setMapData] = useState({
        hexes: [], // Array of { q, r, biome, faction, leylineStrength, height }
        width: 0,
        height: 0,
        metadata: {
            seed: null,
            generationDate: null
        }
    });

    const [viewState, setViewState] = useState({
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
        minZoom: 0.1,
        maxZoom: 10.0
    });

    const [layers, setLayers] = useState({
        biomes: true,
        factions: true,
        leylines: false,
        heightmap: false,
        grid: true,
        labels: true,
        units: true
    });

    const [timeline, setTimeline] = useState({
        currentTick: 0,
        maxTick: 10000,
        isPlaying: false,
        speed: 1.0,
        lastUpdate: Date.now()
    });

    const updateHexData = useCallback((q, r, updates) => {
        setMapData(prev => ({
            ...prev,
            hexes: prev.hexes.map(hex => 
                (hex.q === q && hex.r === r) ? { ...hex, ...updates } : hex
            )
        }));
    }, []);

    const toggleLayer = useCallback((layerName) => {
        setLayers(prev => ({
            ...prev,
            [layerName]: !prev[layerName]
        }));
    }, []);

    const setZoom = useCallback((newZoom) => {
        setViewState(prev => ({
            ...prev,
            zoom: Math.max(prev.minZoom, Math.min(prev.maxZoom, newZoom))
        }));
    }, []);

    const setTimelinePosition = useCallback((tick) => {
        setTimeline(prev => ({
            ...prev,
            currentTick: Math.max(0, Math.min(prev.maxTick, tick))
        }));
    }, []);

    const value = useMemo(() => ({
        mapData,
        setMapData,
        updateHexData,
        viewState,
        setViewState,
        setZoom,
        layers,
        setLayers,
        toggleLayer,
        timeline,
        setTimeline,
        setTimelinePosition
    }), [
        mapData, 
        updateHexData, 
        viewState, 
        setZoom, 
        layers, 
        toggleLayer, 
        timeline, 
        setTimelinePosition
    ]);

    return (
        <WorldContext.Provider value={value}>
            {children}
        </WorldContext.Provider>
    );
};

export const useWorld = () => {
    const context = useContext(WorldContext);
    if (!context) {
        throw new Error('useWorld must be used within a WorldProvider');
    }
    return context;
};

export default WorldContext;