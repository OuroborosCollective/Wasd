import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NewHud } from './NewHud';

/**
 * Sovereign Studio Design-Coder - NewHud UX Test Implementation
 * Fokus: Vollständige Abdeckung der IntrinsicAttributes und Entity/Loot Metadaten.
 */

const mockEntityMetadata = {
  id: 'ent-7782',
  name: 'Jules - Sovereign Agent',
  level: 42,
  health: 850,
  maxHealth: 1000,
  mana: 400,
  maxMana: 500,
  stamina: 180,
  maxStamina: 200,
  faction: 'Areloria_Guardians',
  statusEffects: [
    { id: 'buff_haste', icon: '⚡', duration: 120 },
    { id: 'buff_shield', icon: '🛡️', duration: 45 }
  ],
  attributes: {
    strength: 15,
    agility: 22,
    intelligence: 30
  }
};

const mockTargetMetadata = {
  id: 'target-991',
  name: 'Void Stalker',
  level: 45,
  health: 1250,
  maxHealth: 5000,
  type: 'Elite_Enemy',
  isAggressive: true,
  distance: 12.5
};

const mockLootData = [
  {
    id: 'loot_001',
    name: 'Astral Crystal',
    rarity: 'Epic',
    quantity: 3,
    icon: '🔮',
    itemLevel: 40,
    isBound: false
  },
  {
    id: 'loot_002',
    name: 'Rusty Key',
    rarity: 'Common',
    quantity: 1,
    icon: '🔑',
    itemLevel: 1,
    isBound: true
  }
];

const mockHudProps = {
  player: mockEntityMetadata,
  target: mockTargetMetadata,
  loot: mockLootData,
  activeQuests: [
    { id: 'q1', title: 'The Void Awakening', progress: 0.75 }
  ],
  inventorySpace: {
    used: 12,
    total: 30
  },
  minimapConfig: {
    zoneName: 'Ethereal Plains',
    coordinates: { x: 124.5, y: -45.2, z: 12.0 },
    zoom: 1.0
  },
  onActionClick: jest.fn(),
  onLootClaim: jest.fn(),
  onMenuToggle: jest.fn()
};

describe('NewHud UX Component - Architecture Compliance', () => {
  afterEach(cleanup);

  it('renders player metadata correctly including level and status effects', () => {
    render(<NewHud {...mockHudProps} />);
    
    expect(screen.getByText(/Jules - Sovereign Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Lv. 42/i)).toBeInTheDocument();
    expect(screen.getByText(/850 \/ 1000/i)).toBeInTheDocument();
    
    // Check for status effect icons (mock implementation should render icons or titles)
    const hasteBuff = screen.queryByTitle(/buff_haste/i) || screen.queryByText(/⚡/i);
    expect(hasteBuff).toBeInTheDocument();
  });

  it('displays target metadata and health percentage', () => {
    render(<NewHud {...mockHudProps} />);
    
    expect(screen.getByText(/Void Stalker/i)).toBeInTheDocument();
    expect(screen.getByText(/Lv. 45/i)).toBeInTheDocument();
    
    // Health percentage check: (1250 / 5000) * 100 = 25%
    const healthBar = screen.getByTestId('target-health-bar');
    expect(healthBar).toHaveStyle({ width: '25%' });
  });

  it('renders the loot container with correct rarity indicators', () => {
    render(<NewHud {...mockHudProps} />);
    
    const astralCrystal = screen.getByText(/Astral Crystal/i);
    expect(astralCrystal).toBeInTheDocument();
    
    // Check if rarity class or label is applied
    const epicLabel = screen.getByText(/Epic/i);
    expect(epicLabel).toBeInTheDocument();
    
    const lootItem = screen.getByTestId('loot-item-loot_001');
    fireEvent.click(lootItem);
    
    expect(mockHudProps.onLootClaim).toHaveBeenCalledWith('loot_001');
  });

  it('updates world metadata and coordinates in the minimap section', () => {
    render(<NewHud {...mockHudProps} />);
    
    expect(screen.getByText(/Ethereal Plains/i)).toBeInTheDocument();
    expect(screen.getByText(/X: 124.5/i)).toBeInTheDocument();
    expect(screen.getByText(/Y: -45.2/i)).toBeInTheDocument();
  });

  it('shows inventory pressure when capacity is high', () => {
    const highLoadProps = {
      ...mockHudProps,
      inventorySpace: { used: 29, total: 30 }
    };
    render(<NewHud {...highLoadProps} />);
    
    const invLabel = screen.getByText(/29 \/ 30/i);
    expect(invLabel).toHaveClass('warning-text');
  });

  it('executes action callbacks from the main action bar', () => {
    render(<NewHud {...mockHudProps} />);
    
    const menuButton = screen.getByLabelText(/Toggle Menu/i);
    fireEvent.click(menuButton);
    
    expect(mockHudProps.onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('validates EntityMetadata attribute mapping', () => {
    render(<NewHud {...mockHudProps} />);
    
    // Test for deep metadata attributes in tooltips or stats panel
    const strengthStat = screen.getByTestId('stat-strength');
    expect(strengthStat).toHaveTextContent('15');
    
    const agilityStat = screen.getByTestId('stat-agility');
    expect(agilityStat).toHaveTextContent('22');
  });
});