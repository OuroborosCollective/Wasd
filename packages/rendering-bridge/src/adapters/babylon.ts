import * as BABYLON from "@babylonjs/core";

export interface ECSComponent {
  type: string;
  data: any;
}

export interface ECSEntity {
  id: string;
  components: ECSComponent[];
}

export class BabylonAdapter {
  private scene: BABYLON.Scene;
  private nodeMap: Map<string, BABYLON.Node> = new Map();
  private materialMap: Map<string, BABYLON.StandardMaterial> = new Map();
  private mythicLinks: Map<string, BABYLON.Mesh> = new Map();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Synchronisiert den gesamten ECS-Zustand mit der Babylon.js Scene.
   * @param entities Liste der Entities aus dem ECS
   */
  public sync(entities: ECSEntity[]): void {
    const activeIds = new Set<string>();

    for (const entity of entities) {
      activeIds.add(entity.id);
      this.syncEntity(entity);
    }

    // Entferne Nodes für Entities, die nicht mehr existieren
    for (const [id, node] of this.nodeMap.entries()) {
      if (!activeIds.has(id)) {
        this.cleanupMythicAura(id);
        node.dispose();
        this.nodeMap.delete(id);
      }
    }

    // Cleanup stale links
    this.cleanupStaleMythicLinks(activeIds);
  }

  private cleanupMythicAura(id: string): void {
    const auraId = `aura_${id}`;
    const aura = this.scene.getMeshByName(auraId);
    if (aura) {
      if (aura.material) aura.material.dispose();
      aura.dispose();
    }
  }

  private cleanupStaleMythicLinks(activeIds: Set<string>): void {
    for (const [linkId, mesh] of this.mythicLinks.entries()) {
      const [idA, idB] = linkId.split('_link_');
      if (!activeIds.has(idA) || !activeIds.has(idB)) {
        mesh.dispose();
        this.mythicLinks.delete(linkId);
      }
    }
  }

  private syncEntity(entity: ECSEntity): void {
    const transformComp = entity.components.find((c) => c.type === "Transform");
    const meshComp = entity.components.find((c) => c.type === "Mesh");
    const lightComp = entity.components.find((c) => c.type === "Light");
    const materialComp = entity.components.find((c) => c.type === "Material");
    const mythicComp = entity.components.find((c) => c.type === "MythicAnchor");

    let node = this.nodeMap.get(entity.id);

    // Initialisierung der Node falls nicht vorhanden
    if (!node) {
      if (meshComp) {
        node = this.createMesh(entity.id, meshComp.data);
      } else if (lightComp) {
        node = this.createLight(entity.id, lightComp.data);
      } else if (transformComp) {
        node = new BABYLON.TransformNode(entity.id, this.scene);
      }

      if (node) {
        this.nodeMap.set(entity.id, node);
      }
    }

    // Update Transform
    if (node && transformComp && node instanceof BABYLON.TransformNode) {
      this.applyTransform(node, transformComp.data);
    }

    // Update Material für Meshes
    if (node && node instanceof BABYLON.AbstractMesh && materialComp) {
      this.applyMaterial(node, materialComp.data);
    }

    // Apply Mythic Effects
    if (node && mythicComp && node instanceof BABYLON.TransformNode) {
      this.applyMythicEffects(node, mythicComp.data);
    }
  }

  private applyMythicEffects(node: BABYLON.TransformNode, data: any): void {
    const auraId = `aura_${node.id}`;
    let aura = this.scene.getMeshByName(auraId);
    let auraMat: BABYLON.StandardMaterial;

    if (!aura) {
      aura = BABYLON.MeshBuilder.CreateTorus(auraId, {
        diameter: 2,
        thickness: 0.1,
        tessellation: 32
      }, this.scene);
      aura.parent = node;

      auraMat = new BABYLON.StandardMaterial(`mat_${auraId}`, this.scene);
      aura.material = auraMat;
    } else {
      auraMat = aura.material as BABYLON.StandardMaterial;
    }

    // Dynamic color based on resonance state
    if (data.isResonating) {
      auraMat.emissiveColor = new BABYLON.Color3(0.1, 0.9, 1.0); // Cyan Resonance
      auraMat.alpha = 0.9;
    } else {
      auraMat.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.8); // Mythic Purple
      auraMat.alpha = 0.5;
    }

    // Dynamic scaling based on mythological weight
    const weight = data.mythologicalWeight || 1;
    const scale = 1 + (weight / 100);
    aura.scaling.set(scale, 1, scale);

    // Rotate aura for visual flair
    aura.rotation.y += 0.02;

    // Handle Link Visualization
    if (data.isResonating && data.resonatingWith) {
      this.drawMythicLink(node, data.resonatingWith);
    }
  }

  private drawMythicLink(sourceNode: BABYLON.TransformNode, targetId: string): void {
    const targetNode = this.nodeMap.get(targetId);
    if (!targetNode || !(targetNode instanceof BABYLON.TransformNode)) return;

    const linkId = `${sourceNode.id}_link_${targetId}`;
    const reverseLinkId = `${targetId}_link_${sourceNode.id}`;

    if (this.mythicLinks.has(reverseLinkId)) return; // Already drawn from other side

    let linkMesh = this.mythicLinks.get(linkId);
    if (!linkMesh) {
      // Create a simple procedural cylinder "beam"
      linkMesh = BABYLON.MeshBuilder.CreateCylinder(linkId, { height: 1, diameter: 0.1 }, this.scene);
      const linkMat = new BABYLON.StandardMaterial(`mat_${linkId}`, this.scene);
      linkMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
      linkMat.alpha = 0.7;
      linkMesh.material = linkMat;
      this.mythicLinks.set(linkId, linkMesh);
    }

    // Update cylinder transform to bridge the two nodes
    const start = sourceNode.position;
    const end = targetNode.position;
    const dist = BABYLON.Vector3.Distance(start, end);

    linkMesh.scaling.y = dist;
    linkMesh.position = BABYLON.Vector3.Center(start, end);
    linkMesh.lookAt(end);
    linkMesh.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL);
  }

  private createMesh(id: string, data: any): BABYLON.AbstractMesh {
    let mesh: BABYLON.Mesh;

    switch (data.primitive) {
      case "sphere":
        mesh = BABYLON.MeshBuilder.CreateSphere(id, { diameter: data.diameter || 1, segments: 32 }, this.scene);
        break;
      case "box":
        mesh = BABYLON.MeshBuilder.CreateBox(id, { size: data.size || 1 }, this.scene);
        break;
      case "plane":
        mesh = BABYLON.MeshBuilder.CreatePlane(id, { size: data.size || 1 }, this.scene);
        break;
      case "cylinder":
        mesh = BABYLON.MeshBuilder.CreateCylinder(id, { diameter: data.diameter || 1, height: data.height || 2 }, this.scene);
        break;
      default:
        mesh = BABYLON.MeshBuilder.CreateBox(id, { size: 1 }, this.scene);
    }

    return mesh;
  }

  private createLight(id: string, data: any): BABYLON.Light {
    switch (data.lightType) {
      case "point":
        return new BABYLON.PointLight(id, BABYLON.Vector3.Zero(), this.scene);
      case "directional":
        return new BABYLON.DirectionalLight(id, new BABYLON.Vector3(0, -1, 0), this.scene);
      case "spot":
        return new BABYLON.SpotLight(id, BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, this.scene);
      default:
        return new BABYLON.HemisphericLight(id, new BABYLON.Vector3(0, 1, 0), this.scene);
    }
  }

  private applyTransform(node: BABYLON.TransformNode, data: any): void {
    if (data.position) {
      node.position.set(data.position.x || 0, data.position.y || 0, data.position.z || 0);
    }
    if (data.rotation) {
      node.rotation.set(data.rotation.x || 0, data.rotation.y || 0, data.rotation.z || 0);
    }
    if (data.scale) {
      node.scaling.set(data.scale.x || 1, data.scale.y || 1, data.scale.z || 1);
    }
  }

  private applyMaterial(mesh: BABYLON.AbstractMesh, data: any): void {
    const matKey = JSON.stringify(data);
    let material = this.materialMap.get(matKey);

    if (!material) {
      material = new BABYLON.StandardMaterial(`mat_${mesh.id}_${Date.now()}`, this.scene);
      if (data.color) {
        material.diffuseColor = new BABYLON.Color3(data.color.r, data.color.g, data.color.b);
      }
      if (data.emissive) {
        material.emissiveColor = new BABYLON.Color3(data.emissive.r, data.emissive.g, data.emissive.b);
      }
      if (data.alpha !== undefined) {
        material.alpha = data.alpha;
      }
      this.materialMap.set(matKey, material);
    }

    mesh.material = material;
  }

  /**
   * Bereinigt alle Ressourcen des Adapters.
   */
  public dispose(): void {
    for (const node of this.nodeMap.values()) {
      node.dispose();
    }
    for (const mat of this.materialMap.values()) {
      mat.dispose();
    }
    for (const link of this.mythicLinks.values()) {
      link.dispose();
    }
    this.nodeMap.clear();
    this.materialMap.clear();
    this.mythicLinks.clear();
  }
}