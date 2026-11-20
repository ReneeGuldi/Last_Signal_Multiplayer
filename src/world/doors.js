// doors.js: Doors: opening, locking, keys, boarded doorways, husks bashing doors, and door syncing in multiplayer.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { othersOnline, sendDoor } from '../net.js';
import { camera, scene, world } from '../core/engine.js';
import { spawnImpact } from '../game/effects.js';
import { husks } from '../game/husks.js';
import { playerBody } from '../game/player.js';
import { showMessage } from '../ui/hud.js';
import { mergeGroup, obstacles, part } from './builders.js';

//------------------------------------------------
// Doors
// Press E near a door to open or close it. Each door is one of these kinds:
//   'closed'  - opens with E. Husks chasing you can bash it open after a few seconds,
//               so shutting a door behind you buys time.
//   'locked'  - needs a key (KEY_NAMES). Husks can't get through at all.
//   'boarded' - planks nailed over the doorway. Shoot, slash or shove (F) them off.
//               Explosions blow boards away and blast doors open too.
// When a door is closed it has a real physics collider, so players, husks and
// bullets are all stopped by it. The collider swings with the door when it opens.
// Doors are numbered in the order they're built, so every player's game agrees
// on which door is which. That number is used to keep doors in sync in multiplayer.
export const doors = [];
const DOOR_COLOR = 0x5a4232;
const DOOR_SPEED = 4;   // how fast doors swing (radians per second)
const BASH_TIME = 2.5;  // seconds of husks pounding before a closed door gives way
export const KEY_NAMES = {
    motel: 'Motel master key',
    police: 'Police station key',
    fire: 'Fire station key',
};
export const keyRing = new Set(); // keys you're carrying (each player finds their own)

// A plain wooden door with panels and a handle on both sides.
// It's built so the hinge is at (0, 0, 0) and the door reaches out along x (or z).
function makeDoorLeaf(width, height, alongX, color) {
    const g = new THREE.Group();
    const w = width - 0.06;
    const t = 0.08;
    const along = (a, y, across = 0) => (alongX ? [a, y, across] : [across, y, a]);
    const size = (a, y, across) => (alongX ? [a, y, across] : [across, y, a]);
    const panel = new THREE.Color(color).multiplyScalar(0.75).getHex();

    part(g, ...size(w, height - 0.04, t), ...along(width / 2, height / 2), color);
    for (const s of [-1, 1]) {
        for (const py of [height * 0.3, height * 0.72]) {
            part(g, ...size(w * 0.6, height * 0.3, 0.02), ...along(width / 2, py, s * (t / 2 + 0.01)), panel);
        }
        part(g, ...size(0.06, 0.06, 0.12), ...along(width - 0.22, 1.0, s * (t / 2 + 0.05)), 0xb0a070); // handle
    }
    return g;
}

// hinge: world position of the hinge side of the doorway
// alongX: true if the doorway is in a wall that runs along x (front/back walls)
// mesh: use this object as the door instead of building one (Blockbench doors)
// reverse: the hinge is on the far end and the door reaches back toward smaller x (or z).
// Used for the right-hand door of a pair, or any door whose handle is on the near end.
export function createDoor({ hinge, width, height, y = 0, alongX = true, kind = 'closed', key = null, color = DOOR_COLOR, mesh = null, reverse = false }) {
    const pivot = new THREE.Group();
    pivot.position.set(hinge.x, y, hinge.z);
    scene.add(pivot);
    const dir = reverse ? -1 : 1; // which way the door reaches from its hinge

    const door = {
        id: doors.length, kind, startKind: kind, key,
        pivot, y, width, height, alongX, dir,
        // middle of the doorway, where you stand to use the door
        center: alongX ? { x: hinge.x + dir * width / 2, z: hinge.z } : { x: hinge.x, z: hinge.z + dir * width / 2 },
        open: false, angle: 0, target: 0, bash: 0,
        leaf: null, body: null, bodyAdded: false, planks: [],
    };
    doors.push(door);

    // Boarded doorway: a few crooked planks and an invisible wall behind them
    if (kind === 'boarded') {
        const PLANK = [0x7a5a3a, 0x6a4e34, 0x846444];
        [0.7, 1.45, 2.2].forEach((py, i) => {
            const tilt = (i % 2 ? 1 : -1) * (0.08 + Math.random() * 0.1);
            const plank = new THREE.Mesh(
                new THREE.BoxGeometry(alongX ? width + 0.5 : 0.07, 0.24, alongX ? 0.07 : width + 0.5),
                new THREE.MeshStandardMaterial({ color: PLANK[i] })
            );
            plank.position.set(door.center.x, y + py, door.center.z);
            if (alongX) plank.rotation.z = tilt; else plank.rotation.x = tilt;
            plank.castShadow = true;
            plank.userData.board = door;
            scene.add(plank);
            door.planks.push(plank);
        });
        door.body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(alongX ? width / 2 : 0.1, height / 2, alongX ? 0.1 : width / 2)),
            position: new CANNON.Vec3(door.center.x, y + height / 2, door.center.z),
        });
        world.addBody(door.body);
        door.bodyAdded = true;
        return door;
    }

    // Normal door: the leaf turns around the pivot (the hinge)
    if (mesh) {
        pivot.updateMatrixWorld(true);
        pivot.attach(mesh); // keeps the Blockbench door exactly where it was placed
        door.leaf = mesh;
    } else {
        door.leaf = makeDoorLeaf(width, height, alongX, color);
        pivot.add(door.leaf);
        mergeGroup(door.leaf); // 7 little boxes -> 3 meshes, cheaper to draw
    }
    door.leaf.traverse((c) => { c.userData.door = door; });
    obstacles.push(door.leaf); // bullets stop at doors

    // A marker in the middle of the door, so the collider can follow it as it swings
    door.anchor = new THREE.Object3D();
    if (alongX) door.anchor.position.set(dir * width / 2, height / 2, 0);
    else door.anchor.position.set(0, height / 2, dir * width / 2);
    pivot.add(door.anchor);

    door.body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(alongX ? width / 2 : 0.06, height / 2, alongX ? 0.06 : width / 2)),
    });
    world.addBody(door.body);
    door.bodyAdded = true;
    syncDoorBody(door);
    return door;
}

// Move the door's collider to wherever the door is right now
const _doorPos = new THREE.Vector3();
const _doorQuat = new THREE.Quaternion();
function syncDoorBody(door) {
    door.pivot.rotation.y = door.angle;
    door.pivot.updateMatrixWorld(true);
    door.anchor.getWorldPosition(_doorPos);
    door.pivot.getWorldQuaternion(_doorQuat);
    door.body.position.set(_doorPos.x, _doorPos.y, _doorPos.z);
    door.body.quaternion.set(_doorQuat.x, _doorQuat.y, _doorQuat.z, _doorQuat.w);
    door.body.aabbNeedsUpdate = true;
}

// Which way to swing so the door opens away from whoever pushed it (fromX, fromZ)
function swingAway(door, fromX, fromZ) {
    if (door.alongX) return door.dir * (Math.sign(fromZ - door.center.z) || 1) * Math.PI / 2;
    return -door.dir * (Math.sign(fromX - door.center.x) || 1) * Math.PI / 2;
}

function openDoor(door, fromX, fromZ) {
    door.open = true;
    door.target = swingAway(door, fromX, fromZ);
    door.bash = 0;
}

function closeDoor(door) {
    door.open = false;
    door.target = 0;
}

// Everything another player needs to copy this door's state
export function shareDoor(door) {
    sendDoor(door.id, {
        kind: door.kind, open: door.open, target: door.target,
        planks: door.planks.filter((p) => p.visible).length,
    });
}

// Another player changed a door (or we just joined and are catching up)
export function applyDoorState(id, s) {
    const door = doors[id];
    if (!door || !s) return;
    if (['closed', 'locked', 'boarded', 'broken'].includes(s.kind)) door.kind = s.kind;
    door.open = !!s.open;
    door.target = Number.isFinite(s.target) ? s.target : 0;
    if (Number.isFinite(s.planks)) door.planks.forEach((p, i) => (p.visible = i < s.planks));
    if (door.kind === 'broken' && door.bodyAdded) {
        world.removeBody(door.body);
        door.bodyAdded = false;
    }
}

// Is (x, z) roughly in front of the player (within reach)?
function inFrontOfPlayer(x, z, reach) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const dx = x - playerBody.position.x;
    const dz = z - playerBody.position.z;
    const d = Math.hypot(dx, dz) || 0.01;
    return d < reach && (dx * forward.x + dz * forward.z) / d > 0.3;
}

// Knock a plank off a boarded doorway (the one you hit, or the lowest one left for melee).
// Returns true if there was one to hit.
export function hitBoards(door, plank = null) {
    plank = plank ?? door.planks.find((p) => p.visible);
    if (!plank || !plank.visible) return false;
    plank.visible = false;
    spawnImpact(plank.position, 0x9a7a5a);
    if (!door.planks.some((p) => p.visible)) {
        door.kind = 'broken';
        if (door.bodyAdded) world.removeBody(door.body);
        door.bodyAdded = false;
        showMessage('The boards give way.');
    }
    shareDoor(door);
    return true;
}

// Machete swings and shoves also knock boards off a doorway in front of you
export function meleeBoards(reach) {
    const feet = playerBody.position.y - 0.5;
    for (const door of doors) {
        if (door.kind !== 'boarded' || Math.abs(feet - door.y) > 1.5) continue;
        if (inFrontOfPlayer(door.center.x, door.center.z, reach + 0.8)) return hitBoards(door);
    }
    return false;
}

// Explosions rip the boards off and blast doors open (even locked ones)
export function blastDoors(center, radius) {
    for (const door of doors) {
        const d = Math.hypot(door.center.x - center.x, door.center.z - center.z);
        if (d > radius || door.kind === 'broken') continue;
        if (door.kind === 'boarded') {
            door.planks.forEach((p) => {
                if (p.visible) spawnImpact(p.position, 0x9a7a5a);
                p.visible = false;
            });
            door.kind = 'broken';
            if (door.bodyAdded) world.removeBody(door.body);
            door.bodyAdded = false;
        } else {
            door.kind = 'closed';
            openDoor(door, center.x, center.z);
        }
        shareDoor(door);
    }
}

// What the E prompt says for a door
export function doorPrompt(door) {
    if (door.kind === 'boarded') return 'Boarded up. Shoot, slash or shove (F) the boards off';
    if (door.kind === 'locked') {
        return keyRing.has(door.key) ? `[E] Unlock with the ${KEY_NAMES[door.key]}` : `Locked. You need the ${KEY_NAMES[door.key]}`;
    }
    return door.open ? '[E] Close door' : '[E] Open door';
}

// Pressing E on a door
export function useDoor(door) {
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    if (door.kind === 'boarded') {
        showMessage('The boards are nailed tight. Break them off.', 2);
        return;
    }
    if (door.kind === 'locked') {
        if (!keyRing.has(door.key)) {
            showMessage(`It's locked. Maybe the ${KEY_NAMES[door.key]} is around somewhere.`, 3);
            return;
        }
        door.kind = 'closed';
        showMessage(`Unlocked with the ${KEY_NAMES[door.key]}.`);
        openDoor(door, px, pz);
    } else if (door.open) {
        if (Math.hypot(px - door.center.x, pz - door.center.z) < 0.9) {
            showMessage('Step out of the doorway first.', 1.5);
            return;
        }
        closeDoor(door);
    } else {
        openDoor(door, px, pz);
    }
    shareDoor(door);
    matchPartner(door, px, pz);
}

// Double doors: make the other half do the same thing
function matchPartner(door, fromX, fromZ) {
    const other = door.partner;
    if (!other) return;
    other.kind = door.kind;
    if (door.open) openDoor(other, fromX, fromZ);
    else closeDoor(other);
    shareDoor(other);
}

export function updateDoors(dt, time) {
    for (const door of doors) {
        if (!door.leaf) continue;

        // Husks chasing someone pound on closed doors until they give way
        if (door.kind === 'closed' && !door.open) {
            let pounding = 0;
            for (const h of husks) {
                if (h.dead || !['chase', 'windup', 'lunge'].includes(h.mode)) continue;
                if (Math.abs(h.body.position.y - h.radius - door.y) > 1.5) continue;
                const d = Math.hypot(h.body.position.x - door.center.x, h.body.position.z - door.center.z);
                if (d < 1.2 + h.radius) pounding = Math.max(pounding, h.t.heavy ? 3 : 1); // brutes hit harder
            }
            if (pounding) {
                door.bash += dt * pounding;
                door.pivot.rotation.y = Math.sin(time * 40) * 0.03; // the door rattles
                if (door.bash >= BASH_TIME) {
                    const h = husks.find((k) => !k.dead && Math.hypot(k.body.position.x - door.center.x, k.body.position.z - door.center.z) < 2.5);
                    openDoor(door, h ? h.body.position.x : door.center.x, h ? h.body.position.z : door.center.z);
                    shareDoor(door);
                    matchPartner(door, h ? h.body.position.x : door.center.x, h ? h.body.position.z : door.center.z);
                }
                continue;
            }
            door.bash = Math.max(0, door.bash - dt);
        }

        // Swing toward the target angle, and move the collider with the door
        if (door.angle !== door.target || door.pivot.rotation.y !== door.angle) {
            const step = DOOR_SPEED * dt;
            const diff = door.target - door.angle;
            door.angle = Math.abs(diff) <= step ? door.target : door.angle + Math.sign(diff) * step;
            syncDoorBody(door);
        }
    }
}

// R: put every door back how it started (only when playing solo, so restarting
// doesn't lock doors your teammates already opened)
export function resetDoors() {
    keyRing.clear();
    if (othersOnline()) return;
    for (const door of doors) {
        door.kind = door.startKind;
        door.open = false;
        door.target = 0;
        door.angle = 0;
        door.bash = 0;
        door.planks.forEach((p) => (p.visible = true));
        if (!door.bodyAdded) {
            world.addBody(door.body);
            door.bodyAdded = true;
        }
        if (door.leaf) syncDoorBody(door);
    }
}
