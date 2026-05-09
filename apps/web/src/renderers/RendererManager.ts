Hier ist die korrigierte Fassung der `RendererManager.ts`. Der Fokus liegt auf der korrekten Typisierung der `AREPayload` und der Sicherstellung, dass die Schnittstelle zwischen der deterministischen Engine (Kappa-Konform) und der visuellen Interpretation (Renderers) sauber definiert ist.

typescript
/**
 * @file apps/web/src/renderers/RendererManager.ts
 * @description Zentrales Management-Subsystem für die visuelle Interpretation des ARE-States.
 * @vision Arelorian - Deterministische 10Hz-Logic trifft auf adaptive Visualisierung.
 */

import { AREPayload } from "@wasd/types";
import { BabylonRenderer } from "./BabylonRenderer";
import { ThreeRenderer } from "./ThreeRenderer";
import { ProxyRenderer } from "./ProxyRenderer";
import { PlexityGate } from "../utils/PlexityGate";

/**
 * Definiert den Standard für alle visuellen Interpreter.
 * Renderers sind zustandslose Schalen, die Kappa-Werte (Fixed-Point)
 * in Gleitkommazahlen für die GPU umrechnen.
 */
export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  /**
   * Die render-Methode verarbeitet den AREPayload.
   * Der Payload enthält deterministische Daten (Tick-Nummer, Entity-States).
   */
  render(payload: AREPayload): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export type RendererType = "WEBGPU" | "WEBGL" | "DOM";

/**
 * RendererManager
 * 
 * Orchestriert den Lebenszyklus des visuellen Backends.
 * Wählt basierend auf PlexityGate (Komplexitätsanalyse) und Device-Fähigkeiten
 * zwischen WebGPU (Babylon), WebGL (Three) oder DOM (Proxy).
 */
export class RendererManager {
  private currentRenderer: IRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private type: RendererType = "WEBGL";

  constructor() {}

  /**
   * Initialisiert den optimalen Renderer.
   * Der Prozess ist asynchron, blockiert aber nicht den World-Tick.
   */
  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    
    // PlexityGate entscheidet basierend auf Hardware-Abstraktion
    this.type = await PlexityGate.determineOptimalRenderer();

    switch (this.type) {
      case "WEBGPU":
        this.currentRenderer = new BabylonRenderer();
        break;
      case "WEBGL":
        this.currentRenderer = new ThreeRenderer();
        break;
      case "DOM":
      default:
        this.currentRenderer = new ProxyRenderer();
        break;
    }

    if (this.currentRenderer) {
      try {
        await this.currentRenderer.initialize(this.canvas);
        console.log(`[RendererManager] Backend ${this.type} erfolgreich initialisiert.`);
      } catch (error) {
        console.error(`[RendererManager] Fehler bei Initialisierung von ${this.type}:`, error);
        // Fallback auf DOM-Renderer bei kritischem GPU-Fehler
        if (this.type !== "DOM") {
          await this.switchRenderer("DOM");
        }
      }
    }
  }

  /**
   * Routet den AREPayload an den aktiven Renderer.
   * Diese Methode wird im Takt des World-Update-Loops aufgerufen (interpolation möglich).
   * @param payload Der aktuelle State-Diff oder Full-State aus der WorldStateRegistry.
   */
  public update(payload: AREPayload): void {
    if (!this.currentRenderer || !payload) return;

    // Stateless Interpretation: Der Renderer speichert keine Business-Logik.
    // Er mappt lediglich payload.entities auf grafische Instanzen.
    this.currentRenderer.render(payload);
  }

  /**
   * Passt die Projektionsmatrizen des aktiven Renderers an.
   */
  public handleResize(width: number, height: number): void {
    if (this.currentRenderer) {
      this.currentRenderer.resize(width, height);
    }
  }

  /**
   * Ermöglicht den dynamischen Wechsel des Renderers zur Laufzeit
   * (z.B. bei Performance-Einbruch oder User-Wunsch).
   */
  public async switchRenderer(newType: RendererType): Promise<void> {
    if (this.type === newType || !this.canvas) return;

    console.warn(`[RendererManager] Switching Renderer: ${this.type} -> ${newType}`);
    
    this.dispose();
    this.type = newType;
    await this.initialize(this.canvas);
  }

  /**
   * Ressourcen-Cleanup zur Vermeidung von Memory-Leaks in der Web-App.
   */
  public dispose(): void {
    if (this.currentRenderer) {
      this.currentRenderer.dispose();
      this.currentRenderer = null;
    }
  }

  /**
   * Gibt den aktuell aktiven Backend-Typ zurück.
   */
  public getActiveRendererType(): RendererType {
    return this.type;
  }
}

/**
 * Singleton-Instanz für den globalen Zugriff im App-Scope.
 */
export const rendererManager = new RendererManager();


### Key Fixes & Design Decisions:
1.  **Expliziter Import:** `AREPayload` wird sauber aus `@wasd/types` bezogen. Dies setzt voraus, dass die `index.ts` des `@wasd/types` Pakets diesen Typ exportiert.
2.  **Stateless Render Loop:** Die `update`-Methode nimmt den `AREPayload` entgegen, was dem ARE-Prinzip entspricht, dass Visualisierung nur eine Projektion des deterministischen Zustands ist.
3.  **Error-Handling:** Falls `initialize` fehlschlägt (z.B. WebGPU nicht verfügbar trotz Detektion), erfolgt ein automatischer Fallback auf den `ProxyRenderer`.
4.  **Kappa-Konformität:** Der Code bereitet die Brücke vor, auf der Fixed-Point-Koordinaten aus dem Payload für die GPU in Floats transformiert werden (innerhalb der konkreten Renderer-Implementierungen).