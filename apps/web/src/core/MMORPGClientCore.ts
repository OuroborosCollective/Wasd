import * as THREE from 'three';
import { EventEmitter } from 'events';

/**
 * Areloria WASD - Core Client Logic
 * Handles synchronization between physics, scene, and interaction states.
 * 
 * Optimized to adhere to ARE-Logic and strict TypeScript constraints.
 */

export interface ClosestInteractable {
  id: string;
  distance: number;
  position: THREE.Vector3;
  type: string;
}

export interface ClientConfig {
  baseUrl: string;
  renderDistance: number;
  physicsTickRate: number;
}

export class MMORPGClientCore extends EventEmitter {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private interactables: Map<string, ClosestInteractable> = new Map();
  private localPlayerId: string | null = null;

  constructor(config: ClientConfig) {
    super();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, config.renderDistance);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();
    
    this.init();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public setLocalPlayer(id: string): void {
    this.localPlayerId = id;
  }

  /**
   * Haupt-Update-Loop für die Client-Logik.
   * Delta wird berechnet, um Konsistenz für Frame-abhängige Animationen zu wahren.
   */
  public update(): void {
    // Delta wird für Renderer/Clock benötigt, aber nicht für die reine Interaktions-Logik-Filterung
    this.clock.getDelta();
    
    if (this.localPlayerId) {
      this.processInteractions();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Verarbeitet Interaktionen in der Nähe des Spielers.
   * Entfernt 'delta', da die Selektion auf dem aktuellen State basiert (Kappa-konform).
   */
  private processInteractions(): void {
    if (!this.localPlayerId) return;

    const closest = this.getClosestInteractable();

    if (closest) {
      if (closest.type === 'npc') {
        this.emit('interaction:ready', closest);
      } else if (closest.type === 'item') {
        this.emit('interaction:loot', closest);
      }
      
      this.highlightInteractable(closest.id, true);
    }
  }

  /**
   * Ermittelt das nächste interaktionsfähige Objekt.
   * FIX TS6133: Parameter 'playerId' und 'delta' entfernt, da die Selektion 
   * über die interne Map 'interactables' erfolgt.
   */
  private getClosestInteractable(): ClosestInteractable | null {
    let nearest: ClosestInteractable | null = null;
    let minDistance = Infinity;

    // Simulation der Logik zur Findung des nächsten Objekts basierend auf Distanz-Werten (Kappa-Fixed-Point)
    this.interactables.forEach((item) => {
      if (item.distance < minDistance) {
        minDistance = item.distance;
        nearest = item;
      }
    });

    return nearest;
  }

  private highlightInteractable(id: string, active: boolean): void {
    const object = this.scene.getObjectByName(id);
    if (object && object instanceof THREE.Mesh) {
      // Zugriff auf emissive Farbe zur visuellen Indikation
      const material = object.material as THREE.MeshStandardMaterial;
      if (material.emissive) {
        material.emissive.setHex(active ? 0x00ff00 : 0x000000);
      }
    }
  }

  public registerInteractable(data: ClosestInteractable): void {
    this.interactables.set(data.id, data);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.scene.clear();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}