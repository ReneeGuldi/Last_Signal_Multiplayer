// player.js: The player: physics body, movement, jumping, knockback, taking damage.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { camera, world } from '../core/engine.js';
import { game } from '../core/state.js';
import { controls, keys } from '../ui/input.js';

//------------------------------------------------
// Player
// Invisible physics sphere where the camera sits on top
// Where players spawn (and respawn after a restart): by the farmhouse, facing the dirt path into town
export const SPAWN = { x: -63, z: 103, yaw: -1.16 };


export const playerBody = new CANNON.Body({
    mass: 70,
    shape: new CANNON.Sphere(0.5),
    position: new CANNON.Vec3(SPAWN.x, 2, SPAWN.z),
    fixedRotation: true, // don't let the sphere roll
});
world.addBody(playerBody);

// Ground check, only allow jumping after landing on something (ground or object)
let canJump = false;
const upAxis = new CANNON.Vec3(0, 1, 0);
const contactNormal = new CANNON.Vec3();

playerBody.addEventListener('collide', (e) => {
    const contact = e.contact;
    // The contact normal points from body "bi" to body "bj", so flip it if the player is "bi"
    if (contact.bi.id === playerBody.id) {
        contact.ni.negate(contactNormal);
    } else {
        contactNormal.copy(contact.ni);
    }
    // if the surface we touched faces mostly upward, it's a floor
    if (contactNormal.dot(upAxis) > 0.5) canJump = true;
});

// camera height right above the sphere's center
export const EYE_HEIGHT = 1.1;

// Knockback from explosions & hits
export const knockback = new THREE.Vector3();
// 1 = normal speed, lower while going through barbed wire (set by updateHazards)

export function updatePlayer(dt) {
    if (!controls.isLocked) return;

    const speed = (keys.ShiftLeft ? 12 : 6) * game.hazardSlow;

    // which way is the camera facing - if looking down, don't slow the player
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const move = new THREE.Vector3();
    if (keys.KeyW) move.add(forward);
    if (keys.KeyS) move.sub(forward);
    if (keys.KeyA) move.sub(right);
    if (keys.KeyD) move.add(right);
    move.normalize().multiplyScalar(speed);

    // Setting horizontal velocity directional (plus any knockback) leave vertical to gravity
    playerBody.velocity.x = move.x + knockback.x;
    playerBody.velocity.z = move.z + knockback.z;
    knockback.multiplyScalar(Math.max(0, 1 - dt * 6));

    if (keys.Space && canJump) {
        playerBody.velocity.y = 8;
        canJump = false;
    }

    // camera follows physics body
    camera.position.set(
        playerBody.position.x,
        playerBody.position.y + EYE_HEIGHT,
        playerBody.position.z
    );
}

// Anything that hurts the player (hazards, husks, etc) should call this to apply knockback and damage and flash the screen red
export const hurtEl = document.getElementById('hurt');
let hurtTimer = null;
export function hurtPlayer(amount, fromPos = null, push = 0) {
    if (game.gameOver || game.dead) return;
    game.health -= amount;

    hurtEl.style.opacity = Math.min(0.8, 0.25 + amount / 40);
    clearTimeout(hurtTimer);
    hurtTimer = setTimeout(() => (hurtEl.style.opacity = 0), 120);

    if (fromPos && push > 0) {
        const dx = playerBody.position.x - fromPos.x;
        const dz = playerBody.position.z - fromPos.z;
        const d = Math.hypot(dx, dz) || 1;
        knockback.x += (dx / d) * push;
        knockback.z += (dz / d) * push;
        if (push > 10) playerBody.velocity.y = 5; // big hits pop the player up a bit
    }
}

// Multiplayer: after dying, get back up at the farm. The rest of the world stays as it is.
export function respawnPlayer() {
    playerBody.position.set(SPAWN.x, 2, SPAWN.z);
    playerBody.velocity.set(0, 0, 0);
    knockback.set(0, 0, 0);
    camera.position.set(SPAWN.x, 2 + EYE_HEIGHT, SPAWN.z);
    camera.rotation.set(0, SPAWN.yaw, 0);
    hurtEl.style.opacity = 0;
    game.health = 100;
    game.ammo = Math.max(game.ammo, 15); // enough to fight your way back
    game.dead = false;
}
