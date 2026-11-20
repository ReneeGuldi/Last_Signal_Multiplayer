// hud.js: The HUD: health, ammo, parts, score, objective, on-screen messages.

import { game } from '../core/state.js';
import { WEAPONS, WEAPON_ORDER, owned, weapon } from '../game/weapons.js';
import { ammoEl, healthEl, messageEl, objectiveEl, partsEl, scoreEl, weaponsEl } from './elements.js';
import { keyRing } from '../world/doors.js';

let messageTimer = null;
export function showMessage(text, seconds = 2.5) {
    messageEl.textContent = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (messageEl.textContent = ''), seconds * 1000);
}

export function updateHUD() {
    healthEl.textContent = `Health: ${Math.max(0, Math.ceil(game.health))}`;
    const w = WEAPONS[weapon];
    ammoEl.textContent = w.melee ? w.name : `${w.name}: ${w.ammo === 'shells' ? game.shells : game.ammo}`;
    if (weaponsEl) {
        weaponsEl.textContent = WEAPON_ORDER.filter((k) => owned[k])
            .map((k) => (k === weapon ? `[${WEAPONS[k].slot} ${WEAPONS[k].name}]` : `${WEAPONS[k].slot} ${WEAPONS[k].name}`))
            .join('  ') + (keyRing.size ? `   Keys: ${keyRing.size}` : '');
    }
    partsEl.textContent = `Parts: ${game.partsFound}/3`;
    scoreEl.textContent = `Score: ${game.score}`;

    if (game.towerState === 'landing') {
        objectiveEl.textContent = `Hold the landing zone! Chopper lands in ${Math.ceil(game.evacTimer)}s`;
    }   else if (game.towerState === 'broadcasting') {
        objectiveEl.textContent = `Objective: Follow the road south to the landing zone`;
    }   else if (game.partsFound < 3) {
        objectiveEl.textContent = `Objective: Find the radio parts (${game.partsFound}/3)`;
    }   else {
        objectiveEl.textContent = `Objective: Get to the radio tower!`;
    }
}