// furniture.js: Code-built furniture: tables, chairs, shelves, beds, cabinets, couches, counters, crates, debris.

import { models } from '../core/models.js';

 
 
//------------------------------------------------
// Furniture used to fill the buildings
export const WOOD = 0x6b5238;
export const DARK_WOOD = 0x4a3a2c;
export const METAL = 0x6d6a60;
export const ITEM_COLORS = [0x8a3a2a, 0x3a5a7a, 0xa08a3a, 0x5a6a50, 0xc8c0a0, 0x6a4a6a];

// Creates a table
export function fTable(b, lx, lz, y0 = 0, w = 1.6, d = 0.9, color = WOOD) {
    b.box(w, 0.08, d, lx, y0 + 0.78, lz, color);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.box(0.08, 0.76, 0.08, lx + sx * (w / 2 - 0.1), y0 + 0.38, lz + sz * (d / 2 - 0.1), color);
    }
    b.block(w, 0.82, d, lx, y0 + 0.41, lz);
}

// Creates a chair, with an option to knock it over
export function fChair(b, lx, lz, y0 = 0, rot = 0, knocked = false) {
    if (knocked) {
        b.box(0.45, 0.06, 0.45, lx, y0 + 0.22, lz, DARK_WOOD, 1.4, rot, 0);
        b.box(0.45, 0.5, 0.06, lx + 0.2, y0 + 0.05, lz, DARK_WOOD, 0, rot, 1.5);
        return;
    }
    b.box(0.45, 0.06, 0.45, lx, y0 + 0.45, lz, DARK_WOOD, 0, rot, 0);
    b.box(0.45, 0.5, 0.06, lx - Math.sin(rot) * 0.2, y0 + 0.72, lz - Math.cos(rot) * 0.2, DARK_WOOD, 0, rot, 0);
    for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) {
        b.box(0.05, 0.45, 0.05, lx + sx, y0 + 0.22, lz + sz, DARK_WOOD);
    }
}
 
// Creates a shelf with randomly placed items
export function fShelf(b, lx, lz, y0 = 0, len = 2.4, alongX = true, h = 2.0) {
    const w = alongX ? len : 0.5;
    const d = alongX ? 0.5 : len;
    for (const s of [-1, 1]) {
        b.box(alongX ? 0.06 : 0.5, h, alongX ? 0.5 : 0.06, lx + (alongX ? s * len / 2 : 0), y0 + h / 2, lz + (alongX ? 0 : s * len / 2), METAL);
    }
    for (const sy of [0.1, 0.75, 1.4, h - 0.05]) {
        b.box(w, 0.04, d, lx, y0 + sy, lz, METAL);
        if (sy > h - 0.1) continue;
        // stuff on the shelf
        for (let t = -len / 2 + 0.25; t < len / 2 - 0.2; t += 0.3 + Math.random() * 0.25) {
            if (Math.random() < 0.3) continue;
            const ih = 0.15 + Math.random() * 0.3;
            const c = ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)];
            b.box(0.18, ih, 0.2, lx + (alongX ? t : 0), y0 + sy + 0.02 + ih / 2, lz + (alongX ? 0 : t), c);
        }
    }
    b.block(w, h, d, lx, y0 + h / 2, lz);
}
 
// Creates a bed with a mattress, blanket and pillow
export function fBed(b, lx, lz, y0 = 0, alongX = true, blanket = 0x5a4a5a) {
    // Uses the Blockbench twin bed when it's loaded (pillow end toward -x / -z, like the code bed)
    if (models.bed_twin) {
        b.prop('bed_twin', lx, lz, alongX ? -Math.PI / 2 : Math.PI, y0);
        return;
    }
    const w = alongX ? 2.0 : 1.0;
    const d = alongX ? 1.0 : 2.0;
    b.box(w, 0.3, d, lx, y0 + 0.2, lz, DARK_WOOD);             // frame
    b.box(w - 0.1, 0.18, d - 0.1, lx, y0 + 0.44, lz, 0xb8b0a0); // mattress
    b.box(alongX ? w * 0.6 : d - 0.1, 0.06, alongX ? d - 0.1 : w * 0.6,
        lx + (alongX ? 0.3 : 0), y0 + 0.55, lz + (alongX ? 0 : 0.3), blanket);
    b.box(alongX ? 0.4 : 0.6, 0.12, alongX ? 0.6 : 0.4,
        lx - (alongX ? w / 2 - 0.3 : 0), y0 + 0.58, lz - (alongX ? 0 : d / 2 - 0.3), 0xd0c8b8); // pillow
    b.block(w, 0.55, d, lx, y0 + 0.27, lz);
}
 
// Creates a storage cabinet
export function fCabinet(b, lx, lz, y0 = 0, color = METAL) {
    b.solid(0.6, 1.3, 0.5, lx, y0 + 0.65, lz, color);
    for (const dy of [0.35, 0.75, 1.1]) b.box(0.4, 0.04, 0.02, lx, y0 + dy, lz + 0.26, 0x2a2a2a);
}
 
// Creates a couch
export function fCouch(b, lx, lz, y0 = 0, alongX = true, color = 0x5a4a3a) {
    const w = alongX ? 2.2 : 0.9;
    const d = alongX ? 0.9 : 2.2;
    b.solid(w, 0.45, d, lx, y0 + 0.22, lz, color);
    if (alongX) b.box(w, 0.6, 0.2, lx, y0 + 0.65, lz - 0.35, color);
    else b.box(0.2, 0.6, d, lx - 0.35, y0 + 0.65, lz, color);
}
 
// Creates a counter
export function fCounter(b, lx, lz, y0 = 0, len = 3, alongX = true, color = WOOD) {
    const w = alongX ? len : 0.7;
    const d = alongX ? 0.7 : len;
    b.solid(w, 1.0, d, lx, y0 + 0.5, lz, color);
    b.box(w + 0.1, 0.06, d + 0.1, lx, y0 + 1.03, lz, 0x8a8478);
}

// Adds a few scattered crates
export function fCrates(b, lx, lz, y0 = 0) {
    b.solid(1, 1, 1, lx, y0 + 0.5, lz, 0x7a6040);
    b.box(0.9, 0.9, 0.9, lx + 0.1, y0 + 1.45, lz - 0.05, 0x6b5238, 0, 0.3, 0);
    b.box(0.8, 0.6, 0.7, lx + 1.0, y0 + 0.3, lz + 0.2, 0x7a6040, 0, 0.5, 0);
}
 
// Adds random debris to the floor
export function fDebris(b, lx, lz, y0 = 0, n = 6) {
    for (let k = 0; k < n; k++) {
        b.box(0.2 + Math.random() * 0.5, 0.05 + Math.random() * 0.15, 0.2 + Math.random() * 0.4,
            lx + (Math.random() - 0.5) * 2, y0 + 0.05, lz + (Math.random() - 0.5) * 2,
            [0x6e655a, 0x4a4540, 0xc8c0a8][k % 3], Math.random() * 0.3, Math.random() * 3, 0);
    }
}
