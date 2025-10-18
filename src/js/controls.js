// === CAMERA CONTROLS ===
const keys = {}; // keeps track of pressed keys
const cameraVelocity = new THREE.Vector3(); // camera movement velocity
const cameraSpeed = 10; // base movement speed
const cameraCollisionRadius = 2; // minimum distance from fish

// --- Keyboard input ---
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// Pointer lock for mouse movement
document.body.onclick = () => document.body.requestPointerLock();

let yaw = 0;   // horizontal rotation
let pitch = 0; // vertical rotation

// --- Mouse movement ---
document.addEventListener("mousemove", e => {
    const sensitivity = 0.002;
    if (!camera) return;

    yaw -= e.movementX * sensitivity;

    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.quaternion.copy(quaternion);
});

// --- Terrain height function ---
function getTerrainHeight(x, z) {
    const dune1 = Math.sin(x * 0.1) * 2;
    const dune2 = Math.cos(z * 0.15) * 1.5;
    return dune1 + dune2;
}

// --- Update camera per frame ---
function updateCamera(dt) {
    if (!camera) return;

    // local movement vectors
    const backward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const left = new THREE.Vector3().crossVectors(backward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (keys["KeyW"]) move.add(backward.clone().negate());
    if (keys["KeyS"]) move.add(backward);
    if (keys["KeyA"]) move.add(left);
    if (keys["KeyD"]) move.add(left.clone().negate());
    if (keys["KeyE"]) move.y += 1;
    if (keys["KeyQ"]) move.y -= 1;

    // calculate camera velocity
    if (move.length() > 0) {
        move.normalize();
        move.multiplyScalar(getCurrentSpeed());
        cameraVelocity.copy(move);
    } else {
        cameraVelocity.multiplyScalar(0.9); // friction when not moving
    }

    // handle boost
    updateBoost(dt);

    // apply movement
    camera.position.add(cameraVelocity.clone().multiplyScalar(dt));

    // keep camera above terrain
    const terrainY = getTerrainHeight(camera.position.x, camera.position.z);
    if (camera.position.y < terrainY + 0.5) camera.position.y = terrainY + 0.5;

    // keep camera inside aquarium
    const halfSize = TERRAIN_SIZE / 2 - 1;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfSize, halfSize);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfSize, halfSize);

    // clamp max height
    const glassHeight = 45;
    camera.position.y = Math.min(camera.position.y, glassHeight - 1);

    // prevent camera from passing through fish
    preventCameraThroughFish();
}

// --- Boost handling ---
function updateBoost(dt) {
    const shiftPressed = keys["ShiftLeft"] || keys["ShiftRight"];

    if (shiftPressed && playerBoost > 0 && canBoost) {
        boostActive = true;
        playerBoost -= BOOST_CONSUME_RATE * dt;

        if (playerBoost <= 0) {
            playerBoost = 0;
            canBoost = false;
            boostActive = false;
        }
    } else {
        boostActive = false;

        if (!shiftPressed) {
            canBoost = true;
            playerBoost += BOOST_RECOVER_RATE * dt;
            playerBoost = Math.min(playerBoost, MAX_BOOST);
        }
    }
}

// --- Current speed based on boost ---
function getCurrentSpeed() {
    return boostActive ? cameraSpeed * 2 : cameraSpeed;
}

// --- Prevent camera from passing through fish ---
function preventCameraThroughFish() {
    for (const fish of fishData) {
        const mesh = fish.mesh;
        const fishPos = mesh.position;
        const toCamera = new THREE.Vector3().subVectors(camera.position, fishPos);
        const distance = toCamera.length();

        if (distance < cameraCollisionRadius) {
            // push camera back along vector from fish center
            const pushDir = toCamera.normalize();
            camera.position.copy(fishPos.clone().add(pushDir.multiplyScalar(cameraCollisionRadius)));
        }
    }
}
 