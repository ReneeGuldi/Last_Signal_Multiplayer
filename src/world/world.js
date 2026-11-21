// world.js: buildStaticWorld(): builds the whole town in order. Also the lore notes.

import { buildSecrets } from '../game/interact.js';
import { building, placeModelBuilding, placeProp } from './blockbench.js';
import { reserve } from './builders.js';
import { buildApartment, buildHardware, buildHouseB, buildPharmacy, buildPolice, furnishOldBuildings } from './cityBuildings.js';
import { buildFireStation, buildGrocery, buildMotel, buildSuburbHouse, buildWarehouse } from './eastSide.js';
import { buildEvacRoute } from './evacRoute.js';
import { TOWER_POS, buildCollapsedHouse, buildGasStation, buildRadioTower } from './landmarks.js';
import { LAYOUT, at } from './layout.js';
import { buildLoreNotes, buildNature, buildSkeletons } from './nature.js';
import { buildClinic, buildGarage, buildLaundromat, buildSchool } from './northEnd.js';
import { buildChapel, buildCheckpoint, buildCrashedChopper, buildDiner, buildFarm } from './outskirts.js';
import { buildDirtPath, buildRoads, buildStreetDetails } from './streets.js';

//------------------------------------------------
// World Building
export function buildStaticWorld() {
    // Keep trees and rocks out of these areas -- buildings reserve their own space too
    reserve(...at('gas', -6, -6), ...at('gas', 7, 10));
    reserve(...at('house', -5, -5), ...at('house', 5, 6));
    reserve(...at('diner', -16, -5), ...at('diner', 7, 6));
    reserve(...at('checkpoint', -11, -9), ...at('checkpoint', 11, 9));
    reserve(...at('farm', -17, -11), ...at('farm', 13, 10));
    reserve(...at('chapel', -4, -6), ...at('chapel', 14, 10));
    reserve(...at('crash', -8, -8), ...at('crash', 8, 9));
    reserve(-13, -58, 13, -36);    // tower plaza
    reserve(-18, -160, 18, -58);   // evac road and landing zone
 
    buildRoads();
    buildDirtPath();
 
    building('gasStation', ...LAYOUT.gas, { rotY: 0 }, () => buildGasStation(...LAYOUT.gas));
    buildCollapsedHouse(...LAYOUT.house);
    buildRadioTower(TOWER_POS.x, TOWER_POS.z);
    buildEvacRoute();
    buildCheckpoint(...LAYOUT.checkpoint);
    building('diner', ...LAYOUT.diner, { rotY: 0 }, () => buildDiner(...LAYOUT.diner));
    building('farmhouse', ...LAYOUT.farm, { rotY: 0 }, () => buildFarm(...LAYOUT.farm));
    buildCrashedChopper(...LAYOUT.crash);
    // The Blockbench chapel is modeled big, so it's placed at half size (scale 1.2) with its doors facing town
    if (building('chapel', ...LAYOUT.chapel, { rotY: Math.PI, scale: 1.2, center: true }, () => buildChapel(...LAYOUT.chapel))) {
        furnishChapel(...LAYOUT.chapel);
    }
 
    // New city buildings, with furniture inside
    buildPolice(...LAYOUT.police);
    buildApartment(...LAYOUT.apartment);
    building('pharmacy', ...LAYOUT.pharmacy, { rotY: Math.PI }, () => buildPharmacy(...LAYOUT.pharmacy));
    building('hardware', ...LAYOUT.hardware, { rotY: 0 }, () => buildHardware(...LAYOUT.hardware));
    building('houseB', ...LAYOUT.houseB, { rotY: 0 }, () => buildHouseB(...LAYOUT.houseB));
    furnishOldBuildings();

    // East side and suburbs, with doors to open, keys to find and boards to break
    building('motel', ...LAYOUT.motel, { rotY: Math.PI }, () => buildMotel(...LAYOUT.motel));
    building('grocery', ...LAYOUT.grocery, { rotY: Math.PI }, () => buildGrocery(...LAYOUT.grocery));
    buildFireStation(...LAYOUT.fire);
    building('warehouse', ...LAYOUT.warehouse, { rotY: 0 }, () => buildWarehouse(...LAYOUT.warehouse));
    buildSuburbHouse(...LAYOUT.sub1, 0, false);
    buildSuburbHouse(...LAYOUT.sub2, 1, false, { kind: 'boarded' });
    buildSuburbHouse(...LAYOUT.sub3, 2, false);
    buildSuburbHouse(...LAYOUT.sub4, 3, true);
    buildSuburbHouse(...LAYOUT.sub5, 4, true, { kind: 'boarded' });
    placeModelBuilding('shed', ...LAYOUT.shed, { rotY: Math.PI });

    // North End (placeholders until their Blockbench versions exist)
    buildSchool(...LAYOUT.school);
    building('clinic', ...LAYOUT.clinic, { rotY: Math.PI }, () => buildClinic(...LAYOUT.clinic));
    building('laundromat', ...LAYOUT.laundromat, { rotY: Math.PI }, () => buildLaundromat(...LAYOUT.laundromat));
    building('garage', ...LAYOUT.garage, { rotY: Math.PI }, () => buildGarage(...LAYOUT.garage));
 
    buildStreetDetails();
    buildNature();
    buildSkeletons();
    buildSecrets();
    buildLoreNotes();
}

// Pews and the altar inside the Blockbench chapel (the code-built chapel makes its own)
function furnishChapel(cx, cz) {
    for (let row = 0; row < 5; row++) {
        const pz = cz + 3.2 - row * 1.3; // rows from the doors toward the altar
        for (const side of [-1, 1]) {
            placeProp('church_pew', cx + side * 2.0, pz, Math.PI); // facing the altar
        }
    }
    placeProp('altar', cx, cz - 4.4, 0);
}