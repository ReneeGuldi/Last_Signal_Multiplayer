// reset.js: Clearing everything and starting a fresh run (resetGame()).

import { camera, scene, world } from '../core/engine.js';
import { game } from '../core/state.js';
import { blastLight, effects, fx } from './effects.js';
import { resetCoop } from './coop.js';
import { husks } from './husks.js';
import { closeNote, secrets } from './interact.js';
import { nests } from './nests.js';
import { pickups, resetPickupIds } from './pickups.js';
import { EYE_HEIGHT, SPAWN, hurtEl, knockback, playerBody } from './player.js';
import { props, resetPropIds } from './props.js';
import { spawnEntities } from './spawns.js';
import { equip, owned } from './weapons.js';
import { messageEl, overlayText, overlayTitle } from '../ui/elements.js';
import { resetDrawers } from '../world/blockbench.js';
import { resetDoors } from '../world/doors.js';
import { chopper, hazards } from '../world/evacRoute.js';
import { beaconBulb, beaconLight } from '../world/landmarks.js';

//------------------------------------------------
// Game Reset

function clearEntities() {
    for (const h of husks) { scene.remove(h.mesh); world.removeBody(h.body); }
    husks.length = 0;

    for (const p of props) { scene.remove(p.mesh); world.removeBody(p.body); }
    props.length = 0;

    for (const p of pickups) scene.remove(p.mesh);
    pickups.length = 0;

    for (const n of nests) scene.remove(n.group);
    nests.length = 0;

    if (game.barricade) {
        scene.remove(game.barricade.group);
        world.removeBody(game.barricade.body);
        game.barricade = null;
    }

    for (const f of fx) scene.remove(f.mesh);
    fx.length = 0;

    for (const e of effects) scene.remove(e.fireball);
    effects.length = 0;
    blastLight.intensity = 0;
}

export function resetGame() {
    clearEntities();
    resetPickupIds();
    resetPropIds();
    resetCoop();
    spawnEntities();

    for (const s of secrets) s.found = false;
    game.secretsFound = 0;
    resetDoors();
    resetDrawers();
    for (const zone of hazards) zone.warned = false;

    playerBody.position.set(SPAWN.x, 2, SPAWN.z);
    playerBody.velocity.set(0, 0, 0);
    camera.position.set(SPAWN.x, 2 + EYE_HEIGHT, SPAWN.z);
    camera.rotation.set(0, SPAWN.yaw, 0);
    knockback.set(0, 0, 0);
    hurtEl.style.opacity = 0;

    game.health = 100;
    game.ammo = 30;
    game.shells = 0;
    owned.shotgun = false;
    owned.machete = false;
    equip('pistol');
    closeNote();
    game.partsFound = 0;
    game.score = 0;
    game.meleeCooldown = 0;

    game.towerState = 'dead';
    game.evacTimer = 0;
    game.towerHintShown = false;
    game.lzHintShown = false;
    beaconLight.intensity = 0;
    beaconBulb.material.color.setHex(0x330000);
    chopper.visible = false;

    game.gameOver = false;
    game.dead = false;
    messageEl.textContent = '';
    overlayTitle.textContent = 'LAST SIGNAL';
    overlayText.textContent = 'Click to Start';
}
