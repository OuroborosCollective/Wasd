import React, { useState, useEffect } from 'react';

interface Bounty {
    id: string;
    targetName: string;
    reward: number;
    currency: string;
    faction: string;
    difficulty: 'Low' | 'Medium' | 'High' | 'Extreme';
    description: string;
    expiry: number;
}

interface NemesisStatus {
    factionId: string;
    factionName: string;
    standing: number;
    rank: string;
    notoriety: number;
    threatLevel: number;
}

const BountyUI: React.FC = () => {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [nemesisData, setNemesisData] = useState<NemesisStatus[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Mock API call simulation
                const mockBounties: Bounty[] = [
                    {
                        id: 'B-001',
                        targetName: 'Kaelen Voss',
                        reward: 5000,
                        currency: 'CR',
                        faction: 'Iron Syndicate',
                        difficulty: 'High',
                        description: 'Wanted for corporate espionage and sabotage.',
                        expiry: Date.now() + 86400000
                    },
                    {
                        id: 'B-002',
                        targetName: 'Unknown Entity',
                        reward: 12000,
                        currency: 'CR',
                        faction: 'The Void',
                        difficulty: 'Extreme',
                        description: 'Disruption of subspace communication arrays.',
                        expiry: Date.now() + 172800000
                    }
                ];

                const mockNemesis: NemesisStatus[] = [
                    {
                        factionId: 'f-01',
                        factionName: 'United Federation',
                        standing: -450,
                        rank: 'Public Enemy',
                        notoriety: 75,
                        threatLevel: 4
                    },
                    {
                        factionId: 'f-02',
                        factionName: 'Trade Coalition',
                        standing: 120,
                        rank: 'Neutral',
                        notoriety: 5,
                        threatLevel: 0
                    }
                ];

                setBounties(mockBounties);
                setNemesisData(mockNemesis);
            } catch (error) {
                console.error("Failed to fetch bounty data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'Low': return '#4caf50';
            case 'Medium': return '#ffeb3b';
            case 'High': return '#ff9800';
            case 'Extreme': return '#f44336';
            default: return '#ffffff';
        }
    };

    if (loading) {
        return <div style={{ color: '#00ff00', fontFamily: 'monospace', padding: '20px' }}>INITIALIZING BOUNTY_SYSTEM...</div>;
    }

    return (
        <div style={{
            backgroundColor: '#0a0a0a',
            color: '#e0e0e0',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #333',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <header style={{ borderBottom: '2px solid #f44336', marginBottom: '20px', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0, color: '#f44336', textTransform: 'uppercase', letterSpacing: '2px' }}>Ouroboros Bounty Terminal</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
                <section>
                    <h2 style={{ fontSize: '1.2rem', borderLeft: '4px solid #f44336', paddingLeft: '10px' }}>Active Bounties</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {bounties.map(bounty => (
                            <div key={bounty.id} style={{
                                backgroundColor: '#161616',
                                border: '1px solid #444',
                                padding: '15px',
                                borderRadius: '4px',
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', top: '10px', right: '15px', color: getDifficultyColor(bounty.difficulty), fontWeight: 'bold' }}>
                                    {bounty.difficulty.toUpperCase()}
                                </div>
                                <h3 style={{ margin: '0 0 5px 0', color: '#fff' }}>{bounty.targetName}</h3>
                                <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#aaa' }}>{bounty.description}</p>
                                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Faction: <strong style={{ color: '#64b5f6' }}>{bounty.faction}</strong></span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>{bounty.reward.toLocaleString()} {bounty.currency}</span>
                                </div>
                                <button style={{
                                    marginTop: '15px',
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#f44336',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase'
                                }}>Accept Contract</button>
                            </div>
                        ))}
                    </div>
                </section>

                <aside>
                    <h2 style={{ fontSize: '1.2rem', borderLeft: '4px solid #ff9800', paddingLeft: '10px' }}>Nemesis Status</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {nemesisData.map(status => (
                            <div key={status.factionId} style={{
                                backgroundColor: '#1a1a1a',
                                padding: '10px',
                                borderRadius: '4px',
                                borderLeft: `4px solid ${status.standing < 0 ? '#f44336' : '#4caf50'}`
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{status.factionName}</div>
                                <div style={{ fontSize: '0.8rem', color: '#bbb' }}>Rank: {status.rank}</div>
                                <div style={{ margin: '8px 0' }}>
                                    <div style={{ fontSize: '0.7rem', marginBottom: '2px' }}>NOTORIETY LEVEL {status.notoriety}%</div>
                                    <div style={{ width: '100%', height: '4px', backgroundColor: '#333' }}>
                                        <div style={{ width: `${status.notoriety}%`, height: '100%', backgroundColor: '#ff9800' }}></div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: status.standing < 0 ? '#f44336' : '#4caf50' }}>
                                    Standing: {status.standing}
                                </div>
                                {status.threatLevel > 0 && (
                                    <div style={{ 
                                        marginTop: '5px', 
                                        fontSize: '0.7rem', 
                                        backgroundColor: 'rgba(244, 67, 54, 0.2)', 
                                        padding: '2px 5px', 
                                        textAlign: 'center',
                                        color: '#f44336',
                                        border: '1px solid #f44336'
                                    }}>
                                        THREAT LEVEL: {status.threatLevel} - HUNTERS DISPATCHED
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
            
            <footer style={{ marginTop: '30px', fontSize: '0.7rem', color: '#555', textAlign: 'center', borderTop: '1px solid #222', paddingTop: '10px' }}>
                OUROBOROS ENCRYPTION ACTIVE // SYSTEM_VERSION_4.0.2 // DATA_SYNC_STABLE
            </footer>
        </div>
    );
};

export default BountyUI;