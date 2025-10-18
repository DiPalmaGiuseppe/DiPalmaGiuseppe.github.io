// === PLAYER OXYGEN AND HEALTH ===
function updatePlayerOxygen(dt) {
    const waterSurfaceY = 40; // water surface height
    const underwater = camera.position.y < waterSurfaceY;

    if (underwater) {
        // drain oxygen underwater
        playerOxygen -= OXYGEN_DRAIN_RATE * dt;
        playerOxygen = Math.max(playerOxygen, 0);

        // lose health if oxygen reaches 0
        if (playerOxygen <= 0) {
            playerHealth -= HEALTH_LOSS_ON_NO_OXYGEN * dt;
            playerHealth = Math.max(playerHealth, 0);
        }
    } else {
        // refill oxygen above water
        playerOxygen += OXYGEN_REFILL_RATE * dt;
        playerOxygen = Math.min(playerOxygen, MAX_OXYGEN);
    }
}

// === SHARK DAMAGE ===
let sharkDamageCooldown = 0.5; // time between consecutive hits
let sharkDamageTimer = 0;

function updateSharkDamage(dt) {
    sharkDamageTimer -= dt;
    if (sharkDamageTimer > 0) return;

    // camera bounding box for collision
    const cameraBox = new THREE.Box3().setFromCenterAndSize(camera.position, new THREE.Vector3(1, 1, 1));

    for (const shark of sharkData) {
        const sharkBox = new THREE.Box3().setFromObject(shark.mesh);
        if (cameraBox.intersectsBox(sharkBox)) {
            // decrease player health on collision
            playerHealth -= SHARK_DAMAGE;
            playerHealth = Math.max(playerHealth, 0);
            sharkDamageTimer = sharkDamageCooldown;
            break;
        }
    }
}

// === GAME OVER LOGIC ===
let retryText;
let savedFogColor, savedFogDensity;

function checkGameOver() {
    if (playerHealth <= 0 && !gameOver) {
        gameOver = true;

        // save original fog
        savedFogColor = scene.fog.color.clone();
        savedFogDensity = scene.fog.density;

        // darken scene
        scene.fog.color.set(0x000000);
        scene.fog.density = 0.1;

        // display GAME OVER message
        retryText = makeTextSprite("GAME OVER\nPRESS R TO RETRY", "#ff0000", 48);
        retryText.position.set(window.innerWidth / 2, window.innerHeight / 2, 1);
        hudScene.add(retryText);
    }
}

// --- RESET GAME ---
window.addEventListener("keydown", (e) => {
    if (e.code === "KeyR" && gameOver) {
        resetGame();
    }
});

function resetGame() {
    playerHealth = MAX_HEALTH;
    playerOxygen = MAX_OXYGEN;
    gameOver = false;

    // restore original fog
    scene.fog.color.copy(savedFogColor);
    scene.fog.density = savedFogDensity;

    if (retryText) {
        hudScene.remove(retryText);
        retryText = null;
    }

    // reset camera position
    camera.position.set(0, start_y, 0);
}

// === SHARK MOVEMENT AND AI ===
const SHARK_DAMAGE = 20;
const SHARK_COLLISION_RADIUS = 2;
const SHARK_ATTACK_RADIUS = 25;
const SHARK_ATTACK_SPEED_MULT = 5;

function updateShark(shark, dt) {
    const mesh = shark.mesh;
    const effectiveDt = dt * shark.baseSpeed;

    const playerPos = camera.position.clone();
    const sharkPos = mesh.position;
    const distanceToPlayer = sharkPos.distanceTo(playerPos);

    let currentSpeed = shark.speed;

    if (distanceToPlayer <= SHARK_ATTACK_RADIUS) {
        // chase player
        shark.targetDir.lerp(playerPos.clone().sub(sharkPos).normalize(), 0.2);
        currentSpeed *= SHARK_ATTACK_SPEED_MULT; // increase speed during attack
    } else {
        // wandering inside aquarium boundaries
        const limit = TERRAIN_SIZE / 2 - 5;
        if (mesh.position.x < -limit || mesh.position.x > limit ||
            mesh.position.z < -limit || mesh.position.z > limit) {
            // return to center
            const toCenter = new THREE.Vector3(0, mesh.position.y, 0).sub(mesh.position).normalize();
            shark.targetDir.lerp(toCenter, 0.05).normalize();
            shark.changeTimer = 2 + Math.random() * 2;
        }
    }

    // smooth rotation towards targetDir
    const forwardAxis = modelAxes[shark.name] || new THREE.Vector3(0, 0, 1);
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(forwardAxis.clone(), shark.targetDir.clone());
    mesh.quaternion.slerp(targetQuat, 0.1 * shark.baseSpeed);

    // move along targetDir
    mesh.position.add(shark.targetDir.clone().multiplyScalar(currentSpeed * effectiveDt));

    // gentle vertical bobbing
    mesh.position.y += Math.sin(Date.now() * 0.002 + mesh.position.x + mesh.position.z) * 0.005 * shark.baseSpeed;

    // clamp vertical position
    mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, 5, 25);
}

// === FISH MOVEMENT AND AI ===
function updateFish(fish, dt) { 
    const mesh = fish.mesh; const effectiveDt = dt * fish.baseSpeed;
    // --- Boundary handling --- 
    const limit = TERRAIN_SIZE / 2 - 5;
    if (mesh.position.x < -limit || mesh.position.x > limit
        || mesh.position.z < -limit || mesh.position.z > limit) {
        const center = new THREE.Vector3(0, mesh.position.y, 0);
        const toCenter = center.clone().sub(mesh.position).normalize();
        fish.targetDir.lerp(toCenter, 0.05).normalize();
        fish.changeTimer = 2 + Math.random() * 2; }
        
        // --- Smooth horizontal rotation (yaw) ---
        const forwardAxis = modelAxes[fish.name] || new THREE.Vector3(0, 0, 1);
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(forwardAxis.clone(), fish.targetDir.clone());
        mesh.quaternion.slerp(targetQuat, 0.1 * fish.baseSpeed);
        
        // --- Move along targetDir ---
        const moveDir = fish.targetDir.clone().normalize();
        mesh.position.add(moveDir.multiplyScalar(fish.speed * effectiveDt));
        
        // --- Gentle vertical bobbing ---
        mesh.position.y += Math.sin(Date.now() * 0.002 + mesh.position.x + mesh.position.z) * 0.005 * fish.baseSpeed;
        
        // --- Clamp vertical position --- 
        if (mesh.position.y < 5) mesh.position.y = 5;
        if (mesh.position.y > 25) mesh.position.y = 25; 
}    

// === FISH COLLECTION ===
const FISH_PICKUP_RADIUS = 5;
let collectedFish = [];

window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") {
        attemptCatchFish();
    }
});

function attemptCatchFish() {
    const playerPos = camera.position.clone();

    for (let i = fishData.length - 1; i >= 0; i--) {
        const fish = fishData[i];
        const fishPos = fish.mesh.position;
        const distance = playerPos.distanceTo(fishPos);

        if (distance <= FISH_PICKUP_RADIUS) {
            // fish collected
            collectedFish.push(fish); // could add to inventory later
            scene.remove(fish.mesh);  // remove from scene
            fishData.splice(i, 1);    // remove from update list

            break; // only catch one fish at a time
        }
    }
}

// === TOTEM VICTORY ===
let victoryTriggered = false;
let victorySprite;

function checkTotemVictory() {
    if (victoryTriggered) return;

    const totem = seabed.children.find(c => c.type === "Group" && c.name === "totemPlane");
    const playerPos = camera.position;
    const totemReachDistance = 10;
    const goalPos = new THREE.Vector3(0, totem.position.y + 10, 0);
    const dist = playerPos.distanceTo(goalPos);

    if (dist < totemReachDistance && hudFishTypes.size >= 2) {
        victoryTriggered = true;
        showVictoryHUD();
    }
}

function restartAfterVictory() {
    window.location.reload();
}
