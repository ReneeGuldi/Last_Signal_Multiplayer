// blockbench.js: Loads Blockbench buildings and furniture, sets up their colliders, and handles doors and drawers.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, world } from '../core/engine.js';
import { modelHeight, models } from '../core/models.js';
import { sendWorld } from '../net.js';
import { spawnPickup } from '../game/pickups.js';
import { showMessage } from '../ui/hud.js';
import { obstacles, reserve } from './builders.js';
import { KEY_NAMES, createDoor } from './doors.js';

// ------------------------------------------------
// Blockbench models used for buildings and furniture.
//
// When adding a model:
// 1. Build it to match the game's character scale. The game scales each model by 2.4
//    (BLOCKBENCH_SCALE), so one Blockbench unit (16 pixels) becomes 2.4 m in the game.
//    The player is about 0.74 units tall. Leave doorways at least 0.46 units wide and
//    around 0.86 units tall so the player can get through.
// 2. Collisions are created for each cube separately. This keeps walls, floors, and
//    furniture solid while still letting the player move through open doorways. A mesh
//    gets one collider around its entire shape, so use meshes for parts the player cannot
//    reach, like roofs and steeples, or for decoration.
//    Start a cube or group name with "deco" to leave it out of collision detection.
//    This is useful for things like rugs, cans, and leaves. Parts smaller than 0.25 m
//    on every side are skipped automatically.
// 3. To make a door, name the cube or group "door". It will open when the player presses E.
//    Keep the handle in the same group; the hinge is placed at the opposite end.
//    For double doors, use "door_left" and "door_right" as seen from outside. Both doors
//    will open together. Use "door_locked_police" for a door that needs the police key,
//    or "door_boarded" for a door covered with planks.
// 4. To make a drawer, include "drawer" in the cube or group name. Model it in the open
//    position, and the game will move it closed when the level starts.
// 5. Export the model with File > Export > Export glTF Model into models/. Add furniture
//    to MODEL_FILES or buildings to BUILDING_MODELS, and the game will load it automatically.

const BLOCKBENCH_SCALE = 2.4;
export const drawers = [];
const DRAWER_SPEED = 3; // how fast drawers slide (fraction of the way per second)

// Use the Blockbench version of a building when it is available. Otherwise, run the code that builds the same building.
export function building(name, x, z, opts, buildInCode) {
    if (models[name]) return placeModelBuilding(name, x, z, opts);
    buildInCode();
    return null;
}

// Place a furniture model when one is loaded. If it is missing, use the fallback function to create the furniture in code. y is the floor height.

export function placeProp(name, x, z, rotY = 0, y = 0, fallback = null) {
    if (models[name]) return placeModelBuilding(name, x, z, { rotY, y, reserveSpace: false, center: true, oneBox: true });
    if (fallback) fallback();
    return null;
}

// center: align the middle of the model's footprint with (x, z), rather than its origin. oneBox: use a single collider for the whole model. This is cheaper for furniture, since the player does not need to move between parts like chair legs.
export function placeModelBuilding(name, x, z, { scale = BLOCKBENCH_SCALE, rotY = 0, y = 0, height = null, reserveSpace = true, center = false, oneBox = false } = {}) {
    if (!models[name]) {
        console.warn(`Model "${name}" isn't loaded, skipping it`);
        return null;
    }
    if (height) scale = height / modelHeight(name);

    const g = models[name].clone();
    g.scale.setScalar(scale);
    g.rotation.y = rotY;
    g.position.set(x, y, z);
    scene.add(g);
    g.updateMatrixWorld(true);
    if (center) {
        const mid = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
        g.position.x += x - mid.x;
        g.position.z += z - mid.z;
        g.updateMatrixWorld(true);
    }

    // Find the name tag ("door...", "deco...", "...drawer...") of a part or any group it's inside
    const tagOf = (obj) => {
        for (let a = obj; a && a !== g; a = a.parent) {
            const n = (a.name || '').toLowerCase();
            if (n.startsWith('door') || n.startsWith('deco') || n.includes('drawer')) return { tag: n, owner: a };
        }
        return null;
    };

    const doorObjects = new Set();
    const drawerObjects = new Set();
    const solidBox = new THREE.Box3(); // combined bounds used when the model gets one collider
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const size = new THREE.Vector3();
    const mid = new THREE.Vector3();

    g.traverse((c) => {
        if (!c.isMesh) return;
        const tagged = tagOf(c);
        if (tagged?.tag.includes('drawer')) {
            drawerObjects.add(tagged.owner);
            return;
        }
        if (tagged?.tag.startsWith('door')) {
            doorObjects.add(tagged.owner);
            return;
        }
        if (tagged?.tag.startsWith('deco')) return;
        if (oneBox) {
            solidBox.expandByObject(c);
            return;
        }

        // Create a physics box that follows this mesh's size, position, and rotation.
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        c.geometry.boundingBox.getSize(size);
        c.geometry.boundingBox.getCenter(mid);
        c.matrixWorld.decompose(pos, quat, scl);
        size.multiply(scl);
        if (size.x < 0.25 && size.y < 0.25 && size.z < 0.25) return;
        mid.applyMatrix4(c.matrixWorld);
        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(Math.max(size.x, 0.05) / 2, Math.max(size.y, 0.05) / 2, Math.max(size.z, 0.05) / 2)),
            position: new CANNON.Vec3(mid.x, mid.y, mid.z),
        });
        body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
        world.addBody(body);
    });

    if (oneBox && !solidBox.isEmpty()) {
        // a box lined up with the world; fine for furniture turned in 90 degree steps
        solidBox.getSize(size);
        solidBox.getCenter(mid);
        world.addBody(new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
            position: new CANNON.Vec3(mid.x, mid.y, mid.z),
        }));
    }

    // Turn the "door" parts into real doors
    const made = [];
    for (const obj of doorObjects) {
        const box = new THREE.Box3().setFromObject(obj);
        const alongX = box.max.x - box.min.x >= box.max.z - box.min.z;
        const lname = obj.name.toLowerCase();
        const parts = lname.split('_');
        const kind = parts.includes('locked') ? 'locked' : parts.includes('boarded') ? 'boarded' : 'closed';
        const key = kind === 'locked' ? parts[parts.length - 1] : null;

        // Find the hinge end. The handle is usually the smallest mesh in the door group, so the hinge goes on the opposite end. If there is no handle, use the door name to decide which end should act as the hinge.
        const lo = alongX ? box.min.x : box.min.z;
        const hi = alongX ? box.max.x : box.max.z;
        let reverse = parts.includes('right');
        const handle = smallestMesh(obj);
        if (handle) {
            const c = new THREE.Box3().setFromObject(handle).getCenter(new THREE.Vector3());
            reverse = (alongX ? c.x : c.z) < (lo + hi) / 2; // handle is near this end, so hinge goes at the far end
        }
        const across = alongX ? (box.min.z + box.max.z) / 2 : (box.min.x + box.max.x) / 2;
        const end = reverse ? hi : lo;
        const hinge = alongX ? { x: end, z: across } : { x: across, z: end };

        if (kind === 'boarded') obj.parent.remove(obj); // the boarded-up version is created by the door code in doors.js
        const door = createDoor({
            hinge, alongX, kind, key: KEY_NAMES[key] ? key : null, reverse,
            width: hi - lo, height: box.max.y - box.min.y, y: box.min.y,
            mesh: kind === 'boarded' ? null : obj,
        });
        door.side = parts.includes('left') ? 'left' : parts.includes('right') ? 'right' : null;
        made.push(door);
    }
    // Double doors open and close together
    const left = made.find((d) => d.side === 'left');
    const right = made.find((d) => d.side === 'right');
    if (left && right) {
        left.partner = right;
        right.partner = left;
    }

        // Work out how each drawer sits in the furniture so it can slide back into place. Only nearby/touching furniture parts are used, not objects sitting in front of it.

    for (const obj of drawerObjects) {
        const box = new THREE.Box3().setFromObject(obj).expandByScalar(0.05);
        const rest = new THREE.Box3();
        g.traverse((c) => {
            if (!c.isMesh || tagOf(c)?.tag.includes('drawer')) return;
            const cb = new THREE.Box3().setFromObject(c);
            if (cb.intersectsBox(box)) rest.union(cb);
        });
        if (!rest.isEmpty()) makeDrawer(obj, rest);
    }

    // Bullets hit it, and trees/rocks stay out of it
    obstacles.push(g);
    if (reserveSpace) {
        const all = new THREE.Box3().setFromObject(g);
        reserve(all.min.x - 1, all.min.z - 1, all.max.x + 1, all.max.z + 1);
    }
    return g;
}

// Find the smallest mesh in a group. This is used to identify a door handle. Returns null when the group only contains one mesh.
function smallestMesh(obj) {
    const meshes = [];
    obj.traverse((c) => c.isMesh && meshes.push(c));
    if (meshes.length < 2) return null;
    const vol = (m) => {
        const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
        return s.x * s.y * s.z;
    };
    return meshes.reduce((a, b) => (vol(b) < vol(a) ? b : a));
}

//------------------------------------------------
// Drawers from Blockbench furniture. Press E to open or close one. A drawer can also be assigned a pickup, which appears the first time it is opened.

function makeDrawer(obj, rest) {
    const box = new THREE.Box3().setFromObject(obj);
    // How far it sticks out past the rest of the furniture on each side
    const out = [
        { v: new THREE.Vector3(1, 0, 0), d: box.max.x - rest.max.x },
        { v: new THREE.Vector3(-1, 0, 0), d: rest.min.x - box.min.x },
        { v: new THREE.Vector3(0, 0, 1), d: box.max.z - rest.max.z },
        { v: new THREE.Vector3(0, 0, -1), d: rest.min.z - box.min.z },
    ].reduce((a, b) => (b.d > a.d ? b : a));
    if (out.d <= 0.01) return; // doesn't stick out: can't tell which way it opens

    const openLocal = obj.position.clone();
    const worldPos = obj.getWorldPosition(new THREE.Vector3());
    const shutWorld = worldPos.clone().addScaledVector(out.v, -out.d);
    const closedLocal = obj.parent.worldToLocal(shutWorld.clone());

    const center = box.getCenter(new THREE.Vector3());
    const drawer = {
        obj, openLocal, closedLocal,
        // where you stand to use it, and where loot appears (on top of the open drawer)
        x: center.x, z: center.z, y: box.min.y, top: box.max.y,
        open: false, amount: 0, loot: null, looted: false,
    };
    obj.position.copy(closedLocal);
    drawers.push(drawer);
    return drawer;
}

// Fill the nearest drawer to (x, z) with a pickup type (e.g. 'ammo', 'fireKey')
export function stockDrawer(x, z, lootType) {
    let best = null;
    let bestDist = 4;
    for (const d of drawers) {
        const dist = Math.hypot(d.x - x, d.z - z);
        if (dist < bestDist) {
            best = d;
            bestDist = dist;
        }
    }
    if (best) best.loot = lootType;
    return best;
}

export function useDrawer(d) {
    const hadLoot = d.loot && !d.looted;
    setDrawer(d, !d.open);
    sendWorld('drawer', { id: drawers.indexOf(d), open: d.open }); // teammates see it slide too
    if (d.open && hadLoot) showMessage('Found something in the drawer.', 2);
    else if (d.open && !d.loot) showMessage('Empty.', 1.5);
}

// Open or close a drawer. The first time it opens, its loot appears on top
// (with the same id in everyone's game, so taking it works for the whole team).
export function setDrawer(d, open) {
    d.open = open;
    if (open && d.loot && !d.looted) {
        d.looted = true;
        const p = d.obj.parent.localToWorld(d.openLocal.clone());
        spawnPickup(d.loot, p.x, p.z, { y: d.top - 0.35, id: 'w' + drawers.indexOf(d) });
    }
}

export function updateDrawers(dt) {
    for (const d of drawers) {
        const target = d.open ? 1 : 0;
        if (d.amount === target) continue;
        const step = DRAWER_SPEED * dt;
        d.amount = Math.abs(target - d.amount) <= step ? target : d.amount + Math.sign(target - d.amount) * step;
        d.obj.position.lerpVectors(d.closedLocal, d.openLocal, d.amount);
    }
}

export function resetDrawers() {
    for (const d of drawers) {
        d.open = false;
        d.amount = 0;
        d.looted = false;
        d.obj.position.copy(d.closedLocal);
    }
}
