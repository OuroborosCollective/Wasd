import * as THREE from 'three';

export class ProxyGenerator {
    generate(type, params = {}) {
        const group = new THREE.Group();

        switch (type) {
            case 'tree': {
                const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
                const trunkMat = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513, 
                    emissive: 0x221100 
                });
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                trunk.position.y = 0.5;
                trunk.castShadow = true;
                group.add(trunk);

                const foliageGeo = new THREE.ConeGeometry(0.8, 2, 8);
                const foliageMat = new THREE.MeshStandardMaterial({ 
                    color: 0x228B22, 
                    emissive: 0x001100 
                });
                const foliage = new THREE.Mesh(foliageGeo, foliageMat);
                foliage.position.y = 2;
                foliage.castShadow = true;
                group.add(foliage);
                break;
            }

            case 'building': {
                const width = params.width || 2;
                const height = params.height || 3;
                const depth = params.depth || 2;

                const bodyGeo = new THREE.BoxGeometry(width, height, depth);
                const bodyMat = new THREE.MeshStandardMaterial({ 
                    color: 0x808080, 
                    emissive: 0x111111 
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = height / 2;
                body.castShadow = true;
                body.receiveShadow = true;
                group.add(body);

                const doorGeo = new THREE.BoxGeometry(width * 0.25, height * 0.4, 0.1);
                const doorMat = new THREE.MeshStandardMaterial({ 
                    color: 0x444444, 
                    emissive: 0x000000 
                });
                const door = new THREE.Mesh(doorGeo, doorMat);
                door.position.set(0, (height * 0.4) / 2, depth / 2 + 0.01);
                group.add(door);
                break;
            }

            case 'character': {
                const bodyGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 8);
                const bodyMat = new THREE.MeshStandardMaterial({ 
                    color: 0x3498db, 
                    emissive: 0x112233 
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = 0.9;
                body.castShadow = true;
                group.add(body);

                const indicatorGeo = new THREE.BoxGeometry(0.2, 0.2, 0.4);
                const indicatorMat = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff, 
                    emissive: 0x333333 
                });
                const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
                indicator.position.set(0, 1.4, 0.3);
                group.add(indicator);
                break;
            }

            case 'item': {
                const itemGeo = new THREE.IcosahedronGeometry(0.4, 0);
                const itemMat = new THREE.MeshStandardMaterial({ 
                    color: 0xf1c40f, 
                    emissive: 0x443300 
                });
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.y = 0.5;
                
                // Rotation logic helper for the engine
                item.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
                    item.rotation.y += 0.02;
                    item.rotation.x += 0.01;
                };
                
                group.add(item);
                break;
            }

            default:
                console.warn(`ProxyGenerator: Unknown type "${type}"`);
                break;
        }

        return group;
    }
}