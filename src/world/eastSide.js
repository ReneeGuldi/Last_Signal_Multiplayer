// eastSide.js: East side and suburbs: motel, grocery, fire station, warehouse, suburb houses.

import { models } from '../core/models.js';
import { makeBuilder, reserve } from './builders.js';
import { buildMultiStory, buildShop } from './buildingTypes.js';
import { DARK_WOOD, ITEM_COLORS, METAL, WOOD, fBed, fCabinet, fChair, fCouch, fCounter, fCrates, fDebris, fShelf, fTable } from './furniture.js';
import { UPPER_Y } from './layout.js';

 
//------------------------------------------------
// East side & suburbs: more of the town to explore
// Key chain: motel office (open) has the motel key -> motel room 4 has the police key.
//            Warehouse (boarded) has the fire station key -> fire station (locked).

// MOTEL: an office and five rooms in a row under a covered walkway.
// The rooms are locked; the master key is on the office counter.
const MOTEL_UNITS = [6, 5, 5, 5, 5, 5]; // widths: office, then rooms 1-5
export function buildMotel(x, z) {
    const b = makeBuilder(x, z, true); // flipped: doors face south toward North Street
    const w = MOTEL_UNITS.reduce((a, u) => a + u, 0);
    const d = 8;
    const H = 3.2;
    const T = 0.3;
    const DOOR_H = 2.5;
    const WALL = 0xb89a78;
    const TRIM = 0x7a3a2a;
    const ROOF = 0x4a3a32;
    const GLASS = 0x4a5a56;

    b.solid(w, H, T, 0, H / 2, -d / 2, WALL);  // back
    b.solid(T, H, d, -w / 2, H / 2, 0, WALL);  // left
    b.solid(T, H, d, w / 2, H / 2, 0, WALL);   // right
    b.box(w - T, 0.04, d - T, 0, 0.02, 0, 0x5a4048); // old carpet
    b.solid(w + 0.4, 0.3, d + 0.4, 0, H + 0.15, 0, ROOF);

    // Front wall: a door into every unit, wall pieces in between
    let left = -w / 2;
    let cursor = -w / 2;
    MOTEL_UNITS.forEach((uw, i) => {
        const office = i === 0;
        const cx = left + uw / 2;
        const dw = office ? 1.6 : 1.2;
        const dx = office ? cx : cx - 1.2; // room doors sit left of center, window on the right
        const edge = dx - dw / 2;
        b.solid(edge - cursor, H, T, (cursor + edge) / 2, H / 2, d / 2, WALL);
        b.box(dw, H - DOOR_H, T, dx, DOOR_H + (H - DOOR_H) / 2, d / 2, WALL);
        b.door(dx, d / 2, dw, DOOR_H, office ? { color: 0x6a5a4a } : { kind: 'locked', key: 'motel', color: 0x3a4a5a });
        cursor = dx + dw / 2;

        // window, and a brass room number over the door
        const wx = office ? cx + 1.8 : cx + 1.1;
        for (const s of [1, -1]) b.box(1.3, 1.0, 0.06, wx, 1.6, d / 2 + s * 0.17, Math.random() < 0.4 ? 0x1e1c1a : GLASS);
        if (!office) b.box(0.25, 0.18, 0.03, dx, DOOR_H + 0.25, d / 2 + 0.17, 0xc8a850);

        // wall between this unit and the next
        if (i < MOTEL_UNITS.length - 1) b.solid(T, H, d - T, left + uw, H / 2, 0, WALL);

        // furniture
        if (office) {
            fCounter(b, cx, -1, 0, 3.5, true, DARK_WOOD);
            fShelf(b, cx, -3.4, 0, 3.0, true, 1.8);
            b.box(0.4, 0.3, 0.35, cx - 1.2, 1.2, -1, 0x2a2a2a); // cash register
            for (let k = 0; k < 6; k++) b.box(0.05, 0.12, 0.02, cx - 0.9 + k * 0.3, 2.0, -3.82, 0xc8a850); // empty key hooks
        } else {
            b.prop('bed_double', cx + 0.8, -2.2, -Math.PI / 2, 0, () => fBed(b, cx + 0.8, -2.2, 0, true, [0x6a4a5a, 0x4a5a6a, 0x5a6a4a][i % 3]));
            fTable(b, cx + 1.5, 1.4, 0, 1.0, 0.7, WOOD);
            fChair(b, cx + 0.5, 1.6, 0, Math.PI / 2, i % 2 === 0);
            b.box(0.9, 0.6, 0.5, cx - 1.6, 0.3, -3.4, DARK_WOOD); // dresser
            b.box(0.5, 0.4, 0.1, cx - 1.6, 0.85, -3.5, 0x1a1a1a); // old TV
            fDebris(b, cx, 0, 0, 3);
        }
        left += uw;
    });
    b.solid(w / 2 - cursor, H, T, (cursor + w / 2) / 2, H / 2, d / 2, WALL);

    // Covered walkway out front, with posts
    b.box(w, 0.1, 2.4, 0, 0.05, d / 2 + 1.2, 0x8a8478);
    b.box(w + 0.4, 0.2, 2.6, 0, H, d / 2 + 1.3, ROOF);
    b.box(w + 0.4, 0.4, 0.1, 0, H - 0.1, d / 2 + 2.6, TRIM);
    left = -w / 2;
    for (const uw of MOTEL_UNITS) {
        b.solid(0.2, H, 0.2, left + 0.2, H / 2, d / 2 + 2.3, TRIM);
        left += uw;
    }
    b.solid(0.2, H, 0.2, w / 2 - 0.2, H / 2, d / 2 + 2.3, TRIM);

    // Tall roadside sign
    b.solid(0.3, 6, 0.3, -w / 2 - 2, 3, d / 2 + 2, METAL);
    b.box(3.2, 1.4, 0.25, -w / 2 - 2, 6.4, d / 2 + 2, 0x8a2a2a);
    b.box(2.6, 0.5, 0.27, -w / 2 - 2, 6.5, d / 2 + 2, 0xe8d8a0);
    b.box(1.6, 0.35, 0.27, -w / 2 - 2, 5.9, d / 2 + 2, 0x2a2a2a); // "NO VACANCY", lights out

    b.finish();
    reserve(x - w / 2 - 4, z - d / 2 - 3.5, x + w / 2 + 1, z + d / 2 + 1);
}

// GROCERY STORE: aisles, fridges along the back wall and checkout counters by the door
export function buildGrocery(x, z) {
    buildShop(x, z, {
        w: 16, d: 12, flip: true, storefront: true, sign: 0x3a7a3a, wall: 0xc0b8a0, floor: 0x8a8478,
        furnish(b) {
            [-5.6, -3.0, 3.0, 5.6].forEach((ax, k) => {
                const shelf = k % 2 ? 'shelves_short' : 'shelves_tall';
                if (!models[shelf]) return fShelf(b, ax, -1, 0, 5, false, 1.8);
                for (const az of [-3.0, -1.05,  0.9]) b.prop(shelf, ax, az, Math.PI / 2, 0, null, 3.1);
            });
            for (let fx = -6.5; fx <= 6.5; fx += 1.3) {
                b.solid(1.2, 2.2, 0.8, fx, 1.1, -5.4, 0xd8d8d0);                              // fridge
                b.box(1.0, 1.6, 0.04, fx, 1.2, -4.98, Math.random() < 0.3 ? 0x1e1c1a : 0x6a8a8a); // its glass door
            }
            for (const cx of [-4.5, 4.5]) {
                fCounter(b, cx, 3.6, 0, 2.2, false, 0x6a6a60);
                b.box(0.4, 0.3, 0.35, cx, 1.2, 3.0, 0x2a2a2a); // register
            }
            // tipped over shopping cart
            b.box(0.9, 0.6, 0.06, 1.5, 0.3, 1.8, METAL, 0, 0.4, 1.4);
            b.box(0.9, 0.06, 0.6, 1.8, 0.35, 1.9, METAL, 0, 0.4, 1.4);
            fDebris(b, 0, 0, 0, 8);
        },
    });
}

// FIRE STATION: an engine in the bay downstairs, bunks upstairs. Locked: the key is in the warehouse.
export function buildFireStation(x, z) {
    const RED = 0xa02a20;
    buildMultiStory(x, z, {
        w: 16, d: 12, wall: 0x8a4a3a, trim: 0xd0c8b0, floor: 0x5a5a5a,
        door: { kind: 'locked', key: 'fire', color: 0x8a2a2a },
        ground(b) {
            // fire engine
            b.solid(6.5, 2.2, 2.4, 3.5, 1.4, -2.5, RED);
            b.box(1.8, 1.0, 2.3, 6.0, 2.9, -2.5, RED);               // cab roof
            b.box(0.05, 0.8, 2.0, 6.95, 2.4, -2.5, 0x3e4a48);         // windshield
            b.box(4.2, 0.15, 0.5, 2.6, 2.6, -2.5, METAL);             // ladder on top
            for (const wx of [1.2, 5.6]) for (const s of [-1, 1]) {
                b.box(1.0, 1.0, 0.3, wx, 0.5, -2.5 + s * 1.25, 0x1a1a1a, Math.PI / 2, 0, 0); // wheels
            }
            for (let lx = 0.5; lx <= 4.5; lx += 0.75) b.solid(0.7, 2.0, 0.5, lx, 1.0, -5.5, 0x8a6a2a); // gear lockers
            b.box(0.1, 1.2, 1.6, 7.75, 1.4, 1.5, DARK_WOOD); // hose rack
            for (let k = 0; k < 3; k++) b.box(0.25, 0.5, 0.5, 7.6, 0.9 + k * 0.35, 1.5, 0xc8b878, 0, 0, Math.PI / 2);
            fDebris(b, 2, 2, 0, 5);
        },
        upper(b) {
            const y = UPPER_Y;
            fBed(b, 2, -5, y, true, 0x5a3a3a);
            fBed(b, 5, -5, y, true, 0x3a3a5a);
            fBed(b, 7, 0, y, false, 0x4a4a4a);
            b.prop('table_chairs', 2, 1, 0, y, () => {
                fTable(b, 2, 1, y, 2.0, 1.0, WOOD);
                fChair(b, 2, 2, y, Math.PI);
                fChair(b, 1, 0.2, y, 0.6, true);
            });
            fCabinet(b, -2, -5.5, y, 0x8a6a2a);
            fDebris(b, 4, 3, y, 4);
        },
    });
    // big bay door on the front, jammed shut. It sits just in front of the windows and sills
    // (at the same depth as them, the two surfaces flicker)
    const b = makeBuilder(x, z);
    b.box(3.6, 3.2, 0.06, 4.5, 1.6, 6.34, 0xc8c0b0);
    for (let k = 0; k < 6; k++) b.box(3.6, 0.04, 0.08, 4.5, 0.4 + k * 0.5, 6.39, 0x8a8478);
    b.box(1.6, 0.5, 0.08, 0, 3.15, 6.2, RED); // "9" sign over the door
    b.finish();
}

// WAREHOUSE: tall storage racks, crate stacks and a forklift. Boarded up;
// the foreman's desk in the back corner has the fire station key.
export function buildWarehouse(x, z) {
    buildShop(x, z, {
        w: 20, d: 14, height: 5.5, wall: 0x6a6e6a, roof: 0x4a4e4a, sign: 0x5a5a3a, floor: 0x6a665e,
        door: { kind: 'boarded' },
        furnish(b) {
            // racks in store stop shorter of the left wall, make a more clear walk way for the foreman's desk
            for (const rz of [-4.5, -1]) fShelf(b, -2, rz, 0, 6, true, 3.2);
            fCrates(b, 4, -5);
            fCrates(b, 7, -2.5);
            fCrates(b, 3.5, 1.5);
            b.solid(1, 1, 1, 7.5, 0.5, 1.5, 0x7a6040);
            b.solid(1, 1, 1, 7.5, 1.5, 1.5, 0x6b5238);
            // forklift
            b.solid(1.2, 1.2, 2.0, 0.5, 0.7, 3.5, 0xc8a030);
            b.box(1.0, 0.06, 1.0, 0.5, 2.2, 3.7, 0x2a2a2a);
            b.box(0.1, 2.4, 0.1, 0.1, 1.2, 2.4, 0x2a2a2a);
            b.box(0.1, 2.4, 0.1, 0.9, 1.2, 2.4, 0x2a2a2a);
            b.box(0.15, 0.06, 1.0, 0.25, 0.15, 1.9, METAL);
            b.box(0.15, 0.06, 1.0, 0.75, 0.15, 1.9, METAL);
            // pallets
            for (const [px, pz] of [[-7, 3], [-5, 4.5], [-8, 5.5]]) b.box(1.2, 0.15, 1.0, px, 0.08, pz, 0x8a6a44, 0, Math.random(), 0);
            // foreman's desk
            b.prop('desk_chair', -7.6, -5.9, 0, 0, () => {
                fTable(b, -7.6, -5.9, 0, 1.6, 0.9, METAL);
                fChair(b, -7.6, -5.1, 0, Math.PI);
            });
            fCabinet(b, -9.3, -4.5, 0);
            fDebris(b, 0, -2, 0, 6);
        },
    });
}

// SUBURBS: small houses along the west end of Center Street
const HOUSE_WALLS = [0xa89878, 0x8a9a9a, 0xb0a080, 0x9a8a9a, 0xa08a6a];
const HOUSE_ROOFS = [0x4a3a32, 0x3a4a4a, 0x5a3a2e, 0x3a3a4a, 0x4a4032];
export function buildSuburbHouse(x, z, i, flip, door) {
    buildShop(x, z, {
        w: 8, d: 7, pitched: true, flip, door,
        wall: HOUSE_WALLS[i % HOUSE_WALLS.length], roof: HOUSE_ROOFS[i % HOUSE_ROOFS.length],
        furnish(b) {
            fBed(b, -2.6, -2.4, 0, true, ITEM_COLORS[i % ITEM_COLORS.length]);
            if (i % 2) {
                fCouch(b, 2.2, 2.2, 0, true, 0x5a4a3a);
                b.prop('table_chairs', 2.2, -1.8, 0, 0, () => {
                    fTable(b, 2.2, -1.8, 0, 1.4, 0.9, WOOD);
                    fChair(b, 2.2, -1.0, 0, Math.PI, i === 3);
                });
            } else {
                fShelf(b, 3.5, 0, 0, 2.4, false, 1.8);
                fTable(b, 0.8, -1.6, 0, 1.2, 0.8, DARK_WOOD);
                fChair(b, 0.8, -0.8, 0, Math.PI, true);
                fCrates(b, -3, 1.6);
            }
            fDebris(b, 0, 1, 0, 4);
        },
    });
    // fence along the front yard, with a gap at the path
    const b = makeBuilder(x, z, flip);
    for (const s of [-1, 1]) {
        b.solid(2.6, 0.9, 0.08, s * 2.7, 0.45, 5.2, 0xc8c0a8);
        for (let k = 0; k < 6; k++) b.box(0.1, 1.1, 0.06, s * (1.55 + k * 0.46), 0.55, 5.2, 0xc8c0a8);
    }
    b.finish();
}