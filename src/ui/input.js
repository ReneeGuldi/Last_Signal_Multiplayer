// input.js: Keyboard and mouse: pointer lock (pause), held keys, restart button, key bindings.

import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera } from '../core/engine.js';
import { game } from '../core/state.js';
import { interact } from '../game/interact.js';
import { resetGame } from '../game/reset.js';
import { equip, shove } from '../game/weapons.js';
import { overlay } from './elements.js';
import { showMessage } from './hud.js';
import { updateProfile } from './menu.js';

//------------------------------------------------
// Controls & Input from player
// PointerLockControls hides the curser and turns mouse movement into looking around
export const controls = new PointerLockControls(camera, document.body);


overlay.addEventListener('click', () => { if (game.ready && !game.gameOver) controls.lock(); });
controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
    document.activeElement.blur(); // take focus off the name box so WASD/F/E reach the game
    hasStarted = true;
    updateProfile();
});
controls.addEventListener('unlock', () => {
    releaseAllKeys(); // otherwise a key held while pausing stays "held" when you come back
    overlay.style.display = 'flex';
    updateRestartButton();
});
// Switching tabs or windows also never sends the key-up, so let go of everything
window.addEventListener('blur', () => releaseAllKeys());

export const keys = {};
function releaseAllKeys() {
    for (const code in keys) keys[code] = false;
}

// Restarting: there's no restart key anymore (players kept pressing R to reload).
// Pause menu: "Restart run" button (click twice to confirm). After dying or winning:
// "Play again" button, or press Enter.
let hasStarted = false;
let restartArmed = false;
let restartTimer = null;
const restartBtn = document.getElementById('restart-btn');

export function updateRestartButton() {
    restartArmed = false;
    clearTimeout(restartTimer);
    restartBtn.style.display = hasStarted || game.gameOver ? 'inline-block' : 'none';
    restartBtn.textContent = game.gameOver ? 'Play again' : 'Restart run';
}

function restartFromMenu() {
    if (!game.ready) return;
    resetGame();
    controls.lock();
}

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // don't also count as "click to resume"
    if (game.gameOver) return restartFromMenu();
    if (!restartArmed) {
        // first click: ask to confirm, so nobody loses a run by accident
        restartArmed = true;
        restartBtn.textContent = 'Click again to restart';
        restartTimer = setTimeout(updateRestartButton, 3000);
        return;
    }
    restartFromMenu();
});

document.addEventListener('keydown', (e) => { 
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = true; 
    if (e.code === 'Enter' && game.gameOver) restartFromMenu();
    if (e.code === 'KeyR' && controls.isLocked && !game.gameOver) {
        showMessage('No need to reload: ammo comes straight from your pack.', 2.5);
    }
    if (e.code === 'KeyF' && controls.isLocked && !game.gameOver) shove();
    if (e.code === 'KeyE' && controls.isLocked && !game.gameOver) interact();
    if (controls.isLocked && !game.gameOver) {
        if (e.code === 'Digit1') equip('pistol');
        if (e.code === 'Digit2') equip('shotgun');
        if (e.code === 'Digit3') equip('machete');
    }
});
document.getElementById('profile').addEventListener('click', (e) => e.stopPropagation());
document.getElementById('lobby').addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('keyup', (e) => (keys[e.code] = false));
