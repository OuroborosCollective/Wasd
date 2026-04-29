import React from 'react';

const FloatingToolbar = ({
  layers = [],
  onToggleLayer,
  currentTime = 0,
  onTimeChange,
  onImport,
  onExport,
  minTime = 0,
  maxTime = 2000
}) => {
  const containerStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '15px 25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    color: 'white',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    zIndex: 1000,
    fontFamily: 'sans-serif'
  };

  const sectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRight: '1px solid rgba(255,255,255,0.2)',
    paddingRight: '20px'
  };

  const lastSectionStyle = {
    ...sectionStyle,
    borderRight: 'none',
    paddingRight: 0
  };

  const buttonStyle = {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s'
  };

  const iconButtonStyle = {
    ...buttonStyle,
    padding: '6px',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const sliderContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '200px',
    gap: '5px'
  };

  const sliderStyle = {
    width: '100%',
    cursor: 'pointer'
  };

  const labelStyle = {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.7
  };

  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {layers.map(layer => (
            <button
              key={layer.id}
              style={{
                ...iconButtonStyle,
                backgroundColor: layer.visible ? 'rgba(0, 120, 215, 0.6)' : 'rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => onToggleLayer(layer.id)}
              title={layer.label}
            >
              {layer.visible ? '👁️' : '🕶️'}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sliderContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={labelStyle}>Timeline</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{currentTime} AD</span>
          </div>
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={currentTime}
            onChange={(e) => onTimeChange(parseInt(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>

      <div style={lastSectionStyle}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            style={buttonStyle} 
            onClick={onImport}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            Import JSON
          </button>
          <button 
            style={{...buttonStyle, backgroundColor: '#0078d7'}} 
            onClick={onExport}
            onMouseOver={(e) => e.target.style.background = '#005a9e'}
            onMouseOut={(e) => e.target.style.background = '#0078d7'}
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingToolbar;