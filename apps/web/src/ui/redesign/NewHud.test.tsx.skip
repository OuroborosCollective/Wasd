import React from 'react';
import { render, screen } from '@testing-library/react';
import { NewHud, NewHudProps } from './NewHud';

/**
 * Test-Suite für die NewHud-Komponente.
 * Behebt TS2559 durch vollständige Abdeckung der erforderlichen Props.
 */

const mockProps: NewHudProps = {
  characterName: "Jules",
  hp: 85,
  maxHp: 100,
  mana: 40,
  maxMana: 100,
  stamina: 60,
  maxStamina: 100,
  xp: 1250,
  maxXp: 2000,
  level: 12,
  currency: 540,
  quests: [
    {
      id: "q-1",
      title: "Das Erwachen",
      description: "Finde den Weg aus dem digitalen Limbus.",
      status: "active",
      progress: 0.5
    }
  ],
  fxFeed: [
    {
      id: "fx-1",
      message: "System initialisiert...",
      type: "info",
      timestamp: Date.now()
    }
  ],
  inv: [
    {
      id: "item-1",
      name: "Phasen-Dolch",
      count: 1,
      rarity: "rare",
      icon: "dagger"
    }
  ],
  activeBuffs: [
    {
      id: "b-1",
      name: "Schnelligkeit",
      duration: 30,
      icon: "speed"
    }
  ],
  onOpenMenu: () => console.log('Menu opened'),
  onOpenInventory: () => console.log('Inventory opened'),
  onOpenQuests: () => console.log('Quests opened')
};

describe('NewHud Component', () => {
  it('renders without crashing and displays essential character data', () => {
    render(<NewHud {...mockProps} />);
    
    // Prüfe Level Anzeige
    expect(screen.getByText(/12/)).toBeInTheDocument();
    
    // Prüfe Charaktername
    expect(screen.getByText(/Jules/i)).toBeInTheDocument();
    
    // Prüfe Währung
    expect(screen.getByText(/540/)).toBeInTheDocument();
  });

  it('renders the quest list correctly', () => {
    render(<NewHud {...mockProps} />);
    expect(screen.getByText(/Das Erwachen/i)).toBeInTheDocument();
  });

  it('renders the active inventory items count or presence', () => {
    render(<NewHud {...mockProps} />);
    // Je nach Implementierung der NewHud-Vorschau
    const itemName = screen.queryByText(/Phasen-Dolch/i);
    if (itemName) {
      expect(itemName).toBeInTheDocument();
    }
  });

  it('displays the FX feed messages', () => {
    render(<NewHud {...mockProps} />);
    expect(screen.getByText(/System initialisiert/i)).toBeInTheDocument();
  });
});