// builders.js: Tools for building in code: boxes, colliders, makeBuilder(), and reserve()/isFree() for keeping trees out of buildings.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene, world } from '../core/engine.js';
import { placeProp } from './blockbench.js';
import { createDoor } from './doors.js';

//------------------------------------------------
// Helper Functions
// Used for placeholder buildings, cars, crates, etc
export const obstacles = [];
function createBox(w, h, d, x, z, color, mass = 0) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);

    // Cannon boxes are half size
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d /2)),
        position: new CANNON.Vec3(x, h / 2, z),
    });
    world.addBody(body);

    mesh.position.copy(body.position);
    return { mesh, body };
}


//------------------------------------------------
// Colliders & box-built buildings

// Building geometry generated with ChatGPT from my prompt,
// then reviewed and adjusted by me (collider fixes, pickup placement of items)

const SHOW_COLLIDERS = false;

export function addStaticCollider(w, h, d, x, z, rotY = 0) {
    const ph = h < 0.05 ? h : Math.max(h, 6);

    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, ph / 2, d / 2)),
        position: new CANNON.Vec3(x, ph / 2, z),
    });
    body.quaternion.setFromEuler(0, rotY, 0);
    world.addBody(body);

    if (SHOW_COLLIDERS) {
        const debug = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
        );
        debug.position.set(x, ph / 2, z);
        debug.rotation.y = rotY;
        scene.add(debug);
    }
}

export function part(group, w, h, d, x, y, z, color, rotX = 0, rotY = 0, rotZ = 0) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

// Combines building meshes by material to improve performance.
export function mergeGroup(group) {
    group.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
 
    group.traverse((c) => {
        if (!c.isMesh) return;
        for (let a = c; a && a !== group; a = a.parent) if (a.userData.keep) return;
        const m = c.material;
        if (!m || !m.isMeshStandardMaterial || m.map || m.transparent) return;
        const key = `${m.color.getHex()}|${m.emissive.getHex()}|${m.emissiveIntensity}|${m.flatShading}|${c.geometry.index ? 1 : 0}`;
        if (!buckets.has(key)) buckets.set(key, { material: m, meshes: [] });
        buckets.get(key).meshes.push(c);
    });
 
    for (const { material, meshes } of buckets.values()) {
        if (meshes.length < 2) continue;
        const geos = meshes.map((c) =>
            c.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, c.matrixWorld))
        );
        const merged = mergeGeometries(geos, false);
        if (!merged) continue; // couldn't merge: leave the parts as they are
        for (const c of meshes) c.parent.remove(c);
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
}

export function finishBuilding(group, x, z) {
    group.position.set(x, 0, z);
    scene.add(group);
    mergeGroup(group);
    obstacles.push(group);
}

// Adds a physics collider to the world.
export function addSolid(w, h, d, x, y, z, rotX = 0, rotY = 0) {
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
        position: new CANNON.Vec3(x, y, z),
    });
    body.quaternion.setFromEuler(rotX, rotY, 0);
    world.addBody(body);
 
    // Shows the collider when debug mode is enabled.
    if (SHOW_COLLIDERS) {
        const debug = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        );
        debug.position.set(x, y, z);
        debug.rotation.set(rotX, rotY, 0);
        scene.add(debug);
    }
}

// Helper for adding objects and collision inside buildings.
export function makeBuilder(x, z, flip = false) {
    const g = new THREE.Group();
    const f = flip ? -1 : 1;
    return {
        g, x, z, flip,
        // Converts building coordinates to world coordinates.
        at: (lx, lz) => ({ x: x + lx, z: z + lz * f }),
        // Adds a visible object without collision.
        box(w, h, d, lx, ly, lz, color, rx = 0, ry = 0, rz = 0) {
            return part(g, w, h, d, lx, ly, lz * f, color, rx * f, ry * f, rz);
        },
        // Adds a visible object WITH collision.
        solid(w, h, d, lx, ly, lz, color) {
            part(g, w, h, d, lx, ly, lz * f, color);
            addSolid(w, h, d, x + lx, ly, z + lz * f);
        },
        // Adds an invisible collision box.
        block(w, h, d, lx, ly, lz) {
            addSolid(w, h, d, x + lx, ly, z + lz * f);
        },
        // Adds a door in a front/back wall, centered at (lx, lz). See the Doors section.
        // opts: { kind: 'closed' | 'locked' | 'boarded', key: 'motel' | 'police' | 'fire', y }
        door(lx, lz, width, height, opts = {}) {
            return createDoor({
                hinge: { x: x + lx - width / 2, z: z + lz * f },
                width, height, y: opts.y ?? 0,
                kind: opts.kind ?? 'closed', key: opts.key ?? null, color: opts.color,
            });
        },
        // Places Blockbench furniture at (lx, lz) inside this building, turned rotY.
        // fallback() builds a code version if the model isn't there.
        prop(name, lx, lz, rotY = 0, ly = 0, fallback = null, scale = undefined) {
            // a flipped building is mirrored front-to-back, so turn the furniture to match
            return placeProp(name, x + lx, z + lz * f, f === 1 ? rotY : Math.PI - rotY, ly, fallback, scale);
        },
        // Adds the finished building to the scene.
        finish() {
            finishBuilding(g, x, z);
        },
    };
}

// Keep trees and rocks from spawning inside buildings or on roads
const reserved = [];
export function reserve(x1, z1, x2, z2) {
    reserved.push([Math.min(x1, x2), Math.min(z1, z2), Math.max(x1, x2), Math.max(z1, z2)]);
}
export function isFree(x, z, margin = 1) {
    return !reserved.some(([x1, z1, x2, z2]) =>
        x > x1 - margin && x < x2 + margin && z > z1 - margin && z < z2 + margin);
}
