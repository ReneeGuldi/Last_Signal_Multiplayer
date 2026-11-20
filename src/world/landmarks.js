// landmarks.js: The original landmarks: gas station, radio tower, collapsed house, school bus.

import * as THREE from 'three';
import { addStaticCollider, finishBuilding, part } from './builders.js';

// GAS STATION BUILD
export function buildGasStation(x, z) {
    const g = new THREE.Group();
    const WALL = 0x9b866b;
    const PALE = 0xc0aa83;
    const DARK = 0x403b34;
    const RUST = 0x75452f;
    const GLASS = 0x52605c;
    const CONCRETE = 0x777064;
    const SIGN = 0xbca45d;

    // Walls: small shop, with a doorway in the front wall (+z)
    part(g, 8, 3.8, 0.35, 0, 2.0, -3.8, WALL);
    part(g, 0.35, 3.8, 7.3, -3.8, 2.0, 0, WALL);
    part(g, 0.35, 3.8, 7.3, 3.8, 2.0, 0, PALE);

    // Front wall split around the entrance
    part(g, 2.0, 3.8, 0.35, -3.0, 2.0, 3.8, WALL);
    part(g, 2.0, 3.8, 0.35, 3.0, 2.0, 3.8, PALE);
    part(g, 2.0, 0.45, 0.35, 0, 3.65, 3.8, WALL);

    // Broken front window and its frame
    part(g, 2.1, 1.5, 0.08, -2.3, 2.5, 3.99, GLASS);
    part(g, 2.35, 0.12, 0.12, -2.3, 3.32, 4.04, DARK);
    part(g, 0.12, 1.6, 0.12, -3.48, 2.5, 4.04, DARK);
    part(g, 0.12, 1.6, 0.12, -1.12, 2.5, 4.04, DARK);
    part(g, 0.8, 0.08, 0.12, -2.0, 2.15, 4.08, RUST, 0, 0, -0.35);

    // Roof: two uneven slabs and a missing corner
    part(g, 4.5, 0.35, 8.5, -1.7, 4.05, 0, DARK);
    part(g, 2.6, 0.3, 6.5, 2.65, 3.9, -0.6, WALL, 0, 0, 0.025);
    part(g, 1.1, 0.2, 2.0, 3.0, 4.2, 2.2, RUST, 0, 0, -0.1);

    // Sagging fuel canopy
    part(g, 10, 0.25, 3.6, 1.0, 4.2, 7.0, PALE, 0, 0, -0.035);
    part(g, 10, 0.16, 3.6, 1.0, 4.02, 7.0, RUST);

    // Canopy supports
    part(g, 0.22, 3.9, 0.22, -3.2, 2.0, 5.7, DARK);
    part(g, 0.22, 3.5, 0.22, 5.2, 1.8, 5.7, DARK);
    part(g, 0.22, 3.9, 0.22, -3.2, 2.0, 8.3, RUST);
    part(g, 0.22, 3.5, 0.22, 5.2, 1.8, 8.3, DARK);

    // Rust patches, faded sign and damaged fascia
    part(g, 1.0, 0.55, 0.08, -2.7, 1.3, 4.02, RUST);
    part(g, 1.4, 0.3, 0.1, 1.5, 3.4, 4.02, SIGN);
    part(g, 2.5, 0.22, 0.16, -0.2, 5.0, -3.95, RUST, 0, 0, 0.03);

    // Fuel pumps: blocky bodies and bent-looking nozzles
    for (const px of [-1.7, 2.3]) {
        part(g, 0.8, 1.35, 0.65, px, 0.8, 7.0, RUST);
        part(g, 0.65, 0.38, 0.08, px, 1.05, 7.36, DARK);
        part(g, 0.3, 0.18, 0.08, px, 1.55, 7.36, SIGN);
        part(g, 0.08, 0.55, 0.08, px + 0.48, 1.05, 6.8, DARK, 0, 0, -0.25);
    }

    // Broken concrete and scattered debris
    part(g, 2.2, 0.14, 1.3, -4.8, 0.07, 4.4, CONCRETE, 0, 0, 0.04);
    part(g, 1.0, 0.2, 0.65, 5.3, 0.1, 3.5, RUST, 0.05, 0.3, 0.1);
    part(g, 0.65, 0.25, 0.7, -4.4, 0.13, -4.8, DARK, 0.1, 0.4, 0.1);

    // Place the building
    finishBuilding(g, x, z);

    // Colliders: shop walls, split front wall and fuel pumps
    addStaticCollider(8, 3.8, 0.35, x, z - 3.8);
    addStaticCollider(0.35, 3.8, 7.3, x - 3.8, z);
    addStaticCollider(0.35, 3.8, 7.3, x + 3.8, z);
    addStaticCollider(2, 3.8, 0.35, x - 3, z + 3.8);
    addStaticCollider(2, 3.8, 0.35, x + 3, z + 3.8);
    addStaticCollider(0.8, 1.35, 0.65, x - 1.7, z + 7);
    addStaticCollider(0.8, 1.35, 0.65, x + 2.3, z + 7);
    addStaticCollider(0.22, 3.9, 0.22, x - 3.2, z + 5.7);
    addStaticCollider(0.22, 3.5, 0.22, x + 5.2, z + 5.7);
    addStaticCollider(0.22, 3.9, 0.22, x - 3.2, z + 8.3);
    addStaticCollider(0.22, 3.5, 0.22, x + 5.2, z + 8.3);
}

// RADIO TOWER
export const TOWER_POS = new THREE.Vector3(0, 0, -50);
export let beaconLight;
export let beaconBulb;

export function buildRadioTower(x, z) {
    const g = new THREE.Group();

    // Palette
    const RUST = 0x75432f;
    const DARK = 0x393936;
    const METAL = 0x82796b;
    const PALE = 0xb49a72;
    const WIRE = 0x51473c;

    // Base and anchoring feet
    part(g, 3.4, 0.25, 3.4, 0, 0.12, 0, DARK);
    for (const px of [-1.35, 1.35]) {
        for (const pz of [-1.35, 1.35]) {
            part(g, 0.55, 0.35, 0.55, px, 0.3, pz, METAL);
        }
    }

    // Four tapering-looking legs, built from long tilted boxes
    part(g, 0.24, 24, 0.24, -1.45, 12, -1.45, RUST, 0, 0, -0.045);
    part(g, 0.24, 24, 0.24, 1.45, 12, -1.45, METAL, 0, 0, 0.045);
    part(g, 0.24, 24, 0.24, -1.45, 12, 1.45, METAL, 0.045, 0, -0.045);
    part(g, 0.24, 24, 0.24, 1.45, 12, 1.45, RUST, -0.045, 0, 0.045);

    // Horizontal crossbars at several elevations
    for (const y of [2, 6, 10, 14, 18, 22]) {
        part(g, 3.1, 0.16, 0.16, 0, y, -1.45, METAL);
        part(g, 3.1, 0.16, 0.16, 0, y, 1.45, RUST);
        part(g, 0.16, 0.16, 3.1, -1.45, y, 0, RUST);
        part(g, 0.16, 0.16, 3.1, 1.45, y, 0, METAL);
    }

    // Diagonal braces on all four faces
    for (const y of [2, 6, 10, 14, 18]) {
        part(g, 0.13, 5.7, 0.13, 0, y + 2, -1.45, RUST, 0, 0, 0.65);
        part(g, 0.13, 5.7, 0.13, 0, y + 2, 1.45, METAL, 0, 0, -0.65);
        part(g, 0.13, 5.7, 0.13, -1.45, y + 2, 0, METAL, 0.65, 0, 0);
        part(g, 0.13, 5.7, 0.13, 1.45, y + 2, 0, RUST, -0.65, 0, 0);
    }

    // Damaged upper platform
    part(g, 2.5, 0.18, 2.3, 0, 20, 0, DARK, 0, 0, -0.06);
    part(g, 1.4, 0.15, 0.5, 0.9, 20.2, 0.5, RUST, 0, 0, 0.2);
    part(g, 0.12, 1.1, 0.12, -0.9, 20.5, -0.9, METAL);

    // Antenna mast and broken cross-arms
    part(g, 0.18, 4.5, 0.18, 0, 24.2, 0, RUST, 0, 0, 0.04);
    part(g, 2.2, 0.12, 0.12, 0, 23.2, 0, METAL, 0, 0, -0.08);
    part(g, 1.0, 0.12, 0.12, 0.6, 24.8, 0, RUST, 0, 0, 0.25);
    part(g, 0.12, 1.5, 0.12, 0.4, 23.5, 0, DARK, 0, 0, 0.12);

    // Loose-looking cables and rust patches
    part(g, 0.08, 5, 0.08, -1.0, 17, -1.55, WIRE, 0, 0, 0.3);
    part(g, 0.7, 0.35, 0.08, 1.5, 12, -1.6, RUST);
    part(g, 0.5, 0.4, 0.08, -1.6, 7, 1.5, PALE);

    // beacon at the top of the tower (dark until signal is sent)
    beaconBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x330000 })
    );
    beaconBulb.position.set(0, 26.7, 0);
    beaconBulb.userData.keep = true;
    g.add(beaconBulb);

    beaconLight = new THREE.PointLight(0xff2020, 0, 40);
    beaconLight.position.set(0, 26.7, 0);
    g.add(beaconLight);


    // Place the tower
    finishBuilding(g, x, z);

    // Colliders: base only; leave the lattice open for visibility and navigation
    addStaticCollider(3.4, 0.25, 3.4, x, z);
    for (const px of [-1.45, 1.45]) {
        for (const pz of [-1.45, 1.45]) {
            addStaticCollider(0.24, 2.2, 0.24, x + px, z + pz);
        }
    }
}

// COLLAPSED HOUSE
export function buildCollapsedHouse(x, z) {
    const g = new THREE.Group();

    // Palette
    const WALL = 0x8f7b64;
    const PLASTER = 0xb1a087;
    const WOOD = 0x594638;
    const DARK = 0x39352f;
    const RUST = 0x79503b;
    const STONE = 0x71695c;

    // Back wall
    part(g, 7.6, 3.8, 0.3, 0, 1.9, -3.8, WALL);
    part(g, 2.0, 1.0, 0.18, -2.3, 3.7, -3.62, PLASTER);

    // Left wall, with a broken upper edge
    part(g, 0.3, 3.4, 7.6, -3.8, 1.7, 0, PLASTER);
    part(g, 0.35, 1.0, 3.1, -3.8, 3.8, -2.1, WALL, 0, 0, -0.12);
    part(g, 0.3, 0.8, 2.3, -3.8, 3.3, 2.4, WALL, 0.1, 0, 0.08);

    // Right wall, partially collapsed
    part(g, 0.3, 2.5, 3.1, 3.8, 1.25, -2.2, WALL);
    part(g, 0.3, 1.2, 2.1, 3.8, 0.6, 2.5, PLASTER);
    part(g, 0.35, 1.0, 2.7, 3.8, 3.4, -1.0, WALL, 0, 0, -0.12);

    // Front wall segments leave a wide doorway in the middle
    part(g, 2.0, 2.7, 0.3, -2.8, 1.35, 3.8, WALL);
    part(g, 2.0, 2.7, 0.3, 2.8, 1.35, 3.8, PLASTER);
    part(g, 2.0, 0.3, 0.3, 0, 2.7, 3.8, WALL);

    // Roof remnants: only part of the roof survived
    part(g, 4.3, 0.25, 3.0, -1.6, 4.1, -2.2, DARK, 0, 0, -0.06);
    part(g, 2.8, 0.2, 2.0, 1.4, 4.35, -2.6, WOOD, 0, 0, 0.1);
    part(g, 3.7, 0.18, 0.18, -1.3, 3.9, 0.0, WOOD, 0.1, 0, 0.3);
    part(g, 3.0, 0.18, 0.18, 0.8, 3.5, -0.5, WOOD, 0, 0, -0.25);
    part(g, 0.2, 2.8, 0.2, -2.9, 2.5, -1.9, WOOD, 0, 0, 0.12);

    // Interior decay and exposed framing
    part(g, 0.18, 2.2, 0.18, -2.0, 1.8, -3.55, WOOD);
    part(g, 0.18, 2.2, 0.18, 1.7, 1.8, -3.55, WOOD);
    part(g, 1.1, 0.1, 0.12, -2.5, 1.3, -3.58, RUST);
    part(g, 1.4, 0.1, 0.12, 2.2, 1.5, -3.58, DARK);

    // Rubble scattered around the entry and inside
    part(g, 1.4, 0.22, 0.9, -2.8, 0.12, 4.5, STONE, 0, 0.3, 0.08);
    part(g, 0.9, 0.18, 0.7, 2.7, 0.1, 4.4, DARK, 0, 0.5, 0);
    part(g, 1.2, 0.18, 0.65, 0.8, 0.1, 1.0, STONE, 0, 0.2, 0);
    part(g, 0.7, 0.14, 0.6, -1.6, 0.08, -0.5, PLASTER, 0, 0.6, 0.1);

    // Place the house
    finishBuilding(g, x, z);

    // Colliders: perimeter walls; no collider across the doorway
    addStaticCollider(7.6, 3.8, 0.3, x, z - 3.8);
    addStaticCollider(0.3, 3.4, 7.6, x - 3.8, z);
    addStaticCollider(0.3, 2.5, 3.1, x + 3.8, z - 2.2);
    addStaticCollider(0.3, 1.2, 2.1, x + 3.8, z + 2.5);
    addStaticCollider(2, 2.7, 0.3, x - 2.8, z + 3.8);
    addStaticCollider(2, 2.7, 0.3, x + 2.8, z + 3.8);
}

// CRASHED BUS
export function buildSchoolBus(x, z) {
    const g = new THREE.Group();

    // Palette
    const YELLOW = 0xb39a42;
    const PALE = 0xc1ad66;
    const DARK = 0x393936;
    const GLASS = 0x465450;
    const RUST = 0x75432f;
    const TIRE = 0x282725;
    const METAL = 0x777269;

    // Main body and offset rear section
    part(g, 9.0, 1.65, 2.7, 0, 1.35, 0, YELLOW);
    part(g, 6.0, 0.7, 2.6, -1.1, 2.48, 0, PALE, 0, 0, -0.035);
    part(g, 2.3, 1.4, 2.7, 3.2, 1.3, 0, RUST, 0, 0, 0.08);

    // Front hood and damaged bumper
    part(g, 1.9, 0.65, 2.5, 4.9, 1.25, 0, YELLOW, 0, 0, -0.12);
    part(g, 2.0, 0.2, 2.8, 5.0, 0.65, 0, DARK, 0, 0, -0.12);
    part(g, 0.65, 0.3, 0.1, 5.95, 1.4, -0.7, METAL);
    part(g, 0.65, 0.3, 0.1, 5.95, 1.4, 0.7, METAL);

    // Window band, with missing panes
    for (const wx of [-2.9, -1.5, -0.1, 1.3]) {
        part(g, 1.05, 0.75, 0.07, wx, 2.48, 1.37, GLASS);
        part(g, 1.1, 0.08, 0.12, wx, 2.88, 1.42, DARK);
        part(g, 0.08, 0.8, 0.12, wx - 0.55, 2.48, 1.42, DARK);
    }

    // Broken rear-side windows and exposed framing
    part(g, 0.85, 0.7, 0.08, -4.0, 2.1, 1.39, GLASS);
    part(g, 0.1, 0.9, 0.12, -4.5, 2.1, 1.42, RUST);
    part(g, 0.1, 0.9, 0.12, -3.5, 2.1, 1.42, DARK);

    // Opposite-side windows
    part(g, 1.1, 0.7, 0.08, -2.6, 2.45, -1.39, GLASS);
    part(g, 1.1, 0.7, 0.08, -0.8, 2.45, -1.39, DARK);
    part(g, 0.1, 0.8, 0.12, 0.0, 2.45, -1.42, RUST);

    // Front windshield, cracked look from intersecting strips
    part(g, 0.9, 0.8, 0.08, 5.65, 2.0, -0.65, GLASS, 0, 0, -0.12);
    part(g, 0.9, 0.8, 0.08, 5.65, 2.0, 0.65, GLASS, 0, 0, -0.12);
    part(g, 0.06, 0.9, 0.1, 5.72, 2.0, 0, DARK, 0, 0, 0.12);

    // Wheels: kept as boxes for the low-poly look
    for (const wx of [-3.2, 2.8]) {
        part(g, 0.75, 0.9, 0.35, wx, 0.55, 1.35, TIRE);
        part(g, 0.75, 0.9, 0.35, wx, 0.55, -1.35, TIRE);
        part(g, 0.3, 0.35, 0.38, wx, 0.55, 1.53, METAL);
        part(g, 0.3, 0.35, 0.38, wx, 0.55, -1.53, METAL);
    }

    // Skewed roof and rusted roof rails
    part(g, 3.6, 0.18, 2.6, -1.6, 3.0, 0, DARK, 0, 0, -0.05);
    part(g, 2.2, 0.16, 2.3, 2.4, 3.05, 0, YELLOW, 0, 0, 0.08);
    part(g, 4.0, 0.12, 0.12, -1.0, 3.15, 1.1, RUST, 0, 0, -0.08);

    // Faded stripe and side damage
    part(g, 4.6, 0.18, 0.06, -0.4, 1.6, 1.39, RUST);
    part(g, 1.2, 0.55, 0.08, 2.2, 1.8, 1.42, DARK, 0, 0, 0.08);
    part(g, 0.9, 0.35, 0.08, -3.5, 1.35, 1.42, RUST);
    part(g, 1.3, 0.22, 0.08, -1.7, 0.85, -1.42, METAL);

    // Debris and detached panels
    part(g, 1.4, 0.16, 0.75, 4.5, 0.1, 2.1, RUST, 0, 0.25, 0.1);
    part(g, 1.0, 0.12, 0.65, -4.8, 0.08, -1.8, DARK, 0, 0.5, 0.1);
    part(g, 0.8, 0.18, 0.6, 5.8, 0.1, -1.8, METAL, 0, 0.3, 0.05);

    return g;
}
