import React, { useEffect, useContext } from 'react';
import { WorldProvider, WorldContext } from './context/WorldContext';
import Viewport from './components/Viewport';
import Toolbar from './components/Toolbar';
import Dashboard from './components/Dashboard';
import NoiseEngine from './engine/NoiseEngine';

const AppContent = () => {
    const { setWorldData, worldSettings } = useContext(WorldContext);

    useEffect(() => {
        const initializeWorld = () => {
            const { width, height, seed, scale } = worldSettings;
            const engine = new NoiseEngine(seed);
            const data = engine.generateMap(width, height, scale);
            setWorldData(data);
        };

        initializeWorld();
    }, [setWorldData, worldSettings]);

    return (
        <div className="app-container" style={styles.container}>
            <header className="app-header" style={styles.header}>
                <Toolbar />
            </header>
            <main className="app-main" style={styles.main}>
                <div className="viewport-wrapper" style={styles.viewportWrapper}>
                    <Viewport />
                </div>
                <aside className="dashboard-wrapper" style={styles.dashboardWrapper}>
                    <Dashboard />
                </aside>
            </main>
        </div>
    );
};

const App = () => {
    return (
        <WorldProvider>
            <AppContent />
        </WorldProvider>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontFamily: 'sans-serif'
    },
    header: {
        height: '60px',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        backgroundColor: '#252525'
    },
    main: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
    },
    viewportWrapper: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#000'
    },
    dashboardWrapper: {
        width: '300px',
        borderLeft: '1px solid #333',
        backgroundColor: '#252525',
        overflowY: 'auto'
    }
};

export default App;