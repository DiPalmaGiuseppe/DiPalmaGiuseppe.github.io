// === HUD CONSTANTS ===
const MAX_HEALTH = 100;
const MAX_OXYGEN = 100;
const MAX_BOOST = 5; // max seconds of boost
const BOOST_CONSUME_RATE = 1.5; // stamina decrease per second
const BOOST_RECOVER_RATE = 0.5; // stamina regen per second

// === HUD VARIABLES ===
let hudScene, hudCamera;
let healthBarMesh, oxygenBarMesh, boostBarMesh;
let healthLabel, oxygenLabel, boostLabel;

let playerHealth = MAX_HEALTH;
let playerOxygen = MAX_OXYGEN;
let playerBoost = MAX_BOOST;
let boostActive = false;
let canBoost = true; // prevents boosting when stamina is 0

// === HUD SETUP ===
function createHUD2D() {
    hudScene = new THREE.Scene();
    hudCamera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, -1, 1);

    const barWidth = window.innerWidth * 0.15;
    const barHeight = window.innerHeight * 0.05;
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const barGeom = new THREE.PlaneGeometry(barWidth, barHeight);

    const healthMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const oxygenMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const boostMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // yellow

    // --- Background bars ---
    const healthBG = new THREE.Mesh(barGeom, bgMat);
    const oxygenBG = new THREE.Mesh(barGeom, bgMat);
    const boostBG = new THREE.Mesh(barGeom, bgMat);

    // --- Foreground bars ---
    const healthBar = new THREE.Mesh(barGeom, healthMat);
    const oxygenBar = new THREE.Mesh(barGeom, oxygenMat);
    const boostBar = new THREE.Mesh(barGeom, boostMat);

    const margin = 30;
    const spacing = 15;
    const baseY = margin + barHeight * 3;

    healthBG.position.set(barWidth / 2 + margin, baseY + barHeight * 2 + spacing * 2, 0);
    oxygenBG.position.set(barWidth / 2 + margin, baseY + barHeight + spacing, 0);
    boostBG.position.set(barWidth / 2 + margin, baseY, 0);

    healthBar.position.copy(healthBG.position).setZ(0.1);
    oxygenBar.position.copy(oxygenBG.position).setZ(0.1);
    boostBar.position.copy(boostBG.position).setZ(0.1);

    hudScene.add(healthBG, oxygenBG, boostBG, healthBar, oxygenBar, boostBar);

    healthBarMesh = healthBar;
    oxygenBarMesh = oxygenBar;
    boostBarMesh = boostBar;

    // --- Labels ---
    healthLabel = makeTextSprite("HEALTH", "#000000", 24);
    oxygenLabel = makeTextSprite("OXYGEN", "#000000", 24);
    boostLabel = makeTextSprite("BOOST", "#000000", 24);

    healthLabel.position.set(healthBG.position.x, healthBG.position.y, 0.2);
    oxygenLabel.position.set(oxygenBG.position.x, oxygenBG.position.y, 0.2);
    boostLabel.position.set(boostBG.position.x, boostBG.position.y, 0.2);

    hudScene.add(healthLabel, oxygenLabel, boostLabel);

    window.addEventListener("resize", updateHUDCamera);
}

// --- Create text sprite ---
function makeTextSprite(text, color = "#000000", fontSize = 24) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const padding = 10;
    ctx.font = `bold ${fontSize}px Arial`;

    // measure text and resize canvas
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize * 1.6 + padding * 2;

    // redraw text
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // prevent blur

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width, canvas.height, 1);
    return sprite;
}

// --- Update HUD camera on window resize ---
function updateHUDCamera() {
    hudCamera.right = window.innerWidth;
    hudCamera.top = window.innerHeight;
    hudCamera.updateProjectionMatrix();
}

// --- Update HUD bars ---
function updateHUD2D() {
    healthBarMesh.scale.x = Math.max(0, playerHealth / MAX_HEALTH);
    oxygenBarMesh.scale.x = Math.max(0, playerOxygen / MAX_OXYGEN);
    boostBarMesh.scale.x = Math.max(0, playerBoost / MAX_BOOST);
}

// === LOADING SCREEN ===
function createLoadingScreen() {
    loadingScene = new THREE.Scene();
    loadingCamera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, -1, 1);

    const barWidth = window.innerWidth * 0.4;
    const barHeight = window.innerHeight * 0.03;

    const barGeom = new THREE.PlaneGeometry(barWidth, barHeight);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    loadingBarMesh = new THREE.Mesh(barGeom, barMat);
    loadingBarMesh.scale.x = 0;
    loadingBarMesh.position.set(window.innerWidth / 2, window.innerHeight / 2, 0.1);
    loadingScene.add(loadingBarMesh);

    const borderGeom = new THREE.PlaneGeometry(barWidth + 4, barHeight + 4);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    loadingBorderMesh = new THREE.Mesh(borderGeom, borderMat);
    loadingBorderMesh.position.copy(loadingBarMesh.position);
    loadingScene.add(loadingBorderMesh);

    loadingTextSprite = makeTextSprite("LOADING...", "#ffffff", 36);
    loadingTextSprite.position.set(window.innerWidth / 2, window.innerHeight / 2 + barHeight * 2, 0.2);
    loadingScene.add(loadingTextSprite);
}

// === HUD FISH ICONS ===
let hudFishGroup;
const FISH_HUD_SIZE = 100;
const FISH_HUD_MARGIN = 20;
const hudFishTypes = new Set();
const hudFishBoxes = [];
const hudFishTextures = {};

function createHUDFish() {
    hudFishGroup = new THREE.Group();
    hudScene.add(hudFishGroup);
}

function loadHUDFishTexture(fishName, path, callback) {
    if (hudFishTextures[fishName]) {
        if (callback) callback(hudFishTextures[fishName]);
        return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(path, (tex) => {
        hudFishTextures[fishName] = tex;
        if (callback) callback(tex);
    });
}

function updateHUDFish(dt = 0) {
    if (!hudFishGroup || !collectedFish) return;

    collectedFish.forEach(fish => {
        if (!hudFishTypes.has(fish.name)) {
            hudFishTypes.add(fish.name);

            // --- Background box ---
            const geom = new THREE.PlaneGeometry(FISH_HUD_SIZE, FISH_HUD_SIZE);
            const mat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
            const box = new THREE.Mesh(geom, mat);

            const xPos = window.innerWidth - FISH_HUD_MARGIN - FISH_HUD_SIZE / 2;
            const yPos = window.innerHeight - FISH_HUD_MARGIN - (FISH_HUD_SIZE + 10) * hudFishBoxes.length - FISH_HUD_SIZE / 2;
            box.position.set(xPos, yPos, 0);
            hudFishGroup.add(box);
            hudFishBoxes.push(box);

            // --- Fish image ---
            loadHUDFishTexture(fish.name, `img/${fish.name}.png`, (texture) => {
                const planeGeom = new THREE.PlaneGeometry(FISH_HUD_SIZE * 0.9, FISH_HUD_SIZE * 0.9);
                const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
                const plane = new THREE.Mesh(planeGeom, planeMat);
                plane.position.set(xPos, yPos, 1); // slightly in front of background
                hudFishGroup.add(plane);
            });
        }
    });
}

// === VICTORY HUD ===
let victoryBox, victoryText, restartText;

function showVictoryHUD() {
    if (!hudScene || !victoryTriggered) return;

    gameOver = true;
    controlsEnabled = false;

    // Save current fog
    savedFogColor = scene.fog.color.clone();
    savedFogDensity = scene.fog.density;

    // Darken background
    scene.fog.color.set(0x000000);
    scene.fog.density = 0.08;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // --- Background box ---
    const boxGeom = new THREE.PlaneGeometry(600, 200);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8 });
    victoryBox = new THREE.Mesh(boxGeom, boxMat);
    victoryBox.position.set(centerX, centerY, 0);
    hudScene.add(victoryBox);

    // --- Victory text ---
    victoryText = makeTextSprite("You Win!", "#ffff00", 128);
    victoryText.position.set(centerX, centerY + 20, 0.1);
    hudScene.add(victoryText);

    // --- Restart instruction ---
    restartText = makeTextSprite("Press R to restart", "#ffffff", 32);
    restartText.position.set(centerX, centerY - 70, 0.1);
    hudScene.add(restartText);

    // Restart listener
    function onKeyDown(e) {
        if (e.code === "KeyR" && victoryTriggered) {
            window.removeEventListener("keydown", onKeyDown);
            restartAfterVictory();
        }
    }
    window.addEventListener("keydown", onKeyDown);
}
