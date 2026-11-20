// menu.js: Start menu: name and character picker, and the lobby (host / join) panel.

import { getLobby, hostGame, joinGame, leaveGame, sendProfile } from '../net.js';
import { resetGame } from '../game/reset.js';
import { showMessage } from './hud.js';
import { applyDoorState, doors, shareDoor } from '../world/doors.js';

// Name & character picker on the start screen
const nameInput = document.getElementById('name-input');
export const youEl = document.getElementById('you');
const playersEl = document.getElementById('players');
const pickButtons = document.querySelectorAll('#profile .pick button');
let pickedModel = 'female';
pickButtons[0].classList.add('selected');
playersEl.textContent = 'Playing solo';

export function myProfile() {
    return { name: nameInput.value.trim() || 'Survivor', model: pickedModel };
}
export function updateProfile() {
    sendProfile(myProfile());
    youEl.textContent = `You: ${myProfile().name}`;
}
for (const btn of pickButtons) {
    btn.addEventListener('click', () => {
        pickedModel = btn.dataset.model;
        pickButtons.forEach((b) => b.classList.toggle('selected', b === btn));
        updateProfile();
    });
}
nameInput.addEventListener('change', updateProfile);

//------------------------------------------------
// Lobbies: host a game and share its code, or type a friend's code to join.
// Nothing here until you click a button: by default you play solo.
const lobbyMenuEl = document.getElementById('lobby-menu');
const lobbyInEl = document.getElementById('lobby-in');
const lobbyCodeEl = document.getElementById('lobby-code');
const lobbyRoleEl = document.getElementById('lobby-role');
const lobbyStatusEl = document.getElementById('lobby-status');
const codeInput = document.getElementById('code-input');
let lastLobbyCode = null;

export function setLobbyStatus(text) {
    lobbyStatusEl.textContent = text;
}

export function updateLobbyUI() {
    const info = getLobby();
    lobbyMenuEl.hidden = !!info;
    lobbyInEl.hidden = !info;
    if (info) {
        lobbyCodeEl.textContent = info.code;
        lobbyRoleEl.textContent = info.isHost ? '(you host)' : '';
        playersEl.textContent = `Lobby ${info.code} · ${info.players} survivor${info.players === 1 ? '' : 's'}${info.isHost ? ' · host' : ''}`;
    } else {
        playersEl.textContent = 'Playing solo';
    }
}

document.getElementById('host-btn').addEventListener('click', async () => {
    sendProfile(myProfile());
    setLobbyStatus('Creating a game...');
    try {
        await hostGame();
        setLobbyStatus('Share the code with friends, then click anywhere to play.');
    } catch (err) {
        setLobbyStatus(err.message);
    }
});

async function joinFromInput() {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length !== 4) {
        setLobbyStatus('Codes are 4 letters and numbers.');
        return;
    }
    sendProfile(myProfile());
    setLobbyStatus(`Joining ${code}...`);
    try {
        await joinGame(code);
        setLobbyStatus('Joined! Click anywhere to play.');
    } catch (err) {
        setLobbyStatus(err.message);
    }
}
document.getElementById('join-btn').addEventListener('click', joinFromInput);
codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinFromInput();
});
document.getElementById('leave-btn').addEventListener('click', () => {
    leaveGame();
    setLobbyStatus('Left the lobby. Playing solo.');
});

// net.js tells us whenever the lobby changes
export function onLobbyChange(info, ev) {
    if (ev.joined) {
        const rejoined = info.code === lastLobbyCode;
        if (info.isHost && !rejoined) {
            // we just started this lobby: keep our run, and share any doors we already changed
            for (const door of doors) {
                if (door.kind !== door.startKind || door.open) shareDoor(door);
            }
        } else if (!rejoined) {
            // joined someone else's game: start fresh, then match their doors
            resetGame();
            for (const [id, state] of Object.entries(ev.doors)) applyDoorState(Number(id), state);
            showMessage(`Joined lobby ${info.code}.`, 3);
        }
        lastLobbyCode = info.code;
    }
    if (ev.hostChanged && info.isHost) showMessage('The host left. You are hosting the game now.', 4);
    if (ev.reconnecting) showMessage('Connection lost. Reconnecting...', 4);
    if (!info) {
        lastLobbyCode = null;
        if (ev.error) showMessage(`Lost the game: ${ev.error} Playing solo.`, 5);
    }
    updateLobbyUI();
}
