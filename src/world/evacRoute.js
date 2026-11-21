// evacRoute.js: The evac road to the landing zone: walls, wrecked cars, wire, fire, the barricade, ambush triggers, the chopper.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, world } from '../core/engine.js';
import { game } from '../core/state.js';
import { sendWorld } from '../net.js';
import { huskTargets, runsWorld } from '../game/coop.js';
import { spawnGroup } from '../game/husks.js';
import { hurtPlayer, playerBody } from '../game/player.js';
import { props, spawnCrate } from '../game/props.js';
import { showMessage } from '../ui/hud.js';
import { addStaticCollider, finishBuilding, mergeGroup, part } from './builders.js';

//------------------------------------------------
// Evac Route
// After the signal goes out, the chopper lands at an LZ south of the tower.
// A walled-in road leads there with wrecks, wire, fire, a barricade and ambushes.

export const LZ_POS = new THREE.Vector3(0, 0, -138);
export const LAND_TIME = 45; // seconds the player must hold the LZ
export const LZ_SPAWNS = [[-13, -153], [13, -153], [-13, -124], [13, -124], [0, -153]];

// Straight rubble/concrete wall from (x1,z1) to (x2,z2). Must be along the x or z axis.
function buildWall(x1, z1, x2, z2) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const g = new THREE.Group();

    const slabs = Math.max(1, Math.round(len / 2));
    const COLORS = [0x7a7064, 0x6e655a, 0x857a6b];
    for (let i = 0; i < slabs; i++) {
        const offset = ((i + 0.5) / slabs - 0.5) * len;
        const h = 2.4 + Math.random() * 0.9;
        const jitter = (Math.random() - 0.5) * 0.15;
        const w = len / slabs + 0.05;
        part(g, alongX ? w : 0.6, h, alongX ? 0.6 : w,
            alongX ? offset : jitter, h / 2, alongX ? jitter : offset,
            COLORS[i % 3], 0, 0, (Math.random() - 0.5) * 0.06);

        // rubble piled at the base now and then
        if (Math.random() < 0.3) {
            part(g, 0.7, 0.45, 0.7, alongX ? offset : 0.7, 0.2, alongX ? 0.7 : offset,
                0x6e5a48, 0.3, Math.random(), 0.2);
        }
    }

    finishBuilding(g, cx, cz);
    addStaticCollider(alongX ? len : 0.6, 3.3, alongX ? 0.6 : len, cx, cz);
}

// Cars are props: buildCar() just records where they go while the world is built,
// spawnCars() (called from spawnEntities) creates them, so R puts them back.
const carSpawns = [];
export function buildCar(x, z, rotY = 0, color = 0x6a5a4a, burnt = false) {
    carSpawns.push({ x, z, rotY, color, burnt });
}

// The car's look, built out of boxes like the bus. Length runs along x.
function buildCarModel(color, burnt) {
    const g = new THREE.Group();
    const BODY = burnt ? 0x2e2a26 : color;
    const DARK = 0x2a2724;
    const GLASS = 0x3e4a48;
    const RUST = 0x75452f;

    part(g, 4.2, 0.8, 1.9, 0, 0.7, 0, BODY);                   // lower body
    part(g, 2.2, 0.7, 1.7, -0.2, 1.45, 0, BODY);               // cabin
    part(g, 0.06, 0.6, 1.6, 0.95, 1.4, 0, GLASS, 0, 0, -0.5);  // windshield
    for (const sx of [-1.3, 1.3]) {
        for (const sz of [-0.95, 0.95]) part(g, 0.7, 0.7, 0.3, sx, 0.35, sz, DARK); // wheels
    }
    part(g, 0.9, 0.3, 0.02, 0.8, 0.75, 0.96, RUST);
    part(g, 0.6, 0.25, 0.02, -1.2, 0.6, -0.96, RUST);
    part(g, 1.2, 0.05, 1.0, 1.4, 1.12, 0.1, BODY, 0, 0.2, 0.3); // hood popped open
    mergeGroup(g);
    return g;
}

function spawnCar({ x, z, rotY, color, burnt }) {
    const model = buildCarModel(color, burnt);
    model.position.y = -0.9; // physics box is centered, the model's origin is at the ground

    const holder = new THREE.Group();
    holder.add(model);
    scene.add(holder);

    // frozen in place (mass 0) until a blast wakes it up, just like the bus
    const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 0.9, z) });
    body.addShape(new CANNON.Box(new CANNON.Vec3(2.15, 0.9, 1.0)));
    body.quaternion.setFromEuler(0, rotY, 0);
    body.linearDamping = 0.5;  // the ground has no friction, so this stops them sliding forever
    body.angularDamping = 0.5;
    world.addBody(body);

    const prop = { mesh: holder, body, dormant: true, blastScale: 12, wakeMass: 250 };
    holder.userData.prop = prop;
    props.push(prop);
}

export function spawnCars() {
    for (const c of carSpawns) spawnCar(c);
}

// Hazard zones: rectangles the player gets hurt/slowed in
export const hazards = [];
const fires = [];

function buildWire(z, x1, x2) {
    const g = new THREE.Group();
    for (let x = x1; x <= x2; x += 2) {
        part(g, 0.1, 1.1, 0.1, x, 0.55, (Math.random() - 0.5) * 0.4, 0x4a3f35,
            (Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.15);
    }
    for (const y of [0.3, 0.6, 0.9]) {
        for (const dz of [-0.5, 0, 0.5]) {
            part(g, x2 - x1, 0.025, 0.025, (x1 + x2) / 2, y + Math.random() * 0.1, dz,
                0x8a8a80, Math.random() * 0.2, 0, 0);
        }
    }
    g.position.set(0, 0, z);
    scene.add(g); // not an obstacle, bullets pass through
    hazards.push({ type: 'wire', x1, x2, z1: z - 1.2, z2: z + 1.2, warned: false,
        warning: 'Barbed wire! It slows you down.' });
}

function buildFire(x, z, w, d) {
    const g = new THREE.Group();
    const flames = [];
    for (let i = 0; i < 14; i++) {
        const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.35 + Math.random() * 0.3, 1.2 + Math.random(), 6),
            new THREE.MeshBasicMaterial({ color: i % 3 ? 0xff7a20 : 0xffc040, transparent: true, opacity: 0.85 })
        );
        flame.position.set((Math.random() - 0.5) * w, 0.6, (Math.random() - 0.5) * d);
        flame.userData.phase = Math.random() * 10;
        g.add(flame);
        flames.push(flame);
    }
    const light = new THREE.PointLight(0xff7020, 8, 14);
    light.position.y = 1.5;
    g.add(light);
    g.position.set(x, 0, z);
    scene.add(g);

    fires.push({ flames, light });
    hazards.push({ type: 'fire', x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, warned: false,
        warning: "You're on fire! Get out!" });
}

export function updateHazards(dt, time) {
    for (const f of fires) {
        for (const flame of f.flames) {
            flame.scale.y = 1 + 0.35 * Math.sin(time * 12 + flame.userData.phase);
        }
        f.light.intensity = 6 + Math.random() * 4;
    }

    game.hazardSlow = 1;
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    for (const zone of hazards) {
        if (px < zone.x1 || px > zone.x2 || pz < zone.z1 || pz > zone.z2) continue;
        if (!zone.warned) {
            zone.warned = true;
            showMessage(zone.warning, 2);
        }
        if (zone.type === 'fire') hurtPlayer(20 * dt);
        if (zone.type === 'wire') {
            game.hazardSlow = 0.4;
            hurtPlayer(4 * dt);
        }
    }
}

// Flare: glowing stick on the ground marking the route (no light, cheap)
function buildFlare(x, z) {
    const flare = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3020 })
    );
    flare.position.set(x, 0.2, z);
    flare.rotation.z = 0.5;
    scene.add(flare);
}

// The barricade blocks the road until something blows it up (or you shoot it to pieces)

export function spawnBarricade(z) {
    const g = new THREE.Group();
    for (let x = -6.3; x <= 6.4; x += 1.4) {
        part(g, 1.3, 1.2, 1.2, x, 0.6, (Math.random() - 0.5) * 0.3, 0x6b5238, 0, Math.random() * 0.3, 0);
        if (Math.random() < 0.7) {
            part(g, 1.2, 1.1, 1.1, x + (Math.random() - 0.5) * 0.4, 1.75, 0, 0x7a6040, 0, Math.random() * 0.4, 0);
        }
    }
    part(g, 14.5, 0.25, 0.1, 0, 1.0, 0.7, 0x594638, 0, 0, 0.04);
    part(g, 14.5, 0.25, 0.1, 0, 2.1, 0.7, 0x594638, 0, 0, -0.05);
    part(g, 3, 1.6, 0.06, -3, 1.4, 0.75, 0x777269, 0, 0, 0.1);
    part(g, 2.4, 1.3, 0.06, 3.5, 1.2, 0.75, 0x75452f, 0, 0, -0.08);
    g.position.set(0, 0, z);
    scene.add(g);

    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(7.3, 3, 0.7)),
        position: new CANNON.Vec3(0, 3, z),
    });
    world.addBody(body);

    game.barricade = { group: g, body, hp: 30, z };
    g.userData.barricade = game.barricade;
}

export function damageBarricade(amount) {
    if (!game.barricade) return;
    if (!runsWorld()) {
        sendWorld('barricadeHit', { amount }, 'host'); // the host keeps track of its health
        return;
    }
    game.barricade.hp -= amount;
    if (game.barricade.hp <= 0) breakBarricade();
}

// fromNetwork: the host told us it broke. quiet: catching up after joining (no debris or message)
export function breakBarricade(fromNetwork = false, quiet = false) {
    if (!game.barricade) return;
    const { group, body, z } = game.barricade;
    scene.remove(group);
    world.removeBody(body);
    game.barricade = null;
    if (!fromNetwork) sendWorld('barricade', null);
    if (quiet) return;

    // a few crates go flying as debris
    for (let i = 0; i < 5; i++) {
        spawnCrate(-5 + i * 2.5, z);
        props[props.length - 1].body.applyImpulse(
            new CANNON.Vec3((Math.random() - 0.5) * 30, 40, -20 - Math.random() * 30)
        );
    }
    showMessage('The barricade is down!', 2.5);

    // the noise brings out whatever was hiding behind it (spawnGroup only works for the host)
    spawnGroup([['normal', -3, z - 8], ['normal', 3, z - 9], ['runner', 0, z - 12], ['runner', -5, z - 14]]);
}

// Ambush triggers: fire once when a player walks south past a z line on the road.
// local: only for you (messages). The others spawn husks, so the host checks every player.
const triggers = [];

export function setupTriggers() {
    triggers.length = 0;
    triggers.push(
        { z: -70, run: () => spawnGroup([['runner', -3, -86], ['runner', 3, -88], ['runner', 0, -90]]) },
        { z: -90, local: true, run: () => { if (game.barricade) showMessage('A barricade blocks the road. Those barrels look useful...', 4); } },
        { z: -101, run: () => spawnGroup([['brute', 0, -118], ['normal', 3, -119], ['normal', -2, -121]]) },
    );
    for (const t of triggers) t.fired = false;
}

// playing: false while you're paused or dead (the host still checks teammates then)
export function updateTriggers(playing = true) {
    const me = playerBody.position;
    const everyone = runsWorld() ? huskTargets() : [];
    for (const t of triggers) {
        if (t.fired) continue;
        const onRoad = (p) => Math.abs(p.x) <= 8 && p.z < t.z;
        const meHere = playing && onRoad(me);
        if (meHere || (!t.local && everyone.some(onRoad))) {
            t.fired = true;
            t.run();
        }
    }
}

// Evac chopper, built from boxes. Circles the LZ after the signal, then lands.
export let chopper;
export let rotor;

function buildChopper() {
    const g = new THREE.Group();
    const BODY = 0x4a5240;
    const DARK = 0x23241f;
    const GLASS = 0x3e4a48;

    part(g, 2.2, 1.8, 4.2, 0, 1.6, 0, BODY);       // cabin
    part(g, 1.9, 1.0, 1.0, 0, 1.9, -2.4, GLASS);   // nose window
    part(g, 0.5, 0.5, 5, 0, 2.1, 4.4, BODY);       // tail boom
    part(g, 0.15, 1.5, 0.9, 0, 2.8, 6.7, BODY);    // tail fin
    part(g, 0.2, 0.4, 0.2, 0, 2.6, 0, DARK);       // rotor mast
    for (const sx of [-1, 1]) {
        part(g, 0.12, 0.12, 4.2, sx, 0.1, 0, DARK); // skids
        for (const sz of [-1.2, 1.2]) part(g, 0.1, 0.6, 0.1, sx, 0.4, sz, DARK);
    }

    rotor = new THREE.Group();
    part(rotor, 9, 0.08, 0.35, 0, 0, 0, DARK);
    part(rotor, 0.35, 0.08, 9, 0, 0, 0, DARK);
    rotor.position.y = 2.8;
    g.add(rotor);

    g.visible = false;
    scene.add(g);
    chopper = g;
}

export function buildEvacRoute() {
    // Road walls from the tower down to the LZ
    buildWall(-7.3, -60, -7.3, -120);
    buildWall(7.3, -60, 7.3, -120);

    // LZ enclosure, only open where the road comes in
    buildWall(-16, -120, -16, -156);
    buildWall(16, -120, 16, -156);
    buildWall(-16, -156, 16, -156);
    buildWall(-16, -120, -7.3, -120);
    buildWall(7.3, -120, 16, -120);

    // Wrecks you have to weave around
    buildCar(-4, -67, 0.1, 0x5a6a70);
    buildCar(-1.8, -70, -0.35, 0x7a4a3a);
    buildCar(4, -84, -0.15, 0x6a5a4a, true);
    buildCar(-4, -116, 0.1, 0x55604a);

    // Hazards
    buildWire(-76, -7, 7);
    buildCar(4, -109, 0.3, 0, true); // the burning one
    buildFire(3.8, -109, 6.4, 6);

    // Supply cache halfway: tarp over two posts
    part(scene, 0.15, 2.4, 0.15, -6.5, 1.2, -88, 0x594638);
    part(scene, 0.15, 2.4, 0.15, -6.5, 1.2, -92, 0x594638);
    part(scene, 2.2, 0.06, 4.6, -5.6, 2.3, -90, 0x5a6a50, 0, 0, -0.15);

    // Flares marking the way
    for (let z = -62; z >= -118; z -= 12) {
        buildFlare(-6, z);
        buildFlare(6, z - 6);
    }

    // Helipad: concrete square with an "H"
    const PAD = 0x8a8478;
    const MARK = 0xd8c88a;
    part(scene, 10, 0.06, 10, LZ_POS.x, 0.03, LZ_POS.z, PAD);
    part(scene, 0.6, 0.07, 5, LZ_POS.x - 1.6, 0.04, LZ_POS.z, MARK);
    part(scene, 0.6, 0.07, 5, LZ_POS.x + 1.6, 0.04, LZ_POS.z, MARK);
    part(scene, 2.6, 0.07, 0.6, LZ_POS.x, 0.04, LZ_POS.z, MARK);
    for (const [fx, fz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) buildFlare(LZ_POS.x + fx, LZ_POS.z + fz);

    // Green smoke column so you can spot the LZ from the tower
    const smoke = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 2, 30, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66ff66, transparent: true, opacity: 0.18, depthWrite: false })
    );
    smoke.position.set(LZ_POS.x + 6, 15, LZ_POS.z - 6);
    scene.add(smoke);

    buildChopper();
}
