/* globals BABYLON */
let canvas;
let engine;
let scene;
let score = 0;
let tank = {};
let ui = {};
let text1;
const inputStates = {};
let materials = {};
let i = 0;
window.onload = startGame;

function startGame () {
  canvas = document.querySelector('#myCanvas');
  engine = new BABYLON.Engine(canvas, true);
  scene = createScene();

  // enable physics
  scene.enablePhysics();

  // modify some default settings (i.e pointer events to prevent cursor to go
  // out of the game window)
  modifySettings();

  scene.tanks = [];

  scene.toRender = () => {
    // const deltaTime = engine.getDeltaTime(); // remind you something ?

    tank.move();
    tank.fireLasers(); // will fire only if space is pressed !

    moveOtherTanks();

    scene.render();
  };

  ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('ui');
  text1 = new BABYLON.GUI.TextBlock();
  text1.text = 'Score: 0';
  text1.color = 'white';
  text1.fontSize = 24;
  text1.left = '-46%';
  text1.top = '-45%';
  text1.horizontalAlignment = 0;
  ui.addControl(text1);

  // instead of running the game, we tell instead the asset manager to load.
  // when finished it will execute its onFinish callback that will run the loop
  scene.assetsManager.load();
}

function createScene () {
  const scene = new BABYLON.Scene(engine);

  scene.assetsManager = configureAssetManager(scene);

  const ground = createGround(scene); // eslint-disable-line no-unused-vars
  // let freeCamera = createFreeCamera(scene);

  const tankBodyMaterial = new BABYLON.StandardMaterial('tankBodyMaterial', scene);
  tankBodyMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0);
  tankBodyMaterial.emissiveColor = new BABYLON.Color3(0, 0.2, 0);

  const tankTurretMaterial = new BABYLON.StandardMaterial('tankTurretMaterial', scene);
  tankTurretMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0);
  tankTurretMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0);

  const tankGunMaterial = new BABYLON.StandardMaterial('tankGunMaterial', scene);
  tankGunMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0);
  tankGunMaterial.emissiveColor = new BABYLON.Color3(0, 0.4, 0);

  const tankLaserMaterial = new BABYLON.StandardMaterial('tankLaserMaterial', scene);
  tankLaserMaterial.diffuseColor = new BABYLON.Color3(0.6, 0, 0);
  tankLaserMaterial.emissiveColor = new BABYLON.Color3(0.4, 0, 0);
  tankLaserMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

  const enemyBodyMaterial = new BABYLON.StandardMaterial('enemyBodyMaterial', scene);
  enemyBodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0, 0);
  enemyBodyMaterial.emissiveColor = new BABYLON.Color3(0.2, 0, 0);

  const enemyTurretMaterial = new BABYLON.StandardMaterial('enemyTurretMaterial', scene);
  enemyTurretMaterial.diffuseColor = new BABYLON.Color3(0.6, 0, 0);
  enemyTurretMaterial.emissiveColor = new BABYLON.Color3(0.3, 0, 0);

  const enemyGunMaterial = new BABYLON.StandardMaterial('enemyGunMaterial', scene);
  enemyGunMaterial.diffuseColor = new BABYLON.Color3(0.6, 0, 0);
  enemyGunMaterial.emissiveColor = new BABYLON.Color3(0.4, 0, 0);

  materials = {
    tankBodyMaterial,
    tankTurretMaterial,
    tankGunMaterial,
    tankLaserMaterial,
    enemyBodyMaterial,
    enemyTurretMaterial,
    enemyGunMaterial
  };

  tank = createTank(scene, 'heroTank', true, materials.tankBodyMaterial, materials.tankTurretMaterial, materials.tankGunMaterial, materials.tankLaserMaterial);

  // Create tanks forever every 3000 seconds
  setInterval(() => {
    scene.tanks.push(createTank(scene, 'enemyTank' + i, false, materials.enemyBodyMaterial, materials.enemyTurretMaterial, materials.enemyGunMaterial, null));
    i++;
  }, 3000);

  // second parameter is the target to follow
  scene.followCameraTank = createFollowCamera(scene, tank.gun);
  scene.activeCamera = scene.followCameraTank;

  createLights(scene);

  loadSounds(scene);

  return scene;
}

function configureAssetManager (scene) {
  // useful for storing references to assets as properties. i.e scene.assets.cannonsound, etc.
  scene.assets = {};

  const assetsManager = new BABYLON.AssetsManager(scene);

  assetsManager.onProgress = function (
    remainingCount,
    totalCount,
    lastFinishedTask
  ) {
    engine.loadingUIText =
      'We are loading the scene. ' +
      remainingCount +
      ' out of ' +
      totalCount +
      ' items still need to be loaded.';
  };

  assetsManager.onFinish = function (tasks) {
    engine.runRenderLoop(function () {
      scene.toRender();
    });
  };

  return assetsManager;
}

function loadSounds (scene) {
  const assetsManager = scene.assetsManager;

  let binaryTask = assetsManager.addBinaryFileTask('laser', 'sounds/laser.wav');
  binaryTask.onSuccess = function (task) {
    scene.assets.laserSound = new BABYLON.Sound('laser', task.data, scene, null,
      { loop: false }
    );
  };

  binaryTask = assetsManager.addBinaryFileTask('explosion', 'sounds/explosion.wav');
  binaryTask.onSuccess = function (task) {
    scene.assets.explosion = new BABYLON.Sound(
      'explosion',
      task.data,
      scene,
      null,
      { loop: false }
    );
  };

  binaryTask = assetsManager.addBinaryFileTask('hit', 'sounds/hit.wav');
  binaryTask.onSuccess = function (task) {
    scene.assets.hit = new BABYLON.Sound(
      'hit',
      task.data,
      scene,
      null,
      { loop: false }
    );
  };

  binaryTask = assetsManager.addBinaryFileTask('kill', 'sounds/kill.wav');
  binaryTask.onSuccess = function (task) {
    scene.assets.kill = new BABYLON.Sound(
      'kill',
      task.data,
      scene,
      null,
      { loop: false }
    );
  };
}

function createGround (scene) {
  const groundOptions = {
    width: 2000,
    height: 2000,
    subdivisions: 200,
    minHeight: 0,
    maxHeight: 1000,
    onReady: onGroundCreated
  };
  // scene is optional and defaults to the current scene
  const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
    'gdhm',
    'images/hmap1.jpg',
    groundOptions,
    scene
  );

  function onGroundCreated () {
    const groundMaterial = new BABYLON.StandardMaterial(
      'groundMaterial',
      scene
    );
    groundMaterial.diffuseTexture = new BABYLON.Texture('images/grass.jpg');
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = groundMaterial;
    // to be taken into account by collision detection
    ground.checkCollisions = true;
    ground.optimize(512);
    // groundMaterial.wireframe = true;

    // for physic engine
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
      ground,
      BABYLON.PhysicsImpostor.HeightmapImpostor,
      { mass: 0 },
      scene
    );
  }
  return ground;
}

function createLights (scene) {
  // i.e sun light with all light rays parallels, the vector is the direction.
  const light0 = new BABYLON.DirectionalLight( // eslint-disable-line no-unused-vars
    'dir0',
    new BABYLON.Vector3(0, -1, 0),
    scene
  );
}

function createFollowCamera (scene, target) {
  const targetName = target.name;

  // use the target name to name the camera
  const camera = new BABYLON.FollowCamera(
    targetName + 'FollowCamera',
    target.position,
    scene,
    target
  );

  // default values
  camera.radius = 120; // how far from the object to follow
  camera.heightOffset = 30; // how high above the object to place the camera
  camera.rotationOffset = 0; // the viewing angle
  camera.cameraAcceleration = 0.1; // how fast to move
  camera.maxCameraSpeed = 5; // speed limit

  return camera;
}

function createTank (scene, tankName, isHeroTank, tankBodyMaterial, tankTurretMaterial, tankGunMaterial, tankLaserMaterial) {
  const tank = {
    body: new BABYLON.MeshBuilder.CreateBox(tankName, { height: 10, depth: 50, width: 30 }, scene),
    turret: new BABYLON.MeshBuilder.CreateBox(tankName + 'Turret', { height: 5, depth: 30, width: 20 }, scene),
    gun: new BABYLON.MeshBuilder.CreateBox(tankName + 'Gun', { height: 2, depth: 40, width: 2 }, scene)
  };

  tank.body.tank = tank;
  tank.turret.tank = tank;
  tank.gun.tank = tank;

  tank.health = 3;

  tank.body.material = tankBodyMaterial;
  tank.turret.material = tankTurretMaterial;
  tank.gun.material = tankGunMaterial;

  // By default the box/tank is in 0, 0, 0, let's change that...
  tank.body.position.y = 5.1;
  tank.turret.position.y = 12.5;
  tank.gun.position.y = 12.5;
  tank.gun.position.z = 35;
  tank.gun.rotation.y = Math.PI;

  tank.speed = 1;
  if (isHeroTank) {
    tank.body.frontVector = new BABYLON.Vector3(0, 0, 1);
    tank.turret.frontVector = new BABYLON.Vector3(0, 0, 1);
  } else {
    const random = Math.floor(Math.random() * 4);
    const angle = random * Math.PI / 2;
    tank.body.rotation.y += angle;
    tank.turret.rotation.y += angle;
    tank.gun.rotation.y += angle;
    tank.body.frontVector = new BABYLON.Vector3(Math.sin(tank.body.rotation.y), 0, Math.cos(tank.body.rotation.y));
    tank.turret.frontVector = new BABYLON.Vector3(Math.sin(tank.turret.rotation.y), tank.gun.rotation.x, Math.cos(tank.turret.rotation.y));

    switch (random) {
      case 0:
        tank.body.position.z = -949;
        tank.body.position.x = Math.random() * 1898 - 949;
        break;
      case 1:
        tank.body.position.x = -949;
        tank.body.position.z = Math.random() * 1898 - 949;
        break;
      case 2:
        tank.body.position.z = 949;
        tank.body.position.x = Math.random() * 1898 - 949;
        break;
      case 3:
        tank.body.position.x = 949;
        tank.body.position.z = Math.random() * 1898 - 949;
    }
  }

  tank.turret.move = () => {
    tank.turret.position.x = tank.body.position.x;
    tank.turret.position.y = tank.body.position.y + 7.5;
    tank.turret.position.z = tank.body.position.z;
  };

  tank.gun.move = () => {
    tank.gun.position.x = tank.turret.position.x - Math.sin(tank.gun.rotation.y) * 30;
    tank.gun.position.y = tank.turret.position.y + Math.sin(tank.gun.rotation.x) * 20;
    tank.gun.position.z = tank.turret.position.z - Math.cos(tank.gun.rotation.y) * 30;
  };

  tank.move = () => {
    if (isHeroTank) {
      if (inputStates.up) {
        tank.body.moveWithCollisions(tank.body.frontVector.multiplyByFloats(tank.speed, tank.speed, tank.speed));
      }
      if (inputStates.down) {
        tank.body.moveWithCollisions(tank.body.frontVector.multiplyByFloats(-tank.speed, -tank.speed, -tank.speed));
      }
      if (inputStates.left) {
        tank.body.rotation.y -= 0.02;
        tank.turret.rotation.y -= 0.02;
        tank.gun.rotation.y -= 0.02;

        tank.body.frontVector = new BABYLON.Vector3(Math.sin(tank.body.rotation.y), 0, Math.cos(tank.body.rotation.y));
      }
      if (inputStates.right) {
        tank.body.rotation.y += 0.02;
        tank.turret.rotation.y += 0.02;
        tank.gun.rotation.y += 0.02;

        tank.body.frontVector = new BABYLON.Vector3(Math.sin(tank.body.rotation.y), 0, Math.cos(tank.body.rotation.y));
      }
      if (inputStates.leftTurret) {
        tank.turret.rotation.y -= 0.012;
        tank.gun.rotation.y -= 0.012;
      }
      if (inputStates.rightTurret) {
        tank.turret.rotation.y += 0.012;
        tank.gun.rotation.y += 0.012;
      }
      if (inputStates.upTurret) {
        tank.gun.rotation.x = Math.min(tank.gun.rotation.x + 0.005, 0.2);
      }
      if (inputStates.downTurret) {
        tank.gun.rotation.x = Math.max(tank.gun.rotation.x - 0.005, -0.2);
      }
    } else {
      tank.body.moveWithCollisions(tank.body.frontVector.multiplyByFloats(tank.speed, tank.speed, tank.speed));

      if (tank.body.position.x > 950 || tank.body.position.x < -950 || tank.body.position.z > 950 || tank.body.position.z < -950) {
        tank.die();
      }
    }
    tank.turret.frontVector = new BABYLON.Vector3(Math.sin(tank.turret.rotation.y), tank.gun.rotation.x, Math.cos(tank.turret.rotation.y));

    tank.turret.move();
    tank.gun.move();
  };

  tank.die = () => {
    tank.body.dispose();
    tank.turret.dispose();
    tank.gun.dispose();
    scene.assets.explosion.setVolume(0.4);
    scene.assets.explosion.play();
    scene.tanks.splice(scene.tanks.indexOf(tank), 1);
    score++;
    scene.assets.kill.setVolume(0.4);
    scene.assets.kill.play();
    text1.text = 'Score: ' + score;
  };

  tank.decreaseHealth = () => {
    tank.health--;

    if (tank.health <= 0) {
      tank.die();
    } else {
      scene.assets.hit.setVolume(0.4);
      scene.assets.hit.play();
    }
  };

  if (isHeroTank) {
    // to avoid firing too many lasers rapidly
    tank.canFireLasers = true;
    tank.fireLasersAfter = 0.5; // in seconds

    tank.fireLasers = function () {
      // is the l key pressed ?
      if (!inputStates.laser) return;

      if (!this.canFireLasers) return;

      // ok, we fire, let's put the above property to false
      this.canFireLasers = false;

      // let's be able to fire again after a while
      setTimeout(() => {
        this.canFireLasers = true;
      }, 1000 * this.fireLasersAfter);

      scene.assets.laserSound.setVolume(0.3);
      scene.assets.laserSound.play();

      // create a ray
      const origin = new BABYLON.Vector3(
        this.gun.position.x - Math.sin(tank.gun.rotation.y) * 20,
        this.gun.position.y + Math.sin(tank.gun.rotation.x) * 20,
        this.gun.position.z - Math.cos(tank.gun.rotation.y) * 20
      ); // position of the tank
      // let origin = this.position.add(this.frontVector);

      // Looks a little up (0.1 in y)
      const direction = new BABYLON.Vector3(
        this.turret.frontVector.x,
        this.turret.frontVector.y,
        this.turret.frontVector.z
      );
      const length = 2000;
      const ray = new BABYLON.Ray(origin, direction, length);

      // what did the ray touched?

      // See also multiPickWithRay if you want to kill "through" multiple objects
      // this would return an array of boundingBoxes.... instead of one.

      const pickInfo = scene.pickWithRay(ray, (mesh) => {
        /*
              if((mesh.name === "heroTank")|| ((mesh.name === "ray"))) return false;
              return true;
              */
        return mesh.name.startsWith('enemy') || mesh.name.startsWith('gdhm');
      });

      // to make the ray visible :

      if (pickInfo && pickInfo.pickedPoint) {
        const laser = new BABYLON.MeshBuilder.CreateBox(tankName + 'Laser', { height: 1, depth: BABYLON.Vector3.Distance(origin, pickInfo.pickedPoint), width: 1 }, scene);

        laser.position = pickInfo.pickedPoint.add(origin.subtract(pickInfo.pickedPoint).divide(new BABYLON.Vector3(2, 2, 2)));

        laser.material = tankLaserMaterial;

        laser.rotation = tank.gun.rotation;

        setTimeout(() => laser.dispose(), 100);
      }

      if (pickInfo.pickedMesh && pickInfo.pickedMesh.name.startsWith('enemyTank')) {
        // sometimes it's null for whatever reason...?
        // the mesh is a bounding box of a dude
        const bounder = pickInfo.pickedMesh;
        const enemy = bounder.tank;
        // let's decrease the tank health, pass him the hit point
        enemy.decreaseHealth();
      }
    };
  }

  return tank;
}

function moveOtherTanks () {
  if (scene.tanks) {
    for (let i = 0; i < scene.tanks.length; i++) {
      scene.tanks[i].move();
    }
  }
}

window.addEventListener('resize', () => {
  engine.resize();
});

function modifySettings () {
  window.addEventListener('keydown', (event) => {
    if ((event.key === 'q') || (event.key === 'Q')) {
      inputStates.left = true;
    } else if ((event.key === 'z') || (event.key === 'Z')) {
      inputStates.up = true;
    } else if ((event.key === 'd') || (event.key === 'D')) {
      inputStates.right = true;
    } else if ((event.key === 's') || (event.key === 'S')) {
      inputStates.down = true;
    } else if (event.key === 'ArrowRight') {
      inputStates.rightTurret = true;
    } else if (event.key === 'ArrowLeft') {
      inputStates.leftTurret = true;
    } else if (event.key === 'ArrowUp') {
      inputStates.upTurret = true;
    } else if (event.key === 'ArrowDown') {
      inputStates.downTurret = true;
    } else if (event.key === ' ') {
      inputStates.laser = true;
    }
  }, false);

  window.addEventListener('keyup', (event) => {
    if ((event.key === 'q') || (event.key === 'Q')) {
      inputStates.left = false;
    } else if ((event.key === 'z') || (event.key === 'Z')) {
      inputStates.up = false;
    } else if ((event.key === 'd') || (event.key === 'D')) {
      inputStates.right = false;
    } else if ((event.key === 's') || (event.key === 'S')) {
      inputStates.down = false;
    } else if (event.key === 'ArrowRight') {
      inputStates.rightTurret = false;
    } else if (event.key === 'ArrowLeft') {
      inputStates.leftTurret = false;
    } else if (event.key === 'ArrowUp') {
      inputStates.upTurret = false;
    } else if (event.key === 'ArrowDown') {
      inputStates.downTurret = false;
    } else if (event.key === ' ') {
      inputStates.laser = false;
    }
  }, false);
}
