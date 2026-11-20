// cityBuildings.js: Downtown buildings: police station, apartment, pharmacy, hardware store, houses, and furniture for the older buildings.

import { makeBuilder } from './builders.js';
import { buildMultiStory, buildShop } from './buildingTypes.js';
import { DARK_WOOD, ITEM_COLORS, METAL, WOOD, fBed, fCabinet, fChair, fCouch, fCounter, fCrates, fDebris, fShelf, fTable } from './furniture.js';
import { LAYOUT, UPPER_Y } from './layout.js';

 
 
//------------------------------------------------
// City buildings
 
// POLICE STATION: front desk, filing cabinets and a holding cell downstairs,
// the armory (and the shotgun) upstairs
export function buildPolice(x, z) {
    buildMultiStory(x, z, {
        w: 16, d: 12, wall: 0x7a8088, trim: 0x2a3a5a, floor: 0x5a5a5a,
        door: { kind: 'locked', key: 'police', color: 0x2a3a5a }, // key is in the motel
        ground(b) {
            fCounter(b, 3, 3, 0, 4, true, 0x4a4a52);
            fTable(b, -3.5, -0.5, 0, 1.6, 0.9, 0x5a5048);
            fChair(b, -3.5, 0.3, 0, Math.PI);
            fChair(b, -2.2, -1.5, 0, 0.8, true);
            for (const cx of [1.5, 2.2, 2.9]) fCabinet(b, cx, -5.5, 0);
            fCouch(b, 7.3, 1, 0, false, 0x3a3a44);
            // holding cell in the back right corner, door hanging open
            const BAR = 0x4a4a4a;
            for (let bz = -5.7; bz <= -2.4; bz += 0.3) b.box(0.05, 2.6, 0.05, 4.2, 1.3, bz, BAR);
            for (let bx = 4.2; bx <= 7.8; bx += 0.3) if (bx < 5.0 || bx > 6.0) b.box(0.05, 2.6, 0.05, bx, 1.3, -2.2, BAR);
            b.box(1.0, 2.6, 0.05, 5.8, 1.3, -1.7, BAR, 0, 0.9, 0);
            b.block(0.1, 2.6, 3.6, 4.2, 1.3, -4.0);
            b.block(0.8, 2.6, 0.1, 4.6, 1.3, -2.2);
            b.block(1.85, 2.6, 0.1, 6.95, 1.3, -2.2);
            b.prop('jail_bed', 6.6, -5.2, Math.PI / 2, 0, () => fBed(b, 6.6, -5.2, 0, true, 0x4a4a52));
            fDebris(b, 1, 1.5, 0, 5);
        },
        upper(b) {
            const y = UPPER_Y;
            for (let lx = 0; lx <= 5; lx += 0.75) b.solid(0.7, 2.0, 0.5, lx, y + 1.0, -5.5, 0x4a5a4a); // lockers
            // empty weapon racks on the right wall
            for (const rz of [-2.5, 0, 2.5]) {
                b.box(0.1, 1.4, 2.0, 7.7, y + 1.3, rz, DARK_WOOD);
                for (let k = -0.7; k <= 0.7; k += 0.35) b.box(0.15, 0.05, 0.05, 7.6, y + 0.9, rz + k, METAL);
            }
            fTable(b, 2, -1, y, 2.0, 1.0, 0x5a5048);
            fChair(b, 2, 0, y, Math.PI, true);
            fCrates(b, 5, 4, y);
            fBed(b, -3, 4.5, y, true, 0x4a5a4a); // a cot someone slept on
            fDebris(b, -2, -3, y, 4);
        },
    });
}
 
// APARTMENT BLOCK: lobby with mailboxes downstairs, bedrooms upstairs
export function buildApartment(x, z) {
    buildMultiStory(x, z, {
        w: 14, d: 12, flip: true, wall: 0x9a8270, trim: 0x5a4434, floor: 0x5e5048,
        ground(b) {
            b.solid(0.4, 1.6, 3, 6.5, 0.8, 2, 0x6a6a60); // mailboxes
            for (let mz = 0.8; mz <= 3.2; mz += 0.4) for (const my of [0.5, 0.9, 1.3]) b.box(0.05, 0.25, 0.3, 6.28, my, mz, 0x3a3a34);
            fCouch(b, 3, -4.8, 0, true, 0x6a4a3a);
            fTable(b, 3, -3, 0, 1.2, 0.7, DARK_WOOD);
            fChair(b, 1.5, -1.2, 0, 0.5, true);
            fCrates(b, -3.5, -4.5, 0);
            fDebris(b, 2, 1, 0, 6);
        },
        upper(b) {
            const y = UPPER_Y;
            fBed(b, 3, -4.8, y, true, 0x5a4a6a);
            fBed(b, 6, 1.5, y, false, 0x4a5a6a);
            fShelf(b, 6.7, -2.5, y, 2.0, false, 1.6);
            fTable(b, -1.5, -3, y, 1.4, 0.9, DARK_WOOD);
            fChair(b, -1.5, -2.1, y, Math.PI);
            fCouch(b, 1, 3.5, y, true, 0x5a3a3a);
            fDebris(b, 2, -1, y, 4);
        },
    });
}
 
// PHARMACY: aisles of shelves and a counter at the back. Door faces south.
export function buildPharmacy(x, z) {
    buildShop(x, z, {
        w: 12, d: 8, flip: true, storefront: true, sign: 0x3a6a5a, wall: 0xb0a898,
        furnish(b) {
            fShelf(b, -2.5, 0.6, 0, 3.5, true, 1.8);
            fShelf(b, -2.5, -1.6, 0, 3.5, true, 1.8);
            fShelf(b, 3.2, 0.6, 0, 2.6, true, 1.8);
            fCounter(b, 2.5, -3.0, 0, 4, true, 0xc8c0b0);
            b.box(0.4, 0.3, 0.35, 3.2, 1.2, -3.0, 0x2a2a2a); // cash register
            fDebris(b, 0.5, 2, 0, 6);
        },
    });
}
 
// HARDWARE STORE: tools on the walls, workbench at the back (the machete is on it)
export function buildHardware(x, z) {
    buildShop(x, z, {
        w: 8, d: 8, storefront: true, sign: 0x8a5a2a, wall: 0x9a8a74,
        door: { kind: 'boarded' }, // someone nailed it shut from outside
        furnish(b) {
            fShelf(b, -2.7, 0.2, 0, 3.4, false, 2.0);
            fShelf(b, 2.7, 0.8, 0, 2.6, false, 2.0);
            fCounter(b, 1.3, -3.25, 0, 3.2, true, DARK_WOOD); // workbench
            // tools hanging on the back wall
            for (let tx = -1.5; tx <= 2.5; tx += 0.6) {
                b.box(0.05, 0.6 + Math.random() * 0.3, 0.05, tx, 2.0, -3.75, 0x5a5048);
                b.box(0.25, 0.1, 0.06, tx, 2.3, -3.75, METAL);
            }
            fCrates(b, -2.2, -3, 0);
            for (let k = 0; k < 5; k++) b.box(0.25, 0.3, 0.25, 0.2 + k * 0.32, 0.15, 2.8, ITEM_COLORS[k]); // paint cans
        },
    });
}
 
// The intact house next to the collapsed one
export function buildHouseB(x, z) {
    buildShop(x, z, {
        w: 8, d: 7, pitched: true, wall: 0xa89878, roof: 0x4a3a32,
        furnish(b) {
            fBed(b, -2.6, -2.4, 0, true, 0x6a5a4a);
            fTable(b, 1.6, -1.2, 0, 1.4, 0.9, WOOD);
            fChair(b, 1.6, -0.3, 0, Math.PI);
            fChair(b, 2.6, -1.4, 0, 0, true);
            fCouch(b, 2.2, 2.2, 0, true, 0x5a4a3a);
            fShelf(b, -3.55, 1.4, 0, 1.6, false, 1.6);
        },
    });
}


// Furniture for the older buildings (gas station shop, collapsed house, farmhouse)
export function furnishOldBuildings() {
    // Gas station shop
    let b = makeBuilder(...LAYOUT.gas);
    fShelf(b, -2.4, -0.2, 0, 2.6, false, 1.8);
    fShelf(b, -1.2, -3.3, 0, 2.2, true, 2.0); // drinks cooler along the back
    fCounter(b, 2.6, 2.3, 0, 1.6, true, 0x5a5048);
    b.box(0.4, 0.3, 0.35, 2.6, 1.2, 2.3, 0x2a2a2a);
    fDebris(b, 0, 2.5, 0, 4);
    b.finish();
 
    // Collapsed house: what's left of someone's home
    b = makeBuilder(...LAYOUT.house);
    fTable(b, 2.0, 0.3, 0, 1.4, 0.9, DARK_WOOD);
    fChair(b, 2.8, 1.3, 0, 0, true);
    fBed(b, -2.3, -2.7, 0, true, 0x5a4a3a);
    b.box(2.4, 1.8, 0.4, 1.6, 0.6, -3.2, METAL, 0.9, 0, 0.1); // shelf that fell over
    fDebris(b, 1.5, -1.5, 0, 6);
    b.finish();
 
    // Farmhouse kitchen and bedroom
    b = makeBuilder(...LAYOUT.farm);
    fTable(b, -1, 0, 0, 1.6, 1.0, WOOD);
    fChair(b, -1, -0.8, 0, 0);
    fChair(b, -1, 0.8, 0, Math.PI);
    b.solid(0.8, 0.9, 0.7, -3.3, 0.45, -2.6, 0x3a3a3a); // stove
    fBed(b, -2.6, 2.4, 0, true, 0x7a5a3a);
    fShelf(b, 1.5, -3.1, 0, 2.0, true, 1.6);
    b.finish();
}
