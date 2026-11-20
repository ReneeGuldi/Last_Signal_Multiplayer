// interact.js: Secrets and notes, and the E key: what you can interact with and what happens.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { game } from '../core/state.js';
import { PICKUP_TYPES, collect, pickups } from './pickups.js';
import { playerBody } from './player.js';
import { drawers, useDrawer } from '../world/blockbench.js';
import { part } from '../world/builders.js';
import { doorPrompt, doors, useDoor } from '../world/doors.js';
import { at } from '../world/layout.js';
import { notePaper } from '../world/outskirts.js';

//------------------------------------------------
// Game Easter Eggs

export const secrets = [];

// Building a small object from boxes and registering it as a secret
// y: height it sits at (a table, an upper floor)
export function addSecret(x, z, build, message, y = 0) {
    const g = new THREE.Group();
    build(g);
    g.position.set(x, y, z);
    scene.add(g);
    secrets.push({ x, y, z, message, found: false });
}

export function buildSecrets() {
    // 1. Survivor's note on the floor inside collapsed house
    addSecret(...at('house', -2.5, -1.5), (g) => notePaper(g),
        'A scrawled note: "Day 212. The Bloom took Marcus today. Tower 9 still has power... I think"');
 
    // 2. A lonely teddy bear near the crash site
    addSecret(...at('crash', -8, -8), (g) => {
        const FUR = 0x9c7a55;
        part(g, 0.35, 0.4, 0.25, 0, 0.2, 0, FUR);
        part(g, 0.3, 0.28, 0.25, 0, 0.54, 0, FUR);
        part(g, 0.1, 0.1, 0.06, -0.12, 0.72, 0, FUR);
        part(g, 0.1, 0.1, 0.06, 0.12, 0.72, 0, FUR);
        part(g, 0.04, 0.04, 0.02, 0.06, 0.56, 0.13, 0x111111);
        part(g, 0.1, 0.1, 0.05, 0, 0.48, 0.13, 0xc4a77f);
    }, 'A sun bleached teddy bear, missing an eye. Someone loved this once. I wonder if they made it out.');
 
    // RIP (;
    addSecret(-12, -62, (g) => {
        part(g, 0.8, 0.15, 1.4, 0, 0.07, 0, 0x6e5a48);
        part(g, 0.1, 1.0, 0.1, 0, 0.5, -0.6, 0x594638);
        part(g, 0.5, 0.1, 0.1, 0, 0.75, -0.6, 0x594638);
    }, 'Here lies Renee\'s sleep schedule. 2026-2026. Gone but not forgotten');
}

//------------------------------------------------
// Interacting (E), picking things up and reading notes
const promptEl = document.getElementById('prompt');
const noteEl = document.getElementById('note');
const noteTextEl = document.getElementById('note-text');
const noteCountEl = document.getElementById('note-count');
const REACH = 2;     // how close you need to be
let focus = null;    // what E would use right now: { pickup } or { secret }
let openNote = null; // the secret currently shown on screen
 
export function updateInteraction() {
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    const feet = playerBody.position.y - 0.5; // height of the floor you're standing on
    let best = null;
    let bestDist = REACH;
 
    for (const p of pickups) {
        if (p.collected) continue;
        const d = Math.hypot(px - p.mesh.position.x, pz - p.mesh.position.z);
        if (d < bestDist && Math.abs(feet - p.baseY) < 1.5) {
            best = { pickup: p };
            bestDist = d;
        }
    }
    for (const s of secrets) {
        const d = Math.hypot(px - s.x, pz - s.z);
        if (d < bestDist && Math.abs(feet - s.y) < 1.5) {
            best = { secret: s };
            bestDist = d;
        }
    }
    for (const d of drawers) {
        const dist = Math.hypot(px - d.x, pz - d.z);
        if (dist < bestDist && Math.abs(feet - d.y) < 1.8) {
            best = { drawer: d };
            bestDist = dist;
        }
    }
    // doors count as close a little farther away, since you stand in front of them
    for (const door of doors) {
        if (door.kind === 'broken') continue;
        const d = Math.hypot(px - door.center.x, pz - door.center.z) - 0.4;
        if (d < bestDist && Math.abs(feet - door.y) < 1.5) {
            best = { door };
            bestDist = d;
        }
    }
    focus = best;
 
    // walking away closes the note
    if (openNote && (!focus || focus.secret !== openNote)) closeNote();
 
    if (!focus || openNote) {
        promptEl.style.display = 'none';
        return;
    }
    promptEl.style.display = 'block';
    if (focus.pickup) {
        const p = focus.pickup;
        promptEl.textContent = p.type === 'medkit' && game.health >= 100
            ? 'Medkit (your health is full)'
            : `[E] Pick up ${PICKUP_TYPES[p.type].label}`;
    } else if (focus.door) {
        promptEl.textContent = doorPrompt(focus.door);
    } else if (focus.drawer) {
        promptEl.textContent = focus.drawer.open ? '[E] Close drawer' : '[E] Search drawer';
    } else {
        promptEl.textContent = focus.secret.found ? '[E] Read again' : '[E] Read';
    }
}
 
export function interact() {
    if (openNote) {
        closeNote();
        return;
    }
    if (!focus) return;
    if (focus.pickup) collect(focus.pickup);
    else if (focus.door) useDoor(focus.door);
    else if (focus.drawer) useDrawer(focus.drawer);
    else openSecret(focus.secret);
}
 
function openSecret(s) {
    if (!s.found) {
        // first time reading: count it and give the score
        s.found = true;
        game.secretsFound++;
        game.score += 50;
    }
    openNote = s;
    noteTextEl.textContent = s.message;
    noteCountEl.textContent = `Secrets found: ${game.secretsFound}/${secrets.length}`;
    noteEl.style.display = 'block';
    promptEl.style.display = 'none';
}
 
export function closeNote() {
    openNote = null;
    noteEl.style.display = 'none';
}
