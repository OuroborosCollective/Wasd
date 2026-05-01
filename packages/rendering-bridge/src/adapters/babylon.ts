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
        node.dispose();
        this.nodeMap.delete(id);
      }
    }
  }

  private syncEntity(entity: ECSEntity): void {
    const transformComp = entity.components.find((c) => c.type === "Transform");
    const meshComp = entity.components.find((c) => c.type === "Mesh");
    const lightComp = entity.components.find((c) => c.type === "Light");
    const materialComp = entity.components.find((c) => c.type === "Material");

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
    this.nodeMap.clear();
    this.materialMap.clear();
  }
}