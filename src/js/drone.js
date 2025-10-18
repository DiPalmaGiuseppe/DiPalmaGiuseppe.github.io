let droneVelocity = new THREE.Vector3();
let keyboard;

function updateDrone(dt) {
    const k = keyboard; // Reference to global keyboard input
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(drone.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(drone.quaternion);
    const accel = 4.0; // Acceleration factor

    // --- Movement controls ---
    if (k.isDown('KeyW')) droneVelocity.add(forward.clone().multiplyScalar(accel * dt));
    if (k.isDown('KeyS')) droneVelocity.add(forward.clone().multiplyScalar(-accel * dt));
    if (k.isDown('KeyA')) droneVelocity.add(right.clone().multiplyScalar(-accel * dt));
    if (k.isDown('KeyD')) droneVelocity.add(right.clone().multiplyScalar(accel * dt));
    if (k.isDown('KeyQ')) droneVelocity.y += accel * dt; // ascend
    if (k.isDown('KeyE')) droneVelocity.y -= accel * dt; // descend

    // --- Rotation controls ---
    if (k.isDown('ArrowLeft')) drone.rotation.y += drone.userData.rotationSpeed * dt;
    if (k.isDown('ArrowRight')) drone.rotation.y -= drone.userData.rotationSpeed * dt;
    if (k.isDown('ArrowUp')) drone.rotation.x += drone.userData.rotationSpeed * dt;
    if (k.isDown('ArrowDown')) drone.rotation.x -= drone.userData.rotationSpeed * dt;

    // --- Apply velocity damping ---
    droneVelocity.multiplyScalar(0.98);

    // --- Update drone position ---
    drone.position.add(droneVelocity.clone());

    // Prevent drone from going below floor
    if (drone.position.y < 0.5) drone.position.y = 0.5;
}
