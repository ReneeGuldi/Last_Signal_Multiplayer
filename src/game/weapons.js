// weapons.js: Weapons: the shove (F), pistol, shotgun, machete, hits, explosions.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { sendShot } from '../net.js';
import { camera, scene, world } from '../core/engine.js';
import { models, sizedModel } from '../core/models.js';
import { game } from '../core/state.js';
import { GUN_REST, blastLight, effects, flashRed, gun, gunBarrel, gunBody, gunGrip, hitMarker, muzzleLight, raycaster, spawnImpact, spawnTracer, updateFx } from './effects.js';
import { alertHusks, damageHusk, husks } from './husks.js';
import { damageNest, nests } from './nests.js';
import { hurtPlayer, playerBody } from './player.js';
import { charModel, props } from './props.js';
import { showMessage } from '../ui/hud.js';
import { controls } from '../ui/input.js';
import { obstacles, part } from '../world/builders.js';
import { blastDoors, doors, hitBoards, meleeBoards } from '../world/doors.js';
import { breakBarricade, damageBarricade } from '../world/evacRoute.js';

//------------------------------------------------
// Melee Shove (F)
// Never helpless: shove husks in front of you away, even with 0 ammo

export function shove() {
    if (game.meleeCooldown > 0) return;
    game.meleeCooldown = 0.7;

    // jab the gun forward
    gun.position.z -= 0.25;
    gun.position.y += 0.05;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    let hitSomething = false;
    for (const h of husks) {
        if (h.dead || Math.abs(h.body.position.y - playerBody.position.y) > 1.5) continue;
        const dx = h.body.position.x - playerBody.position.x;
        const dz = h.body.position.z - playerBody.position.z;
        const d = Math.hypot(dx, dz) || 0.01;
        // in range and roughly in front of the player
        if (d > 2.6 + h.radius || (dx * forward.x + dz * forward.z) / d < 0.4) continue;

        hitSomething = true;
        const dir = new THREE.Vector3(dx / d, 0, dz / d);
        if (h.t.heavy) {
            // brutes barely budge, but it does interrupt a charge
            h.stun = 0.4;
            flashRed(h.mesh);
        } else {
            damageHusk(h, 1, dir);
            if (!h.dead) {
                h.stun = 1;
                h.body.velocity.set(dir.x * 10, 0, dir.z * 10);
            }
        }
    }
    meleeBoards(2.6);
    if (hitSomething) hitMarker();
}


//------------------------------------------------
// Weapons
// 1 = pistol, 2 = shotgun, 3 = machete (or scroll the mouse wheel).
// Players start with the pistol; the shotgun and machete have to be found in the city.
//
// Each weapon model is sized automatically by its longest side (length).
// If one shows up pointing backwards, set flip: true. Use viewPos / viewRot
export const WEAPONS = {
    pistol: {
        name: 'Pistol', slot: 1, model: 'pistol', length: 0.32,
        ammo: 'ammo', pellets: 1, spread: 0.003, damage: 1, cooldown: 0.2, range: 100,
        recoil: 0.07, kick: 0.1, alert: 30,
        viewPos: [0, 0, 0], viewRot: [0, 0, 0], flip: false,
    },
    shotgun: {
        name: 'Shotgun', slot: 2, model: 'shotgun', length: 0.8,
        ammo: 'shells', pellets: 7, spread: 0.06, damage: 1, cooldown: 0.85, range: 35,
        recoil: 0.18, kick: 0.3, alert: 45,
        viewPos: [0, 0.02, -0.12], viewRot: [0, 0, 0], flip: false,
    },
    machete: {
        name: 'Machete', slot: 3, model: 'machete', length: 0.9,
        melee: true, damage: 2, cooldown: 0.45, reach: 2.6,
        viewPos: [0.02, 0.2, -0.15], viewRot: [0.5, 0, -0.5], flip: false,
    },
};
export const WEAPON_ORDER = ['pistol', 'shotgun', 'machete'];
 
export let weapon = 'pistol';
export const owned = { pistol: true, shotgun: false, machete: false };
const viewModels = {}; // weapon -> the model held on screen
 
// Box-built stand-ins, used when a weapon's model file is missing
function fallbackViewModel(key) {
    const g = new THREE.Group();
    const DARK = 0x2a2a2a;
    if (key === 'pistol') {
        g.add(gunBody, gunBarrel, gunGrip); // the original box gun
        g.userData.muzzle = 0.45;
    } else if (key === 'shotgun') {
        part(g, 0.09, 0.1, 0.55, 0, 0, -0.1, DARK);
        part(g, 0.05, 0.05, 0.5, 0, 0.04, -0.55, 0x1a1a1a);
        part(g, 0.07, 0.12, 0.3, 0, -0.04, 0.3, 0x4a3a2a, 0.2, 0, 0);
        g.userData.muzzle = 0.82;
    } else {
        part(g, 0.05, 0.14, 0.12, 0, -0.05, 0.12, 0x3a2a1a);        // handle
        part(g, 0.015, 0.1, 0.55, 0, 0, -0.22, 0x9a9a92);           // blade
    }
    return g;
}
 
// Build the on-screen model for each weapon (after the models have loaded)
export function initWeapons() {
    gun.remove(gunBody, gunBarrel, gunGrip); // the box gun is only used if the pistol model is missing
    for (const key of WEAPON_ORDER) {
        const w = WEAPONS[key];
        let vm;
        if (models[w.model]) {
            vm = sizedModel(w.model, w.length, w.flip);
            vm.position.set(...w.viewPos);
            vm.rotation.set(...w.viewRot);
            vm.userData.muzzle = w.length / 2 + 0.05 - w.viewPos[2];
            vm.traverse((c) => { if (c.isMesh) c.castShadow = false; });
        } else {
            vm = fallbackViewModel(key);
        }
        vm.visible = false;
        gun.add(vm);
        viewModels[key] = vm;
    }
    equip('pistol');
}
 
export function equip(key) {
    if (!owned[key] || !viewModels[key]) return;
    weapon = key;
    for (const [k, vm] of Object.entries(viewModels)) vm.visible = k === key;
    muzzleLight.position.set(0, 0.02, -(viewModels[key].userData.muzzle || 0.45));
    gun.position.y = GUN_REST.y - 0.3; // dip out of view, then it slides back up
    game.weaponCooldown = Math.max(game.weaponCooldown, 0.25);
}
 
export function giveWeapon(key) {
    owned[key] = true;
    equip(key);
}
 
function cycleWeapon(dir) {
    const list = WEAPON_ORDER.filter((k) => owned[k]);
    const i = list.indexOf(weapon);
    equip(list[(i + dir + list.length) % list.length]);
}
 
document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !controls.isLocked || game.gameOver) return;
    attack();
});
document.addEventListener('wheel', (e) => {
    if (!controls.isLocked || game.gameOver || e.deltaY === 0) return;
    cycleWeapon(Math.sign(e.deltaY));
});
 
// Everything a bullet can hit
function shootTargets() {
    return [
        ...husks.filter((h) => !h.dead).map((h) => h.mesh),
        ...nests.filter((n) => !n.dead).map((n) => n.group),
        ...(game.barricade ? [game.barricade.group] : []),
        ...props.map((p) => p.mesh),
        ...doors.flatMap((d) => d.planks.filter((p) => p.visible)),
        ...obstacles,
    ];
}
 
function attack() {
    if (game.weaponCooldown > 0) return;
    const w = WEAPONS[weapon];
    if (w.melee) {
        swingMelee(w);
        return;
    }
 
    const left = w.ammo === 'shells' ? game.shells : game.ammo;
    if (left <= 0) {
        const what = w.ammo === 'shells' ? 'shells' : 'ammo';
        showMessage(owned.machete ? `Out of ${what}! Press 3 for the machete.` : `Out of ${what}! Press F to shove.`, 1.5);
        return;
    }
    if (w.ammo === 'shells') game.shells--;
    else game.ammo--;
    game.weaponCooldown = w.cooldown;
 
    // Muzzle flash & recoil
    muzzleLight.intensity = w.pellets > 1 ? 10 : 6;
    setTimeout(() => (muzzleLight.intensity = 0), 50);
    gun.position.z += w.recoil;
    gun.rotation.x += w.kick;
 
    // gunshots are loud: nearby husks come running
    alertHusks(playerBody.position.x, playerBody.position.z, w.alert);
 
    const origin = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldPosition(origin);
    camera.getWorldDirection(forward);
    const targets = shootTargets();
    let hitSomething = false;
 
    for (let i = 0; i < w.pellets; i++) {
        const dir = forward.clone();
        if (w.spread) {
            dir.x += (Math.random() - 0.5) * 2 * w.spread;
            dir.y += (Math.random() - 0.5) * 2 * w.spread;
            dir.z += (Math.random() - 0.5) * 2 * w.spread;
            dir.normalize();
        }
        raycaster.set(origin, dir);
        raycaster.far = w.range;
        const hits = raycaster.intersectObjects(targets, true);
        const end = hits.length > 0 ? hits[0].point : origin.clone().addScaledVector(dir, w.range);
        spawnTracer(end);
        if (i < 3) sendShot(origin, end); // a few tracers is plenty for other players to see
        if (hits.length > 0 && applyHit(hits[0], dir, w.damage)) hitSomething = true;
    }
    if (hitSomething) hitMarker();
}
 
// What happens where a bullet lands. Returns true if it hit a husk or nest.
function applyHit(hit, dir, damage) {
    let obj = hit.object;
    while (obj && !obj.userData.husk && !obj.userData.prop && !obj.userData.nest && !obj.userData.barricade && !obj.userData.board) {
        obj = obj.parent;
    }
 
    // green bloom splatter when hitting husks or nests, dust everywhere else
    const bloom = obj && (obj.userData.husk || obj.userData.nest);
    spawnImpact(hit.point, bloom ? 0x66ff44 : 0xc8a878);
    if (!obj) return false;
 
    if (obj.userData.husk) {
        damageHusk(obj.userData.husk, damage, dir);
        return true;
    }
    if (obj.userData.nest) {
        damageNest(obj.userData.nest, damage);
        return true;
    }
    if (obj.userData.barricade) {
        damageBarricade(damage);
        return false;
    }
    if (obj.userData.board) {
        hitBoards(obj.userData.board, obj);
        return false;
    }
 
    const p = obj.userData.prop;
    if (!props.includes(p)) return false; // already blown up by an earlier pellet
    if (p.explosive) {
        explode(p);
    } else {
        const offset = new CANNON.Vec3(
            hit.point.x - p.body.position.x,
            hit.point.y - p.body.position.y,
            hit.point.z - p.body.position.z
        );
        p.body.applyImpulse(new CANNON.Vec3(dir.x * 30 * damage, 5, dir.z * 30 * damage), offset);
    }
    return false;
}
 
// Machete: quiet (doesn't alert husks), hits everything in an arc in front of you
function swingMelee(w) {
    game.weaponCooldown = w.cooldown;
    gun.rotation.set(-0.7, 0.6, 1.0); // wind-up pose; it swings back as it eases to rest
 
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    let hitSomething = false;
 
    for (const h of husks) {
        if (h.dead || Math.abs(h.body.position.y - playerBody.position.y) > 1.5) continue;
        const dx = h.body.position.x - px;
        const dz = h.body.position.z - pz;
        const d = Math.hypot(dx, dz) || 0.01;
        if (d > w.reach + h.radius || (dx * forward.x + dz * forward.z) / d < 0.5) continue;
        damageHusk(h, w.damage, new THREE.Vector3(dx / d, 0, dz / d), 0.6);
        hitSomething = true;
    }
    for (const n of nests) {
        if (!n.dead && Math.hypot(n.x - px, n.z - pz) < w.reach + 1) {
            damageNest(n, w.damage);
            hitSomething = true;
        }
    }
    if (game.barricade && Math.abs(pz - game.barricade.z) < 2.2 && Math.abs(px) < 8) damageBarricade(w.damage);
    meleeBoards(w.reach);
    if (hitSomething) hitMarker();
}

function explode(p) {
    const center = p.body.position;
    
    // Remove barrel from scene
    scene.remove(p.mesh);
    world.removeBody(p.body);
    props.splice(props.indexOf(p), 1);

    // generate a fireball that grows & fades
    const fireball = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9 })
    );

    fireball.position.copy(center);
    scene.add(fireball);
    blastLight.position.copy(center);
    effects.push({ fireball, age: 0});

    const RADIUS = 6;
    blastDoors(center, RADIUS);

    // husks in range take 8 damage: normal husks & runners die, brutes get staggered
    for (const h of husks) {
        if (h.dead) continue;
        if (h.body.position.distanceTo(center) < RADIUS) {
            const away = h.body.position.vsub(center);
            away.y = 0;
            away.normalize();
            damageHusk(h, 8, away, 1.6);
            if (!h.dead) {
                h.stun = 0.8;
                h.body.velocity.set(away.x * 8, 0, away.z * 8);
            }
        }
    }

    // nests caught in the blast take heavy damage
    for (const n of nests) {
        if (!n.dead && Math.hypot(n.x - center.x, n.z - center.z) < RADIUS) damageNest(n, 8);
    }

    // Crates get blasted, other barrels will chain-react and explode
    for (const other of props) {
        const d = other.body.position.distanceTo(center);
        if (d < RADIUS) {
            // frozen props come to life if the blast hits them
            if (other.dormant) {
                other.dormant = false;
                other.body.type = CANNON.Body.DYNAMIC;
                other.body.mass = other.wakeMass || 800;
                other.body.updateMassProperties();
                other.body.wakeUp();
                charModel(other.mesh);
            }

            const away = other.body.position.vsub(center);
            away.normalize();
            const strength = other.blastScale || 15;
            const push = (1 - d / RADIUS) * other.body.mass * strength;
            other.body.applyImpulse(
                new CANNON.Vec3(away.x * push, push, away.z * push),
                new CANNON.Vec3(0, 0.6, 0)
            );

            if (other.explosive) {
                setTimeout(() => { if (props.includes(other)) explode(other); }, 150);
            }
        }
    }

    // blow open the barricade if the blast is close enough
    if (game.barricade && Math.abs(center.z - game.barricade.z) < RADIUS && Math.abs(center.x) < 9) {
        breakBarricade();
    }

    // everything nearby heard that
    alertHusks(center.x, center.z, 45);

    // If player is standing too close, they take damage and get thrown
    const playerDist = playerBody.position.distanceTo(center);
    if (playerDist < RADIUS) {
        hurtPlayer(40 * (1 - playerDist / RADIUS), center, 14);
    }
}

export function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.age += dt;
        const t = e.age / 0.5;
        e.fireball.scale.setScalar(1 + t * 5);
        e.fireball.material.opacity = 0.9 * (1 - t);
        blastLight.intensity = 40 * (1 - t);
        if (t >= 1) {
            scene.remove(e.fireball);
            blastLight.intensity = 0;
            effects.splice(i, 1);
        }
    }
    updateFx(dt);
    gun.position.lerp(GUN_REST, Math.min(1, dt * 15));
    const ease = Math.min(1, dt * 12);
    gun.rotation.x += (0 - gun.rotation.x) * ease;
    gun.rotation.y += (0 - gun.rotation.y) * ease;
    gun.rotation.z += (0 - gun.rotation.z) * ease;
}
