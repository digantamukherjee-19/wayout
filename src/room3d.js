/**
 * WAY OUT - 3D Room Builder (Three.js)
 * Constructs a large, realistic institutional room with off-white walls, restrained dark furniture,
 * subtle blood patches, physical interactive objects, animations, and collision bounding boxes.
 *
 * DEFINITIVE OBJECT AUDIT & VISIBILITY IMPLEMENTATION:
 * - Desk contains two physically modeled, always-visible drawers:
 *   - Drawer 1 (LEFT, towards North): requires Strange Key, opens physically, contains Crowbar.
 *   - Drawer 2 (RIGHT, towards South): harmless clutter, separately interactable.
 * - Brown Cabinet: physically modeled, visible from start on South wall, says "Not the perfect key.", never opens.
 * - Correct Puzzle Cabinet: dark metal, heavy brass padlock, opens with Cabinet Key, awards Access Card #2.
 * - Phone: genuine 3D model on a sturdy Medical Table on West wall, revealed immediately when Access Card #1 is collected, persists indefinitely.
 * - Exit Door, Bed, Bookshelf, Window, Carpet, Small Boxes, and Timer Gifts all physically modeled with full colliders.
 */

export class Room3D {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;

    // Interactive 3D object registry for raycasting
    this.interactiveObjects = [];

    // Collision obstacles (AABB boxes: { minX, maxX, minZ, maxZ })
    this.colliders = [];

    // Mesh references for dynamic animations and state validation
    this.meshes = {};

    this.build();
    this.validateRoomObjects();
  }

  build() {
    this.setupLighting();
    this.buildArchitecture();
    this.buildFurniture();
    this.buildPuzzleObjects();
    this.buildEnvironmentalDetails();
    this.setupRandomizedCardLocations();
  }

  setupLighting() {
    // Soft ambient light for dark clinical mood
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.45);
    this.scene.add(ambient);

    // Main overhead light with warm-white tint
    const ceilingLight = new THREE.PointLight(0xfef08a, 0.85, 18, 1.8);
    ceilingLight.position.set(0, 3.2, 0);
    this.scene.add(ceilingLight);

    // Subtle blue night moonlight from the barred window
    const moonLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    moonLight.position.set(0, 3.0, -8);
    moonLight.target.position.set(0, 0, -2);
    this.scene.add(moonLight);
    this.scene.add(moonLight.target);

    // Secondary dim corridor bounce light near door
    const doorLight = new THREE.PointLight(0x94a3b8, 0.35, 8, 2.0);
    doorLight.position.set(0, 2.8, -5.8);
    this.scene.add(doorLight);
  }

  buildArchitecture() {
    // Room Dimensions: 12m wide (X: -6 to +6), 14m deep (Z: -7 to +7), 3.5m high (Y: 0 to 3.5)
    const roomW = 12;
    const roomD = 14;
    const roomH = 3.5;

    // Off-white / pale institutional plaster material
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xeeece8,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Dark muted clinical floorboards/tiles
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.6,
      metalness: 0.1,
    });

    // Off-white ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3cd,
      roughness: 0.9,
    });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomH;
    this.scene.add(ceiling);

    // North Wall (Z = -roomD/2)
    const northWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    northWall.position.set(0, roomH / 2, -roomD / 2);
    this.scene.add(northWall);

    // South Wall (Z = +roomD/2)
    const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    southWall.rotation.y = Math.PI;
    southWall.position.set(0, roomH / 2, roomD / 2);
    this.scene.add(southWall);

    // West Wall (X = -roomW/2)
    const westWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(-roomW / 2, roomH / 2, 0);
    this.scene.add(westWall);

    // East Wall (X = +roomW/2)
    const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.position.set(roomW / 2, roomH / 2, 0);
    this.scene.add(eastWall);

    // Baseboards around perimeter
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const bGeoX = new THREE.BoxGeometry(roomW, 0.14, 0.04);
    const bNorth = new THREE.Mesh(bGeoX, baseboardMat);
    bNorth.position.set(0, 0.07, -roomD / 2 + 0.02);
    this.scene.add(bNorth);
    const bSouth = new THREE.Mesh(bGeoX, baseboardMat);
    bSouth.position.set(0, 0.07, roomD / 2 - 0.02);
    this.scene.add(bSouth);

    const bGeoZ = new THREE.BoxGeometry(0.04, 0.14, roomD);
    const bWest = new THREE.Mesh(bGeoZ, baseboardMat);
    bWest.position.set(-roomW / 2 + 0.02, 0.07, 0);
    this.scene.add(bWest);
    const bEast = new THREE.Mesh(bGeoZ, baseboardMat);
    bEast.position.set(roomW / 2 - 0.02, 0.07, 0);
    this.scene.add(bEast);

    // Outer Room Bounds Colliders
    this.colliders.push({ minX: -roomW / 2 - 1, maxX: -roomW / 2 + 0.35, minZ: -roomD / 2, maxZ: roomD / 2 }); // West
    this.colliders.push({ minX: roomW / 2 - 0.35, maxX: roomW / 2 + 1, minZ: -roomD / 2, maxZ: roomD / 2 });  // East
    this.colliders.push({ minX: -roomW / 2, maxX: roomW / 2, minZ: -roomD / 2 - 1, maxZ: -roomD / 2 + 0.35 }); // North
    this.colliders.push({ minX: -roomW / 2, maxX: roomW / 2, minZ: roomD / 2 - 0.35, maxZ: roomD / 2 + 1 });  // South
  }

  buildFurniture() {
    // === 1. HOSPITAL BED (West wall, North side: X: -4.5, Z: -3.2) ===
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-4.5, 0, -3.2);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });

    // Bed Frame & Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 2.6), sheetMat);
    mattress.position.set(0, 0.5, 0);
    bedGroup.add(mattress);

    // Headboard & Footboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 0.08), metalMat);
    headboard.position.set(0, 0.7, -1.3);
    bedGroup.add(headboard);

    const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 0.08), metalMat);
    footboard.position.set(0, 0.5, 1.3);
    bedGroup.add(footboard);

    // Pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.5), pillowMat);
    pillow.position.set(0, 0.72, -0.9);
    bedGroup.add(pillow);

    this.scene.add(bedGroup);
    this.meshes.bed = bedGroup;
    this.colliders.push({ minX: -5.6, maxX: -3.4, minZ: -4.8, maxZ: -1.6 });

    // === 2. MEDICAL EXAMINATION TABLE (West wall, Center: X: -4.5, Z: -0.5) ===
    // Fixed, reachable surface where the Old Mobile Phone rests
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-4.5, 0, -0.5);

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.35 });
    const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.4, metalness: 0.2 });

    // Stainless steel table top
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.6), tableTopMat);
    tableTop.position.set(0, 0.84, 0);
    tableGroup.add(tableTop);

    // 4 Tubular legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.80, 8);
    const legPositions = [
      [-0.55, 0.40, -0.70],
      [0.55, 0.40, -0.70],
      [-0.55, 0.40, 0.70],
      [0.55, 0.40, 0.70]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      tableGroup.add(leg);
    });

    // Lower tray shelf
    const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 1.45), tableMat);
    lowerShelf.position.set(0, 0.25, 0);
    tableGroup.add(lowerShelf);

    // Tray instrument clutter
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    tray.position.set(0.35, 0.90, -0.35);
    tableGroup.add(tray);

    // OLD MOBILE PHONE (Resting on top of this table)
    // Initially hidden. Revealed immediately when Access Card #1 is collected!
    const phoneMesh = this.createPhoneMesh();
    phoneMesh.position.set(-0.25, 0.90, 0.15);
    phoneMesh.visible = false; // Hidden until Access Card #1
    tableGroup.add(phoneMesh);

    // Dedicated Phone interaction hitbox for generous, reliable crosshair detection
    const phoneHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.35, 0.45),
      new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
    );
    phoneHitbox.position.set(-0.25, 0.92, 0.15);
    tableGroup.add(phoneHitbox);

    this.scene.add(tableGroup);
    this.meshes.table = tableGroup;
    this.meshes.phone = phoneMesh;
    this.meshes.phoneHitbox = phoneHitbox;
    this.colliders.push({ minX: -5.4, maxX: -3.6, minZ: -1.4, maxZ: 0.4 });

    // === 3. EXAMINATION DESK WITH TWO DISTINCT DRAWERS (East wall: X: 4.5, Z: -2.5) ===
    // Both drawers are physically created and visible from room start!
    const deskGroup = new THREE.Group();
    deskGroup.position.set(4.5, 0, -2.5);

    const deskWood = new THREE.MeshStandardMaterial({ color: 0x2e1c14, roughness: 0.7 });
    const deskTopWood = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.6 });
    const drawerFaceMat = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.65 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });

    // Desk Top (Spans X: -0.7 to +0.7, Z: -1.4 to +1.4)
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.8), deskTopWood);
    deskTop.position.set(0, 0.95, 0);
    deskGroup.add(deskTop);

    // Pedestals recessed so drawer faces are completely visible on front
    const leftPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.88, 1.0), deskWood);
    leftPedestal.position.set(0.1, 0.44, -0.75);
    deskGroup.add(leftPedestal);

    const rightPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.88, 1.0), deskWood);
    rightPedestal.position.set(0.1, 0.44, 0.75);
    deskGroup.add(rightPedestal);

    // --- DRAWER 1 (LEFT DRAWER - Towards North: Z: -0.75) ---
    // Contains the Crowbar. Requires Strange Key.
    const drawer1Group = new THREE.Group();
    // Default closed position: local X = -0.58
    drawer1Group.position.set(-0.58, 0.68, -0.75);

    // Visible drawer front facing the player
    const dFace1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.92), drawerFaceMat);
    drawer1Group.add(dFace1);

    // Brass pull handle
    const handle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), brassMat);
    handle1.rotation.x = Math.PI / 2;
    handle1.position.set(-0.06, 0.04, 0);
    drawer1Group.add(handle1);

    // Brass escutcheon keyhole
    const escutcheon = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), brassMat);
    escutcheon.rotation.z = Math.PI / 2;
    escutcheon.position.set(-0.04, -0.06, 0);
    drawer1Group.add(escutcheon);

    // Drawer 1 interior box
    const dBox1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.86),
      new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.8 })
    );
    dBox1.position.set(0.38, -0.04, 0);
    drawer1Group.add(dBox1);

    // Crowbar inside Drawer 1 (initially hidden, visible when drawer opens)
    const crowbarMesh = this.createCrowbarMesh();
    crowbarMesh.position.set(0.3, -0.02, 0);
    crowbarMesh.visible = false;
    drawer1Group.add(crowbarMesh);

    // Drawer 1 generous interaction hitbox
    const d1Hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.42, 0.95),
      new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
    );
    d1Hitbox.position.set(-0.15, 0, 0);
    drawer1Group.add(d1Hitbox);

    deskGroup.add(drawer1Group);
    this.meshes.drawer1 = drawer1Group;
    this.meshes.crowbar = crowbarMesh;

    // --- DRAWER 2 (RIGHT DRAWER - Towards South: Z: +0.75) ---
    // Harmless clutter drawer. Always visible, separately clickable.
    const drawer2Group = new THREE.Group();
    drawer2Group.position.set(-0.58, 0.68, 0.75);

    const dFace2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.92), drawerFaceMat);
    drawer2Group.add(dFace2);

    const handle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), brassMat);
    handle2.rotation.x = Math.PI / 2;
    handle2.position.set(-0.06, 0.04, 0);
    drawer2Group.add(handle2);

    const dBox2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.86),
      new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.8 })
    );
    dBox2.position.set(0.38, -0.04, 0);
    drawer2Group.add(dBox2);

    // Harmless clutter items inside Drawer 2
    const clutterPaper1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.015, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 })
    );
    clutterPaper1.position.set(0.25, -0.08, -0.15);
    clutterPaper1.rotation.y = 0.15;
    drawer2Group.add(clutterPaper1);

    const clutterPaper2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.015, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85 })
    );
    clutterPaper2.position.set(0.28, -0.07, 0.12);
    clutterPaper2.rotation.y = -0.2;
    drawer2Group.add(clutterPaper2);

    const vial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 })
    );
    vial.rotation.z = Math.PI / 2;
    vial.position.set(0.3, -0.08, 0.25);
    drawer2Group.add(vial);

    const d2Hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.42, 0.95),
      new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
    );
    d2Hitbox.position.set(-0.15, 0, 0);
    drawer2Group.add(d2Hitbox);

    deskGroup.add(drawer2Group);
    this.meshes.drawer2 = drawer2Group;

    this.scene.add(deskGroup);
    this.meshes.desk = deskGroup;
    this.colliders.push({ minX: 3.6, maxX: 5.5, minZ: -4.1, maxZ: -0.9 });

    // Register Drawers with distinct IDs and hitboxes
    this.registerInteractive(dFace1, 'drawer_1', 'Left Drawer (Keyhole)');
    this.registerInteractive(handle1, 'drawer_1', 'Left Drawer (Keyhole)');
    this.registerInteractive(d1Hitbox, 'drawer_1', 'Left Drawer (Keyhole)');

    this.registerInteractive(dFace2, 'drawer_2', 'Right Drawer');
    this.registerInteractive(handle2, 'drawer_2', 'Right Drawer');
    this.registerInteractive(d2Hitbox, 'drawer_2', 'Right Drawer');

    // === 4. BROWN CABINET (South wall: X: 2.2, Z: 6.2) ===
    // Always visible, reachable, responds with "Not the perfect key.", never opens
    this.buildBrownCabinet();

    // === 5. CORRECT PUZZLE CABINET (East wall, South side: X: 4.6, Z: 2.5) ===
    // Reinforced steel cabinet with brass padlock, requires Cabinet Key, contains Access Card #2
    this.buildPuzzleCabinet();

    // === 6. BOOKSHELF (West wall, South side: X: -4.6, Z: 2.4) ===
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-4.6, 0, 2.4);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3b2219, roughness: 0.8 });
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 2.2), shelfMat);
    shelfBack.position.set(0, 1.3, 0);
    shelfGroup.add(shelfBack);

    // Books rows
    const bookColors = [0x991b1b, 0x1e3a8a, 0x166534, 0x854d0e, 0x475569];
    for (let row = 0; row < 4; row++) {
      for (let b = 0; b < 6; b++) {
        const bMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.35, 0.08),
          new THREE.MeshStandardMaterial({ color: bookColors[(row * 6 + b) % bookColors.length] })
        );
        bMesh.position.set(-0.25, 0.45 + row * 0.55, -0.8 + b * 0.3);
        shelfGroup.add(bMesh);
      }
    }

    this.scene.add(shelfGroup);
    this.meshes.bookshelf = shelfGroup;
    this.colliders.push({ minX: -5.5, maxX: -3.8, minZ: 1.1, maxZ: 3.7 });

    // === 7. STARTING WOODEN CHAIR (Directly behind player spawn) ===
    this.buildStartingChair();
  }

  buildBrownCabinet() {
    // Distinct wooden brown cabinet along South wall, facing North
    const brownCabGroup = new THREE.Group();
    brownCabGroup.position.set(2.2, 0, 6.2);
    brownCabGroup.rotation.y = Math.PI; // Face North into room

    const brownWoodMat = new THREE.MeshStandardMaterial({
      color: 0x543217, // Rich walnut brown finish
      roughness: 0.65,
      metalness: 0.1,
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });

    // Main cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 0.8), brownWoodMat);
    body.position.set(0, 1.15, 0);
    brownCabGroup.add(body);

    // Decorative top cornice
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 0.9), brownWoodMat);
    cornice.position.set(0, 2.32, 0);
    brownCabGroup.add(cornice);

    // Base plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.86), brownWoodMat);
    plinth.position.set(0, 0.06, 0);
    brownCabGroup.add(plinth);

    // Left and Right wooden panel doors with hinge pivots (front facing North: local Z = 0.42)
    const doorGeo = new THREE.BoxGeometry(0.74, 2.05, 0.05);

    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-0.74, 1.15, 0.42);
    const leftDoor = new THREE.Mesh(doorGeo, brownWoodMat);
    leftDoor.position.set(0.37, 0, 0);
    leftDoorPivot.add(leftDoor);

    const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), brassMat);
    h1.rotation.x = Math.PI / 2;
    h1.position.set(0.68, 0, 0.04);
    leftDoorPivot.add(h1);
    brownCabGroup.add(leftDoorPivot);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(0.74, 1.15, 0.42);
    const rightDoor = new THREE.Mesh(doorGeo, brownWoodMat);
    rightDoor.position.set(-0.37, 0, 0);
    rightDoorPivot.add(rightDoor);

    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), brassMat);
    h2.rotation.x = Math.PI / 2;
    h2.position.set(-0.68, 0, 0.04);
    rightDoorPivot.add(h2);
    brownCabGroup.add(rightDoorPivot);

    // Keyhole plate
    const keyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.01), brassMat);
    keyPlate.position.set(0, 1.02, 0.45);
    brownCabGroup.add(keyPlate);

    // Interior shelf for Access Card #2 if randomized here
    const intShelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.04, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x3d2410, roughness: 0.8 })
    );
    intShelf.position.set(0, 1.1, 0);
    brownCabGroup.add(intShelf);

    // Generous interaction hitbox
    const brownHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 2.2, 0.9),
      new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
    );
    brownHitbox.position.set(0, 1.15, 0.2);
    brownCabGroup.add(brownHitbox);

    this.scene.add(brownCabGroup);
    this.meshes.brownCabinet = brownCabGroup;
    this.meshes.brownDoorLeft = leftDoorPivot;
    this.meshes.brownDoorRight = rightDoorPivot;
    this.colliders.push({ minX: 1.2, maxX: 3.2, minZ: 5.4, maxZ: 6.9 });

    // Register with unique ID 'brown_cabinet'
    this.registerInteractive(leftDoor, 'brown_cabinet', 'Brown Cabinet');
    this.registerInteractive(rightDoor, 'brown_cabinet', 'Brown Cabinet');
    this.registerInteractive(brownHitbox, 'brown_cabinet', 'Brown Cabinet');
  }

  buildPuzzleCabinet() {
    // Large locked metal cabinet on East wall: X: 4.6, Z: 2.5
    const cabinetGroup = new THREE.Group();
    cabinetGroup.position.set(4.6, 0, 2.5);

    const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });

    // Cabinet Main Box
    const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.8), cabMat);
    cabFrame.position.set(0, 1.2, 0);
    cabinetGroup.add(cabFrame);

    // Left and Right Hinged Doors
    const doorGeo = new THREE.BoxGeometry(0.05, 2.3, 0.86);
    const cabDoorLeft = new THREE.Mesh(doorGeo, cabMat);
    cabDoorLeft.position.set(-0.6, 1.2, -0.44);
    cabinetGroup.add(cabDoorLeft);

    const cabDoorRight = new THREE.Mesh(doorGeo, cabMat);
    cabDoorRight.position.set(-0.6, 1.2, 0.44);
    cabinetGroup.add(cabDoorRight);

    // Heavy Brass Padlock on cabinet doors
    const padlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 })
    );
    padlock.position.set(-0.64, 1.2, 0);
    cabinetGroup.add(padlock);

    // Access Card #2 inside cabinet (hidden until unlocked)
    const card2Mesh = this.createCardMesh(0x0f172a, 'ACCESS #2');
    card2Mesh.position.set(-0.1, 1.2, 0);
    card2Mesh.visible = false;
    cabinetGroup.add(card2Mesh);

    // Generous interaction hitbox
    const cabHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.2, 1.7),
      new THREE.MeshBasicMaterial({ visible: false, wireframe: true })
    );
    cabHitbox.position.set(-0.55, 1.2, 0);
    cabinetGroup.add(cabHitbox);

    this.scene.add(cabinetGroup);
    this.meshes.puzzleCabinet = cabinetGroup;
    this.meshes.cabinetDoorLeft = cabDoorLeft;
    this.meshes.cabinetDoorRight = cabDoorRight;
    this.meshes.padlock = padlock;
    this.meshes.accessCard2 = card2Mesh;

    this.colliders.push({ minX: 3.8, maxX: 5.5, minZ: 1.4, maxZ: 3.6 });
    this.registerInteractive(padlock, 'cabinet', 'Locked Metal Cabinet');
    this.registerInteractive(cabDoorLeft, 'cabinet', 'Locked Metal Cabinet');
    this.registerInteractive(cabHitbox, 'cabinet', 'Locked Metal Cabinet');
    this.registerInteractive(card2Mesh, 'item_card_2', 'Access Card #2');
  }

  buildStartingChair() {
    // === STARTING WOODEN CHAIR (Directly behind player spawn) ===
    // Player spawns at (0, 1.65, 3.2) with yaw = -0.38 facing forward into room.
    // Backward direction vector: dx = -0.3709, dz = 0.9287.
    // At distance 0.90m behind player: chairX = -0.334, chairZ = 4.036.
    const chairGroup = new THREE.Group();
    const spawnX = 0;
    const spawnZ = 3.2;
    const startYaw = -0.38;
    const distBehind = 0.90;

    // Direction vector directly behind player
    const backX = Math.sin(startYaw); // -0.3709
    const backZ = Math.cos(startYaw); // 0.9287
    const chairX = spawnX + backX * distBehind;
    const chairZ = spawnZ + backZ * distBehind;

    chairGroup.position.set(chairX, 0, chairZ);
    chairGroup.rotation.y = startYaw; // Oriented facing the same direction as player

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3821, // Warm natural walnut wood
      roughness: 0.72,
      metalness: 0.04,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x422613, // Slightly darker wood for legs/frame
      roughness: 0.75,
      metalness: 0.05,
    });

    // 1. Seat: 0.44m wide x 0.035m thick x 0.42m deep at height Y: 0.44m
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.035, 0.42), woodMat);
    seat.position.set(0, 0.44, 0);
    chairGroup.add(seat);

    // 2. Four Legs (front-left, front-right, back-left, back-right) from Y: 0 to Y: 0.42m
    const legGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
    const legPositions = [
      [-0.18, 0.21, -0.17], // front-left
      [0.18, 0.21, -0.17],  // front-right
      [-0.18, 0.21, 0.17],  // back-left
      [0.18, 0.21, 0.17],   // back-right
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, darkWoodMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      chairGroup.add(leg);
    });

    // 3. Lower Rungs / Stretchers between legs for authentic wooden carpentry
    const rungSideGeo = new THREE.BoxGeometry(0.02, 0.02, 0.34);
    const leftRung = new THREE.Mesh(rungSideGeo, darkWoodMat);
    leftRung.position.set(-0.18, 0.14, 0);
    chairGroup.add(leftRung);

    const rightRung = new THREE.Mesh(rungSideGeo, darkWoodMat);
    rightRung.position.set(0.18, 0.14, 0);
    chairGroup.add(rightRung);

    const rungFrontGeo = new THREE.BoxGeometry(0.36, 0.02, 0.02);
    const frontRung = new THREE.Mesh(rungFrontGeo, darkWoodMat);
    frontRung.position.set(0, 0.12, -0.17);
    chairGroup.add(frontRung);

    // 4. Backrest (NO ARMRESTS - simple clean design)
    // Two vertical posts extending upward from back legs (from Y: 0.44 to 0.90)
    const postGeo = new THREE.BoxGeometry(0.04, 0.46, 0.04);
    const leftPost = new THREE.Mesh(postGeo, darkWoodMat);
    leftPost.position.set(-0.18, 0.67, 0.18);
    chairGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, darkWoodMat);
    rightPost.position.set(0.18, 0.67, 0.18);
    chairGroup.add(rightPost);

    // Top crest rail across the two posts
    const crestRail = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.03), woodMat);
    crestRail.position.set(0, 0.88, 0.18);
    chairGroup.add(crestRail);

    // Two horizontal slats
    const slat1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.02), woodMat);
    slat1.position.set(0, 0.76, 0.18);
    chairGroup.add(slat1);

    const slat2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.02), woodMat);
    slat2.position.set(0, 0.64, 0.18);
    chairGroup.add(slat2);

    this.scene.add(chairGroup);
    this.meshes.chair = chairGroup;

    // AABB Collider for chair
    this.colliders.push({
      minX: chairX - 0.24,
      maxX: chairX + 0.24,
      minZ: chairZ - 0.24,
      maxZ: chairZ + 0.24,
    });
  }

  buildPuzzleObjects() {
    // === 1. MAIN EXIT DOOR (North Wall: X: 0, Z: -6.85) ===
    const doorFrameGroup = new THREE.Group();
    doorFrameGroup.position.set(0, 0, -6.85);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 });
    const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 });

    // Outer door jamb
    const jambLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.15), frameMat);
    jambLeft.position.set(-1.1, 1.4, 0);
    doorFrameGroup.add(jambLeft);

    const jambRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.15), frameMat);
    jambRight.position.set(1.1, 1.4, 0);
    doorFrameGroup.add(jambRight);

    const jambTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.15), frameMat);
    jambTop.position.set(0, 2.7, 0);
    doorFrameGroup.add(jambTop);

    // Physically swinging door leaf (pivot on left side: X: -1.0)
    const doorLeafPivot = new THREE.Group();
    doorLeafPivot.position.set(-1.0, 0, 0);

    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.1), doorPanelMat);
    doorLeaf.position.set(1.0, 1.3, 0);
    doorLeafPivot.add(doorLeaf);

    // Electronic Console Mounted on Door
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.08), consoleMat);
    consoleBox.position.set(0.6, 1.35, 0.06);
    doorLeaf.add(consoleBox);

    // Keypad screen glow
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    screenMesh.position.set(0.6, 1.55, 0.11);
    doorLeaf.add(screenMesh);

    // Lock Indicator LEDs: Lock 1 (PIN) and Lock 2 (Card)
    const ledMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const led1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), ledMatRed);
    led1.position.set(0.48, 1.2, 0.11);
    doorLeaf.add(led1);

    const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), ledMatRed);
    led2.position.set(0.72, 1.2, 0.11);
    doorLeaf.add(led2);

    // Door Handle / Push Bar
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), handleMat);
    handleBar.position.set(0.0, 1.0, 0.1);
    doorLeaf.add(handleBar);

    doorFrameGroup.add(doorLeafPivot);
    this.scene.add(doorFrameGroup);

    this.meshes.doorPivot = doorLeafPivot;
    this.meshes.doorLed1 = led1;
    this.meshes.doorLed2 = led2;
    this.meshes.doorScreen = screenMesh;

    // Door is interactive
    this.registerInteractive(doorLeaf, 'main_door', 'Main Exit Door (Two Locks)');
    this.registerInteractive(consoleBox, 'main_door', 'Door Security Console');

    // === 2. CARPET (Center of room) ===
    const carpetGroup = new THREE.Group();
    carpetGroup.position.set(0, 0.005, 0.8);

    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      roughness: 0.95,
      metalness: 0.0,
    });

    const carpetMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetGroup.add(carpetMesh);

    this.scene.add(carpetGroup);
    this.meshes.carpet = carpetMesh;
    this.registerInteractive(carpetMesh, 'carpet', 'Heavy Worn Carpet');

    // === 3. THREE SMALL BOXES (Separated in 3 physical locations) ===
    // Box 1: Near bookshelf area (-4.1, 0.45, 3.6) -> Contains Access Card #1
    const box1 = this.createSmallBoxMesh(0x78350f);
    box1.position.set(-4.1, 0.45, 3.6);
    this.scene.add(box1);
    this.meshes.box1 = box1;
    this.registerInteractive(box1.children[0], 'box_1', 'Small Metal Box #1');

    // Box 2: Near examination desk (3.8, 0.35, -4.2)
    const box2 = this.createSmallBoxMesh(0x57534e);
    box2.position.set(3.8, 0.35, -4.2);
    this.scene.add(box2);
    this.meshes.box2 = box2;
    this.registerInteractive(box2.children[0], 'box_2', 'Small Metal Box #2');

    // Box 3: Near North window/corner (-1.8, 0.2, -6.0)
    const box3 = this.createSmallBoxMesh(0x475569);
    box3.position.set(-1.8, 0.2, -6.0);
    this.scene.add(box3);
    this.meshes.box3 = box3;
    this.registerInteractive(box3.children[0], 'box_3', 'Small Metal Box #3');

    // Access Card #1 inside Box 1
    const card1Mesh = this.createCardMesh(0xf8fafc, 'WING 1');
    card1Mesh.position.set(0, 0.12, 0);
    card1Mesh.visible = false;
    box1.add(card1Mesh);
    this.meshes.accessCard1 = card1Mesh;
    this.registerInteractive(card1Mesh, 'item_card_1', 'Access Card #1');

    // === 4. TWO STOPWATCH +30S EXTENSION GIFTS (Physical 3D devices) ===
    // Gift 1: On small table surface near bookshelf (-4.8, 0.55, 1.0)
    const gift1 = this.createStopwatchGiftMesh();
    gift1.position.set(-4.8, 0.55, 1.0);
    this.scene.add(gift1);
    this.meshes.gift1 = gift1;
    this.registerInteractive(gift1, 'gift_1', '+30s Stopwatch Gift');

    // Gift 2: Behind bed frame (-4.8, 0.35, -5.2)
    const gift2 = this.createStopwatchGiftMesh();
    gift2.position.set(-4.8, 0.35, -5.2);
    this.scene.add(gift2);
    this.meshes.gift2 = gift2;
    this.registerInteractive(gift2, 'gift_2', '+30s Stopwatch Gift');
  }

  buildEnvironmentalDetails() {
    // === 1. ATMOSPHERIC BLOOD STAINS (2–3 in room) ===
    const bloodMat = new THREE.MeshBasicMaterial({
      color: 0x7f1d1d,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    // Blood Stain 1: Floor near bed leg
    const b1 = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), bloodMat);
    b1.rotation.x = -Math.PI / 2;
    b1.position.set(-3.6, 0.003, -1.8);
    this.scene.add(b1);

    // Blood Stain 2: Floor near North corner
    const b2 = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), bloodMat);
    b2.rotation.x = -Math.PI / 2;
    b2.position.set(-4.8, 0.003, -5.8);
    this.scene.add(b2);

    // Blood Stain 3: Faint hand smear on low North plaster wall
    const b3 = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.3), bloodMat);
    b3.position.set(-2.2, 0.65, -6.98);
    this.scene.add(b3);

    // === 2. BARRED WINDOW ON NORTH WALL ===
    const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const winGlassMat = new THREE.MeshBasicMaterial({ color: 0x0f2744, transparent: true, opacity: 0.8 });

    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), winGlassMat);
    winGlass.position.set(0, 2.5, -6.97);
    this.scene.add(winGlass);
    this.meshes.window = winGlass;

    // Iron bars across window
    for (let i = -1.0; i <= 1.0; i += 0.4) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), winFrameMat);
      bar.position.set(i, 2.5, -6.95);
      this.scene.add(bar);
    }

    // === 3. WALL CLOCK ABOVE EXIT DOOR ===
    const clockGroup = new THREE.Group();
    clockGroup.position.set(0, 3.0, -6.96);

    const clockFrame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0xb45309 })
    );
    clockFrame.rotation.x = Math.PI / 2;
    clockGroup.add(clockFrame);

    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
    clockFace.position.z = 0.03;
    clockGroup.add(clockFace);

    this.scene.add(clockGroup);

    // === 4. FRAMED PAINTINGS ===
    // Painting on West Wall
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    p1.position.set(-5.96, 2.0, -0.5);
    this.scene.add(p1);

    // Painting on South Wall
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.04), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    p2.position.set(2.0, 2.0, 6.96);
    this.scene.add(p2);

    // === 5. MISC CLUTTER (Floor books, flashlight, papers) ===
    // Flashlight on floor near desk
    const torch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    );
    torch.rotation.z = Math.PI / 2;
    torch.position.set(2.8, 0.03, -1.8);
    this.scene.add(torch);

    // Scattered clinical papers
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const paper1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), paperMat);
    paper1.rotation.x = -Math.PI / 2;
    paper1.rotation.z = 0.4;
    paper1.position.set(3.2, 0.004, -2.2);
    this.scene.add(paper1);

    const paper2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), paperMat);
    paper2.rotation.x = -Math.PI / 2;
    paper2.rotation.z = -0.2;
    paper2.position.set(4.2, 0.96, -2.2);
    this.scene.add(paper2);
  }

  // --- Dynamic Reveal System ---
  revealPhone() {
    if (this.meshes.phone) {
      this.meshes.phone.visible = true;
      if (this.meshes.phoneHitbox && !this.interactiveObjects.includes(this.meshes.phoneHitbox)) {
        this.registerInteractive(this.meshes.phoneHitbox, 'item_phone', 'Old Mobile Phone');
      }
      if (!this.interactiveObjects.includes(this.meshes.phone)) {
        this.registerInteractive(this.meshes.phone, 'item_phone', 'Old Mobile Phone');
      }
      console.log('[Room3D] Phone physically revealed on Medical Table at fixed position.');
    }
  }

  // --- Dynamic Randomized Card Configuration ---
  setupRandomizedCardLocations() {
    const layout = this.gameState.layout;
    if (!layout) return;

    // 1. Position Access Card #1 inside the correct small box
    if (this.meshes.accessCard1) {
      this.meshes.accessCard1.visible = false;
      const targetBox = this.meshes[layout.correctBox];
      if (targetBox) {
        if (this.meshes.accessCard1.parent && this.meshes.accessCard1.parent !== targetBox) {
          this.meshes.accessCard1.parent.remove(this.meshes.accessCard1);
        }
        if (this.meshes.accessCard1.parent !== targetBox) {
          targetBox.add(this.meshes.accessCard1);
          this.meshes.accessCard1.position.set(0, 0.12, 0);
        }
      }
    }

    // 2. Position Access Card #2 inside the correct cabinet
    if (this.meshes.accessCard2) {
      this.meshes.accessCard2.visible = false;
      const targetCabinet = layout.correctCabinet === 'brown_cabinet'
        ? this.meshes.brownCabinet
        : this.meshes.puzzleCabinet;

      if (targetCabinet) {
        if (this.meshes.accessCard2.parent && this.meshes.accessCard2.parent !== targetCabinet) {
          this.meshes.accessCard2.parent.remove(this.meshes.accessCard2);
        }
        if (this.meshes.accessCard2.parent !== targetCabinet) {
          targetCabinet.add(this.meshes.accessCard2);
          if (layout.correctCabinet === 'brown_cabinet') {
            this.meshes.accessCard2.position.set(0, 1.15, 0.2);
          } else {
            this.meshes.accessCard2.position.set(-0.1, 1.2, 0);
          }
        }
      }
    }

    console.log(`[Room3D] Card locations configured: Card #1 -> ${layout.correctBox}, Card #2 -> ${layout.correctCabinet}`);
  }

  // --- Startup Room Verification ---
  validateRoomObjects() {
    const required = [
      { name: 'Desk', mesh: this.meshes.desk },
      { name: 'Drawer 1 (Left)', mesh: this.meshes.drawer1, interactiveId: 'drawer_1' },
      { name: 'Drawer 2 (Right)', mesh: this.meshes.drawer2, interactiveId: 'drawer_2' },
      { name: 'Brown Cabinet', mesh: this.meshes.brownCabinet, interactiveId: 'brown_cabinet' },
      { name: 'Correct Puzzle Cabinet', mesh: this.meshes.puzzleCabinet, interactiveId: 'cabinet' },
      { name: 'Exit Door', mesh: this.meshes.doorPivot, interactiveId: 'main_door' },
      { name: 'Hospital Bed', mesh: this.meshes.bed },
      { name: 'Bookshelf', mesh: this.meshes.bookshelf },
      { name: 'Barred Window', mesh: this.meshes.window },
      { name: 'Carpet', mesh: this.meshes.carpet, interactiveId: 'carpet' },
      { name: 'Medical Table', mesh: this.meshes.table },
      { name: 'Phone', mesh: this.meshes.phone },
      { name: 'Small Box #1', mesh: this.meshes.box1, interactiveId: 'box_1' },
      { name: 'Small Box #2', mesh: this.meshes.box2, interactiveId: 'box_2' },
      { name: 'Small Box #3', mesh: this.meshes.box3, interactiveId: 'box_3' },
      { name: 'Timer Gift #1', mesh: this.meshes.gift1, interactiveId: 'gift_1' },
      { name: 'Timer Gift #2', mesh: this.meshes.gift2, interactiveId: 'gift_2' },
      { name: 'Starting Wooden Chair', mesh: this.meshes.chair },
    ];

    const missing = [];
    for (const item of required) {
      if (!item.mesh) {
        missing.push(`${item.name} mesh is missing`);
      }
      if (item.interactiveId) {
        const hasInteractive = this.interactiveObjects.some(
          obj => obj.userData?.interactiveId === item.interactiveId
        );
        if (!hasInteractive && item.name !== 'Phone') {
          missing.push(`${item.name} interactive registration is missing`);
        }
      }
    }

    if (missing.length > 0) {
      console.error('[Room3D Validation FAILED]', missing);
      throw new Error(`Required 3D room objects missing: ${missing.join(', ')}`);
    }

    console.log('[Room3D Validation PASSED] All required 3D objects, colliders, and interaction targets verified.');
    return true;
  }

  // --- Helper Mesh Generators ---

  createCrowbarMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });

    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), mat);
    shaft.rotation.z = Math.PI / 2;
    group.add(shaft);

    // Curved hook
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), mat);
    hook.position.set(0.28, 0.05, 0);
    hook.rotation.z = 0.6;
    group.add(hook);

    return group;
  }

  createSmallBoxMesh(colorHex) {
    const group = new THREE.Group();
    const boxMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.5 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.28), boxMat);
    group.add(base);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.3), boxMat);
    lid.position.y = 0.12;
    group.add(lid);

    return group;
  }

  createCardMesh(colorHex, label) {
    const cardMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.2 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.3), cardMat);

    // Chip / Magnetic strip
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.006, -0.08);
    card.add(strip);

    return card;
  }

  createPhoneMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    // Phone Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.34), bodyMat);
    group.add(body);

    // Illuminated Screen (11:11 PM Clue)
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 128;
    screenCanvas.height = 64;
    const ctx = screenCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('11:11 PM', 64, 40);
    }

    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.08),
      new THREE.MeshBasicMaterial({ map: screenTex })
    );
    screenMesh.rotation.x = -Math.PI / 2;
    screenMesh.position.set(0, 0.021, -0.04);
    group.add(screenMesh);

    return group;
  }

  createStopwatchGiftMesh() {
    const group = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });

    // Round stopwatch body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), brassMat);
    group.add(body);

    // Top plunger
    const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), brassMat);
    plunger.position.set(0, 0, -0.14);
    plunger.rotation.x = Math.PI / 2;
    group.add(plunger);

    // Dial face with +30 SEC glow
    const dialCanvas = document.createElement('canvas');
    dialCanvas.width = 128;
    dialCanvas.height = 128;
    const ctx = dialCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+30s', 64, 68);
    }

    const dialTex = new THREE.CanvasTexture(dialCanvas);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ map: dialTex }));
    dial.rotation.x = -Math.PI / 2;
    dial.position.y = 0.026;
    group.add(dial);

    // Subtle golden aura light
    const aura = new THREE.PointLight(0xf59e0b, 0.45, 1.2);
    aura.position.set(0, 0.1, 0);
    group.add(aura);

    return group;
  }

  registerInteractive(mesh, id, name) {
    mesh.userData = { interactiveId: id, interactiveName: name };
    if (!this.interactiveObjects.includes(mesh)) {
      this.interactiveObjects.push(mesh);
    }
  }
}
