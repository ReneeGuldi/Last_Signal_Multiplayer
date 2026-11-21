// layout.js: Where everything goes: LAYOUT (building positions), at(), ROADS, floor heights.


 

//------------------------------------------------
// CITY LAYOUT
// Every landmark's center. 
export const LAYOUT = {
    farm:       [-75, 100], // far north-west: where you start, and where the Bloom started
    checkpoint: [0, 72],    // quarantine line across the north end of Main Street
    house:      [-27, 27],  // collapsed house
    houseB:     [-13, 27],  // the intact house next door
    apartment:  [-20, 13],  // 2 floors, door faces south
    diner:      [25, 26],
    pharmacy:   [20, 12],   // door faces south
    police:     [-20, -17], // 2 floors, armory upstairs
    gas:        [26, -20],
    hardware:   [12, -18],
    bus:        [-20, 40],  // crashed across North Street
    chapel:     [-62, 15],
    crash:      [66, -22],
    // East side (past East Avenue, out to Mill Road)
    motel:      [75, 54],   // faces south onto North Street
    grocery:    [62, 13.5], // faces south onto Center Street
    fire:       [84, -13.5],// 2 floors, faces north onto Center Street
    warehouse:  [75, -50.5],// faces north onto South Street
    // Suburbs at the west end of Center Street
    sub1:       [-62, -13],
    sub2:       [-76, -13],
    sub3:       [-90, -13],
    sub4:       [-80, 13],  // north side: doors face south
    sub5:       [-94, 13],
    shed:       [-62, -23], // backyard of sub1
    // North End, north side of North Street (all face south)
    school:     [-30, 54],  // 2 floors (20 wide: x -40 to -20)
    clinic:     [-13, 53.5],// 12 wide: x -19 to -7, just west of Main Street's sidewalk
    laundromat: [13, 53],   // 10 wide: x 8 to 18, just east of Main Street's sidewalk
    garage:     [32, 54.5],
};
 
// Position relative to a landmark
export function at(name, dx = 0, dz = 0) {
    const [x, z] = LAYOUT[name];
    return [x + dx, z + dz];
}
 
// Roads: [x1, z1, x2, z2] along their center lines (each one runs along x or z)
export const ROAD_W = 8;   // asphalt width
export const WALK_W = 2.5; // sidewalk on each side
export const ROADS = [
    [0, -45, 0, 85],      // Main Street: tower plaza up to the checkpoint
    [-40, -36, -40, 40],  // West Avenue
    [40, -36, 40, 40],    // East Avenue
    [-46, 40, 104, 40],   // North Street (east end runs past the motel)
    [-100, 0, 100, 0],    // Center Street, from the suburbs out to Mill Road
    [-46, -36, 104, -36], // South Street (east end runs past the warehouse)
    [100, -36, 100, 40],  // Mill Road, the east edge of town
];
 
export const FLOOR_H = 3.6;               // height of one story
export const UPPER_Y = FLOOR_H + 0.125;