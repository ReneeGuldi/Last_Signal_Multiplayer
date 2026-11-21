// northEnd.js: North End placeholder buildings: school, clinic, laundromat, auto garage.

import { buildMultiStory, buildShop } from './buildingTypes.js';
import { DARK_WOOD, WOOD, fBed, fCabinet, fChair, fCounter, fCrates, fDebris, fShelf, fTable } from './furniture.js';
import { UPPER_Y } from './layout.js';

//------------------------------------------------
// North End: placeholder buildings along the north side of North Street.
// Each is built in code for now; will swap in a Blockbench version through BUILDING_MODELS once created
// (clinic, laundromat, garage). They all face south onto North Street.

// SCHOOL: two floors. Classrooms downstairs, library and the principal's office upstairs.
export function buildSchool(x, z) {
    const GREEN_BOARD = 0x2e4a3a;
    buildMultiStory(x, z, {
        w: 20, d: 12, flip: true, wall: 0xa0603e, trim: 0xd8d0b8, floor: 0x6a6258,
        ground(b) {
            // two rows of student desks facing a chalkboard on the back wall
            for (const row of [-2.5, 0.5]) {
                for (const col of [-3, -0.5, 2, 4.5, 7]) {
                    fTable(b, col, row, 0, 1.0, 0.6, WOOD);
                    fChair(b, col, row + 0.7, 0, Math.PI, Math.random() < 0.25);
                }
            }
            b.box(6, 1.6, 0.06, 2, 1.7, -5.83, GREEN_BOARD);  // chalkboard
            b.box(6.2, 0.08, 0.15, 2, 0.88, -5.78, DARK_WOOD); // chalk ledge
            for (let k = 0; k < 6; k++) fCabinet(b, 4 + k * 0.7, 5.5, 0, 0x6a7a8a); // lockers by the door (clear of its swing)
            fDebris(b, 2, 2.5, 0, 8);
        },
        upper(b) {
            const y = UPPER_Y;
            // library
            for (const rz of [-4.5, -2]) fShelf(b, 2, rz, y, 6, true, 2.0);
            fTable(b, 2, 1.5, y, 2.4, 1.0, WOOD);
            fChair(b, 1, 2.3, y, Math.PI);
            fChair(b, 3, 0.7, y, 0, true);
            // principal's office in the corner, with a desk (drawer has ammo)
            b.prop('desk_chair', 7.5, -4.6, 0, y, () => fTable(b, 7.5, -4.6, y, 1.6, 0.9, DARK_WOOD));
            fCabinet(b, 9.2, -2.5, y);
            fDebris(b, 4, 3, y, 5);
        },
    });
}

// CLINIC: a waiting room up front, beds behind curtains, a medicine cabinet in the back.
export function buildClinic(x, z) {
    buildShop(x, z, {
        w: 12, d: 10, flip: true, sign: 0xc8c8c0, wall: 0xc8c0b0, floor: 0x9a968a,
        door: { kind: 'closed', color: 0x8a9aa0 },
        furnish(b) {
            // red cross over the door
            b.box(1.2, 0.3, 0.05, 0, 3.1, 5.2, 0xa02a2a);
            b.box(0.3, 1.2, 0.05, 0, 3.1, 5.2, 0xa02a2a);
            // waiting room chairs
            for (const cx of [-4.5, -3.7, -2.9]) fChair(b, cx, 3.6, 0, Math.PI, cx === -3.7);
            fCounter(b, 3.5, 2.8, 0, 3, true, 0xc8c8c0);
            // three beds with curtain walls between them
            for (const bx of [-3.5, 0, 3.5]) {
                fBed(b, bx, -2.6, 0, false, 0x8aa0a8);
                b.box(0.05, 2.0, 2.6, bx + 1.75, 1.0, -2.8, 0x8aa8a0);
            }
            fCabinet(b, -5.4, -0.5, 0, 0xd8d8d0); // medicine cabinet
            fDebris(b, 0, 0.5, 0, 6);
        },
    });
}

// LAUNDROMAT: a row of washers and dryers, folding tables, big front windows.
export function buildLaundromat(x, z) {
    buildShop(x, z, {
        w: 10, d: 9, flip: true, storefront: true, sign: 0x3a6a9a, wall: 0xb8b0a0, floor: 0x8a8a84,
        furnish(b) {
            // Blockbench washer/dryer sets along the back wall, or code-built ones if the model isn't loaded
            const sets = [-3.3, -1.1, 1.1, 3.3];
            if (b.prop('washer_dryer', sets[0], -3.9, Math.PI)) {
                for (const mx of sets.slice(1)) b.prop('washer_dryer', mx, -3.9, Math.PI);
            } else {
                for (let k = 0; k < 6; k++) {
                    const mx = -3.8 + k * 1.3;
                    b.solid(1.1, 1.0, 0.9, mx, 0.5, -3.8, 0xd8d8d0);                 // washer
                    b.box(0.6, 0.6, 0.04, mx, 0.55, -3.33, k % 3 === 1 ? 0x1a1a1a : 0x4a5a6a); // its round-ish door
                    b.solid(1.1, 1.0, 0.9, mx, 1.55, -3.8, 0xc8c8c0);                // dryer stacked on top
                    b.box(0.5, 0.5, 0.04, mx, 1.6, -3.33, 0x3a3a3a);
                }
            }
            fTable(b, -1.5, 0, 0, 2.4, 0.9, 0xc8c0b0);
            fTable(b, 2, 0, 0, 2.4, 0.9, 0xc8c0b0);
            for (const cx of [-3.5, -2.7, 3, 3.8]) fChair(b, cx, 2.8, 0, Math.PI, cx === 3);
            fDebris(b, 0, 1.5, 0, 6);
        },
    });
}

// AUTO GARAGE: a tall service bay with a car up on the lift, tool shelves and oil drums.
export function buildGarage(x, z) {
    buildShop(x, z, {
        w: 14, d: 12, flip: true, height: 4.6, sign: 0x9a5a2a, wall: 0x7a7a70, roof: 0x4a4a44, floor: 0x5a5852,
        door: { kind: 'boarded' },
        furnish(b) {
            // painted roll-up bay door on the front, rusted shut
            b.box(4.4, 3.6, 0.06, 4.2, 1.8, 6.17, 0x9a9a8a);
            for (let k = 0; k < 7; k++) b.box(4.4, 0.04, 0.08, 4.2, 0.3 + k * 0.5, 6.2, 0x6a6a60);
            // car on the lift
            b.solid(0.3, 1.2, 0.3, 1.8, 0.6, -1, 0xa08a2a);
            b.solid(0.3, 1.2, 0.3, 5.6, 0.6, -1, 0xa08a2a);
            b.box(4.4, 0.15, 2.2, 3.7, 1.25, -1, 0x6a6a60);              // lift arms
            b.solid(4.0, 1.0, 1.9, 3.7, 1.85, -1, 0x4a5a6a);             // car body
            b.box(2.2, 0.7, 1.7, 3.5, 2.7, -1, 0x4a5a6a);                // cabin
            b.box(2.0, 0.55, 1.75, 3.5, 2.7, -1, 0x2e3a3a);              // windows
            // tool shelves and a workbench
            for (const sz of [-4.5, -2.7]) b.prop('shelves_short', -6.3, sz, Math.PI / 2, 0, () => fShelf(b, -6.3, sz, 0, 1.6, false, 1.8));
            fCounter(b, -3, -5.4, 0, 3.5, true, DARK_WOOD);
            fCrates(b, -5.5, 3.5);
            fDebris(b, 0, 2, 0, 8);
        },
    });
}