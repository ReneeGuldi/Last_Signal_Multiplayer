// streets.js: Roads, sidewalks, the dirt path, street lamps (and their flicker), traffic lights, trash, parked cars.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { placeProp } from './blockbench.js';
import { addStaticCollider, mergeGroup, obstacles, part, reserve } from './builders.js';
import { buildCar } from './evacRoute.js';
import { ROADS, ROAD_W, WALK_W } from './layout.js';
   // top of an upper floor (where you stand)
 
 
//------------------------------------------------
// Roads, sidewalks and the tower plaza
export function buildRoads() {
    const g = new THREE.Group();
    const ASPHALT = 0x3a3632;
    const WALK = 0x8a8478;
    const LINE = 0x9a8a4a;
    const CRACK = 0x2a2724;
 
    const half = ROAD_W / 2;
    const corridor = half + WALK_W;
 
    ROADS.forEach(([x1, z1, x2, z2], i) => {
        const alongX = z1 === z2;
        const a = alongX ? Math.min(x1, x2) : Math.min(z1, z2);
        const b = alongX ? Math.max(x1, x2) : Math.max(z1, z2);
        const fixed = alongX ? z1 : x1;
        const len = b - a + ROAD_W;
        const mid = (a + b) / 2;
        const y = 0.02 + i * 0.002; // tiny height difference so crossings don't flicker
 
        // asphalt
        if (alongX) part(g, len, 0.04, ROAD_W, mid, y, fixed, ASPHALT);
        else part(g, ROAD_W, 0.04, len, fixed, y, mid, ASPHALT);
 
        // where other roads cross this one (no sidewalk or center line there)
        const crossings = ROADS.filter((r, j) => j !== i && (r[1] === r[3]) !== alongX)
            .map((r) => (alongX ? r[0] : r[1]))
            .filter((c) => c >= a - 1 && c <= b + 1);
        const blocked = (t, pad) => crossings.some((c) => Math.abs(t - c) < half + pad);
 
        // sidewalks on both sides, in 2 m pieces so they can skip the crossings
        for (let t = a - half; t < b + half; t += 2) {
            if (blocked(t + 1, 0)) continue;
            for (const side of [-1, 1]) {
                const off = fixed + side * (half + WALK_W / 2);
                if (alongX) part(g, 2, 0.12, WALK_W, t + 1, 0.06, off, WALK);
                else part(g, WALK_W, 0.12, 2, off, 0.06, t + 1, WALK);
            }
        }
 
        // faded, dashed center line
        for (let t = a; t < b; t += 5) {
            if (blocked(t, 1.5) || Math.random() < 0.25) continue;
            if (alongX) part(g, 2.2, 0.01, 0.18, t, y + 0.021, fixed, LINE);
            else part(g, 0.18, 0.01, 2.2, fixed, y + 0.021, t, LINE);
        }
 
        // cracks and potholes
        for (let k = 0; k < len / 10; k++) {
            const t = a + Math.random() * (b - a);
            const o = (Math.random() - 0.5) * (ROAD_W - 1);
            const w = 0.4 + Math.random() * 1.4;
            if (alongX) part(g, w, 0.01, 0.15 + Math.random() * 0.5, t, y + 0.022, fixed + o, CRACK, 0, Math.random(), 0);
            else part(g, 0.15 + Math.random() * 0.5, 0.01, w, fixed + o, y + 0.022, t, CRACK, 0, Math.random(), 0);
        }
 
        // keep trees and rocks off the road
        if (alongX) reserve(a - corridor, fixed - corridor, b + corridor, fixed + corridor);
        else reserve(fixed - corridor, a - corridor, fixed + corridor, b + corridor);
    });
 
    // Cracked concrete plaza in front of the radio tower
    part(g, 24, 0.05, 18, 0, 0.03, -47, 0x77706a);
    for (let k = 0; k < 14; k++) {
        part(g, 0.2 + Math.random() * 0.4, 0.01, 1 + Math.random() * 2,
            (Math.random() - 0.5) * 22, 0.06, -47 + (Math.random() - 0.5) * 16, 0x4a4540, 0, Math.random() * 3, 0);
    }
 
    scene.add(g);
    mergeGroup(g);
}
 
// Dirt path from the farm (player spawn) to the checkpoint at the top of Main Street
const PATH_POINTS = [[-63, 101], [-52, 97], [-38, 93], [-24, 91], [-11, 89], [0, 88]];
 
export function buildDirtPath() {
    const g = new THREE.Group();
    const DIRT = 0x6b5038;
    const DARK = 0x5a4430;
    for (let i = 0; i < PATH_POINTS.length - 1; i++) {
        const [x1, z1] = PATH_POINTS[i];
        const [x2, z2] = PATH_POINTS[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const rot = Math.atan2(x2 - x1, z2 - z1);
        part(g, 3.2, 0.03, len + 1.5, (x1 + x2) / 2, 0.015, (z1 + z2) / 2, DIRT, 0, rot, 0);
        // wheel ruts and stones
        part(g, 0.5, 0.01, len, (x1 + x2) / 2, 0.035, (z1 + z2) / 2, DARK, 0, rot, 0);
        for (let k = 0; k < 4; k++) {
            const t = Math.random();
            const side = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 0.6);
            const sx = x1 + (x2 - x1) * t + Math.cos(rot) * side;
            const sz = z1 + (z2 - z1) * t - Math.sin(rot) * side;
            part(g, 0.3, 0.2, 0.25, sx, 0.1, sz, 0x6e6258, 0.2, Math.random() * 3, 0.1);
        }
        reserve(Math.min(x1, x2) - 2, Math.min(z1, z2) - 2, Math.max(x1, x2) + 2, Math.max(z1, z2) + 2);
    }
    // a few broken fence posts beside the first stretch
    for (let k = 0; k < 6; k++) {
        const x = -60 + k * 4;
        part(g, 0.12, 1.0 - Math.random() * 0.4, 0.12, x, 0.45, 102.3 - k * 1.45, 0x594638, (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
    }
    scene.add(g);
    mergeGroup(g);
}

//------------------------------------------------
// Adds street lights, traffic lights, trash and abandoned cars.
const lamps = []; // Stores working lamps for the flickering effect

// Adds a street lamp.
// (toX, toZ): which way the arm reaches, toward the road
function buildLamp(g, x, z, toX, toZ, lit = false) {
    const POLE = 0x4a4844;
    part(g, 0.16, 5.6, 0.16, x, 2.8, z, POLE);
    part(g, 0.35, 0.3, 0.35, x, 0.15, z, POLE);
    // Positions the arm over the road
    const ax = toX;
    const az = toZ;
    const armDir = Math.atan2(-toZ, toX);
    part(g, 1.6, 0.1, 0.1, x + ax * 0.75, 5.55, z + az * 0.75, POLE, 0, armDir, 0);
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.18, 0.35),
        new THREE.MeshStandardMaterial({
            color: lit ? 0xffe0a0 : 0x2f2d2a,
            emissive: lit ? 0xffc870 : 0x000000,
            emissiveIntensity: lit ? 0.9 : 0,
        })
    );
    head.position.set(x + ax * 1.5, 5.45, z + az * 1.5);
    head.rotation.y = armDir;
    g.add(head);
    addStaticCollider(0.25, 5.6, 0.25, x, z);
 
    if (lit) {
        const light = new THREE.PointLight(0xffd08a, 6, 16);
        light.position.set(x + ax * 1.5, 5.2, z + az * 1.5);
        scene.add(light);
        lamps.push({ light, phase: Math.random() * 10 });
    }
}
 
export function buildStreetDetails() {
    const g = new THREE.Group();
    const edge = ROAD_W / 2 + WALK_W - 0.5; // Keeps lamps near the sidewalk edge
 
    // Street lamps along Main Street, alternating sides (arms point toward the road)
    [[-26, 1], [-12, -1], [14, 1], [28, -1], [54, 1], [64, -1]].forEach(([z, side], i) => {
        buildLamp(g, side * edge, z, -side, 0, i === 2);
    });
    // Street lamps along Center Street.
    [[-52, 1], [-26, -1], [-14, 1], [14, -1], [26, 1], [52, -1]].forEach(([x, side], i) => {
        buildLamp(g, x, side * edge, 0, -side, i === 4);
    });
    // A few lamps along the north and south roads
    buildLamp(g, -28, 40 - edge, 0, 1);
    buildLamp(g, 22, 40 + edge, 0, -1, true);
    buildLamp(g, -16, -36 + edge, 0, -1);
    buildLamp(g, 18, -36 - edge, 0, 1);
    // East side and suburbs
    [[-74, 1], [-88, -1], [70, 1], [90, -1]].forEach(([x, side], i) => buildLamp(g, x, side * edge, 0, -side, i === 1));
    buildLamp(g, 60, 40 + edge, 0, -1);
    buildLamp(g, 86, 40 + edge, 0, -1, true);
    buildLamp(g, 62, -36 - edge, 0, 1);
    buildLamp(g, 90, -36 - edge, 0, 1);
    buildLamp(g, 100 - edge, -18, 1, 0);
    buildLamp(g, 100 + edge, 22, -1, 0);
 
    // Traffic light at the Main and Center Street intersection
    const POLE = 0x3f3d3a;
    part(g, 0.2, 5, 0.2, edge, 2.5, edge, POLE);
    part(g, 3.2, 0.12, 0.12, edge - 1.5, 4.9, edge, POLE);
    part(g, 0.35, 0.9, 0.3, edge - 2.8, 4.45, edge, 0x2a2826);
    for (const [ly, c] of [[4.75, 0x4a1a1a], [4.45, 0x4a3a1a], [4.15, 0x1a3a1a]]) {
        part(g, 0.2, 0.2, 0.05, edge - 2.8, ly, edge + 0.16, c);
    }
    addStaticCollider(0.3, 5, 0.3, edge, edge);
    // A second traffic light lying in the road
    part(g, 0.2, 5, 0.2, -edge - 1.5, 0.15, -edge + 1, POLE, 0, 0.6, Math.PI / 2);
 
    // Trash bags, newspapers and junk along the sidewalks
    const JUNK = [0x2a2a2a, 0x3a3a2e, 0x5a5048, 0xc8c0a8];
    for (let k = 0; k < 40; k++) {
        const r = ROADS[k % ROADS.length];
        const alongX = r[1] === r[3];
        const t = (alongX ? Math.min(r[0], r[2]) : Math.min(r[1], r[3])) + Math.random() * Math.abs(alongX ? r[2] - r[0] : r[3] - r[1]);
        const off = (Math.random() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 0.6 + Math.random() * 1.5);
        const x = alongX ? t : r[0] + off;
        const z = alongX ? r[1] + off : t;
        const c = JUNK[k % JUNK.length];
        if (c === 0xc8c0a8) part(g, 0.4, 0.01, 0.3, x, 0.13, z, c, 0, Math.random() * 3, 0); // newspaper
        else part(g, 0.5, 0.4, 0.45, x, 0.32, z, c, 0.1, Math.random() * 3, 0.1);           // trash bag
    }
 
    scene.add(g);
    mergeGroup(g);
    obstacles.push(g);
 
    // Abandoned cars along the streets (props: barrels can throw them around)
    buildCar(2.6, 20, Math.PI / 2 + 0.1, 0x5a6a70);
    buildCar(-2.6, 58, Math.PI / 2 - 0.2, 0x6a5a4a, true);
    buildCar(2.4, -22, Math.PI / 2, 0x7a4a3a);
    buildCar(-30, -2.4, 0.05, 0x55604a);
    buildCar(32, 2.5, -0.1, 0x6a5a4a, true);
    buildCar(50, -2, 0.3, 0x5a5a68);
    buildCar(14, 42.5, 0, 0x7a6a4a);
    buildCar(-18, -34, 0.1, 0x4a5a6a);
    buildCar(24, -38, -0.2, 0x6a3a3a, true);
    buildCar(-42.4, 22, Math.PI / 2, 0x5a6a50);
    buildCar(42.5, -12, Math.PI / 2 + 0.2, 0x7a5a4a);
    buildCar(-24, -8.5, 0, 0x2a3a5a); // police cruiser out front
    buildCar(68, 41.8, 0.1, 0x8a7a5a);          // in front of the motel
    buildCar(84, 38, -0.15, 0x4a5a4a, true);
    buildCar(88, -2.2, -0.2, 0x6a3a3a, true);   // burnt out by the fire station
    buildCar(101.8, 12, Math.PI / 2, 0x5a6a70); // Mill Road
    buildCar(78, -38, 0.1, 0x6a5a4a);           // warehouse loading zone
    buildCar(-70, 2.4, 0, 0x7a6a5a);            // suburbs
    buildCar(-93, -2, 0.25, 0x4a4a5a, true);

    // Benches, hydrants and mailboxes along the sidewalks (Blockbench models; skipped if not loaded)
    [[-20, 1], [6, -1], [40, 1]].forEach(([bz, side]) => {
        placeProp('park_bench', side * edge, bz, -side * Math.PI / 2); // facing the road
    });
    [[-24, 1], [16, 1], [30, -1], [56, 1]].forEach(([hz, side]) => {
        placeProp('fire_hydrant', side * (edge - 0.3), hz, 0);
    });
    [[-22, -1], [-30, 1], [24, -1], [72, 1], [88, -1]].forEach(([mx, side]) => {
        placeProp('mailbox', mx, side * edge, side > 0 ? Math.PI : 0);
    });
}
 
export function updateCity(time) {
    // Makes the working street lamps flicker.
    for (const l of lamps) {
        const f = Math.sin(time * 13 + l.phase) + Math.sin(time * 31 + l.phase * 2);
        l.light.intensity = f > 1.5 ? 0.5 : 6;
    }
}