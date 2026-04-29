import React from 'react';

const ArcaneDashboard = ({ isOpen, onClose, regionData }) => {
  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)'
    },
    container: {
      width: '80%',
      maxWidth: '800px',
      maxHeight: '90vh',
      backgroundColor: '#e0e5ec',
      borderRadius: '30px',
      padding: '40px',
      boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff',
      position: 'relative',
      overflowY: 'auto',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    parchment: {
      backgroundColor: '#f4e4bc',
      backgroundImage: 'url("https://www.transparenttextures.com/patterns/papyros.png")',
      padding: '30px',
      borderRadius: '15px',
      boxShadow: 'inset 6px 6px 12px #cfc19f, inset -6px -6px 12px #ffffd9',
      color: '#4a3728',
      marginBottom: '30px'
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#e0e5ec',
      boxShadow: '6px 6px 12px #bebebe, -6px -6px 12px #ffffff',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '20px',
      color: '#666'
    },
    title: {
      fontSize: '2.5rem',
      textAlign: 'center',
      marginBottom: '30px',
      color: '#444',
      textShadow: '1px 1px 2px rgba(255,255,255,1)'
    },
    sectionTitle: {
      fontSize: '1.4rem',
      fontWeight: 'bold',
      marginBottom: '15px',
      borderBottom: '2px solid rgba(0,0,0,0.1)',
      paddingBottom: '5px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    card: {
      backgroundColor: '#e0e5ec',
      padding: '20px',
      borderRadius: '20px',
      boxShadow: '9px 9px 16px #bebebe, -9px -9px 16px #ffffff'
    },
    resourceItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    factionBar: {
      height: '12px',
      backgroundColor: '#d1d9e6',
      borderRadius: '6px',
      marginTop: '8px',
      boxShadow: 'inset 2px 2px 5px #b8b9be, inset -3px -3px 7px #ffffff'
    },
    factionProgress: {
      height: '100%',
      borderRadius: '6px',
      boxShadow: '2px 2px 5px #b8b9be'
    }
  };

  const { name, lore, resources, factions } = regionData || {
    name: 'Unbekannte Region',
    lore: 'Die Winde der Magie verbergen die Geschichte dieses Ortes...',
    resources: [],
    factions: []
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>&times;</button>
        
        <h1 style={styles.title}>{name}</h1>
        
        <div style={styles.parchment}>
          <h2 style={styles.sectionTitle}>Annalen der Region</h2>
          <p style={{ lineHeight: '1.6', fontSize: '1.1rem', fontStyle: 'italic' }}>
            {lore}
          </p>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Vorkommen</h2>
            {resources.map((res, index) => (
              <div key={index} style={styles.resourceItem}>
                <span>{res.type}</span>
                <span style={{ fontWeight: 'bold' }}>{res.amount}</span>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Fraktions-Einfluss</h2>
            {factions.map((faction, index) => (
              <div key={index} style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>{faction.name}</span>
                  <span>{faction.influence}%</span>
                </div>
                <div style={styles.factionBar}>
                  <div style={{ 
                    ...styles.factionProgress, 
                    width: `${faction.influence}%`, 
                    backgroundColor: faction.color || '#4a90e2' 
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArcaneDashboard;