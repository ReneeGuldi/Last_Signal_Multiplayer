// tower.js: The radio tower, evac countdown, landing zone waves, and winning.

import { sendWorld } from '../net.js';
import { game } from '../core/state.js';
import { runsWorld } from './coop.js';
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
// Any player can move it to the next stage; everyone else hears about it through setTowerState().

// Move the tower/evac to a stage. who: the teammate who did it (null for you, or when catching up)
export function setTowerState(state, evacTimer = 0, who = null) {
    if (!['dead', 'broadcasting', 'landing'].includes(state) || state === game.towerState) return;
    const before = game.towerState;
    game.towerState = state;
    chopper.visible = state !== 'dead';
    if (state === 'broadcasting' && before === 'dead') {
        showMessage(who ? `${who} sent the signal! The chopper is inbound. Follow the road south to the landing zone!`
            : 'Signal sent! The chopper is inbound. Follow the road south to the landing zone!', 5);
    }
    if (state === 'landing') {
        game.evacTimer = evacTimer || LAND_TIME;
        waveTimer = 2;
        if (before !== 'landing') {
            showMessage(who ? `${who} reached the landing zone! Hold it until the chopper touches down!`
                : 'Hold the landing zone until the chopper touches down!', 4);
        }
    }
}

// We moved it ourselves: change it here and tell everyone
function advanceTower(state) {
    setTowerState(state, LAND_TIME);
    sendWorld('tower', { state, evacTimer: game.evacTimer });
}

// playing: false while you're paused or dead (the countdown and waves still run)
export function updateTower(dt, time, playing = true) {
    const px = playerBody.position.x;
    const pz = playerBody.position.z;
    const distToTower = playing ? Math.hypot(px - TOWER_POS.x, pz - TOWER_POS.z) : Infinity;
    const inLZ = playing && pz < -122 && Math.abs(px - LZ_POS.x) < 16;

    if (game.towerState === 'dead') {
        if (distToTower < 6) {
            if (game.partsFound >= 3) {
                advanceTower('broadcasting');
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

        if (inLZ) advanceTower('landing');
    } else if (game.towerState === 'landing') {
        game.evacTimer = Math.max(0, game.evacTimer - dt);
        const progress = 1 - game.evacTimer / LAND_TIME; // 0 -> 1

        // descend straight onto the helipad
        chopper.position.set(LZ_POS.x, 45 * (1 - progress), LZ_POS.z);
        chopper.rotation.y += (0 - chopper.rotation.y) * dt;

        // waves get faster and nastier as the chopper gets closer
        waveTimer -= dt;
        const alive = husks.filter((h) => !h.dead).length;
        if (runsWorld() && waveTimer <= 0 && alive < HUSK_TUNING.waveMax) {
            const { waveSlowest: slow, waveFastest: fast } = HUSK_TUNING;
            waveTimer = slow - (slow - fast) * progress;
            const [sx, sz] = LZ_SPAWNS[Math.floor(Math.random() * LZ_SPAWNS.length)];
            let type = Math.random() < 0.4 ? 'runner' : 'normal';
            if (progress > 0.5 && Math.random() < 0.15) type = 'brute';
            createHusk(sx, sz, type, { alerted: true });
        }

        // the host decides when it's over, so everyone wins at the same moment
        if (game.evacTimer <= 0 && runsWorld()) {
            sendWorld('win', null);
            win();
        }
    }
}

// Win state
export function win() {
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
