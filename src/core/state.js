// state.js: Game state that several files change (health, score, ammo...). Read and change it as game.health, game.score, and so on.


// Values more than one file changes. Everything else stays in the file it belongs to.
export const game = {
    health: 100, // from src/game/player.js
    ammo: 30, // from src/game/player.js
    partsFound: 0, // from src/game/player.js
    score: 0, // from src/game/player.js
    towerState: 'dead', // from src/game/tower.js
    evacTimer: 0, // from src/game/tower.js
    towerHintShown: false, // from src/game/tower.js
    gameOver: false,
    ready: false, // true once models finish loading
    hazardSlow: 1, // from src/game/player.js
    secretsFound: 0, // from src/game/interact.js
    meleeCooldown: 0, // from src/game/weapons.js
    barricade: null, // from src/world/evacRoute.js
    shells: 0, // from src/game/weapons.js
    weaponCooldown: 0, // from src/game/weapons.js
    lzHintShown: false, // from src/game/tower.js
};
