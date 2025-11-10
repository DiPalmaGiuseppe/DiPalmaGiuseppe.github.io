// === LOAD TEXTURES ===
function loadTextures() {
    return new Promise((resolve, reject) => {
        let loadedCount = 0;
        const totalToLoad = 3; // sand, rock, cubemap

        // check if all required textures are loaded
        function checkDone() {
            loadedCount++;
            if (loadedCount === totalToLoad) resolve();
        }

        // --- SAND TEXTURE ---
        const sandT = textureLoader.load('textures/sand.jpg', checkDone, undefined, reject);
        sandT.wrapS = sandT.wrapT = THREE.RepeatWrapping;
        sandT.repeat.set(1, 1);
        textures.sandT = sandT;

        // --- ROCK TEXTURE ---
        const rockT = textureLoader.load('textures/rock.jpg', checkDone, undefined, reject);
        rockT.wrapS = rockT.wrapT = THREE.RepeatWrapping;
        rockT.repeat.set(1, 1);
        textures.rockT = rockT;

        // --- ADDITIONAL TEXTURES (non-counted) ---
        const rockTotemT = textureLoader.load('textures/rock_2.jpg');
        rockTotemT.wrapS = rockTotemT.wrapT = THREE.RepeatWrapping;
        rockTotemT.repeat.set(1, 1);
        textures.rockTotemT = rockTotemT;

        const metalT = textureLoader.load('textures/red_metal.jpg');
        metalT.wrapS = metalT.wrapT = THREE.RepeatWrapping;
        metalT.repeat.set(1, 1);
        textures.metalT = metalT;

        const metalGoldT = textureLoader.load('textures/gold_metal.jpg');
        metalGoldT.wrapS = metalGoldT.wrapT = THREE.RepeatWrapping;
        metalGoldT.repeat.set(1, 1);
        textures.metalGoldT = metalGoldT;

        // --- CUBEMAP / BACKGROUND ---
        const urls = [
            'textures/background_2/px.jpg',
            'textures/background_2/nx.jpg',
            'textures/background_2/py.jpg',
            'textures/background_2/ny.jpg',
            'textures/background_2/pz.jpg',
            'textures/background_2/nz.jpg',
        ];

        cubeLoader.load(
            urls,
            cube => {
                textures.backgroundT = cube; // assign cubemap
                checkDone();
            },
            undefined,
            err => reject(err)
        );
    });
}
