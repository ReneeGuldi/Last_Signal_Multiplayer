// coop.js: Sharing one world with everyone in a lobby.
// 
// The host's game is the "real" one: its husks think and attack, its nests spawn, its ambushes fire and its evac countdown decides when everyone wins. Everyone else's husks are puppets: they copy where the host's husks are, 10 times a second. When you change the world (shoot a husk, grab a pickup, open a drawer, blow up a barrel), your game tells the others with sendWorld(kind, data, to), and onWorldMessage() below is where every game handles what it hears. Playing solo, none of this runs: you are your own host.
//
//   kind          who sends it -> to   what it means
//   husks         host -> all          where every husk is: [id, type, x, y, z, facing, mode, dead]
//   hit           anyone -> host       "I hit husk id for this much damage"
//   push          anyone -> host       "I shoved husk id"
//   nestHit       anyone -> host       "I hit nest id"
//   alert         anyone -> host       "I fired a gun here, wake up the husks nearby"
//   barricadeHit  anyone -> host       "I hit the barricade"
//   hurt          host -> one player   "a husk hit you"
//   score         host -> one player   "you killed something, here are the points"
//   drop          host -> all          a husk or nest dropped loot
//   nestDown      host -> all          a nest was destroyed
//   barricade     host -> all          the barricade broke
//   take          anyone -> all        "I picked up pickup id"
//   drawer        anyone -> all        "I opened/closed drawer id"
//   boom          anyone -> all        "barrel id exploded"
//   tower         anyone -> all        the tower or evac moved to its next stage
//   win           host -> all          the chopper landed: everyone wins
//   restart       anyone -> all        start a fresh run
//   sync          host -> new player   everything that already happened this run

import * as THREE from 'three';
import { inLobby, isHost, playerList, playerName, sendWorld } from '../net.js';
import { scene, world } from '../core/engine.js';
import { game } from '../core/state.js';
import { applyHuskSnapshot, alertHusks, damageHusk, husks, huskSnapshot, makeHusksReal, pushHusk } from './husks.js';
import { damageNest, nests, removeNest } from './nests.js';
import { PICKUP_TYPES, pickups, spawnPickup, takenByOther } from './pickups.js';
import { playerBody, hurtPlayer } from './player.js';
import { props } from './props.js';
import { setTowerState, win } from './tower.js';
import { explode } from './weapons.js';
import { showMessage } from '../ui/hud.js';
import { drawers, setDrawer } from '../world/blockbench.js';
import { breakBarricade, damageBarricade } from '../world/evacRoute.js';

const HUSK_SEND_RATE = 10; // husk updates per second from the host
let huskTimer = 0;

// Things that already happened this run, so the host can catch up players who join late
const takenIds = new Set();   // pickups picked up (not counting ones that came back)
const boomIds = new Set();    // barrels that exploded

// Does this game run the world? True for the host, and when playing solo.
export function runsWorld() {
    return isHost();
}

// Everyone husks can chase: you (unless you're dead) and every living teammate.
// id is null for you, or the teammate's player id.
export function huskTargets() {
    const list = [];
    if (!game.dead) list.push({ id: null, x: playerBody.position.x, y: playerBody.position.y, z: playerBody.position.z });
    if (inLobby()) {
        for (const p of playerList()) if (!p.dead) list.push(p);
    }
    return list;
}

// The closest player to a point (being on another floor counts as farther away)
export function nearestTarget(x, y, z) {
    let best = null;
    let bestDist = Infinity;
    for (const p of huskTargets()) {
        const d = Math.hypot(p.x - x, p.z - z) + Math.abs(p.y - y) * 3;
        if (d < bestDist) {
            best = p;
            bestDist = d;
        }
    }
    return best;
}

// How far the closest player is from a spot on the ground (for nests)
export function nearestPlayerDist(x, z) {
    let best = Infinity;
    for (const p of huskTargets()) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
    return best;
}

//------------------------------------------------
// Things the rest of the game calls

// Host: send every husk's position to everyone else (called each frame, sends 10 times a second)
export function shareHusks(dt) {
    if (!inLobby() || !runsWorld()) return;
    huskTimer -= dt;
    if (huskTimer > 0) return;
    huskTimer = 1 / HUSK_SEND_RATE;
    sendWorld('husks', huskSnapshot());
}

// A husk hurt a teammate (host only)
export function hurtTeammate(id, amount, from, push) {
    sendWorld('hurt', { amount, x: from.x, z: from.z, push }, id);
}

// Points for a kill: yours, or sent to the teammate who made it (host only)
export function giveScore(by, amount) {
    if (by == null) game.score += amount;
    else sendWorld('score', { amount }, by);
}

// Host: a husk or nest dropped loot. Everyone gets the same pickup with the same id.
export function dropLoot(type, x, z, y = 0) {
    const id = 'd' + Math.random().toString(36).slice(2, 9);
    spawnPickup(type, x, z, { temporary: true, y, id });
    sendWorld('drop', { id, type, x, z, y });
}

// You picked something up: it disappears for everyone (weapons stay, so everyone can grab one)
export function shareTake(p) {
    if (PICKUP_TYPES[p.type].weapon) return;
    if (!PICKUP_TYPES[p.type].respawn || p.temporary) takenIds.add(p.id);
    sendWorld('take', { id: p.id });
}

export function shareBoom(p) {
    boomIds.add(p.id);
    sendWorld('boom', { id: p.id });
}

// Restart the run for everyone in the lobby
export function restartEveryone(resetGame) {
    sendWorld('restart', null);
    resetGame();
}

// Called by resetGame()
export function resetCoop() {
    takenIds.clear();
    boomIds.clear();
}

// We just became the host (the old host left): our puppet husks start thinking for themselves
export function becomeHost() {
    makeHusksReal();
}

// Host: a new player joined, send them everything that already happened
export function syncNewPlayer(id) {
    if (!runsWorld()) return;
    sendWorld('sync', {
        taken: [...takenIds],
        respawning: pickups.filter((p) => p.collected && p.respawnTimer > 0).map((p) => [p.id, Math.round(p.respawnTimer)]),
        drops: pickups.filter((p) => p.temporary && !p.collected)
            .map((p) => ({ id: p.id, type: p.type, x: p.mesh.position.x, z: p.mesh.position.z, y: p.baseY })),
        nestsDown: nests.filter((n) => n.dead).map((n) => n.id),
        drawers: drawers.map((d) => [d.open ? 1 : 0, d.looted ? 1 : 0]),
        booms: [...boomIds],
        barricadeDown: !game.barricade,
        partsFound: game.partsFound,
        towerState: game.towerState,
        evacTimer: game.evacTimer,
    }, id);
}

//------------------------------------------------
// Handling what other players send. from = their player id.

const num = (v, max = 1000) => (Number.isFinite(v) ? Math.max(-max, Math.min(max, v)) : 0);
const findHusk = (id) => husks.find((h) => h.id === id);
const findPickup = (id) => pickups.find((p) => p.id === id);

export function onWorldMessage(kind, data, from, resetGame) {
    const host = runsWorld();
    switch (kind) {
        // --- the host's husks, for everyone else
        case 'husks':
            if (!host && Array.isArray(data)) applyHuskSnapshot(data);
            break;

        // --- things only the host acts on
        case 'hit': {
            const h = host && findHusk(data.id);
            if (h) damageHusk(h, num(data.amount, 20), new THREE.Vector3(num(data.dx, 1), 0, num(data.dz, 1)), num(data.force, 3), from);
            break;
        }
        case 'push': {
            const h = host && findHusk(data.id);
            if (h) pushHusk(h, new THREE.Vector3(num(data.dx, 1), 0, num(data.dz, 1)), num(data.stun, 2), num(data.speed, 20));
            break;
        }
        case 'nestHit': {
            const n = host && nests[data.id];
            if (n) damageNest(n, num(data.amount, 20), from);
            break;
        }
        case 'alert':
            if (host) alertHusks(num(data.x), num(data.z), num(data.radius, 60));
            break;
        case 'barricadeHit':
            if (host) damageBarricade(num(data.amount, 20));
            break;

        // --- the host telling one player something
        case 'hurt':
            hurtPlayer(num(data.amount, 100), { x: num(data.x), z: num(data.z) }, num(data.push, 30));
            break;
        case 'score':
            game.score += num(data.amount, 1000);
            break;

        // --- the host telling everyone something
        case 'drop':
            if (!findPickup(data.id) && PICKUP_TYPES[data.type]) {
                spawnPickup(data.type, num(data.x), num(data.z), { temporary: true, y: num(data.y, 20), id: data.id });
            }
            break;
        case 'nestDown': {
            const n = nests[data.id];
            if (n && !n.dead) removeNest(n);
            break;
        }
        case 'barricade':
            breakBarricade(true);
            break;
        case 'win':
            if (!game.gameOver) win();
            break;

        // --- anyone telling everyone
        case 'take': {
            const p = findPickup(data.id);
            if (p) {
                if (!PICKUP_TYPES[p.type].respawn || p.temporary) takenIds.add(p.id);
                takenByOther(p, playerName(from));
            }
            break;
        }
        case 'drawer': {
            const d = drawers[data.id];
            if (d) setDrawer(d, !!data.open);
            break;
        }
        case 'boom': {
            const p = props.find((q) => q.id === data.id);
            boomIds.add(data.id);
            if (p) explode(p, true, from);
            break;
        }
        case 'tower':
            setTowerState(data.state, num(data.evacTimer), playerName(from));
            break;
        case 'restart':
            resetGame();
            showMessage(`${playerName(from)} restarted the run.`, 3);
            break;
        case 'sync':
            applySync(data);
            break;
    }
}

// Catch up on everything that happened before we joined
function applySync(s) {
    // drawers first, so loot inside them exists before we check what was taken
    (s.drawers || []).forEach(([open, looted], i) => {
        const d = drawers[i];
        if (!d) return;
        if (looted) setDrawer(d, true);
        d.open = !!open;
    });
    for (const drop of s.drops || []) {
        if (!findPickup(drop.id)) spawnPickup(drop.type, num(drop.x), num(drop.z), { temporary: true, y: num(drop.y, 20), id: drop.id });
    }
    for (const id of s.taken || []) {
        const p = findPickup(id);
        takenIds.add(id);
        if (p) takenByOther(p, null);
    }
    // supplies someone grabbed that haven't come back yet
    for (const [id, timeLeft] of s.respawning || []) {
        const p = findPickup(id);
        if (!p) continue;
        takenByOther(p, null);
        p.respawnTimer = num(timeLeft, 120);
    }
    for (const id of s.nestsDown || []) {
        if (nests[id] && !nests[id].dead) removeNest(nests[id], true);
    }
    for (const id of s.booms || []) {
        const p = props.find((q) => q.id === id);
        boomIds.add(id);
        if (p) {
            scene.remove(p.mesh);
            world.removeBody(p.body);
            props.splice(props.indexOf(p), 1);
        }
    }
    if (s.barricadeDown) breakBarricade(true, true);
    game.partsFound = num(s.partsFound, 3);
    setTowerState(s.towerState, num(s.evacTimer), null);
}
