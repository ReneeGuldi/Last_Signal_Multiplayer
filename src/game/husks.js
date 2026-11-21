// husks.js: Husks: types, tuning, AI (guarding, chasing, lunging, stairs), damage and death.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, world } from '../core/engine.js';
import { modelHeight, models, spawnModel } from '../core/models.js';
import { game } from '../core/state.js';
import { sendWorld } from '../net.js';
import { dropLoot, giveScore, hurtTeammate, nearestTarget, runsWorld } from './coop.js';
import { flashRed } from './effects.js';
import { hurtPlayer } from './player.js';
import { FLOOR_H } from '../world/layout.js';

//------------------------------------------------
// Husks
export const husks = [];
let nextHuskId = 0; // every husk gets a number so all players agree which husk is which
const MODES = ['idle', 'guard', 'return', 'chase', 'windup', 'lunge'];
const HUSK_TURN = Math.PI;
const HUSK_MODEL_SCALE = 2.4;

// Difficulty knobs: change these to make husks easier or harder
export const HUSK_TUNING = {
    speed: 0.85,        // multiplies every husk's walk and lunge speed (1 = original)
    nestInterval: 16,   // seconds between nest spawns (was 10)
    nestCap: 5,         // a nest stops spawning once this many husks are near it
    nestRange: 30,      // nests only spawn while you're this close
    waveMax: 20,        // most husks alive at once during the evac (was 30)
    waveSlowest: 5,     // seconds between evac spawns at the start (was 4)
    waveFastest: 2.5,   // seconds between evac spawns at the end (was 1.6)
};

// model: the Blockbench file to use (from MODEL_FILES). If it's missing,
// the normal husk model is used instead, tinted with `tint`.
const HUSK_TYPES = {
    normal: { model: 'husk', hp: 3, speed: 3.5, scale: 1, tint: null, damage: 15, aggroRange: 30, score: 100, drop: 0.3,
                lungeRange: 4.5, windup: 0.4, lungeSpeed: 11, lungeTime: 0.3 },
    runner: { model: 'runner', hp: 1, speed: 7, scale: 0.75, tint: 0xd07040, damage: 8, aggroRange: 35, score: 75, drop: 0.15,
              lungeRange: 5, windup: 0.25, lungeSpeed: 16, lungeTime: 0.3 },
    brute:  { model: 'brute', hp: 12, speed: 2.2, scale: 1.6, tint: 0x6a2a2a, damage: 30, aggroRange: 25, score: 300, drop: 1,
              lungeRange: 12, windup: 0.9, lungeSpeed: 14, lungeTime: 0.7, heavy: true },
}

// home: if given, the husk is a guard. It shuffles around home, only notices you inside guardRadius, and walks back if you lead it too far away.
// alerted: spawn already hunting the player (ambushes, nest spawns, evac waves)
// puppet: a copy of one of the host's husks (multiplayer, when you aren't the host)
export function createHusk(x, z, type = 'normal', { home = null, guardRadius = 12, alerted = false, y = 0, puppet = false, id = null } = {}) {
    // Only the host makes real husks. Everyone else gets puppets from the host's updates.
    if (!puppet && !runsWorld()) return null;
    const base = HUSK_TYPES[type] || HUSK_TYPES.normal;
    const t = { ...base, speed: base.speed * HUSK_TUNING.speed, lungeSpeed: base.lungeSpeed * HUSK_TUNING.speed };
    const radius = 0.5 * t.scale;

    // Use the type's own model if it loaded, sized to match a normal husk times t.scale,
    // so it doesn't matter what scale it was built at in Blockbench
    const ownModel = t.model !== 'husk' && models[t.model] && models.husk;
    const modelName = ownModel ? t.model : 'husk';
    let modelScale = t.scale * HUSK_MODEL_SCALE;
    if (ownModel) modelScale *= modelHeight('husk') / modelHeight(t.model);
    const mesh = spawnModel(modelName, modelScale, -radius);
    mesh.children[0].rotation.y = ownModel && t.turn !== undefined ? t.turn : HUSK_TURN;

    // tint only the stand-in; custom models keep their own textures
    if (t.tint && !ownModel) {
        const tint = new THREE.Color(t.tint);
        mesh.traverse((c) => { if (c.isMesh) c.material.color.lerp(tint, 0.6); });
    }

    // Puppets are "kinematic": they go exactly where the host says, and push players out of the way
    const mass = t.heavy ? 200 : 50;
    const body = new CANNON.Body({
        mass: puppet ? 0 : mass,
        type: puppet ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(x, y + radius, z),
        fixedRotation: true,
    });
    world.addBody(body);
    mesh.position.copy(body.position);

    const husk = {
        id: id ?? nextHuskId++, puppet, net: null, mass,
        type, t, mesh, body, radius,
        hp: t.hp, stun: 0, dead: false, deathTimer: 0,
        mode: home ? 'guard' : 'idle', // idle, guard, return, chase, windup, lunge
        modeTimer: 0,
        lungeDir: new THREE.Vector3(),
        lungeCooldown: 0,
        attackCooldown: 0,
        alertTimer: alerted ? 8 : 0,
        home: home ? { x: home.x, z: home.z } : null,
        guardRadius,
        wanderTarget: null,
        wanderTimer: 0,
    };
    mesh.userData.husk = husk;
    husks.push(husk);
    return husk;
}

// Spawn a list like [['runner', x, z], ['brute', x, z]] already hunting the player
export function spawnGroup(list) {
    for (const [type, x, z] of list) createHusk(x, z, type, { alerted: true });
}

// Wake up every husk within radius of a point (gunshots, explosions, screams)
export function alertHusks(x, z, radius) {
    if (!runsWorld()) {
        sendWorld('alert', { x, z, radius }, 'host');
        return;
    }
    for (const h of husks) {
        if (h.dead) continue;
        if (Math.hypot(h.body.position.x - x, h.body.position.z - z) < radius) {
            h.alertTimer = Math.max(h.alertTimer, 8);
        }
    }
}

function setGlow(mesh, hex) {
    mesh.traverse((c) => {
        if (c.isMesh && c.material.emissive) c.material.emissive.setHex(hex);
    });
}

function moveToward(h, tx, tz, speed) {
    const dx = tx - h.body.position.x;
    const dz = tz - h.body.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.1) {
        h.body.velocity.x = 0;
        h.body.velocity.z = 0;
    } else {
        h.body.velocity.x = (dx / d) * speed;
        h.body.velocity.z = (dz / d) * speed;
    }
    return d;
}

// Every staircase (filled in by buildMultiStory), so husks know how to get
// up, down, in and out of buildings: { area, floorY, bottom, top, doorIn, doorOut }
export const stairways = [];
 
function inArea(a, x, z) {
    return x > a.x1 && x < a.x2 && z > a.z1 && z < a.z2;
}

// Handles enemy movement between buildings and floors.
function huskTarget(h, px, py, pz) {
    const hx = h.body.position.x;
    const hy = h.body.position.y;
    const hz = h.body.position.z;
    const near = (p, r = 1.3) => Math.hypot(hx - p.x, hz - p.z) < r;

    // Keeps enemies aligned with the stairs while climbing.
    const along = (dest) => {
        const dz = dest.z - hz;
        return Math.abs(dz) < 1.2 ? dest : { x: dest.x, z: hz + Math.sign(dz) };
    };

    const upper = FLOOR_H - 0.4;
    const pUp = py > upper;
    const hUp = hy > upper;
    const pB = stairways.find((s) => inArea(s.area, px, pz));
    const hB = stairways.find((s) => inArea(s.area, hx, hz));
    const chase = { x: px, z: pz };

    // Handles enemies already upstairs.
    if (hB && hUp) {
        if (h.stairStage === 'up') {
            if (near(hB.top, 1.0)) h.stairStage = null;
            else return along(hB.top);
        }
        if (pB === hB && pUp) {
            h.stairStage = null;
            return chase;
        }
        if (h.stairStage !== 'down' && near(hB.top, 1.0)) h.stairStage = 'down';
        return h.stairStage === 'down' ? along(hB.bottom) : hB.top;
    }

    // Handles enemies on or near the stairs.
    if (hB) {
        if (pB === hB && pUp) {
            // Larger enemies cannot use the stairs.
            if (h.t.heavy) return hB.bottom;
            if (h.stairStage !== 'up' && near(hB.bottom, 1.0)) h.stairStage = 'up';
            return h.stairStage === 'up' ? along(hB.top) : hB.bottom;
        }
        if (h.stairStage === 'down' && hy > 1) return along(hB.bottom);
        if (pB !== hB) {
            // Sends enemies outside through the building's door.
            if (h.stairStage !== 'exit' && near(hB.doorIn)) h.stairStage = 'exit';
            return h.stairStage === 'exit' ? hB.doorOut : hB.doorIn;
        }
        h.stairStage = null;
        return chase;
    }

    // Guides enemies outside toward the player's building.
    if (pB) {
        if (h.stairStage !== 'enter' && near(pB.doorOut)) h.stairStage = 'enter';
        return h.stairStage === 'enter' ? pB.doorIn : pB.doorOut;
    }

    h.stairStage = null;
    return chase;
}

export function updateHusks(dt, time) {
    // Loop backwards so removing a dead husk doesn't skip the next one
    for (let i = husks.length - 1; i >= 0; i--) {
        const h = husks[i];

        // Dead husks: physics can fling them around before being removed
        if (h.dead) {
            h.mesh.position.copy(h.body.position);
            h.mesh.quaternion.copy(h.body.quaternion);
            h.deathTimer -= dt;
            if (h.deathTimer <= 0) {
                scene.remove(h.mesh);
                world.removeBody(h.body);
                husks.splice(i, 1);
            }
            continue;
        }

        if (h.puppet) {
            updatePuppet(h, dt, time);
            continue;
        }

        // Go after whichever player is closest. If nobody's alive, stand still.
        const target = nearestTarget(h.body.position.x, h.body.position.y, h.body.position.z);
        if (!target) {
            h.body.velocity.x = 0;
            h.body.velocity.z = 0;
            if (h.mode !== 'guard') h.mode = h.home ? 'return' : 'idle';
            h.mesh.position.copy(h.body.position);
            continue;
        }
        const px = target.x;
        const pz = target.z;
        const dx = px - h.body.position.x;
        const dz = pz - h.body.position.z;
        const dist = Math.hypot(dx, dz);

        // only fight on the same floor as the player, otherwise wander around, don't bite through the ceiling/floir
        const sameFloor = Math.abs(target.y - h.body.position.y) < 1.5;
        const inner = h.mesh.children[0];
        inner.scale.y = h.t.scale * HUSK_MODEL_SCALE; // undo the wind-up crouch

        h.alertTimer -= dt;
        h.lungeCooldown -= dt;
        h.attackCooldown -= dt;

        const hunting = h.mode === 'chase' || h.mode === 'windup' || h.mode === 'lunge';

        if (h.stun > 0) {
            // knocked back: slide to a stop, any lunge is cancelled
            h.stun -= dt;
            const slow = Math.max(0, 1 - dt * 5);
            h.body.velocity.x *= slow;
            h.body.velocity.z *= slow;
            if (h.mode === 'windup' || h.mode === 'lunge') {
                h.mode = 'chase';
                setGlow(h.mesh, 0x000000);
            }
        } else if (!hunting) {
            const noticeRange = h.home ? h.guardRadius : h.t.aggroRange;
            if (dist < noticeRange || h.alertTimer > 0) {
                // A husk that spots you on its own screams and wakes its friends
                if (h.alertTimer <= 0) alertHusks(h.body.position.x, h.body.position.z, 15);
                h.mode = 'chase';
            } else if (h.mode === 'return') {
                if (moveToward(h, h.home.x, h.home.z, h.t.speed) < 1.5) h.mode = 'guard';
            } else if (h.mode === 'guard') {
                // shuffle around near home
                h.wanderTimer -= dt;
                if (h.wanderTimer <= 0 || !h.wanderTarget) {
                    h.wanderTimer = 2 + Math.random() * 3;
                    const a = Math.random() * Math.PI * 2;
                    const r = Math.random() * h.guardRadius * 0.4;
                    h.wanderTarget = { x: h.home.x + Math.cos(a) * r, z: h.home.z + Math.sin(a) * r };
                }
                moveToward(h, h.wanderTarget.x, h.wanderTarget.z, h.t.speed * 0.3);
            } else {
                h.body.velocity.x = 0;
                h.body.velocity.z = 0;
            }
        } else if (h.mode === 'chase') {
            const interested = dist < h.t.aggroRange * 1.4 || h.alertTimer > 0;
            const farFromHome = h.home &&
                Math.hypot(h.body.position.x - h.home.x, h.body.position.z - h.home.z) > 35;

            if (!interested || (farFromHome && dist > 10 && h.alertTimer <= 0)) {
                // lost interest: guards go home, wanderers just stop
                h.mode = h.home ? 'return' : 'idle';
            } else if (sameFloor && dist < h.t.lungeRange && dist > 1.2 && h.lungeCooldown <= 0) {
                h.mode = 'windup';
                h.modeTimer = h.t.windup;
                setGlow(h.mesh, 0x663300);
            } else if (dist > h.radius + 0.6 || !sameFloor || h.stairStage) {
                const step = huskTarget(h, px, target.y, pz);
                moveToward(h, step.x, step.z, h.t.speed);
            } else {
                h.body.velocity.x = 0;
                h.body.velocity.z = 0;
            }
        } else if (h.mode === 'windup') {
            // crouch and glow so the player can see the lunge coming and sidestep
            h.modeTimer -= dt;
            inner.scale.y = h.t.scale * HUSK_MODEL_SCALE * 0.8;
            h.body.velocity.x = 0;
            h.body.velocity.z = 0;
            if (h.modeTimer <= 0) {
                h.mode = 'lunge';
                h.modeTimer = h.t.lungeTime;
                h.lungeDir.set(dx, 0, dz).normalize();
                setGlow(h.mesh, 0x000000);
            }
        } else if (h.mode === 'lunge') {
            h.modeTimer -= dt;
            h.body.velocity.x = h.lungeDir.x * h.t.lungeSpeed;
            h.body.velocity.z = h.lungeDir.z * h.t.lungeSpeed;
            if (h.modeTimer <= 0) {
                h.mode = 'chase';
                h.lungeCooldown = 2 + Math.random();
            }
        }

        // Melee hit: one solid hit per second instead of constant drain
        if (sameFloor && dist < h.radius + 1.0 && h.attackCooldown <= 0 && h.stun <= 0 && !game.gameOver) {
            h.attackCooldown = h.t.heavy ? 1.5 : 1;
            const push = h.t.heavy ? 16 : 6;
            if (target.id == null) hurtPlayer(h.t.damage, h.body.position, push);
            else hurtTeammate(target.id, h.t.damage, h.body.position, push);
            if (h.mode === 'lunge') {
                h.mode = 'chase';
                h.lungeCooldown = 2;
            }
        }

        h.mesh.position.copy(h.body.position);
        h.mesh.position.y += Math.abs(Math.sin(time * (h.mode === 'lunge' ? 20 : 8))) * 0.05;

        // face the player when hunting, otherwise face the way it's walking
        const vx = h.body.velocity.x;
        const vz = h.body.velocity.z;
        if (h.mode === 'chase' || h.mode === 'windup') {
            h.mesh.lookAt(px, h.mesh.position.y, pz);
        } else if (Math.hypot(vx, vz) > 0.2) {
            h.mesh.lookAt(h.mesh.position.x + vx, h.mesh.position.y, h.mesh.position.z + vz);
        }
    }
}

// dir: direction the hit came from (pushes the husk that way)
// force: multiplies how hard a killing blow flings the body
// by: the teammate who did it (null if it was you), so they get the points
export function damageHusk(h, amount, dir, force = 1, by = null) {
    if (h.dead) return;
    if (h.puppet) {
        // not our husk: show the hit, and tell the host so it takes the damage
        flashRed(h.mesh);
        sendWorld('hit', { id: h.id, amount, dx: dir.x, dz: dir.z, force }, 'host');
        return;
    }
    h.hp -= amount;
    h.alertTimer = Math.max(h.alertTimer, 8); // getting hurt makes them angry
    flashRed(h.mesh);

    if (h.hp <= 0) {
        killHusk(h, new CANNON.Vec3(dir.x * 400 * force, 400 * force, dir.z * 400 * force), by);
    } else if (!h.t.heavy) {
        // brutes shrug off bullets, everything else staggers
        h.stun = 0.3;
        h.body.velocity.set(dir.x * 6, 0, dir.z * 6);
    }
}

// Shove a husk back and stun it (shoves and explosions)
export function pushHusk(h, dir, stun, speed) {
    if (h.dead) return;
    if (h.puppet) {
        sendWorld('push', { id: h.id, dx: dir.x, dz: dir.z, stun, speed }, 'host');
        return;
    }
    h.stun = Math.max(h.stun, stun);
    if (speed) h.body.velocity.set(dir.x * speed, 0, dir.z * speed);
}

function killHusk(h, impulse, by = null) {
    if (h.dead) return;
    h.dead = true;
    h.deathTimer = 1.5;
    setGlow(h.mesh, 0x000000);
    if (h.puppet) {
        // a puppet only needs to fall over: the host handles points and loot
        h.body.type = CANNON.Body.DYNAMIC;
        h.body.mass = h.mass;
    }

    const q = h.mesh.quaternion;
    h.body.quaternion.set(q.x, q.y, q.z, q.w);
    h.body.fixedRotation = false;
    h.body.updateMassProperties();
    h.body.applyImpulse(impulse.scale(h.body.mass / 50));
    if (h.puppet) return;
    giveScore(by, h.t.score);

    // Loot! Dropped pickups vanish after a while
    const x = h.body.position.x;
    const z = h.body.position.z;
    const floorY = Math.max(0, h.body.position.y - h.radius - 0.1);
    if (Math.random() < h.t.drop) dropLoot(Math.random() < 0.25 ? 'shells' : 'ammo', x, z, floorY);
    if (h.type === 'brute') dropLoot('medkit', x + 1, z, floorY);
}

//------------------------------------------------
// Multiplayer: the host sends its husks out, everyone else copies them as puppets

// Which way a husk faces, as one angle
function facing(h) {
    const v = new THREE.Vector3(0, 0, 1).applyQuaternion(h.mesh.quaternion);
    return Math.atan2(v.x, v.z);
}

// Host: every husk as a short list of numbers
export function huskSnapshot() {
    const r = (v) => Math.round(v * 100) / 100;
    return husks.map((h) => [h.id, h.type, r(h.body.position.x), r(h.body.position.y), r(h.body.position.z),
        r(facing(h)), MODES.indexOf(h.mode), h.dead ? 1 : 0]);
}

// Everyone else: make our puppets match the host's husks
export function applyHuskSnapshot(list) {
    const seen = new Set();
    for (const [id, type, x, y, z, yaw, mode, dead] of list) {
        seen.add(id);
        let h = husks.find((k) => k.id === id);
        if (!h) {
            if (dead) continue; // died before we ever saw it
            h = createHusk(x, z, type, { puppet: true, id });
            h.body.position.set(x, y, z);
            h.mesh.position.set(x, y, z);
        }
        if (!h.puppet) continue;
        h.net = { x, y, z, yaw, mode: MODES[mode] || 'idle' };
        if (dead && !h.dead) killHusk(h, new CANNON.Vec3((Math.random() - 0.5) * 200, 300, (Math.random() - 0.5) * 200));
    }
    // husks the host doesn't have anymore
    for (let i = husks.length - 1; i >= 0; i--) {
        const h = husks[i];
        if (h.puppet && !h.dead && !seen.has(h.id)) {
            scene.remove(h.mesh);
            world.removeBody(h.body);
            husks.splice(i, 1);
        }
    }
}

// Slide a puppet toward where the host says it is
function updatePuppet(h, dt, time) {
    const n = h.net;
    if (!n) return;
    const t = Math.min(1, dt * 12);
    h.body.position.x += (n.x - h.body.position.x) * t;
    h.body.position.y += (n.y - h.body.position.y) * t;
    h.body.position.z += (n.z - h.body.position.z) * t;
    h.body.velocity.set(0, 0, 0);
    h.mode = n.mode;

    const inner = h.mesh.children[0];
    const windup = n.mode === 'windup';
    inner.scale.y = h.t.scale * HUSK_MODEL_SCALE * (windup ? 0.8 : 1);
    if (windup !== !!h.glowing) setGlow(h.mesh, windup ? 0x663300 : 0x000000);
    h.glowing = windup;

    h.mesh.position.copy(h.body.position);
    h.mesh.position.y += Math.abs(Math.sin(time * (n.mode === 'lunge' ? 20 : 8))) * 0.05;
    let diff = n.yaw - h.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    h.mesh.rotation.set(0, h.mesh.rotation.y + diff * t, 0);
}

// We became the host: puppets turn into real husks that think for themselves
export function makeHusksReal() {
    for (const h of husks) {
        if (!h.puppet) continue;
        h.puppet = false;
        if (h.dead) continue;
        h.body.type = CANNON.Body.DYNAMIC;
        h.body.mass = h.mass;
        h.body.updateMassProperties();
        h.mode = 'idle';
        h.alertTimer = 4;
        setGlow(h.mesh, 0x000000);
    }
}
