// === GLOBALS ===
let renderer, scene, camera, clock;
let bubbles;
let textures = {};

let textureLoader, gltfLoader, cubeLoader;
let loadingManager;

let loadingScene, loadingCamera, loadingBarMesh, loadingBorderMesh, loadingTextSprite;
let loadingProgress = 0;
let loadingComplete = false;

let stats;

let gameOver = false;

const OXYGEN_DRAIN_RATE = 5;
const OXYGEN_REFILL_RATE = 25;
const HEALTH_LOSS_ON_NO_OXYGEN = 10;

const TERRAIN_SIZE = 200;
const start_y = 41;

// === INITIALIZATION ===
init();
animate();

function init() {
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);
    renderer.autoClear = false;

    // Clock and camera
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, start_y, 0);

    // Stats (FPS panel)
    stats = new Stats();
    stats.showPanel(0); // 0: fps
    document.body.appendChild(stats.dom);
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0px';
    stats.dom.style.left = '0px';
    stats.dom.style.zIndex = '100';

    createLoadingScreen();

    // Handle window resizing
    window.addEventListener('resize', updateAspectRatio);
    updateAspectRatio();

    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xa0e0ff, 0.02);

    setupLoadingManager();
}

// Load main scene objects
function loadScene() {
    createHUD2D();
    createHUDFish();
    scene.add(createAquariumBase());
    scene.add(createSeabed(textures));
    bubbles = addBubblesSystem()
    scene.add(bubbles);
    scene.add(createAquariumBorder());
    scene.add(createWaterSurface());

    setupLights(scene);
    updateUnderwaterEffect();
    scene.background = textures.backgroundT;
}

// Update camera aspect ratio on window resize
function updateAspectRatio() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main render loop
function animate() {
    requestAnimationFrame(animate);

    stats.begin(); // Start frame

    if (!loadingComplete) {
        renderLoadingScreen();
        stats.end();
        return;
    }

    renderer.clear();
    const dt = clock.getDelta();

    if (!gameOver) {
        preventCameraThroughFish();
        mixers.forEach(m => m.update(dt));
        fishData.forEach(f => updateFish(f, dt));
        sharkData.forEach(s => updateShark(s, dt));

        if (bubbles?.userData.update) bubbles.userData.update(dt);
        seabed?.children.forEach(child => child.userData.update?.(dt));

        updateUnderwaterEffect();
        updatePlayerOxygen(dt);
        updateSharkDamage(dt);
        updateBoost(dt);
        updateCamera(dt);
    }

    checkGameOver();
    checkTotemVictory();
    updateHUD2D();

    // Render main scene
    renderer.clear();
    renderer.render(scene, camera);

    // Render HUD
    renderer.clearDepth();
    updateHUDFish();
    renderer.render(hudScene, hudCamera);

    stats.end(); // End frame
}

// Loading manager setup
function setupLoadingManager() {
    loadingManager = new THREE.LoadingManager(
        () => console.log("Resource Loaded!"),
        (url, itemsLoaded, itemsTotal) => updateLoadingBar(itemsLoaded / itemsTotal),
        (err) => console.error('Resource loading error:', err)
    );

    textureLoader = new THREE.TextureLoader(loadingManager);
    gltfLoader = new THREE.GLTFLoader(loadingManager);
    cubeLoader = new THREE.CubeTextureLoader(loadingManager);

    Promise.all([loadTextures(), loadSceneModels()])
        .then(() => {
            loadingComplete = true;
            loadScene(); // All resources are ready
        })
        .catch(err => console.error('Error loading resources:', err));
}

// Update progress bar based on loading progress
function updateLoadingBar(progress) {
    loadingProgress = THREE.MathUtils.clamp(progress, 0, 1);
}

// Render the loading screen
function renderLoadingScreen() {
    if (loadingBarMesh) {
        loadingBarMesh.scale.x += (loadingProgress - loadingBarMesh.scale.x) * 0.1;
    }
    renderer.clear();
    renderer.render(loadingScene, loadingCamera);
}
