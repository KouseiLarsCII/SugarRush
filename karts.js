// karts.js - Fixed Wheel Hierarchy & Steering Pivots

window.KART_CONFIGS = {
  player: {
    name: 'YOU (Player)',
    color: 0x00f0ff,
    bodyMetalness: 0.6,
    bodyRoughness: 0.2,
    cabinColor: 0x0f172a
  },
  candidates: [
    { id: 1, name: 'Viper AI', color: 0xff007f, bodyMetalness: 0.6, bodyRoughness: 0.2 },
    { id: 2, name: 'Apex AI', color: 0xffb703, bodyMetalness: 0.6, bodyRoughness: 0.2 },
    { id: 3, name: 'Blaze AI', color: 0x7209b7, bodyMetalness: 0.6, bodyRoughness: 0.2 }
  ]
};

window.createKartMesh = function(configOrColor) {
  const group = new THREE.Group();

  const config = typeof configOrColor === 'object' ? configOrColor : {
    color: configOrColor,
    bodyMetalness: 0.6,
    bodyRoughness: 0.2,
    cabinColor: 0x0f172a
  };

  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: config.color, 
    roughness: config.bodyRoughness !== undefined ? config.bodyRoughness : 0.2, 
    metalness: config.bodyMetalness !== undefined ? config.bodyMetalness : 0.6 
  });

  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.1, metalness: 0.9 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.3, metalness: 0.5 });

  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 3.0), bodyMat);
  mainBody.position.set(0, 0.5, 0);
  mainBody.castShadow = true;
  group.add(mainBody);

  const noseCone = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), bodyMat);
  noseCone.position.set(0, 0.45, 1.8);
  noseCone.castShadow = true;
  group.add(noseCone);

  const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 1.8), bodyMat);
  leftPod.position.set(-1.1, 0.45, 0);
  leftPod.castShadow = true;
  group.add(leftPod);

  const rightPod = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 1.8), bodyMat);
  rightPod.position.set(1.1, 0.45, 0);
  rightPod.castShadow = true;
  group.add(rightPod);

  const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.0), darkMat);
  engineBlock.position.set(0, 0.7, -1.1);
  engineBlock.castShadow = true;
  group.add(engineBlock);

  const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  
  const leftExhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  leftExhaust.position.set(-0.35, 0.55, -1.7);
  group.add(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeo, chromeMat);
  rightExhaust.position.set(0.35, 0.55, -1.7);
  group.add(rightExhaust);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), darkMat);
  seat.position.set(0, 0.75, -0.2);
  seat.castShadow = true;
  group.add(seat);

  const steeringWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), accentMat);
  steeringWheel.rotation.x = Math.PI / 3;
  steeringWheel.position.set(0, 1.0, 0.45);
  group.add(steeringWheel);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 20);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });

  function createWheelMesh() {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.37, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rim);

    return wheelGroup;
  }

  // Hierarchical pivots: Outer pivot handles steering rotation (Y-axis), inner mesh handles rolling (Z-axis)
  const frontLeftWheel = createWheelMesh();
  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(-1.25, 0.38, 1.1);
  frontLeftPivot.add(frontLeftWheel);
  group.add(frontLeftPivot);

  const frontRightWheel = createWheelMesh();
  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(1.25, 0.38, 1.1);
  frontRightPivot.add(frontRightWheel);
  group.add(frontRightPivot);

  const rearLeftWheel = createWheelMesh();
  const rearLeftPivot = new THREE.Group();
  rearLeftPivot.position.set(-1.25, 0.38, -1.1);
  rearLeftPivot.add(rearLeftWheel);
  group.add(rearLeftPivot);

  const rearRightWheel = createWheelMesh();
  const rearRightPivot = new THREE.Group();
  rearRightPivot.position.set(1.25, 0.38, -1.1);
  rearRightPivot.add(rearRightWheel);
  group.add(rearRightPivot);

  group.userData = {
    frontLeftPivot,
    frontRightPivot,
    frontLeftWheel,
    frontRightWheel,
    rearLeftPivot,
    rearRightPivot,
    rearLeftWheel,
    rearRightWheel
  };

  return group;
};

window.getKartParkingSlot = function(placeIndex) {
  const parkingSlots = [
    { depth: 6.0,  offset: -2.0 }, 
    { depth: 6.0,  offset: 2.0  }, 
    { depth: 14.0, offset: -2.0 }, 
    { depth: 14.0, offset: 2.0  }  
  ];
  return parkingSlots[placeIndex] || { depth: 6.0 + (placeIndex * 8.0), offset: 0 };
};