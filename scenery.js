function createSceneryObjects(scene, trackCurve, roadWidth) {
  const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 8);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

  const treeLeavesGeo = new THREE.ConeGeometry(2.5, 6, 8);
  const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.8, flatShading: true });

  const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.9, flatShading: true });

  const bushGeo = new THREE.SphereGeometry(1.5, 8, 8);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8, flatShading: true });

  const totalObjects = 250;

  for (let i = 0; i < totalObjects; i++) {
    const u = Math.random();
    const pt = trackCurve.getPointAt(u);
    const tangent = trackCurve.getTangentAt(u).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    const sideDistance = (roadWidth + 4) + Math.random() * 80;
    const sideDirection = Math.random() < 0.5 ? 1 : -1;

    const spawnPos = pt.clone().add(side.multiplyScalar(sideDistance * sideDirection));
    
    // Safely check global scope for getTerrainHeight
    let terrainY = 0;
    if (typeof window.getTerrainHeight === 'function') {
      terrainY = window.getTerrainHeight(spawnPos.x, spawnPos.z);
    }

    const itemType = Math.random();

    if (itemType < 0.6) {
      const treeGroup = new THREE.Group();

      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;

      const leaves = new THREE.Mesh(treeLeavesGeo, treeLeavesMat);
      leaves.position.y = 5.0;
      leaves.castShadow = true;

      treeGroup.add(trunk, leaves);

      const scale = 0.8 + Math.random() * 0.6;
      treeGroup.scale.set(scale, scale, scale);
      treeGroup.position.set(spawnPos.x, terrainY, spawnPos.z);

      scene.add(treeGroup);
    } else if (itemType < 0.85) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      
      const scale = 0.6 + Math.random() * 1.0;
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.position.set(spawnPos.x, terrainY + (0.6 * scale), spawnPos.z);
      rock.castShadow = true;

      scene.add(rock);
    } else {
      const bush = new THREE.Mesh(bushGeo, bushMat);
      
      const scale = 0.7 + Math.random() * 0.5;
      bush.scale.set(scale, scale * 0.7, scale);
      bush.position.set(spawnPos.x, terrainY + (0.8 * scale), spawnPos.z);
      bush.castShadow = true;

      scene.add(bush);
    }
  }
}
window.createSceneryObjects = createSceneryObjects;