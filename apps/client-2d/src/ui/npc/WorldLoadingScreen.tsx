/**
 * World Loading Screen
 * 
 * Displays deterministic loading state with animated transitions.
 * Shows "LOADING" or "SYNCING WORLD" status that transitions to "ONLINE/LIVE" when ready.
 * Diamond Glass aesthetic with Cyber-Zen styling.
 */

import React, { useEffect, useState } from "react";

export type LoadingStatus = "loading" | "syncing" | "online" | "error" | "offline";

export interface WorldLoadingScreenProps {
  readonly status: LoadingStatus;
  readonly progress?: number; // 0-100
  readonly worldName?: string;
  readonly errorMessage?: string;
  readonly onReady?: () => void; // Called when status becomes "online"
}

// Loading animations
const LOADING_ANIMATIONS = `
  @keyframes loading-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes loading-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes loading-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes loading-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes sync-bar {
    0% { width: 0%; }
    100% { width: 100%; }
  }
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
  }
  @keyframes world-pulse {
    0%, 100% { text-shadow: 0 0 10px rgba(0, 229, 255, 0.5); }
    50% { text-shadow: 0 0 20px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.4); }
  }
`;

// Status configurations
const STATUS_CONFIG: Record<LoadingStatus, { 
  label: string; 
  color: string; 
  showProgress: boolean;
  animation: string;
  icon: string;
}> = {
  loading: {
    label: "LOADING",
    color: "#00e5ff",
    showProgress: true,
    animation: "loading-pulse 1.5s ease-in-out infinite",
    icon: "◈",
  },
  syncing: {
    label: "SYNCING WORLD",
    color: "#9d00ff",
    showProgress: true,
    animation: "loading-spin 2s linear infinite",
    icon: "◎",
  },
  online: {
    label: "ONLINE",
    color: "#50c878",
    showProgress: false,
    animation: "heartbeat 2s ease-in-out infinite",
    icon: "◉",
  },
  error: {
    label: "ERROR",
    color: "#ffb4ab",
    showProgress: false,
    animation: "loading-pulse 1s ease-in-out infinite",
    icon: "◆",
  },
  offline: {
    label: "OFFLINE",
    color: "#849396",
    showProgress: false,
    animation: "none",
    icon: "◇",
  },
};

export function WorldLoadingScreen({
  status,
  progress = 0,
  worldName = "ARELORIA",
  errorMessage,
  onReady,
}: WorldLoadingScreenProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [styleInjected, setStyleInjected] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Inject styles once
  useEffect(() => {
    if (!styleInjected && !document.getElementById("world-loading-styles")) {
      const style = document.createElement("style");
      style.id = "world-loading-styles";
      style.textContent = LOADING_ANIMATIONS;
      document.head.appendChild(style);
      setStyleInjected(true);
    }
  }, [styleInjected]);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate progress smoothly
  useEffect(() => {
    if (status === "loading" || status === "syncing") {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          const target = progress;
          const diff = target - prev;
          if (Math.abs(diff) < 0.5) return target;
          return prev + diff * 0.1;
        });
      }, 50);
      return () => clearInterval(interval);
    } else if (status === "online") {
      setDisplayProgress(100);
    }
  }, [status, progress]);

  // Callback when online
  useEffect(() => {
    if (status === "online" && onReady) {
      onReady();
    }
  }, [status, onReady]);

  const config = STATUS_CONFIG[status];
  const isOnline = status === "online";

  return (
    <div
      className="world-loading-screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0f11",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.5s ease-out",
      }}
    >
      {/* Background Grid Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
          animation: "loading-fade-in 0.6s ease-out",
        }}
      >
        {/* Status Icon */}
        <div
          style={{
            fontSize: "48px",
            color: config.color,
            animation: config.animation,
            textShadow: isOnline ? `0 0 20px ${config.color}` : "none",
          }}
        >
          {config.icon}
        </div>

        {/* World Name */}
        <div
          style={{
            fontFamily: "Epilogue, sans-serif",
            fontSize: "14px",
            fontWeight: "600",
            letterSpacing: "0.3em",
            color: "#849396",
            textTransform: "uppercase",
          }}
        >
          {worldName}
        </div>

        {/* Status Label */}
        <div
          style={{
            fontFamily: "Epilogue, sans-serif",
            fontSize: isOnline ? "32px" : "24px",
            fontWeight: isOnline ? "800" : "700",
            letterSpacing: "0.15em",
            color: config.color,
            textTransform: "uppercase",
            animation: isOnline ? "world-pulse 2s ease-in-out infinite" : "none",
          }}
        >
          {config.label}
        </div>

        {/* Progress Bar (for loading/syncing) */}
        {config.showProgress && (
          <div
            style={{
              width: "280px",
              height: "4px",
              backgroundColor: "rgba(132, 147, 150, 0.2)",
              borderRadius: "0px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Shimmer effect */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${config.color} 50%, 
                  transparent 100%
                )`,
                backgroundSize: "200% 100%",
                animation: "loading-shimmer 1.5s linear infinite",
              }}
            />
            {/* Progress fill */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${displayProgress}%`,
                backgroundColor: config.color,
                transition: "width 0.1s ease-out",
                boxShadow: `0 0 10px ${config.color}`,
              }}
            />
          </div>
        )}

        {/* Progress Percentage */}
        {config.showProgress && (
          <div
            style={{
              fontFamily: "Epilogue, sans-serif",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.2em",
              color: "#849396",
            }}
          >
            {Math.round(displayProgress)}%
          </div>
        )}

        {/* Error Message */}
        {status === "error" && errorMessage && (
          <div
            style={{
              fontFamily: "Epilogue, sans-serif",
              fontSize: "12px",
              color: "#ffb4ab",
              textAlign: "center",
              maxWidth: "400px",
              padding: "16px",
              backgroundColor: "rgba(147, 0, 10, 0.2)",
              border: "1px solid rgba(255, 180, 171, 0.3)",
              borderRadius: "0px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Online indicator - World Heartbeat */}
        {isOnline && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            {/* Heartbeat visualization */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "4px",
                    height: `${12 + Math.sin(i * 0.8) * 8}px`,
                    backgroundColor: "#50c878",
                    animation: `heartbeat 1.5s ease-in-out ${i * 0.1}s infinite`,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: "Epilogue, sans-serif",
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "0.2em",
                color: "#50c878",
                textTransform: "uppercase",
              }}
            >
              WORLD HEARTBEAT ACTIVE
            </span>
          </div>
        )}
      </div>

      {/* Corner Decorations */}
      {[
        { top: "20px", left: "20px", transform: "rotate(0deg)" },
        { top: "20px", right: "20px", transform: "rotate(90deg)" },
        { bottom: "20px", right: "20px", transform: "rotate(180deg)" },
        { bottom: "20px", left: "20px", transform: "rotate(270deg)" },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "40px",
            height: "40px",
            borderTop: `2px solid ${isOnline ? "#50c878" : "#00e5ff"}`,
            borderLeft: `2px solid ${isOnline ? "#50c878" : "#00e5ff"}`,
            opacity: 0.3,
            ...pos,
          }}
        />
      ))}

      {/* Version Info */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          fontFamily: "Epilogue, sans-serif",
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "#3b494c",
        }}
      >
        OUROBOROS ENGINE v2.0
      </div>
    </div>
  );
}

export default WorldLoadingScreen;