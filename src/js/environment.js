// === SEABED ===
let seabed, bubblesSystem;
let goalPos, pos_initialized = false;

// --- Create seabed terrain with sand and rocks ---
function createSeabed(textures) {
    seabed = new THREE.Group();
    seabed.name = "seabedPlane";

    const width = TERRAIN_SIZE;
    const height = TERRAIN_SIZE;
    const seg = 64;
    const geom = new THREE.PlaneGeometry(width, height, seg, seg);
    geom.rotateX(-Math.PI / 2);

    // generate random terrain heights
    for (let i = 0; i < geom.attributes.position.count; i++) {
        const x = geom.attributes.position.getX(i);
        const z = geom.attributes.position.getZ(i);
        const y = Math.sin(x * 0.1) * 2 + Math.cos(z * 0.15) * 1.5 + (Math.random() - 0.5) * 1.0;
        geom.attributes.position.setY(i, y);
    }
    geom.computeVertexNormals();

    // sand plane
    const mat = new THREE.MeshStandardMaterial({ map: textures.sandT });
    const plane = new THREE.Mesh(geom, mat);
    plane.receiveShadow = true;
    seabed.add(plane);

    // random rocks
    const rockCount = 50;
    for (let i = 0; i < rockCount; i++) {
        const s = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.4 + Math.random() * 2, 1),
            new THREE.MeshStandardMaterial({ map: textures.rockT })
        );
        const x = (Math.random() - 0.5) * width;
        const z = (Math.random() - 0.5) * height;
        const y = getTerrainHeight(x, z) + 0.2;
        s.position.set(x, y, z);
        s.scale.setScalar(0.6 + Math.random() * 1.8);
        s.castShadow = true;
        seabed.add(s);
    }

    // central totem
    const totem = createTotem(textures);
    const totemX = 0, totemZ = 0;
    const totemY = getTerrainHeight(totemX, totemZ) + totem.position.y;
    totem.position.set(totemX, totemY, totemZ);
    seabed.add(totem);

    goalPos = new THREE.Vector3(0, totemY + 10, 0);
    pos_initialized = true;

    // rocks around totem
    const ringRockCount = 8;
    const radiusAroundTotem = 6;
    for (let i = 0; i < ringRockCount; i++) {
        const angle = (i / ringRockCount) * Math.PI * 2;
        const x = totemX + Math.cos(angle) * radiusAroundTotem;
        const z = totemZ + Math.sin(angle) * radiusAroundTotem;
        const y = getTerrainHeight(x, z) + 0.2;
        const rock = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.MeshStandardMaterial({ map: textures.rockTotemT })
        );
        rock.position.set(x, y, z);
        rock.scale.setScalar(1.6);
        rock.castShadow = true;
        seabed.add(rock);
    }

    return seabed;
}

// --- Create bubble particle system ---
function addBubblesSystem() {
    bubblesSystem = new THREE.Group();
    const particles = [];

    for (let i = 0; i < 300; i++) {
        // random size for each bubble
        const size = Math.random() * 1.5 + 0.5;
        const geom = new THREE.SphereGeometry(size, 16, 12);

        const mat = new THREE.MeshStandardMaterial({
            color: 0xcfefff,
            transparent: true,
            opacity: 0.8,
            metalness: 0.1,
            roughness: 0.8
        });

        const m = new THREE.Mesh(geom, mat);

        // random initial position
        m.position.set(
            (Math.random() - 0.5) * TERRAIN_SIZE,
            Math.random() * -10,
            (Math.random() - 0.5) * TERRAIN_SIZE
        );

        // additional random scale
        m.scale.setScalar(Math.random() * .6);

        bubblesSystem.add(m);

        // store speed, larger variability
        particles.push({ mesh: m, speed: 0.6 + Math.random() * 1.5 });
    }

    // update function for rising bubbles
    bubblesSystem.userData.update = function (dt) {
        for (const p of particles) {
            p.mesh.position.y += p.speed * dt * 3.0; // faster rise

            // reset position when bubble reaches top
            if (p.mesh.position.y > 15) p.mesh.position.y = -10 - Math.random() * 5;

            // opacity fades as bubble rises
            p.mesh.material.opacity = Math.max(0, 1 - (p.mesh.position.y + 10) / 25);
        }
    };

    return bubblesSystem;
}

// --- Fog density based on camera height and torch ---
function updateFog() {
    if (!camera || !scene.fog) return;

    const minHeight = 0;
    const maxHeight = 200;
    const minFog = 0.02;
    const maxFog = 0.1;

    let t = 1 - (camera.position.y - minHeight) / (maxHeight - minHeight);
    t = Math.min(Math.max(t, 0), 1);
    let fogDensity = minFog + t * (maxFog - minFog);

    if (torchOn) fogDensity *= 0.3;

    scene.fog.density = fogDensity;
}

// --- Aquarium glass border ---
function createAquariumBorder() {
    const glassThickness = 0.5;
    const glassHeight = 50;
    const halfSize = TERRAIN_SIZE / 2;

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x66c0ff,
        transparent: true,
        opacity: 0.4,
        roughness: 0,
        metalness: 0,
        reflectivity: 0.8,
        transmission: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0,
    });

    const borders = new THREE.Group();

    // four walls
    const wallGeomX = new THREE.BoxGeometry(TERRAIN_SIZE + glassThickness * 2, glassHeight, glassThickness);
    const wallGeomZ = new THREE.BoxGeometry(glassThickness, glassHeight, TERRAIN_SIZE + glassThickness * 2);

    const wall1 = new THREE.Mesh(wallGeomX, glassMat);
    wall1.position.set(0, glassHeight / 2 - 5, halfSize + glassThickness / 2);
    borders.add(wall1);

    const wall2 = wall1.clone();
    wall2.position.set(0, glassHeight / 2 - 5, -halfSize - glassThickness / 2);
    borders.add(wall2);

    const wall3 = new THREE.Mesh(wallGeomZ, glassMat);
    wall3.position.set(halfSize + glassThickness / 2, glassHeight / 2 - 5, 0);
    borders.add(wall3);

    const wall4 = wall3.clone();
    wall4.position.set(-halfSize - glassThickness / 2, glassHeight / 2 - 5, 0);
    borders.add(wall4);

    return borders;
}

// --- Water surface ---
function createWaterSurface() {
    const glassHeight = 40;
    const halfSize = TERRAIN_SIZE / 2;

    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.0,
    });

    const water = new THREE.Mesh(geometry, material);
    water.position.y = glassHeight - 0.5;
    water.receiveShadow = false;

    return water;
}

// --- Underwater fog effect ---
function updateUnderwaterEffect() {
    const maxWaterHeight = 40;
    if (camera.position.y < maxWaterHeight) {
        scene.fog.color.set(0x66ccff);
        scene.fog.density = 0.02;
    } else {
        scene.fog.color.set(0xa0e0ff);
        scene.fog.density = 0.002;
    }
}

// --- Totem object ---
function createTotem(textures) {
    const group = new THREE.Group();
    group.name = "totemPlane";

    const height = 15;
    const radius = 1.5;
    const detail = 20;

    const body = new THREE.Group();

    // main column
    const columnGeom = new THREE.CylinderGeometry(radius * 0.9, radius * 1.2, height, detail, 1);
    const columnMat = new THREE.MeshStandardMaterial({ map: textures.metalT });
    const column = new THREE.Mesh(columnGeom, columnMat);
    column.castShadow = true;
    column.receiveShadow = true;
    body.add(column);

    // decorative rings
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
        const ringGeom = new THREE.TorusGeometry(radius, 0.25, 12, 24);
        const ringMat = new THREE.MeshStandardMaterial({ map: textures.metalGoldT });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -height / 2 + (i + 1) * (height / (ringCount + 1));
        body.add(ring);
    }

    // reflective sphere on top
    const sphereGeom = new THREE.SphereGeometry(radius * 2, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
        envMap: textures.backgroundT,
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.0,
        envMapIntensity: 1.0,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.position.y = height / 2 + radius * 0.8;
    body.add(sphere);

    // base
    const baseGeom = new THREE.CylinderGeometry(radius * 1.8, radius * 2.5, 1.2, 12);
    const base = new THREE.Mesh(baseGeom, columnMat);
    base.position.y = -height / 2 - 0.6;
    body.add(base);

    // small tilt for realism
    group.rotation.x = (Math.random() - 0.5) * (Math.PI / 18);
    group.rotation.z = (Math.random() - 0.5) * (Math.PI / 18);
    group.rotation.y = 0;

    // pivot at base
    body.position.y = height / 2 + 0.6;
    group.add(body);

    return group;
}

// --- Aquarium base ---
function createAquariumBase() {
    const baseHeight = -5;
    const baseSize = TERRAIN_SIZE + 50;
    const geometry = new THREE.PlaneGeometry(baseSize, baseSize, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2,
    });

    const base = new THREE.Mesh(geometry, material);
    base.position.y = baseHeight;
    base.receiveShadow = true;

    return base;
}
