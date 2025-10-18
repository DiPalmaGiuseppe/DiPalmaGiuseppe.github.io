function setupLights(scene) {
    // --- Ambient light for general illumination (does not cast shadows) ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    // --- Main directional light (casts shadows over the scene) ---
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 100, 50); // elevated and diagonal
    dir.castShadow = true;

    const s = TERRAIN_SIZE / 2;
    dir.shadow.camera.left = -s;
    dir.shadow.camera.right = s;
    dir.shadow.camera.top = s;
    dir.shadow.camera.bottom = -s;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 200;
    dir.shadow.mapSize.width = 1024; 
    dir.shadow.mapSize.height = 1024;

    scene.add(dir);

    // --- Spot light for accent lighting ---
    const spot = new THREE.SpotLight(0xcfefff, 0.2);
    spot.position.set(0, 50, 0);
    spot.angle = Math.PI / 6;
    spot.penumbra = 0.2;
    spot.castShadow = true;
    scene.add(spot);
}
