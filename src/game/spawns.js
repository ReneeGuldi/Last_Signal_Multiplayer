// spawns.js: spawnEntities(): where every husk, pickup, barrel and nest starts each run.

import { createHusk } from './husks.js';
import { spawnNest } from './nests.js';
import { spawnPickup } from './pickups.js';
import { spawnBarrel, spawnBus, spawnCrate } from './props.js';
import { stockDrawer } from '../world/blockbench.js';
import { setupTriggers, spawnBarricade, spawnCars } from '../world/evacRoute.js';
import { LAYOUT, UPPER_Y, at } from '../world/layout.js';

// A group of guards around one spot
function spawnCluster(homeX, homeZ, list, guardRadius = 12) {
    for (const [type, x, z] of list) {
        createHusk(x, z, type, { home: { x: homeX, z: homeZ }, guardRadius });
    }
}

// Same, but everything relative to a landmark from LAYOUT.
// y: spawn them on an upper floor (UPPER_Y)
function guards(name, homeDx, homeDz, list, guardRadius = 12, y = 0) {
    const [x, z] = LAYOUT[name];
    for (const [type, dx, dz] of list) {
        createHusk(x + dx, z + dz, type, { home: { x: x + homeDx, z: z + homeDz }, guardRadius, y });
    }
}

// To be called at startup and anytime the player presses 'R'
export function spawnEntities() {
    // Bus crashed across North Street, and every parked car
    spawnBus(...LAYOUT.bus);
    spawnCars();
 
    // Crates + barrels
    for (let i = 0; i < 4; i++) spawnCrate(-3 + i * 1.5, 52); // abandoned supply drop on Main Street
    spawnBarrel(...at('gas', -5, 6));
    spawnBarrel(...at('gas', -5.6, 7.2));
    spawnBarrel(...at('police', 6, 8));
    spawnBarrel(...at('police', 7, 8.6));
    spawnBarrel(...at('bus', 8, 3));
    spawnBarrel(...at('diner', -11, -6));
    spawnBarrel(...at('hardware', -5, 5));
    spawnBarrel(...at('checkpoint', -8, 6));
    spawnBarrel(...at('checkpoint', -7.2, 6.6));
    spawnBarrel(...at('farm', -4, 9));
    spawnBarrel(-14, 4.5);  // in front of the apartments
    spawnBarrel(6, 30);     // Main Street
 
    // Barrels around the tower
    spawnBarrel(-6, -44);
    spawnBarrel(6, -56);
    spawnBarrel(-7, -55);
 
    // Bloom nests: farm field, diner, police station, gas station, collapsed house
    spawnNest(...at('farm', -11, 0));
    spawnNest(...at('diner', 4, 0));
    spawnNest(...at('police', -1, -3.5));
    spawnNest(...at('gas', 1.5, -1.5));
    spawnNest(...at('house', -1.5, 2));
 
    // Husks, location by location
    guards('farm', -9, 0, [['normal', -8, -4], ['normal', -14, 5], ['runner', -6, 7]]);
    guards('checkpoint', 0, 8, [['normal', -3, 8], ['normal', 3, 7], ['runner', 0, 12]]);
    guards('bus', 4, -2, [['brute', 4, -6], ['normal', 10, 0], ['normal', -6, -3], ['runner', 2, 5]]);
    guards('house', 0, 6, [['normal', 0, 7], ['normal', 4, 5]]);
    // apartment: one in the lobby, one upstairs, two out front (door faces south, z goes down)
    guards('apartment', 2, 0, [['normal', 2, 0]], 8);
    guards('apartment', 3, 3, [['normal', 3, 3]], 8, UPPER_Y);
    guards('apartment', 0, -9, [['normal', -2, -9], ['runner', 4, -9.5]]);
    guards('diner', -9, 0, [['normal', -10, -3], ['normal', -8, 3], ['runner', -13, 0]]);
    guards('pharmacy', 0, -8, [['normal', -2, -7], ['runner', 3, -7]]);
    // police: two out front, one at the front desk, two in the armory upstairs
    guards('police', 0, 9, [['normal', -2, 8], ['normal', 3, 9]]);
    guards('police', 3, -2, [['normal', 3, -2]], 8);
    guards('police', 2, -3, [['normal', 0, -3], ['runner', 5, 2]], 8, UPPER_Y);
    guards('gas', 0, 7, [['normal', -3, 6], ['normal', 3, 6], ['normal', 0, 10], ['runner', -5, 3]]);
    guards('hardware', 0, 5, [['normal', -1, 6], ['runner', 2, 7]]);
    guards('chapel', 0, 6, [['normal', 2, 8], ['normal', -2, 8], ['normal', 10, 5]]);
    guards('crash', 0, 0, [['normal', 4, 4], ['runner', -4, -3]]);
    spawnCluster(0, -50, [['normal', 4, -46], ['normal', -4, -47], ['runner', 0, -57]], 10); // tower
 
    // A few wanderers out in the open
    createHusk(-35, -20);
    createHusk(30, 45, 'runner');
    createHusk(50, 20);
    createHusk(-50, -30, 'brute', { home: { x: -50, z: -30 }, guardRadius: 10 });
 
    // EAST SIDE & SUBURBS
    // Motel: two out front, and a husk shut inside some of the locked rooms
    // the motel faces south, so a room's inside is at +z from its door
    guards('motel', 0, -8, [['normal', -6, -7], ['normal', 5, -8]]);
    guards('motel', -7, 0, [['normal', -7, 0.5]], 3);
    guards('motel', 3, 0, [['normal', 3.5, 0.5]], 3);
    guards('motel', 13, 0, [['runner', 13, 0.5]], 3);
    spawnPickup('motelKey', ...at('motel', -11.9, 1), { y: 1.06 });  // on the office counter
    spawnPickup('policeKey', ...at('motel', 6.4, 3.4), { y: 0.62 }); // on the dresser in room 4
    spawnPickup('ammo', ...at('motel', -7.5, -0.5));
    spawnPickup('shells', ...at('motel', -2.5, -0.5));
    spawnPickup('medkit', ...at('motel', 2.5, -0.5));
    spawnPickup('ammo', ...at('motel', 12.5, -0.5));

    // Grocery: a nest in the back, two husks in the aisles
    spawnNest(...at('grocery', 0.5, 2.5));
    guards('grocery', 0, 0, [['normal', 1.5, 0], ['runner', -4.3, 2]], 7);
    guards('grocery', 0, -11, [['normal', -3, -10]]);
    spawnPickup('medkit', ...at('grocery', -4.3, 3.8));
    spawnPickup('ammo', ...at('grocery', 4.3, 1));

    // Warehouse: a brute behind the boards, plus a nest. The fire station key is on the desk.
    spawnNest(...at('warehouse', -3, 5));
    guards('warehouse', 2, -2, [['brute', 2, -1], ['normal', -3, 2.5], ['normal', 5, 4.5]], 8);
    // The fire station key is in the foreman's desk drawer (on the desk without the model implemented)
    if (!stockDrawer(...at('warehouse', -7.6, -5.9), 'fireKey')) spawnPickup('fireKey', ...at('warehouse', -7.1, -5.9), { y: 0.82 });
    spawnPickup('shells', ...at('warehouse', 7, 5));
    spawnPickup('ammo', ...at('warehouse', -1, -3));
    spawnBarrel(...at('warehouse', -4, 9));  // or blow the boards off
    spawnBarrel(...at('warehouse', 4.5, 9.5));

    // Fire station: one on the ground floor, a runner upstairs, two out front
    guards('fire', 0, 10, [['normal', -3, 9], ['normal', 4, 10]]);
    guards('fire', 2, 2, [['normal', 2, 2]], 6);
    guards('fire', 4, -2, [['runner', 4, -2]], 6, UPPER_Y);
    spawnPickup('shells', ...at('fire', -3, 2));
    spawnPickup('medkit', ...at('fire', 6, 2));
    spawnPickup('shells', ...at('fire', -2, -3), { y: UPPER_Y });
    spawnPickup('ammo', ...at('fire', 5, 2), { y: UPPER_Y });

    // Suburbs
    guards('sub2', 0, 7, [['normal', -2, 7], ['runner', 3, 8]]);
    guards('sub3', 0, 0, [['normal', 0, 0]], 5);
    createHusk(-86, 24);
    spawnPickup('ammo', ...at('sub1', 0.8, -1.6), { y: 0.82 });
    spawnPickup('medkit', ...at('sub2', 2.2, -1.8), { y: 0.82 });
    spawnPickup('shells', ...at('sub2', -1, 1));
    spawnPickup('ammo', ...at('sub4', 2.2, 1.8), { y: 0.82 });
    spawnPickup('medkit', ...at('sub5', 0.8, 1.6), { y: 0.82 });

    // Shed: a medkit someone stashed
    spawnPickup('medkit', ...at('shed', 0, 0));

    // NORTH END (all face south, so a building's inside is at +z from its front door)
    guards('school', 0, -9, [['normal', -4, -8], ['runner', 3, -8.5]]);
    guards('school', 2, 1, [['normal', 0, 1], ['runner', 5, 0]], 7);
    guards('school', 2, 2, [['normal', 3, 2]], 6, UPPER_Y);
    stockDrawer(...at('school', 7.5, 4.6), 'ammo'); // principal's desk
    spawnPickup('shells', ...at('school', 2, -1.5), { y: UPPER_Y + 0.82 });

    guards('clinic', 0, 1, [['normal', -1, 1], ['normal', 2, 2.5]], 6);
    spawnPickup('medkit', ...at('clinic', -5.4, 0.5));
    spawnPickup('medkit', ...at('clinic', 3.5, -2.8), { y: 1.06 }); // on the front counter
    spawnNest(...at('clinic', -3, -1)); // it's taken over the waiting room

    guards('laundromat', 0, -8, [['normal', 2, -8.5]]);
    spawnPickup('ammo', ...at('laundromat', 2, 0), { y: 0.82 });

    guards('garage', 0, 0, [['brute', 0, 1], ['normal', -3, 2]], 7);
    spawnPickup('shells', ...at('garage', -3, 5.4), { y: 1.06 });
    spawnBarrel(...at('garage', -5.5, 0.5));
    spawnBarrel(...at('garage', 5.5, 4.5));
    spawnBarrel(...at('garage', -2, -8)); // outside: blow the boards off

    // One radio part at each location
    spawnPickup('battery', ...at('gas', 0, 7));          // under the gas station canopy
    spawnPickup('coil', ...at('house', 0, -2));          // inside the collapsed house
    spawnPickup('transmitter', ...at('bus', 7.5, -2.7)); // beside the bus
 
    // Weapons, as rewards for exploring
    spawnPickup('shotgun', ...at('police', 2.5, 1), { y: UPPER_Y }); // police armory, upstairs
    spawnPickup('machete', ...at('hardware', 1.8, -3.25), { y: 1.06 }); // on the hardware store workbench
 
    // Supplies (these respawn after being picked up)
    spawnPickup('ammo', ...at('farm', 6, 1.5), { y: 0.2 });   // farmhouse porch, near the start
    spawnPickup('medkit', ...at('farm', 1.5, 1.2));           // farmhouse kitchen
    spawnPickup('ammo', ...at('checkpoint', 6, -0.5));
    spawnPickup('ammo', ...at('checkpoint', -6, -7));
    spawnPickup('shells', ...at('checkpoint', 7, 1));
    spawnPickup('ammo', 2, 50);                               // by the supply crates
    spawnPickup('ammo', ...at('houseB', 1.6, -1.2), { y: 0.82 }); // on the kitchen table
    spawnPickup('ammo', ...at('apartment', 3, 2));            // lobby (door faces south)
    spawnPickup('medkit', ...at('apartment', -2, 5), { y: UPPER_Y });
    spawnPickup('ammo', ...at('apartment', 1, 4.5), { y: UPPER_Y });
    spawnPickup('medkit', ...at('diner', -1, 1));
    spawnPickup('medkit', ...at('pharmacy', 1, 1.5));         // door faces south, so +z is the back
    spawnPickup('medkit', ...at('pharmacy', -4.8, -2.5));
    spawnPickup('ammo', ...at('police', 3, -0.5));
    spawnPickup('shells', ...at('police', 3.5, 1.6), { y: UPPER_Y });
    spawnPickup('shells', ...at('hardware', 0.5, -1));
    spawnPickup('ammo', ...at('gas', -1, 1.5));
    spawnPickup('ammo', ...at('chapel', 0, 1));
    spawnPickup('medkit', ...at('crash', 3, -3));
    spawnPickup('ammo', 4, -44); // stocked up at the tower
    spawnPickup('medkit', -4, -44);
 
    // Evac route: crates, barrels at the barricade, supply cache, LZ supplies
    spawnCrate(-3, -84);
    spawnCrate(-4.5, -84.6);
    spawnBarricade(-98);
    spawnBarrel(-2, -96.5);
    spawnBarrel(2.5, -96.5);
    spawnPickup('ammo', -5.5, -89);
    spawnPickup('medkit', -5.5, -91);
    spawnPickup('shells', -5.5, -87.5);
    spawnBarrel(-10, -130);
    spawnBarrel(10, -146);
    spawnBarrel(9, -128);
    spawnPickup('ammo', -12, -150);
    spawnPickup('ammo', 12, -150);
    spawnPickup('medkit', 0, -125);
 
    setupTriggers();
}
