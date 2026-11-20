// engine.js: Renderer, scene, camera, lights, the physics world and the ground.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Creating the Renderer, Scene, and Game Camera
export const renderer = new THREE.WebGLRenderer({ antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
// dusty orange sky, may alter
const SKY_COLOR = 0xb08560;
scene.background = new THREE.Color(SKY_COLOR);
// (color, start, end) - focused on hiding map edges
scene.fog = new THREE.Fog(SKY_COLOR, 10, 90); 

// Perspective Camera (fov, aspect, near, far)
// far is just past where the fog ends (90): anything farther is invisible anyway,
// so not drawing it keeps the bigger town running smoothly
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 130);

// Lighting
// Goal is ambient, soft fill everywhere, directional the sun casts shadows

scene.add(new THREE.AmbientLight(0xffe0c0, 0.5));

export const sun = new THREE.DirectionalLight(0xffc89a, 1.5);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);

// The shadow camera is a box, only letting things inside of it get shadows
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60});
scene.add(sun);
scene.add(sun.target); // sun aims at its target which follows the player

// Game Physics through cannon-es
// Physics will run in its own invisible world, where each frame we copy the
// physics body positions onto the visible Three.js meshes.
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0)});
// Sweep-and-prune: much faster than checking every pair of bodies now that
// the town has 500+ colliders (walls, furniture, doors)
world.broadphase = new CANNON.SAPBroadphase(world);
// stop the player from sticking to walls
world.defaultContactMaterial.friction = 0;

//------------------------------------------------
// Ground
const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x8a6a4a })
);
// planes start vertical, lay it flat
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// mass 0 = static
const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);
