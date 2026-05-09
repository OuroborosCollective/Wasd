import * as THREE from 'three';
import { EventEmitter } from 'events';

/**
 * Areloria WASD - Core Client Logic
 * Handles synchronization between physics, scene, and interaction states.
 */

export interface ClosestInteractable {
  id: string;
  distance: number;
  position: THREE.Vector3;
  type: string; // FIX TS2339: Eigenschaft 'type' hinzugefügt
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
   */
  public update(): void {
    const _delta = this.clock.getDelta();
    
    if (this.localPlayerId) {
      this.processInteractions(_delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Verarbeitet Interaktionen in der Nähe des Spielers.
   */
  private processInteractions(_delta: number): void {
    if (!this.localPlayerId) return;

    // FIX TS2554: Aufruf auf zwei Argumente erweitert (playerId und _delta)
    const closest = this.getClosestInteractable(this.localPlayerId, _delta);

    if (closest) {
      // FIX TS2339: Zugriff auf .type ist nun durch das Interface-Update valide
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
   * @param playerId Die ID des lokalen Spielers
   * @param _delta Zeit seit dem letzten Frame für Interpolation
   */
  private getClosestInteractable(_playerId: string, _delta: number): ClosestInteractable | null {
    let nearest: ClosestInteractable | null = null;
    let minDistance = Infinity;

    // Simulation der Logik zur Findung des nächsten Objekts
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
      object.material.emissive = active ? new THREE.Color(0x00ff00) : new THREE.Color(0x000000);
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