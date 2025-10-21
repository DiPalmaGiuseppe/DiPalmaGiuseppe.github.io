// === MODEL & ANIMATION DATA ===
const mixers = []; // global animation mixers
const models = {}; // loaded model objects
const modelAxes = {}; // forward axis for each model
const gltfAnims = {}; // animations per model
const fishData = []; // fish instances
const sharkData = []; // shark instances

// === LOAD A MODEL ===
async function loadModel(name, url, forwardAxis = new THREE.Vector3(-1, 0, 0)) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            function (gltf) {
                const object = gltf.scene;
                models[name] = object;
                gltfAnims[name] = gltf.animations || [];
                modelAxes[name] = forwardAxis.clone().normalize();
                resolve(object);
            },
            undefined,
            function (error) {
                console.error(`Error loading model ${name}:`, error);
                reject(error);
            }
        );
    });
}

// === SPAWN CLONES ===
function spawnClones(name, url, count, positionFn = null, options = {}) {
    if (!models[name]) {
        console.warn(`${name} not loaded yet!`);
        return;
    }

    const anims = gltfAnims[name] || [];
    const sMin = options.scaleMin ?? 0.1;
    const sMax = options.scaleMax ?? 0.2;
    const baseSpeed = options.baseSpeed ?? 1.0;
    const forward = modelAxes[name];

    for (let i = 0; i < count; i++) {
        const clone = THREE.SkeletonUtils.clone(models[name]);
        const scale = sMin + Math.random() * (sMax - sMin);
        clone.scale.setScalar(scale);

        // Random position or custom function
        const x = (Math.random() * 2 - 1) * 50;
        const y = (Math.random() * 20) + 5;
        const z = (Math.random() * 2 - 1) * 50;
        clone.position.copy(positionFn ? positionFn(i) : new THREE.Vector3(x, y, z));

        // Clone materials for independent instances
        clone.traverse(n => {
            if (n.isMesh) {
                n.material = Array.isArray(n.material)
                    ? n.material.map(m => m.clone())
                    : n.material.clone();
                n.castShadow = true;
                n.receiveShadow = true;
            }
        });

        scene.add(clone);

        // --- Play animations if available ---
        let mixer = null;
        if (anims.length > 0) {
            mixer = new THREE.AnimationMixer(clone);
            anims.forEach(clip => mixer.clipAction(clip).play());
            mixers.push(mixer);
        }

        // --- Compute bounding box ---
        const bbox = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Store instance data
        const instanceData = {
            mesh: clone,
            name: name,
            url: url,
            mixer: mixer,
            speed: baseSpeed * (0.8 + Math.random() * 0.4),
            targetDir: forward.clone().normalize(),
            changeTimer: 2 + Math.random() * 2,
            baseSpeed: baseSpeed,
            bbox: bbox.clone(),
            size: size.clone()
        };

        if (name === 'shark') {
            sharkData.push(instanceData);
        } else {
            fishData.push(instanceData);
        }
    }

    console.log(`Spawned ${count} clones of ${name}`);
}

// === SPAWN PLANT GROUPS ===
function spawnPlantGroups(name, groupCount = 12, plantsPerGroup = 20, options = {}) {
    if (!models[name]) {
        console.warn(`${name} not loaded yet!`);
        return;
    }

    const anims = gltfAnims[name] || [];
    const sMin = options.scaleMin ?? 1;
    const sMax = options.scaleMax ?? 2;
    const terrainHalf = TERRAIN_SIZE / 2;
    const borderMargin = 2; // avoid clipping

    for (let g = 0; g < groupCount; g++) {
        const groupX = (Math.random() - 0.5) * (TERRAIN_SIZE - 2 * borderMargin);
        const groupZ = (Math.random() - 0.5) * (TERRAIN_SIZE - 2 * borderMargin);

        for (let i = 0; i < plantsPerGroup; i++) {
            const clone = THREE.SkeletonUtils.clone(models[name]);
            const scale = sMin + Math.random() * (sMax - sMin);
            clone.scale.setScalar(scale);

            let offsetX = (Math.random() - 0.5) * 50;
            let offsetZ = (Math.random() - 0.5) * 50;

            const x = THREE.MathUtils.clamp(groupX + offsetX, -terrainHalf + borderMargin, terrainHalf - borderMargin);
            const z = THREE.MathUtils.clamp(groupZ + offsetZ, -terrainHalf + borderMargin, terrainHalf - borderMargin);
            const y = getTerrainHeight(x, z) + 0.1; // slight offset
            clone.position.set(x, y, z);

            // Clone materials
            clone.traverse(n => {
                if (n.isMesh) {
                    n.material = Array.isArray(n.material)
                        ? n.material.map(m => m.clone())
                        : n.material.clone();
                    n.castShadow = true;
                    n.receiveShadow = true;
                }
            });

            scene.add(clone);

            // Play animations if present
            if (anims.length > 0) {
                const mixer = new THREE.AnimationMixer(clone);
                anims.forEach(clip => mixer.clipAction(clip).play());
                mixers.push(mixer);
            }
        }
    }

    console.log(`Spawned ${groupCount} groups of ${plantsPerGroup} plants (${name})`);
}

// === LOAD ALL SCENE MODELS ===
async function loadSceneModels() {
    try {
        await loadModel('manta', 'models/manta/scene.gltf', new THREE.Vector3(-1, 0, 0));
        await loadModel('shark', 'models/shark/scene.gltf', new THREE.Vector3(0, 0, 1));
        await loadModel('koi_fish', 'models/koi_fish/scene.gltf', new THREE.Vector3(1, 0, 0));
        await loadModel('turtle', 'models/turtle/scene.gltf', new THREE.Vector3(0, 0, -1));
        await loadModel('demanosi', 'models/demanosi/scene.gltf', new THREE.Vector3(0, 0, 1));
        await loadModel('lown', 'models/lown/scene.gltf', new THREE.Vector3(-1, 0, 0));
        await loadModel('water_plants', 'models/water_plant/scene.gltf', new THREE.Vector3(0, 1, 0));

        spawnClones('manta', 'models/manta/scene.gltf', 6, null, { baseSpeed: 3, scaleMin: 2, scaleMax: 4 });
        spawnClones('shark', 'models/shark/scene.gltf', 2, null, { baseSpeed: 1.5, scaleMin: 0.01, scaleMax: 0.02 });
        spawnClones('koi_fish', 'models/koi_fish/scene.gltf', 6, null, { baseSpeed: 3.5, scaleMin: 0.8, scaleMax: 1 });
        spawnClones('turtle', 'models/turtle/scene.gltf', 6, null, { baseSpeed: 3, scaleMin: 10, scaleMax: 20 });
        spawnClones('demanosi', 'models/demanosi/scene.gltf', 6, null, { baseSpeed: 2.5, scaleMin: 5, scaleMax: 10 });
        spawnClones('lown', 'models/lown/scene.gltf', 6, null, { baseSpeed: 2, scaleMin: .1, scaleMax: .3 });
        spawnPlantGroups('water_plants', 10, 20, { scaleMin: 0.05, scaleMax: 0.15 });
    } catch (e) {
        console.error('Error loading models', e);
    }
}
