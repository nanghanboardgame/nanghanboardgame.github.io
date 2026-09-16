import * as THREE from 'https://esm.sh/three@0.160.0';
import { RoundedBoxGeometry } from 'https://esm.sh/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as CANNON from 'https://esm.sh/cannon-es@0.20.0';

const DICE_COLOR = '#ffcf2f';

function pipTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = '#020031';
  const positions = {
    1: [[64, 64]],
    2: [[32, 32], [96, 96]],
    3: [[32, 32], [64, 64], [96, 96]],
    4: [[32, 32], [96, 32], [32, 96], [96, 96]],
    5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
    6: [[32, 32], [96, 32], [32, 64], [96, 64], [32, 96], [96, 96]],
  }[number];
  positions.forEach(([x, y]) => {
    context.beginPath();
    context.arc(x, y, 11, 0, Math.PI * 2);
    context.fill();
  });
  return new THREE.CanvasTexture(canvas);
}

export function createDicePhysics(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 100);
  camera.position.set(5, 6, 7);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff1e2, 0x020031, 2.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 8, 5);
  scene.add(keyLight);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
  world.allowSleep = true;
  const floor = new CANNON.Body({ mass: 0 });
  floor.addShape(new CANNON.Plane());
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);

  const geometry = new RoundedBoxGeometry(2.35, 2.35, 2.35, 5, .18);
  const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(1.175, 1.175, 1.175)) });
  world.addBody(body);
  const mesh = new THREE.Mesh(geometry, []);
  mesh.castShadow = true;
  scene.add(mesh);

  let frame;
  let lastTime = performance.now();
  let settling = false;

  const setMaterials = (value) => {
    const textures = Array.from({ length: 6 }, (_, index) => pipTexture(index + 1, DICE_COLOR));
    mesh.material = textures.map((texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: .48, metalness: .05 }));
    mesh.material[2].map = textures[value - 1];
  };

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    const aspect = Math.max(width / Math.max(height, 1), .5);
    camera.left = -3 * aspect;
    camera.right = 3 * aspect;
    camera.top = 3;
    camera.bottom = -3;
    camera.updateProjectionMatrix();
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
  };

  const animate = (now) => {
    const delta = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (!settling) world.step(1 / 60, delta, 3);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  };

  const roll = (value) => {
    setMaterials(value);
    settling = false;
    body.wakeUp();
    body.position.set((Math.random() - .5) * .7, 4.5, (Math.random() - .5) * .7);
    body.velocity.set((Math.random() - .5) * 3, -4, (Math.random() - .5) * 3);
    body.angularVelocity.set(12 + Math.random() * 8, 14 + Math.random() * 8, 10 + Math.random() * 8);
    body.quaternion.setFromEuler(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    window.setTimeout(() => {
      settling = true;
      body.velocity.setZero();
      body.angularVelocity.setZero();
      body.position.set(0, 1.18, 0);
      body.quaternion.set(0, 0, 0, 1);
    }, 760);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  setMaterials(1);
  frame = requestAnimationFrame(animate);

  return { roll, destroy: () => { observer.disconnect(); cancelAnimationFrame(frame); renderer.dispose(); geometry.dispose(); } };
}
