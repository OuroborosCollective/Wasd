/**
 * ResponsiveHUD Component
 * Adaptive HUD layout that adjusts to screen size
 * 
 * Features:
 * - Automatic breakpoint detection
 * - Mobile/Tablet/Desktop layouts
 * - Collapsible panels
 * - Customizable widget positions
 * - Touch-friendly sizing
 * - Performance optimized
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ResponsiveHUD.css';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type HUDLayout = 'compact' | 'standard' | 'expanded';

export interface HUDConfig {
  showStats: boolean;
  showInventory: boolean;
  showQuests: boolean;
  showChat: boolean;
  showMap: boolean;
  compactMode: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface ResponsiveHUDProps {
  config?: Partial<HUDConfig>;
  onConfigChange?: (config: HUDConfig) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Breakpoint Manager
 */
const useBreakpoint = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [layout, setLayout] = useState<HUDLayout>('standard');
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  const updateBreakpoint = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    setScreenSize({ width, height });

    // Determine device type
    let newDeviceType: DeviceType = 'desktop';
    let newLayout: HUDLayout = 'standard';

    if (width < 480) {
      newDeviceType = 'mobile';
      newLayout = 'compact';
    } else if (width < 1024) {
      newDeviceType = 'tablet';
      newLayout = 'standard';
    } else {
      newDeviceType = 'desktop';
      newLayout = 'expanded';
    }

    setDeviceType(newDeviceType);
    setLayout(newLayout);
  }, []);

  useEffect(() => {
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [updateBreakpoint]);

  return { deviceType, layout, screenSize };
};

/**
 * HUD Widget Component
 */
const HUDWidget: React.FC<{
  id: string;
  title: string;
  icon: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ id, title, icon, collapsible = true, defaultCollapsed = false, children, className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`hud-widget ${id} ${isCollapsed ? 'collapsed' : ''} ${className}`}>
      <div className="widget-header">
        <span className="widget-icon">{icon}</span>
        <span className="widget-title">{title}</span>
        {collapsible && (
          <button
            className="widget-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        )}
      </div>
      {!isCollapsed && <div className="widget-content">{children}</div>}
    </div>
  );
};

/**
 * Mobile HUD Layout
 */
const MobileHUDLayout: React.FC<{
  config: HUDConfig;
  children?: React.ReactNode;
}> = ({ config, children }) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  return (
    <div className="hud-layout mobile">
      {/* Top Bar - Stats */}
      {config.showStats && (
        <div className="hud-top-bar">
          <HUDWidget id="stats-mobile" title="Stats" icon="❤️" collapsible={false}>
            <div className="stats-compact">
              <div className="stat-row">
                <span className="stat-label">HP</span>
                <div className="stat-bar">
                  <div className="stat-fill" style={{ width: '75%' }} />
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">MP</span>
                <div className="stat-bar">
                  <div className="stat-fill" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </HUDWidget>
        </div>
      )}

      {/* Bottom Bar - Quick Access */}
      <div className="hud-bottom-bar">
        {config.showInventory && (
          <button
            className={`quick-access-btn ${activePanel === 'inventory' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'inventory' ? null : 'inventory')}
            title="Inventory"
          >
            🎒
          </button>
        )}
        {config.showQuests && (
          <button
            className={`quick-access-btn ${activePanel === 'quests' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'quests' ? null : 'quests')}
            title="Quests"
          >
            📜
          </button>
        )}
        {config.showChat && (
          <button
            className={`quick-access-btn ${activePanel === 'chat' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
            title="Chat"
          >
            💬
          </button>
        )}
        {config.showMap && (
          <button
            className={`quick-access-btn ${activePanel === 'map' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'map' ? null : 'map')}
            title="Map"
          >
            🗺️
          </button>
        )}
      </div>

      {/* Active Panel Overlay */}
      {activePanel && (
        <div className="hud-panel-overlay">
          <div className="panel-content">
            {activePanel === 'inventory' && <div>Inventory Content</div>}
            {activePanel === 'quests' && <div>Quests Content</div>}
            {activePanel === 'chat' && <div>Chat Content</div>}
            {activePanel === 'map' && <div>Map Content</div>}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

/**
 * Tablet HUD Layout
 */
const TabletHUDLayout: React.FC<{
  config: HUDConfig;
  children?: React.ReactNode;
}> = ({ config, children }) => {
  return (
    <div className="hud-layout tablet">
      {/* Top Bar */}
      {config.showStats && (
        <div className="hud-top-bar">
          <HUDWidget id="stats-tablet" title="Stats" icon="❤️" collapsible={false}>
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-label">HP</span>
                <div className="stat-bar">
                  <div className="stat-fill" style={{ width: '75%' }} />
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-label">MP</span>
                <div className="stat-bar">
                  <div className="stat-fill" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </HUDWidget>
        </div>
      )}

      {/* Left Sidebar */}
      <div className="hud-left-sidebar">
        {config.showInventory && (
          <HUDWidget
            id="inventory-tablet"
            title="Inventory"
            icon="🎒"
            defaultCollapsed={true}
          >
            <div>Inventory items...</div>
          </HUDWidget>
        )}
        {config.showQuests && (
          <HUDWidget id="quests-tablet" title="Quests" icon="📜" defaultCollapsed={true}>
            <div>Quest list...</div>
          </HUDWidget>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hud-right-sidebar">
        {config.showChat && (
          <HUDWidget id="chat-tablet" title="Chat" icon="💬" defaultCollapsed={true}>
            <div>Chat messages...</div>
          </HUDWidget>
        )}
        {config.showMap && (
          <HUDWidget id="map-tablet" title="Map" icon="🗺️" defaultCollapsed={true}>
            <div>Map view...</div>
          </HUDWidget>
        )}
      </div>

      {children}
    </div>
  );
};

/**
 * Desktop HUD Layout
 */
const DesktopHUDLayout: React.FC<{
  config: HUDConfig;
  children?: React.ReactNode;
}> = ({ config, children }) => {
  return (
    <div className="hud-layout desktop">
      {/* Top Bar */}
      {config.showStats && (
        <div className="hud-top-bar">
          <HUDWidget id="stats-desktop" title="Stats" icon="❤️" collapsible={false}>
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-label">HP</span>
                <div className="stat-bar large">
                  <div className="stat-fill" style={{ width: '75%' }} />
                </div>
                <span className="stat-value">750/1000</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">MP</span>
                <div className="stat-bar large">
                  <div className="stat-fill" style={{ width: '60%' }} />
                </div>
                <span className="stat-value">600/1000</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">XP</span>
                <div className="stat-bar large">
                  <div className="stat-fill" style={{ width: '45%' }} />
                </div>
                <span className="stat-value">4500/10000</span>
              </div>
            </div>
          </HUDWidget>
        </div>
      )}

      {/* Left Sidebar */}
      <div className="hud-left-sidebar">
        {config.showInventory && (
          <HUDWidget id="inventory-desktop" title="Inventory" icon="🎒">
            <div>Full inventory...</div>
          </HUDWidget>
        )}
        {config.showQuests && (
          <HUDWidget id="quests-desktop" title="Quests" icon="📜">
            <div>Full quest log...</div>
          </HUDWidget>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hud-right-sidebar">
        {config.showChat && (
          <HUDWidget id="chat-desktop" title="Chat" icon="💬">
            <div>Full chat...</div>
          </HUDWidget>
        )}
        {config.showMap && (
          <HUDWidget id="map-desktop" title="Map" icon="🗺️">
            <div>Full map...</div>
          </HUDWidget>
        )}
      </div>

      {children}
    </div>
  );
};

/**
 * Main ResponsiveHUD Component
 */
export const ResponsiveHUD: React.FC<ResponsiveHUDProps> = ({
  config: userConfig,
  onConfigChange,
  children,
  className = ''
}) => {
  const { deviceType, layout, screenSize } = useBreakpoint();

  const defaultConfig: HUDConfig = {
    showStats: true,
    showInventory: true,
    showQuests: true,
    showChat: true,
    showMap: true,
    compactMode: deviceType === 'mobile',
    position: 'top'
  };

  const config = useMemo(
    () => ({
      ...defaultConfig,
      ...userConfig,
      compactMode: deviceType === 'mobile'
    }),
    [userConfig, deviceType]
  );

  const renderLayout = () => {
    switch (deviceType) {
      case 'mobile':
        return <MobileHUDLayout config={config}>{children}</MobileHUDLayout>;
      case 'tablet':
        return <TabletHUDLayout config={config}>{children}</TabletHUDLayout>;
      case 'desktop':
      default:
        return <DesktopHUDLayout config={config}>{children}</DesktopHUDLayout>;
    }
  };

  return (
    <div
      className={`responsive-hud ${deviceType} ${layout} ${className}`}
      data-screen-width={screenSize.width}
      data-screen-height={screenSize.height}
    >
      {renderLayout()}
    </div>
  );
};

export default ResponsiveHUD;
