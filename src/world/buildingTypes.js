// buildingTypes.js: The two building templates: buildMultiStory() (two floors with stairs) and buildShop() (one floor).

import { stairways } from '../game/husks.js';
import { addSolid, makeBuilder, reserve } from './builders.js';
import { FLOOR_H } from './layout.js';

 
 
//------------------------------------------------
// Creates a two-story building with stairs connecting both floors
export function buildMultiStory(x, z, o) {
    const b = makeBuilder(x, z, o.flip);
    const { w, d } = o;
    const FH = FLOOR_H;
    const H = FH * 2 + 0.2;
    const T = 0.3;
    const WALL = o.wall ?? 0x8f8374;
    const TRIM = o.trim ?? 0x5a4f44;
    const FLOOR = o.floor ?? 0x5e574e;
    const GLASS = 0x3e4a48;
    const DARK = 0x1e1c1a;
    const ROOF = 0x3f3a36;
 
    // Builds the walls and doorway
    const DOOR = 2.2;
    const DOOR_H = 2.7;
    const seg = (w - DOOR) / 2;
    b.solid(w, H, T, 0, H / 2, -d / 2, WALL);                                   // back
    b.solid(T, H, d, -w / 2, H / 2, 0, WALL);                                   // left
    b.solid(T, H, d, w / 2, H / 2, 0, WALL);                                    // right
    b.solid(seg, FH, T, -(DOOR / 2 + seg / 2), FH / 2, d / 2, WALL);            // front, left of door
    b.solid(seg, FH, T, DOOR / 2 + seg / 2, FH / 2, d / 2, WALL);               // front, right of door
    b.solid(DOOR, FH - DOOR_H, T, 0, DOOR_H + (FH - DOOR_H) / 2, d / 2, WALL);  // over the door
    b.solid(w, H - FH, T, 0, FH + (H - FH) / 2, d / 2, WALL);                   // front, upper floor
    // the front door (door: false leaves an open doorway)
    if (o.door !== false) b.door(0, d / 2, DOOR, DOOR_H, o.door ?? {});
 
    // Adds windows to both floors, some smashed
    for (const y of [1.8, FH + 1.8]) {
        for (let wx = -w / 2 + 1.6; wx <= w / 2 - 1.6; wx += 2.6) {
            if (y < FH && Math.abs(wx) < DOOR / 2 + 0.9) continue; // not over the door
            for (const side of [1, -1]) {
                const c = Math.random() < 0.35 ? DARK : GLASS;
                b.box(1.3, 1.1, 0.06, wx, y, side * (d / 2 + 0.17), c);
                b.box(1.3, 1.1, 0.06, wx, y, side * (d / 2 - 0.17), c);
            }
            b.box(1.5, 0.1, 0.14, wx, y - 0.6, d / 2 + 0.22, TRIM); // sill
        }
        for (let wz = -d / 2 + 1.6; wz <= d / 2 - 1.6; wz += 2.6) {
            for (const side of [1, -1]) {
                const c = Math.random() < 0.35 ? DARK : GLASS;
                b.box(0.06, 1.1, 1.3, side * (w / 2 + 0.17), y, wz, c);
                b.box(0.06, 1.1, 1.3, side * (w / 2 - 0.17), y, wz, c);
            }
        }
    }
    // Adds exterior trim and the roof
    b.box(w + 0.1, 0.3, 0.06, 0, FH, d / 2 + 0.18, TRIM);
    b.box(w + 0.1, 0.3, 0.06, 0, FH, -d / 2 - 0.18, TRIM);
    b.box(0.06, 0.3, d + 0.1, w / 2 + 0.18, FH, 0, TRIM);
    b.box(0.06, 0.3, d + 0.1, -w / 2 - 0.18, FH, 0, TRIM);
    b.box(DOOR + 0.4, 0.2, 0.1, 0, DOOR_H + 0.1, d / 2 + 0.2, TRIM);
    b.solid(w + 0.4, 0.3, d + 0.4, 0, H + 0.15, 0, ROOF);
    b.box(w + 0.4, 0.5, 0.2, 0, H + 0.55, d / 2 + 0.1, TRIM);
    b.box(w + 0.4, 0.5, 0.2, 0, H + 0.55, -d / 2 - 0.1, TRIM);
    b.box(0.2, 0.5, d + 0.4, w / 2 + 0.1, H + 0.55, 0, TRIM);
    b.box(0.2, 0.5, d + 0.4, -w / 2 - 0.1, H + 0.55, 0, TRIM);
 
    // Ground floor
    b.box(w - T, 0.04, d - T, 0, 0.02, 0, FLOOR);
 
    // Builds stairs along the left wall
    const SW = 1.6;               // stair width (brutes don't fit; they guard the bottom)
    const SL = 6.4;               // long enough to stay under 30 degrees
    const sx = -w / 2 + T / 2 + SW / 2 + 0.05;
    const sz0 = d / 2 - 1.4;      // first step
    const szTop = sz0 - SL;       // last step
    const holeX = sx + SW / 2 + 0.05;
    const area = { x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 };
    const steps = Math.round(FH / 0.3);
    for (let i = 0; i < steps; i++) {
        const h = (i + 1) * (FH / steps);
        b.box(SW, h, SL / steps, sx, h / 2, sz0 - (i + 0.5) * (SL / steps), 0x6e655a);
    }
    // Adds a ramp for smoother movement up the stairs
    const angle = Math.atan2(FH, SL) * (o.flip ? -1 : 1);
    const rampMid = b.at(sx, sz0 - SL / 2);
    addSolid(SW, 0.2, Math.hypot(FH, SL) + 0.3, rampMid.x, FH / 2 - 0.05, rampMid.z, angle, 0);
    // Fill in space under stairs so players cant walk under the steps into the 'wall'
    for (let i = 0; i < steps; i++) {
        const top = (i + 1) * (FH / steps) - 0.4;
        if (top <= 0.05) continue;
        const p = b.at(sx, sz0 - (i + 0.5) * (SL / steps));
        addSolid(SW, top, SL / steps, p.x, top / 2, p.z);
    }
    stairways.push({
        area,
        floorY: FH,
        bottom: b.at(sx, sz0 + 0.7),
        top: b.at(sx, szTop - 1.6),   // on the landing, a little back from the top step
        doorIn: b.at(0, d / 2 - 1.2),
        doorOut: b.at(0, d / 2 + 1.6),
    });
 
    // Upper floor and stair railing
    const SLAB = 0.25;
    const inL = -w / 2 + T / 2;
    const inR = w / 2 - T / 2;
    const inB = -d / 2 + T / 2;
    b.solid(inR - holeX, SLAB, d - T, (holeX + inR) / 2, FH, 0, FLOOR);
    b.solid(holeX - inL, SLAB, szTop - inB, (inL + holeX) / 2, FH, (szTop + inB) / 2, FLOOR);
    b.solid(0.08, 1.0, SL + 1.2, holeX + 0.04, FH + 0.62, sz0 - SL / 2 + 0.6, TRIM);
 
    o.ground?.(b);
    o.upper?.(b);
    b.finish();
    reserve(x - w / 2 - 1, z - d / 2 - 1, x + w / 2 + 1, z + d / 2 + 1);
    return b;
}
 
// Creates a one-story building with optional storefront windows and a pitched roof
// o.door: { kind, key } for the front door (see Doors), or false for an open doorway
// o.height: wall height (warehouses are taller)
export function buildShop(x, z, o) {
    const b = makeBuilder(x, z, o.flip);
    const { w, d } = o;
    const H = o.height ?? (o.pitched ? 3.4 : 3.6);
    const T = 0.3;
    const WALL = o.wall ?? 0xa09684;
    const TRIM = o.trim ?? 0x5a4f44;
    const GLASS = 0x4a5a56;
    const DOOR = 2.0;
    const seg = (w - DOOR) / 2;
 
    b.solid(w, H, T, 0, H / 2, -d / 2, WALL);
    b.solid(T, H, d, -w / 2, H / 2, 0, WALL);
    b.solid(T, H, d, w / 2, H / 2, 0, WALL);
    b.solid(seg, H, T, -(DOOR / 2 + seg / 2), H / 2, d / 2, WALL);
    b.solid(seg, H, T, DOOR / 2 + seg / 2, H / 2, d / 2, WALL);
    b.box(DOOR, H - 2.6, T, 0, 2.6 + (H - 2.6) / 2, d / 2, WALL);
    b.box(w - T, 0.04, d - T, 0, 0.02, 0, o.floor ?? 0x5e574e);
    if (o.door !== false) b.door(0, d / 2, DOOR, 2.6, o.door ?? {});
 
    if (o.storefront) {
        for (const s of [-1, 1]) {
            b.box(seg - 0.6, 1.8, 0.06, s * (DOOR / 2 + seg / 2), 1.7, d / 2 + 0.17, Math.random() < 0.5 ? 0x1e1c1a : GLASS);
            b.box(seg - 0.6, 0.12, 0.14, s * (DOOR / 2 + seg / 2), 0.75, d / 2 + 0.22, TRIM);
        }
    } else {
        for (const s of [-1, 1]) b.box(1.2, 1.0, 0.06, s * (DOOR / 2 + seg / 2), 1.8, d / 2 + 0.17, GLASS);
    }
    for (const s of [-1, 1]) b.box(0.06, 1.0, 1.2, s * (w / 2 + 0.17), 1.8, 0, Math.random() < 0.4 ? 0x1e1c1a : GLASS);
 
    if (o.pitched) {
        const ROOF = o.roof ?? 0x5a3a2e;
        b.box(w / 2 + 0.6, 0.25, d + 0.8, -w / 4, H + 0.8, 0, ROOF, 0, 0, 0.45);
        b.box(w / 2 + 0.6, 0.25, d + 0.8, w / 4, H + 0.8, 0, ROOF, 0, 0, -0.45);
        for (const s of [-1, 1]) {
            b.box(w - 3, 0.6, T, 0, H + 0.3, s * d / 2, WALL);
            b.box(w - 5.6, 0.6, T, 0, H + 0.9, s * d / 2, WALL);
        }
    } else {
        b.box(w + 0.4, 0.3, d + 0.4, 0, H + 0.15, 0, o.roof ?? 0x3f3a36);
    }
    if (o.sign) {
        b.box(w * 0.6, 0.7, 0.15, 0, H - 0.25, d / 2 + 0.25, o.sign);
        b.box(w * 0.5, 0.25, 0.17, 0, H - 0.25, d / 2 + 0.26, 0xd8d0b8);
    }
 
    o.furnish?.(b);
    b.finish();
    reserve(x - w / 2 - 1, z - d / 2 - 1, x + w / 2 + 1, z + d / 2 + 1);
    return b;
}
