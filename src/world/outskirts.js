// outskirts.js: Outskirts locations: checkpoint, diner, farm (spawn), crashed chopper, chapel.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { addStaticCollider, finishBuilding, part } from './builders.js';
import { buildCar } from './evacRoute.js';

//------------------------------------------------
// OUTSKIRTS:
// Story order (players can find them in any order):
//   Farm (Day 1) -> Checkpoint bulletin -> Diner (Day 96) -> Chapel (Day 150)
//   -> Crashed EVAC-2 recorder -> your existing house note (Day 212)
 
// Small paper note, same look as the one in the collapsed house
export function notePaper(g, y = 0.01) {
    part(g, 0.3, 0.002, 0.4, 0, y, 0, 0xe8e0c8, 0, 0.4, 0);
    part(g, 0.2, 0.025, 0.03, 0, y + 0.002, -0.05, 0x333333, 0, 0.3, 0);
    part(g, 0.2, 0.025, 0.03, 0, y + 0.002, 0.05, 0x333333, 0, 0.4, 0);
}
 
 
// MILITARY QUARANTINE CHECKPOINT
// Two tents, a sandbag wall with a gate, fence, floodlight and an abandoned jeep
export function buildCheckpoint(x, z) {
    const g = new THREE.Group();
    const OLIVE = 0x4f5536;
    const CANVAS = 0x6b6a4a;
    const SAND = 0x8f7f5c;
    const DARK = 0x2f312a;
    const METAL = 0x6d6a60;
    const RED = 0x8a3a2a;
    const WHITE = 0xcfc8b0;
 
    // Two army tents: canvas body, peaked roof, open flap facing the camp
    for (const tx of [-6, 6]) {
        part(g, 5, 2.2, 4, tx, 1.1, -4, CANVAS);
        part(g, 5.2, 0.12, 2.4, tx, 2.6, -5, OLIVE, -0.5, 0, 0);
        part(g, 5.2, 0.12, 2.4, tx, 2.6, -3, OLIVE, 0.5, 0, 0);
        part(g, 1.2, 1.8, 0.05, tx, 0.9, -1.97, DARK);
    }
 
    // Field desk infront of the left tent, with a dead radio on it
    part(g, 1.6, 0.08, 0.9, -6, 0.75, -0.9, OLIVE);
    for (const [lx, lz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) {
        part(g, 0.06, 0.75, 0.06, -6 + lx, 0.37, -0.9 + lz, DARK);
    }
    part(g, 0.4, 0.25, 0.3, -5.5, 0.92, -1.1, DARK);
 
    // Sandbag wall with a gap in the middle for the gate
    for (let sx = -9; sx <= 9; sx += 0.9) {
        if (Math.abs(sx) < 2) continue;
        for (let row = 0; row < 3; row++) {
            part(g, 0.85, 0.35, 0.5, sx + (row % 2) * 0.4, 0.18 + row * 0.33, 3.5, SAND,
                0, (Math.random() - 0.5) * 0.1, 0);
        }
    }
 
    // Gate: post and a red/white boom arm, snapped and hanging
    part(g, 0.3, 1.2, 0.3, 2.3, 0.6, 3.5, METAL);
    for (let i = 0; i < 4; i++) {
        part(g, 1, 0.15, 0.15, 1.8 - i, 1.15 - i * 0.15, 3.5, i % 2 ? RED : WHITE, 0, 0, 0.15);
    }
 
    // Fence along the back
    for (let fx = -10; fx <= 10; fx += 2.5) if (Math.abs(fx) > 3) part(g, 0.12, 2.2, 0.12, fx, 1.1, -8, METAL);
    for (const y of [0.4, 1.2, 2.0]) for (const s of [-1, 1]) part(g, 7, 0.04, 0.04, s * 6.5, y, -8, METAL);
    part(g, 6, 1.8, 0.03, -6, 1.1, -8, 0x5a5a52, 0, 0, 0.05); // sagging fence panel
 
    // Quarantine sign
    part(g, 0.15, 3, 0.15, -9, 1.5, 4.5, METAL);
    part(g, 2.2, 1.2, 0.08, -9, 2.6, 4.55, WHITE);
    part(g, 2.0, 0.25, 0.09, -9, 2.95, 4.58, RED);
 
    // Floodlight tower and supply crates
    part(g, 0.2, 5, 0.2, 9, 2.5, -6, METAL);
    part(g, 1.4, 0.6, 0.4, 9, 5.1, -6, DARK, 0.3, 0, 0);
    part(g, 1, 1, 1, 8, 0.5, -1, OLIVE);
    part(g, 1, 1, 1, 8.2, 1.5, -1.1, OLIVE, 0, 0.3, 0);
    part(g, 1, 0.6, 0.8, 9.2, 0.3, -0.5, OLIVE, 0, 0.2, 0);
 
    finishBuilding(g, x, z);
    buildCar(x + 7, z + 6, 0.4, OLIVE); // abandoned army jeep (has its own collider)
 
    // Colliders: tents, both halves of the sandbag wall, fence, crates
    addStaticCollider(5, 2.2, 4, x - 6, z - 4);
    addStaticCollider(5, 2.2, 4, x + 6, z - 4);
    addStaticCollider(7.6, 1.1, 0.6, x - 5.6, z + 3.5);
    addStaticCollider(7.6, 1.1, 0.6, x + 6.0, z + 3.5);
    addStaticCollider(7, 2.2, 0.2, x - 6.5, z - 8);
    addStaticCollider(7, 2.2, 0.2, x + 6.5, z - 8);
    addStaticCollider(2, 2, 1.2, x + 8.5, z - 1);
}
 
 
// ROADSIDE DINER
// Long building with the door on the west side, counter and booths inside,
// tall sign and a parking lot out front
export function buildDiner(x, z) {
    const g = new THREE.Group();
    const WALL = 0xa8a090;
    const TRIM = 0x8a3a2a;
    const ROOF = 0x4a4540;
    const GLASS = 0x52605c;
    const CHROME = 0x9a968c;
    const COUNTER = 0x7a5a40;
    const SEAT = 0x7a2a2a;
    const CONCRETE = 0x777064;
 
    // Walls: door gap in the west wall
    part(g, 0.35, 3.4, 7, 6, 1.7, 0, WALL);          // back (east)
    part(g, 12, 3.4, 0.35, 0, 1.7, -3.5, WALL);      // north
    part(g, 12, 1.1, 0.35, 0, 0.55, 3.5, WALL);      // south, below the windows
    part(g, 12, 0.7, 0.35, 0, 3.05, 3.5, WALL);      // south, above the windows
    part(g, 0.35, 3.4, 2.5, -6, 1.7, -2.25, WALL);   // west, left of the door
    part(g, 0.35, 3.4, 2.5, -6, 1.7, 2.25, WALL);    // west, right of the door
    part(g, 0.35, 0.8, 2.0, -6, 3.0, 0, WALL);       // over the door
 
    // Big front windows: two intact, one shattered, one missing
    for (const mx of [-3, 0, 3]) part(g, 0.15, 1.6, 0.4, mx, 1.9, 3.5, CHROME);
    part(g, 2.8, 1.5, 0.06, -4.5, 1.9, 3.5, GLASS);
    part(g, 2.8, 1.5, 0.06, 1.5, 1.9, 3.5, GLASS);
    part(g, 1.2, 0.7, 0.06, -1.9, 1.5, 3.5, GLASS, 0, 0, 0.4);
 
    // Red trim stripes and flat roof
    part(g, 12.1, 0.2, 0.05, 0, 1.0, 3.7, TRIM);
    part(g, 12.1, 0.2, 0.05, 0, 1.0, -3.7, TRIM);
    part(g, 12.8, 0.3, 7.8, 0, 3.55, 0, ROOF);
    part(g, 12.8, 0.4, 0.1, 0, 3.4, 3.95, TRIM);
 
    // Counter with a chrome top and a row of stools (one knocked over)
    part(g, 7, 1.0, 0.8, 1, 0.5, -2.4, COUNTER);
    part(g, 7.2, 0.08, 1.0, 1, 1.04, -2.4, CHROME);
    for (let sx = -1.5; sx <= 3.5; sx += 1.25) {
        if (Math.abs(sx - 1) < 0.1) continue;
        part(g, 0.12, 0.7, 0.12, sx, 0.35, -1.5, CHROME);
        part(g, 0.45, 0.1, 0.45, sx, 0.72, -1.5, SEAT);
    }
    part(g, 0.45, 0.1, 0.45, 1.2, 0.22, -0.8, SEAT, 1.4, 0.3, 0);
    part(g, 0.12, 0.7, 0.12, 1.0, 0.1, -0.5, CHROME, 1.5, 0.3, 0);
 
    // Booths along the window wall
    for (const bx of [-4, -1, 2]) {
        part(g, 1.2, 0.08, 0.8, bx, 0.75, 2.6, COUNTER);
        part(g, 0.1, 0.75, 0.1, bx, 0.37, 2.6, CHROME);
        for (const side of [-1, 1]) {
            part(g, 0.5, 0.5, 0.8, bx + side * 0.95, 0.25, 2.6, SEAT);
            part(g, 0.15, 1.0, 0.8, bx + side * 1.2, 0.75, 2.6, SEAT);
        }
    }
 
    // Tall roadside sign, leaning a little
    part(g, 0.3, 6, 0.3, -8, 3, -4, CHROME);
    part(g, 3.2, 1.4, 0.25, -8, 6.4, -4, TRIM, 0, 0, 0.08);
    part(g, 2.6, 0.4, 0.27, -8, 6.4, -4, 0xd8d0b8, 0, 0, 0.08);
 
    // Parking lot with faded lines
    part(g, 9, 0.04, 9, -11, 0.02, 0, CONCRETE);
    for (const lz of [-3, 0, 3]) part(g, 3, 0.05, 0.12, -12.5, 0.03, lz, 0xc8c0a0);
 
    finishBuilding(g, x, z);
    buildCar(x - 11, z + 1.5, 0.1, 0x7a3a3a);
    buildCar(x - 12, z - 3.5, -0.2, 0x5a6a70, true);
 
    // Colliders: walls (door left open) and the counter
    addStaticCollider(0.35, 3.4, 7, x + 6, z);
    addStaticCollider(12, 3.4, 0.35, x, z - 3.5);
    addStaticCollider(12, 3.4, 0.35, x, z + 3.5);
    addStaticCollider(0.35, 3.4, 2.5, x - 6, z - 2.25);
    addStaticCollider(0.35, 3.4, 2.5, x - 6, z + 2.25);
    addStaticCollider(7, 1.0, 0.8, x + 1, z - 2.4);
}
 
 
// FARM: where the Bloom started
// Farmhouse with a porch, a silo, a rusty tractor and a field of glowing Bloom crops
 
// Shared by every crop stalk so 40+ stalks don't each make their own material
const BLOOM_STALK_MAT = new THREE.MeshStandardMaterial({ color: 0x3f5a2a });
const BLOOM_BULB_MAT = new THREE.MeshStandardMaterial({ color: 0x66ff44, emissive: 0x66ff44, emissiveIntensity: 0.8 });
const STALK_GEO = new THREE.BoxGeometry(0.08, 1.6, 0.08);
const BULB_GEO = new THREE.BoxGeometry(0.22, 0.3, 0.22);
 
export function buildFarm(x, z) {
    const g = new THREE.Group();
    const WALL = 0xb8a888;
    const WOOD = 0x594638;
    const ROOF = 0x5a3a2e;
    const DARK = 0x2f2c28;
    const GLASS = 0x52605c;
    const SILO = 0x8a8478;
    const RUST = 0x75452f;
    const DIRT = 0x5e4632;
 
    // Farmhouse walls: door in the east wall, facing the porch
    part(g, 0.3, 3.4, 7, -4, 1.7, 0, WALL);
    part(g, 8, 3.4, 0.3, 0, 1.7, -3.5, WALL);
    part(g, 8, 3.4, 0.3, 0, 1.7, 3.5, WALL);
    part(g, 0.3, 3.4, 2.5, 4, 1.7, -2.25, WALL);
    part(g, 0.3, 3.4, 2.5, 4, 1.7, 2.25, WALL);
    part(g, 0.3, 0.8, 2.0, 4, 3.0, 0, WALL);
 
    // Boarded-up front windows
    for (const wz of [-2.25, 2.25]) {
        part(g, 0.05, 1.0, 1.2, 4.17, 1.9, wz, GLASS);
        part(g, 0.06, 0.15, 1.4, 4.2, 1.7, wz, WOOD, 0.3, 0, 0);
        part(g, 0.06, 0.15, 1.4, 4.2, 2.1, wz, WOOD, -0.25, 0, 0);
    }
 
    // Pitched roof (ridge runs north-south) and stepped gable ends
    part(g, 4.6, 0.25, 8, -2.1, 4.2, 0, ROOF, 0, 0, 0.45);
    part(g, 4.6, 0.25, 8, 2.1, 4.2, 0, ROOF, 0, 0, -0.45);
    for (const gz of [-3.5, 3.5]) {
        part(g, 5, 0.6, 0.3, 0, 3.7, gz, WALL);
        part(g, 2.4, 0.6, 0.3, 0, 4.3, gz, WALL);
        part(g, 0.5, 0.45, 0.3, 0, 4.8, gz, WALL);
    }
 
    // Porch
    part(g, 2.5, 0.2, 7, 5.3, 0.1, 0, WOOD);
    for (const pz of [-3.3, 3.3]) part(g, 0.15, 2.9, 0.15, 6.4, 1.5, pz, WOOD);
    part(g, 2.8, 0.15, 7.4, 5.4, 3.05, 0, ROOF, 0, 0, -0.12);
    part(g, 0.6, 0.6, 0.6, 5.8, 0.5, -2.5, WOOD, 0, 0.4, 0);
 
    // Silo with a rusty dome and a ladder
    const silo = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 10, 10),
        new THREE.MeshStandardMaterial({ color: SILO })
    );
    silo.position.set(10, 5, -7);
    silo.castShadow = true;
    silo.receiveShadow = true;
    g.add(silo);
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: RUST })
    );
    cap.position.set(10, 10, -7);
    cap.castShadow = true;
    g.add(cap);
    part(g, 0.1, 9, 0.5, 12.25, 4.5, -7, DARK);
 
    // Old tractor
    part(g, 2.4, 1.0, 1.2, 7, 1.1, 7, RUST);
    part(g, 0.9, 1.0, 1.1, 6.2, 2.0, 7, RUST);
    for (const wz of [6.2, 7.8]) {
        part(g, 1.4, 1.4, 0.35, 6.2, 0.7, wz, DARK);
        part(g, 0.8, 0.8, 0.3, 7.9, 0.4, wz, DARK);
    }
    part(g, 0.12, 0.9, 0.12, 7.8, 2.0, 7, DARK);
 
    // The Bloom field: dirt patch full of glowing stalks, with a clearing for the nest
    part(g, 9.5, 0.03, 13, -11.75, 0.015, 0, DIRT);
    for (let fx = -15.5; fx <= -7.5; fx += 1.6) {
        for (let fz = -5.5; fz <= 5.5; fz += 1.4) {
            if (Math.hypot(fx + 11, fz) < 2.5) continue;
            const sx = fx + (Math.random() - 0.5) * 0.4;
            const sz = fz + (Math.random() - 0.5) * 0.4;
            const h = 0.8 + Math.random() * 0.6;
 
            const stalk = new THREE.Mesh(STALK_GEO, BLOOM_STALK_MAT);
            stalk.scale.y = h;
            stalk.position.set(sx, 0.8 * h, sz);
            stalk.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
            g.add(stalk);
 
            const bulb = new THREE.Mesh(BULB_GEO, BLOOM_BULB_MAT);
            bulb.position.set(sx, 1.6 * h, sz);
            g.add(bulb);
        }
    }
 
    // Wooden fence along both sides of the field
    for (const fz of [-6.8, 6.8]) {
        for (let fx = -16; fx <= -7; fx += 2) part(g, 0.12, 1.1, 0.12, fx, 0.55, fz, WOOD);
        part(g, 9, 0.1, 0.06, -11.5, 0.8, fz, WOOD, 0, 0, fz > 0 ? 0.06 : -0.04);
    }
 
    finishBuilding(g, x, z);
 
    // Colliders: house walls (door open), silo, tractor
    addStaticCollider(0.3, 3.4, 7, x - 4, z);
    addStaticCollider(8, 3.4, 0.3, x, z - 3.5);
    addStaticCollider(8, 3.4, 0.3, x, z + 3.5);
    addStaticCollider(0.3, 3.4, 2.5, x + 4, z - 2.25);
    addStaticCollider(0.3, 3.4, 2.5, x + 4, z + 2.25);
    addStaticCollider(4.4, 10, 4.4, x + 10, z - 7);
    addStaticCollider(2.4, 2.4, 1.6, x + 7, z + 7);
}
 
 
// CRASHED EVAC-2 CHOPPER
// The first rescue attempt: cabin rolled on its side, tail torn off, rotor blades everywhere
export function buildCrashedChopper(x, z, rotY = 0.5) {
    const g = new THREE.Group();
    const BODY = 0x3e4436;
    const DARK = 0x23241f;
    const BURNT = 0x2a2622;
    const GLASS = 0x3e4a48;
    const SCORCH = 0x3a2e24;
 
    // Scorched ground
    part(g, 13, 0.02, 10, 0, 0.012, 1, SCORCH);
 
    // Cabin rolled onto its side, with a skid sticking up
    part(g, 2.2, 1.8, 4.2, 0, 1.3, 0, BODY, 0, 0, 1.2);
    part(g, 1.9, 1.0, 1.0, -0.2, 1.2, -2.5, GLASS, 0, 0, 1.2);
    part(g, 1.4, 1.2, 0.06, 0.6, 1.1, 2.12, BURNT, 0, 0, 1.2);
    part(g, 0.12, 0.12, 4.2, 1.76, 1.69, 0, DARK, 0, 0, 1.2);
    part(g, 0.12, 0.12, 3, 2.6, 0.1, -1, DARK, 0, 0.4, 0);
 
    // Tail boom torn off and lying a few meters away
    part(g, 0.5, 0.5, 4.5, 2.8, 0.3, 5.5, BODY, 0, 0.5, 0);
    part(g, 0.15, 1.5, 0.9, 3.8, 0.9, 7.3, BODY, 0, 0.5, 0.25);
 
    // Rotor blades: two flung across the ground, one stabbed into the dirt
    part(g, 4.5, 0.08, 0.35, -4.5, 0.05, 2.5, DARK, 0, 0.8, 0);
    part(g, 4, 0.08, 0.35, 3.5, 0.05, -4.5, DARK, 0, -0.4, 0.04);
    part(g, 0.35, 3.2, 0.08, -2.8, 1.3, -4.2, DARK, 0.3, 0, 0.25);
 
    // Debris
    part(g, 0.8, 0.3, 0.6, -3, 0.15, 4, BURNT, 0.2, 0.5, 0.1);
    part(g, 1.2, 0.2, 0.9, 4.5, 0.1, 1, BURNT, 0, 1.1, 0.1);
    part(g, 0.5, 0.5, 0.5, -1, 0.25, 4.5, BODY, 0.3, 0.2, 0.2);
 
    g.rotation.y = rotY;
    finishBuilding(g, x, z);
    addStaticCollider(4.4, 2.6, 4.6, x, z, rotY); // cabin only, the rest you can walk over
 
    // Thin smoke column (added to the sceneand not the building, so bullets pass through it)
    const smoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.6, 16, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x4a4540, transparent: true, opacity: 0.12, depthWrite: false })
    );
    smoke.position.set(x, 8, z);
    scene.add(smoke);
}
 
 
// CHAPEL AND GRAVEYARD
// Stone chapel with a steeple and stained glass, pews inside, graves out the east side
export function buildChapel(x, z) {
    const g = new THREE.Group();
    const STONE = 0x8a8274;
    const DARK_STONE = 0x6e675c;
    const ROOF = 0x3f3a36;
    const WOOD = 0x594638;
    const STAINED = [0x8a3a3a, 0x3a4a7a, 0xa08a3a];
 
    // Walls: 6 wide, 10 long, door in the north wall facing town
    part(g, 0.4, 3.8, 10, -3, 1.9, 0, STONE);
    part(g, 0.4, 3.8, 10, 3, 1.9, 0, STONE);
    part(g, 6.4, 3.8, 0.4, 0, 1.9, -5, STONE);
    part(g, 2.2, 3.8, 0.4, -1.9, 1.9, 5, STONE);
    part(g, 2.2, 3.8, 0.4, 1.9, 1.9, 5, STONE);
    part(g, 1.6, 1.0, 0.4, 0, 3.3, 5, STONE);
 
    // Stained glass: three windows per side, and a 4-pane window behind the altar
    for (const side of [-1, 1]) {
        [-3, 0, 3].forEach((wz, i) => {
            part(g, 0.06, 1.6, 0.9, side * 3.22, 2.2, wz, STAINED[(i + (side > 0 ? 1 : 0)) % 3]);
        });
    }
    [[-0.4, 2.0], [0.4, 2.0], [-0.4, 2.8], [0.4, 2.8]].forEach(([wx, wy], i) => {
        part(g, 0.75, 0.75, 0.06, wx, wy, -5.22, STAINED[i % 3]);
    });
 
    // Pitched roof and gable ends
    part(g, 3.8, 0.25, 10.8, -1.6, 4.6, 0, ROOF, 0, 0, 0.5);
    part(g, 3.8, 0.25, 10.8, 1.6, 4.6, 0, ROOF, 0, 0, -0.5);
    for (const gz of [-5, 5]) {
        part(g, 3.9, 0.6, 0.4, 0, 4.1, gz, STONE);
        part(g, 1.7, 0.6, 0.4, 0, 4.7, gz, STONE);
    }
 
    // Steeple over the door, with a spire and a crooked cross
    part(g, 2, 3.6, 2, 0, 5.6, 4.6, STONE);
    part(g, 0.8, 1.0, 0.05, 0, 6.4, 5.62, 0x1e1c1a); // belfry opening
    const spire = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 3.5, 4),
        new THREE.MeshStandardMaterial({ color: ROOF })
    );
    spire.position.set(0, 9.15, 4.6);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    g.add(spire);
    part(g, 0.12, 1.0, 0.12, 0, 11.4, 4.6, WOOD, 0, 0, 0.3);
    part(g, 0.6, 0.12, 0.12, 0.08, 11.6, 4.6, WOOD, 0, 0, 0.3);
 
    // Pews on both sides of the aisle (a few knocked over) and the altar
    for (let pz = 3; pz >= -2.5; pz -= 1.3) {
        for (const side of [-1, 1]) {
            const knocked = Math.random() < 0.25;
            part(g, 2, 0.45, 0.4, side * 1.6, knocked ? 0.2 : 0.45, pz, WOOD, knocked ? 1.3 : 0, 0, 0);
            if (!knocked) part(g, 2, 0.6, 0.1, side * 1.6, 0.8, pz - 0.2, WOOD);
        }
    }
    part(g, 2, 1, 0.8, 0, 0.5, -4.2, DARK_STONE);
 
    // Graveyard to the east: rows of leaning headstones with dirt mounds
    for (let gx = 6.5; gx <= 12.5; gx += 2) {
        for (let gz = -0.5; gz <= 7.5; gz += 2.5) {
            const tilt = (Math.random() - 0.5) * 0.25;
            part(g, 0.7, 0.9 + Math.random() * 0.3, 0.15, gx, 0.45, gz, DARK_STONE, tilt, 0, tilt * 0.5);
            part(g, 0.7, 0.05, 1.4, gx, 0.03, gz + 0.8, 0x4a3a2c);
        }
    }
    // A freshly dug grave with a shovel left in the dirt pile
    part(g, 0.9, 0.02, 1.8, 6.5, 0.01, -3, 0x2a2018);
    part(g, 0.9, 0.4, 0.9, 7.6, 0.2, -3, 0x5e4632, 0, 0.4, 0);
    part(g, 0.06, 1.3, 0.06, 7.3, 0.6, -2.4, WOOD, 0.4, 0, 0.2);
 
    // Low fence around the graveyard (no collider, you can walk through gaps)
    for (const fz of [-4.5, 9]) {
        for (let fx = 5.5; fx <= 13.5; fx += 1.5) part(g, 0.1, 0.8, 0.1, fx, 0.4, fz, WOOD);
        part(g, 8, 0.08, 0.05, 9.5, 0.6, fz, WOOD);
    }
 
    finishBuilding(g, x, z);
 
    // Colliders: walls (door open) and the altar
    addStaticCollider(0.4, 3.8, 10, x - 3, z);
    addStaticCollider(0.4, 3.8, 10, x + 3, z);
    addStaticCollider(6.4, 3.8, 0.4, x, z - 5);
    addStaticCollider(2.2, 3.8, 0.4, x - 1.9, z + 5);
    addStaticCollider(2.2, 3.8, 0.4, x + 1.9, z + 5);
    addStaticCollider(2, 1, 0.8, x, z - 4.2);
}
