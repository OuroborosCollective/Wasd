import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlModuleProps {
  groupName: string;
  statusColor?: string;
  initialProgress?: number;
  targetProgress: number;
}

export const ControlModule: React.FC<ControlModuleProps> = ({
  groupName,
  statusColor = '#00f3ff',
  targetProgress
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const containerStyle: React.CSSProperties = {
    background: 'rgba(10, 15, 25, 0.85)',
    border: `1px solid ${isHovered ? statusColor : 'rgba(255, 255, 255, 0.1)'}`,
    borderRadius: '4px',
    padding: '14px',
    width: '280px',
    fontFamily: '"Orbitron", "Inter", sans-serif',
    color: '#e0e0e0',
    backdropFilter: 'blur(12px)',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    boxShadow: isHovered ? `0 0 20px ${statusColor}33` : 'none',
    cursor: 'crosshair',
    position: 'relative',
    overflow: 'hidden'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600
  };

  const barContainerStyle: React.CSSProperties = {
    height: '2px',
    background: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
    position: 'relative'
  };

  return (
    <div 
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={labelStyle}>
        <span>{groupName}</span>
        <motion.div
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: `0 0 8px ${statusColor}`
          }}
        />
      </div>

      <div style={barContainerStyle}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: isHovered ? `${targetProgress}%` : '5%' }}
          transition={{ 
            type: 'spring', 
            stiffness: 40, 
            damping: 12,
            mass: 0.5
          }}
          style={{
            height: '100%',
            background: statusColor,
            boxShadow: `0 0 10px ${statusColor}`
          }}
        />
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '14px',
              fontSize: '8px',
              color: statusColor,
              opacity: 0.8
            }}
          >
            ACTIVE_MATRIX_FEED: {targetProgress}%
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, transparent 0%, ${statusColor}11 50%, transparent 100%)`,
          zIndex: -1
        }}
        animate={{
          x: isHovered ? ['-100%', '100%'] : '-100%'
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};

export default ControlModule;