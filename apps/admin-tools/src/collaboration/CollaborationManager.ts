import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface CollaborationState {
    id: string;
    type: string;
    properties: Record<string, any>;
    lastModifiedBy: string;
    timestamp: number;
}

export type CollaborationCallback = (event: {
    type: 'insert' | 'update' | 'delete';
    id: string;
    state?: CollaborationState;
}) => void;

export class CollaborationManager {
    private doc: Y.Doc;
    private provider: WebsocketProvider;
    private sharedObjects: Y.Map<CollaborationState>;
    private callback: CollaborationCallback | null = null;
    private userId: string;

    constructor(serverUrl: string, roomName: string, userId: string) {
        this.doc = new Y.Doc();
        this.userId = userId;
        
        // Initialisierung des Websocket Providers für Echtzeit-Synchronisation
        this.provider = new WebsocketProvider(serverUrl, roomName, this.doc);
        
        // Shared Map für alle Szene-Objekte/Editor-States
        this.sharedObjects = this.doc.getMap('editor-objects');

        this.initEventListeners();
    }

    private initEventListeners(): void {
        this.sharedObjects.observe((event) => {
            if (!this.callback) return;

            event.changes.keys.forEach((change, key) => {
                switch (change.action) {
                    case 'add':
                        this.callback!({
                            type: 'insert',
                            id: key,
                            state: this.sharedObjects.get(key)
                        });
                        break;
                    case 'update':
                        this.callback!({
                            type: 'update',
                            id: key,
                            state: this.sharedObjects.get(key)
                        });
                        break;
                    case 'delete':
                        this.callback!({
                            type: 'delete',
                            id: key
                        });
                        break;
                }
            });
        });

        this.provider.on('status', (event: { status: string }) => {
            console.log(`Collaboration Connection Status: ${event.status}`);
        });

        // Awareness für Cursor-Positionen oder aktive Selektionen
        this.provider.awareness.on('change', () => {
            const states = Array.from(this.provider.awareness.getStates().values());
            // Hier könnten UI Updates für andere User getriggert werden
        });
    }

    public setCallback(callback: CollaborationCallback): void {
        this.callback = callback;
    }

    /**
     * Aktualisiert ein Objekt im CRDT Store
     */
    public updateObject(id: string, type: string, properties: Record<string, any>): void {
        const state: CollaborationState = {
            id,
            type,
            properties,
            lastModifiedBy: this.userId,
            timestamp: Date.now()
        };

        this.doc.transact(() => {
            this.sharedObjects.set(id, state);
        });
    }

    /**
     * Entfernt ein Objekt aus dem CRDT Store
     */
    public deleteObject(id: string): void {
        this.sharedObjects.delete(id);
    }

    /**
     * Setzt den lokalen User Status (z.B. Cursor-Position in der Szene)
     */
    public setLocalAwareness(data: any): void {
        this.provider.awareness.setLocalStateField('user', {
            id: this.userId,
            ...data
        });
    }

    /**
     * Gibt den aktuellen State eines Objekts zurück
     */
    public getObjectState(id: string): CollaborationState | undefined {
        return this.sharedObjects.get(id);
    }

    /**
     * Gibt alle synchronisierten Objekte zurück
     */
    public getAllObjects(): CollaborationState[] {
        return Array.from(this.sharedObjects.values());
    }

    /**
     * Trennt die Verbindung und räumt Ressourcen auf
     */
    public dispose(): void {
        this.provider.disconnect();
        this.doc.destroy();
    }

    public get isConnected(): boolean {
        return this.provider.synced;
    }
}