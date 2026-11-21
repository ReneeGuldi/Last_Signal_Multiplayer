// pickups.js: Pickups (ammo, medkits, weapons, keys, radio parts): spawning, collecting, respawning.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { sizedModel, spawnModel } from '../core/models.js';
import { game } from '../core/state.js';
import { shareTake } from './coop.js';
import { WEAPONS, giveWeapon } from './weapons.js';
import { showMessage } from '../ui/hud.js';
import { KEY_NAMES, keyRing } from '../world/doors.js';

//------------------------------------------------
// Item Pick Ups (press E)
// respawn: seconds before a collected supply comes back (radio parts never respawn)
// length: weapons are sized by their longest size since blockbench scales vary from my models

export const PICKUP_TYPES = {
    battery:     { model: 'battery', scale: 2, radio: true, label: 'the battery' },
    coil:        { model: 'coil', scale: 1.5, radio: true, label: 'the antenna coil' },
    transmitter: { model: 'transmitter', scale: 2, radio: true, label: 'the transmitter' },
    medkit:      { model: 'medkit', scale: 1.5, respawn: 60, label: 'Medkit' },
    ammo:        { model: 'ammo', scale: 1.5, respawn: 40, label: 'Pistol ammo' },
    shells:      { model: 'ammo', scale: 1.5, respawn: 50, label: 'Shotgun shells', tint: 0xb04a2a },
    shotgun:     { model: 'shotgun', weapon: 'shotgun', length: 0.9, label: 'the Shotgun' },
    machete:     { model: 'machete', weapon: 'machete', length: 1.1,  roll: Math.PI / 2, label: 'the Machete' },
    // keys open locked doors (see KEY_NAMES in the Doors section)
    motelKey:    { key: 'motel', color: 0xc8a040, label: 'the Motel master key' },
    policeKey:   { key: 'police', color: 0x6a8ac8, label: 'the Police station key' },
    fireKey:     { key: 'fire', color: 0xc84a3a, label: 'the Fire station key' },
};

// A key built from boxes, with a colored tag so players can tell them apart
function keyModel(color) {
    const g = new THREE.Group();
    const BRASS = new THREE.MeshStandardMaterial({ color: 0xc8a850, emissive: 0x4a3a10, metalness: 0.6, roughness: 0.4 });
    const add = (w, h, d, x, y) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), BRASS);
        m.position.set(x, y, 0);
        g.add(m);
    };
    add(0.22, 0.22, 0.05, 0, 0.2);      // ring
    add(0.06, 0.35, 0.05, 0, -0.06);    // shaft
    add(0.12, 0.05, 0.05, 0.06, -0.16); // teeth
    add(0.09, 0.05, 0.05, 0.05, -0.06);
    const tag = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.2, 0.02),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
    );
    tag.position.set(0.16, 0.36, 0);
    tag.rotation.z = -0.4;
    g.add(tag);
    g.scale.setScalar(1.3);
    return g;
}

export const pickups = [];
// Every pickup has an id so all players agree which one was taken. Pickups placed at the
// start of a run are numbered in order (p0, p1...); loot from husks gets a random id from the host.
let nextPickupId = 0;
export function resetPickupIds() {
    nextPickupId = 0;
}

// temporary: loot dropped by husks/nests. Blinks and disappears after 25s, never respawns
// y: height of the floor it sits on (for pickups upstairs or on tables)
export function spawnPickup(type, x, z, { temporary = false, y = 0, id = null } = {}) {
    const config = PICKUP_TYPES[type];
    let mesh;
    if (config.key) {
        mesh = new THREE.Group();
        mesh.add(keyModel(config.color));
        scene.add(mesh);
    } else if (config.length) {
        mesh = new THREE.Group();
        const item = sizedModel(config.model, config.length);
        if (config.roll) item.rotation.z = config.roll; // stand flat models on edge so they're visible
        mesh.add(item);
        scene.add(mesh);
    } else {
        mesh = spawnModel(config.model, config.scale, 0);
    }
    if (config.tint) {
        const tint = new THREE.Color(config.tint);
        mesh.traverse((c) => { if (c.isMesh) c.material.color.lerp(tint, 0.6); });
    }
    mesh.position.set(x, y + 0.6, z);
 
    // radio parts get additional yellow glow to stand out in the fog
    if (config.radio) {
        const glow = new THREE.PointLight(0xffd84a, 3, 5);
        glow.position.y = 0.5;
        mesh.add(glow);
    }

    const p = { id: id ?? 'p' + nextPickupId++, type, mesh, baseY: y, collected: false, respawnTimer: 0, temporary, life: 25 };
    pickups.push(p);
    return p;
}

export function collect(p) {
    const config = PICKUP_TYPES[p.type];

    // don't waste a medkit at full health, leave it for later
    if (p.type === 'medkit' && game.health >= 100) {
        showMessage('Your health is already full.', 1.5);
        return;
    }

    removePickup(p);
    shareTake(p); // gone for your teammates too

    if (config.radio) {
        game.partsFound++;
        game.score += 100;
        if (game.partsFound === 3) {
            showMessage('All parts found! Get to the radio tower.', 5);
        } else {
            showMessage(`Found ${config.label}! (${game.partsFound}/3)`);
        }
    } else if (config.weapon) {
        giveWeapon(config.weapon);
        if (config.weapon === 'shotgun') game.shells += 6;
        showMessage(`Picked up ${config.label}! Press ${WEAPONS[config.weapon].slot} to switch to it.`, 3.5);
    } else if (config.key) {
        keyRing.add(config.key);
        game.score += 25;
        showMessage(`Found the ${KEY_NAMES[config.key]}!`, 3);
    } else if (p.type === 'medkit') {
        game.health = Math.min(100, game.health + 35);
        showMessage('+35 health');
    } else if (p.type === 'ammo') {
        game.ammo += 15;
        showMessage('+15 pistol ammo');
    } else if (p.type === 'shells') {
        game.shells += 6;
        showMessage('+6 shotgun shells');
    }
}


// Hide a supply until it respawns, or remove it for good
function removePickup(p) {
    const config = PICKUP_TYPES[p.type];
    p.collected = true;
    if (config.respawn && !p.temporary) {
        // hide it and start the respawn countdown
        p.mesh.visible = false;
        p.respawnTimer = config.respawn;
    } else {
        scene.remove(p.mesh);
    }
}

// A teammate picked this up. Radio parts count for the whole team.
// who: their name, or null when catching up after joining (no messages then)
export function takenByOther(p, who) {
    if (p.collected) return;
    const config = PICKUP_TYPES[p.type];
    removePickup(p);
    if (config.radio && who) {
        game.partsFound++;
        if (game.partsFound === 3) showMessage(`${who} found ${config.label}! All parts found: get to the radio tower.`, 5);
        else showMessage(`${who} found ${config.label}! (${game.partsFound}/3)`, 3);
    } else if (config.key && who) {
        showMessage(`${who} found the ${KEY_NAMES[config.key]}.`, 3);
    }
}

export function updatePickups(dt, time) {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];

        if (p.collected) {
            if (p.respawnTimer > 0) {
                p.respawnTimer -= dt;
                if (p.respawnTimer <= 0) {
                    p.collected = false;
                    p.mesh.visible = true;
                }
            } else {
                pickups.splice(i, 1); // radio parts, weapons & loot are gone for good
            }
            continue;
        }

        if (p.temporary) {
            p.life -= dt;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                pickups.splice(i, 1);
                continue;
            }
            // blink during the last 5 seconds
            p.mesh.visible = p.life > 5 || Math.sin(time * 20) > 0;
        }

        p.mesh.rotation.y += dt * 1.5;
        p.mesh.position.y = p.baseY + 0.6 + Math.sin(time * 2) * 0.15;
    }
}
