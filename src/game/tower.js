// tower.js: The radio tower, evac countdown, landing zone waves, and winning.

import { game } from '../core/state.js';
import { HUSK_TUNING, createHusk, husks } from './husks.js';
import { playerBody } from './player.js';
import { overlayText, overlayTitle } from '../ui/elements.js';
import { showMessage } from '../ui/hud.js';
import { controls, updateRestartButton } from '../ui/input.js';
import { LAND_TIME, LZ_POS, LZ_SPAWNS, chopper, rotor } from '../world/evacRoute.js';
import { TOWER_POS, beaconBulb, beaconLight } from '../world/landmarks.js';

let waveTimer = 0;
const EVAC_TIME = 60;


//------------------------------------------------
// Radio Tower & Win Condition
// towerState: 'dead' -> 'broadcasting' (get to the LZ) -> 'landing' (hold the LZ) -> 'done'

export function updateTower(dt, time) {
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    const distToTower = Math.hypot(px - TOWER_POS.x, pz - TOWER_POS.z);
    const inLZ = pz < -122 && Math.abs(px - LZ_POS.x) < 16;

    if (game.towerState === 'dead') {
        if (distToTower < 6) {
            if (game.partsFound === 3) {
                game.towerState = 'broadcasting';
                chopper.visible = true;
                showMessage('Signal sent! The chopper is inbound. Follow the road south to the landing zone!', 5);
            } else if (!game.towerHintShown) {
                game.towerHintShown = true;
                showMessage(`The tower is dead. Find the radio parts (${game.partsFound}/3).`, 3);
            }
        } else {
            game.towerHintShown = false;
        }
        if (inLZ && !game.lzHintShown) {
            game.lzHintShown = true;
            showMessage('An empty landing zone. Fix the radio tower to call for evac.', 3);
        }
        return;
    }

    // beacon blinks for the rest of the game
    const on = Math.sin(time * 8) > 0;
    beaconLight.intensity = on ? 50 : 0;
    beaconBulb.material.color.setHex(on ? 0xff2020 : 0x330000);
    rotor.rotation.y += dt * 25;

    if (game.towerState === 'broadcasting') {
        // chopper circles high above the LZ waiting for you
        const angle = time * 0.3;
        chopper.position.set(LZ_POS.x + Math.cos(angle) * 20, 45, LZ_POS.z + Math.sin(angle) * 20);
        chopper.rotation.y = -angle;

        if (inLZ) {
            game.towerState = 'landing';
            game.evacTimer = LAND_TIME;
            waveTimer = 2;
            showMessage('Hold the landing zone until the chopper touches down!', 4);
        }
    } else if (game.towerState === 'landing') {
        game.evacTimer -= dt;
        const progress = 1 - game.evacTimer / LAND_TIME; // 0 -> 1

        // descend straight onto the helipad
        chopper.position.set(LZ_POS.x, 45 * (1 - progress), LZ_POS.z);
        chopper.rotation.y += (0 - chopper.rotation.y) * dt;

        // waves get faster and nastier as the chopper gets closer
        waveTimer -= dt;
        const alive = husks.filter((h) => !h.dead).length;
        if (waveTimer <= 0 && alive < HUSK_TUNING.waveMax) {
            const { waveSlowest: slow, waveFastest: fast } = HUSK_TUNING;
            waveTimer = slow - (slow - fast) * progress;
            const [sx, sz] = LZ_SPAWNS[Math.floor(Math.random() * LZ_SPAWNS.length)];
            let type = Math.random() < 0.4 ? 'runner' : 'normal';
            if (progress > 0.5 && Math.random() < 0.15) type = 'brute';
            createHusk(sx, sz, type, { alerted: true });
        }

        if (game.evacTimer <= 0) win();
    }
}

// Win state
function win() {
    game.towerState = 'done';
    game.gameOver = true;
    chopper.position.set(LZ_POS.x, 0, LZ_POS.z);
    game.score += Math.ceil(game.health) * 5;
    beaconLight.intensity = 0;
    controls.unlock();
    overlayTitle.textContent = 'EVAC ARRIVED';
    overlayText.textContent = `You made it out. Final Score: ${game.score}. Press Enter or click Play again.`;
    updateRestartButton();
}
