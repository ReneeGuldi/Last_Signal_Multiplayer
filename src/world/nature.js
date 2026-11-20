// nature.js: Dead trees, rocks and skeletons.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { addSecret } from '../game/interact.js';
import { addStaticCollider, isFree, mergeGroup, obstacles, part, reserve } from './builders.js';
import { UPPER_Y, at } from './layout.js';
import { notePaper } from './outskirts.js';

 
 
//------------------------------------------------
// Nature: dead trees and rocks, kept off roads and out of buildings
function buildDeadTree(g, x, z, s = 1) {
    const BARK = 0x3a2e24;
    const h = (4 + Math.random() * 2.5) * s;
    const lean = (Math.random() - 0.5) * 0.15;
    const trunk = new THREE.Group();
    trunk.position.set(x, 0, z);
    trunk.rotation.set(lean, Math.random() * 6, -lean);
    g.add(trunk);
    part(trunk, 0.4 * s, h, 0.4 * s, 0, h / 2, 0, BARK);
    part(trunk, 0.7 * s, 0.3, 0.7 * s, 0, 0.15, 0, BARK); // root flare
 
    const branches = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branches; i++) {
        const pivot = new THREE.Group();
        pivot.position.y = h * (0.45 + Math.random() * 0.5);
        pivot.rotation.y = Math.random() * Math.PI * 2;
        trunk.add(pivot);
        const arm = new THREE.Group();
        arm.rotation.z = 0.5 + Math.random() * 0.6;
        pivot.add(arm);
        const len = (1.2 + Math.random() * 1.4) * s;
        part(arm, len, 0.14 * s, 0.14 * s, len / 2, 0, 0, BARK);
        // a twig off the end
        const twig = new THREE.Group();
        twig.position.x = len;
        twig.rotation.z = 0.5;
        arm.add(twig);
        part(twig, len * 0.5, 0.08 * s, 0.08 * s, len * 0.25, 0, 0, BARK);
    }
    addStaticCollider(0.45 * s, h, 0.45 * s, x, z);
    reserve(x - 1, z - 1, x + 1, z + 1);
}
 
export function buildNature() {
    const g = new THREE.Group();
 
    // trees in specific spots: yards, along the dirt path, the farm, the chapel
    const spots = [
        [-35, 17], [-8, 16], [-33, 8], [-7, 33],                    // residential yards
        [-56, 104], [-46, 99], [-32, 96], [-18, 94], [-5, 92],     // along the path
        [-44, 89], [-28, 87], [-14, 85],
        [-92, 108], [-88, 92], [-60, 112], [-70, 85],              // farm
        [-70, 22], [-52, 26], [-68, 6],                             // chapel
        [72, -10], [58, -14], [76, -30],                            // crash site
        [-50, -20], [-55, -45], [52, 30], [55, 55], [-55, 55], [30, 60], [-25, 62], [25, 70],
        [-69, -18], [-83, -20], [-97, -16], [-87, 18], [-72, 20],   // suburb yards
        [92, 60], [58, 64], [92, -26], [64, -44], [108, 10],         // east side
    ];
    for (const [x, z] of spots) if (isFree(x, z, 0.5)) buildDeadTree(g, x, z, 0.8 + Math.random() * 0.5);
 
    // extra random trees in the open outskirts
    for (let k = 0, placed = 0; k < 400 && placed < 25; k++) {
        const x = (Math.random() - 0.5) * 240;
        const z = (Math.random() - 0.5) * 240 + 10;
        if (Math.abs(x) < 50 && z > -45 && z < 50) continue; // not in the middle of the city
        if (!isFree(x, z, 3)) continue;
        buildDeadTree(g, x, z, 0.7 + Math.random() * 0.6);
        placed++;
    }
    scene.add(g);
    mergeGroup(g);
    obstacles.push(g);
 
    // rocks (visual only)
    const rocks = new THREE.Group();
    for (let k = 0, placed = 0; k < 500 && placed < 70; k++) {
        const x = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 300;
        if (!isFree(x, z, 1.5)) continue;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(Math.random() * 1.2 + 0.3),
            new THREE.MeshStandardMaterial({ color: 0x6e5a48, flatShading: true })
        );
        rock.position.set(x, 0.2, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rocks.add(rock);
        placed++;
    }
    scene.add(rocks);
    mergeGroup(rocks);
}
 
 
//------------------------------------------------
// Skeletons: lying on the ground, or sitting against a wall
const BONE = 0xd6cdb4;
 
function buildSkeleton(x, z, rot = 0, sitting = false, y = 0) {
    const g = new THREE.Group();
    if (!sitting) {
        // lying on its back, head toward -z
        part(g, 0.22, 0.2, 0.25, 0, 0.1, -0.85, BONE);               // skull
        part(g, 0.04, 0.04, 0.03, -0.05, 0.16, -0.97, 0x222222);     // eye sockets
        part(g, 0.04, 0.04, 0.03, 0.05, 0.16, -0.97, 0x222222);
        part(g, 0.05, 0.05, 0.6, 0, 0.04, -0.4, BONE);               // spine
        for (let i = 0; i < 5; i++) part(g, 0.34 - i * 0.03, 0.04, 0.03, 0, 0.08, -0.6 + i * 0.07, BONE); // ribs
        part(g, 0.3, 0.06, 0.14, 0, 0.05, -0.05, BONE);              // pelvis
        for (const s of [-1, 1]) {
            part(g, 0.05, 0.05, 0.45, s * 0.1, 0.03, 0.25, BONE, 0, s * 0.08, 0);   // thigh
            part(g, 0.045, 0.045, 0.42, s * 0.14, 0.03, 0.68, BONE, 0, s * 0.12, 0); // shin
            part(g, 0.04, 0.04, 0.3, s * 0.24, 0.03, -0.45, BONE, 0, -s * 0.4, 0);   // upper arm
            part(g, 0.035, 0.035, 0.28, s * 0.3, 0.03, -0.18, BONE, 0, s * 0.25, 0); // forearm
        }
    } else {
        // sitting against a wall (behind it is -z), legs stretched out toward +z
        part(g, 0.22, 0.22, 0.24, 0, 0.82, -0.05, BONE, 0.3, 0, 0.15); // skull, slumped
        part(g, 0.04, 0.04, 0.03, -0.05, 0.85, 0.08, 0x222222);
        part(g, 0.04, 0.04, 0.03, 0.05, 0.85, 0.08, 0x222222);
        part(g, 0.05, 0.55, 0.05, 0, 0.4, -0.12, BONE, -0.15, 0, 0); // spine
        for (let i = 0; i < 4; i++) part(g, 0.32 - i * 0.03, 0.03, 0.18, 0, 0.62 - i * 0.08, -0.06, BONE);
        part(g, 0.3, 0.1, 0.16, 0, 0.06, -0.1, BONE);                 // pelvis
        for (const s of [-1, 1]) {
            part(g, 0.05, 0.05, 0.45, s * 0.1, 0.05, 0.15, BONE, 0, s * 0.05, 0);
            part(g, 0.045, 0.045, 0.42, s * 0.12, 0.04, 0.58, BONE, 0, s * 0.08, 0);
            part(g, 0.04, 0.3, 0.04, s * 0.2, 0.45, -0.05, BONE, 0, 0, s * 0.2);   // arms hanging down
            part(g, 0.035, 0.035, 0.28, s * 0.25, 0.12, 0.12, BONE, 0, s * 0.3, 0);
        }
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    scene.add(g);
    mergeGroup(g);
}
 
export function buildSkeletons() {
    // Positions are relative to landmarks where it matters, so they move with them
    buildSkeleton(...at('checkpoint', -3, 6), 0.4);
    buildSkeleton(...at('checkpoint', 9, -3), 2.0);
    buildSkeleton(3, 50, 1.2);
    buildSkeleton(-36, 3, -0.6);
    buildSkeleton(35, -32, 2.5);
    buildSkeleton(...at('crash', 3, 4), 0.8);
    buildSkeleton(...at('chapel', 5.2, -3), 1.0);  // next to the open grave
    buildSkeleton(...at('farm', -6, 8), -0.5);
    buildSkeleton(3, -80, 2.2);                     // evac road
    buildSkeleton(-4, -126, -1.0);                  // landing zone
    // sitting ones
    buildSkeleton(...at('diner', -4.9, 2.6), Math.PI / 2, true, 0.5);   // in a diner booth
    buildSkeleton(...at('police', 6.8, -5.0), 0, true, 0.55);           // on the cell bed
    buildSkeleton(...at('motel', 8.8, 2.2), Math.PI, true, 0.55);       // Officer Reyes, motel room 4
    buildSkeleton(...at('warehouse', -6, -3), 1.9);
    buildSkeleton(...at('sub5', -1, -1.5), 0.6);
    buildSkeleton(...at('police', 7.2, 3), -Math.PI / 2, true, UPPER_Y); // upstairs, by the racks
    buildSkeleton(-13.7, 17.5, -Math.PI / 2, true, UPPER_Y);            // apartment, upstairs bedroom
    buildSkeleton(...at('houseB', -2.4, -2.4), Math.PI / 2, false, 0.5); // in bed
}

// LORE: journal pages and records at each new location.
// They use addSecret, so they count toward the secrets total and give +50 score.
export function buildLoreNotes() {
    addSecret(...at('farm', 5.5, -1.5), (g) => notePaper(g),
        'Torn journal page: "Day 1. The corn came up overnight with green veins in every stalk. At night the whole field glows. Dad thinks it\'s beautiful."', 0.2);
 
    addSecret(...at('checkpoint', -6, -0.9), (g) => notePaper(g),
        'Military bulletin: "SECTOR 9 QUARANTINE. The Bloom spreads by spore. Infected hosts are hostile. Evacuation flights suspended until further notice."', 0.79);
 
    addSecret(...at('police', 2, -1.2), (g) => notePaper(g),
        'Duty log, Officer Reyes: "Day 31. No word from command in a week. I left the shotgun up here in the armory. If you\'re reading this, it\'s yours now."', UPPER_Y + 0.82);
 
    addSecret(-21.5, 16, (g) => notePaper(g),
        'Journal page: "Day 58. We barricaded the stairwell, but they learned to climb. Nowhere is high enough anymore."', UPPER_Y + 0.82);
 
    addSecret(...at('diner', -3, -0.8), (g) => notePaper(g),
        'Journal page: "Day 96. Marcus found us at the diner. Six of us now. He says Tower 9 can still reach the evac channel if we find the parts."');
 
    addSecret(...at('chapel', 0, -4.2), (g) => notePaper(g),
        'Journal page: "Day 150. We buried Ellie behind the chapel. Marcus has started coughing. It comes up green."', 1.01);
 
    // East side and suburbs (motel and grocery face south, so their insides are at +z)
    addSecret(...at('motel', 9.5, -1.4), (g) => notePaper(g),
        'Note on motel stationery: "Locked the station so they can\'t get to the armory. Kept the key with me. If I don\'t wake up, take it. The shotgun is upstairs. - Reyes"', 0.82);

    addSecret(...at('grocery', 4.5, -3.6), (g) => notePaper(g),
        'Store notice: "ALL PRODUCE FROM THE FARM UP THE NORTH ROAD HAS BEEN RECALLED. Do not eat it. Do not touch it. Do not take it home."', 1.06);

    addSecret(...at('warehouse', -8.7, -6.1), (g) => notePaper(g),
        'Shipping manifest: "42 crates, AGRI-TRIAL 9 seed stock. Deliver to the farm up the north road. Do not open. Keep dry."', 0.82);

    addSecret(...at('fire', 2, 1), (g) => notePaper(g),
        'Engine 9 logbook: "Day 40. We hosed down a nest on Main Street. The water just carried the spores further. Captain says no more water."', UPPER_Y + 0.82);

    addSecret(...at('school', 2, 5.4), (g) => notePaper(g),
        'Written on the chalkboard: "Classes cancelled. Parents: pick up your children at the gym by 3pm. Do NOT go near the farm road."', 1.2);

    addSecret(...at('sub5', -0.5, -1.5), (g) => notePaper(g),
        'A child\'s drawing: a house, a family of four, and a giant green flower over the roof. Someone has written "IT\'S WATCHING US" across the bottom.');

    addSecret(...at('crash', -3, 3), (g) => {
        part(g, 0.4, 0.3, 0.5, 0, 0.15, 0, 0xd0661a, 0, 0.5, 0);
        part(g, 0.42, 0.06, 0.52, 0, 0.22, 0, 0x222222, 0, 0.5, 0);
    }, 'Flight recorder: "EVAC-2 to base... spore cloud in the intake... losing power... we\'re going dow—" The recording ends.');
}
