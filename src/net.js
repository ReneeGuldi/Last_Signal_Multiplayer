// Last Signal networking (client side)
// ------------------------------------------------
// Connects to the multiplayer server, hosts or joins a lobby by its code, sends our
// position, and draws other players using the survivor models: hoodie tinted in each
// player's color, name tag overhead, arms and legs swinging while they walk.
// Until you host or join a lobby (or if no server can be reached) you play solo.

import * as THREE from 'three';
import { io } from 'socket.io-client';

const HOSTED_SERVER_URL = '';

function pickServerUrl() {
    if (location.hostname.endsWith('github.io')) return HOSTED_SERVER_URL || null;
    if (location.protocol === 'file:') return null;
    return location.origin; // the server that gave us this page
}

const SEND_RATE = 15; // how many times per second to send position updates to the server
let socket = null;
let myId = null;
let sendTimer = 0;
let scene = null;
let playerModels = {}; // { female, male } loaded in main.js
let myProfile = { name: 'Survivor', model: 'female' };
let onStatus = () => {};
let onMyColor = () => {};
let onRemoteShot = () => {};
let onRemoteDoor = () => {};
let onLobby = () => {};
let onWorld = () => {};
let onPlayerJoin = () => {};

// The lobby we're in: { code, hostId } or null when playing solo
let lobby = null;
// A host/join request waiting for the server's answer
let pending = null;

// Player colors, handed out by the server in this order (index = color slot)
export const PLAYER_COLORS = [0x3f8cff, 0xff7a2f, 0x4fd34f, 0xb05cff, 0xffd23f, 0x2fd6c8, 0xff5c9a, 0xe8e8e8];

const PLAYER_SCALE = 2.4;
const FEET_OFFSET = -0.5;
const remotes = new Map();

//------------------------------------------------
// Hoodie tinting
const tintCache = new Map();

function isGray(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    return saturation < 0.12 && max > 40 && max < 235;
}

// Is this texture mostly hoodie? (at least half of its visible pixels are gray)
function isHoodieTexture(image) {
    const data = readPixels(image);
    let gray = 0;
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        visible++;
        if (isGray(data[i], data[i + 1], data[i + 2])) gray++;
    }
    return visible > 0 && gray / visible > 0.5;
}

function readPixels(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function tintedTexture(texture, colorHex) {
    const key = `${texture.uuid}:${colorHex}`;
    if (tintCache.has(key)) return tintCache.get(key);

    const image = texture.image;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = pixels.data;

    const color = new THREE.Color(colorHex);
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0 || !isGray(d[i], d[i + 1], d[i + 2])) continue;
        const shade = d[i] / 255;
        const boost = 1.7; 
        d[i] = Math.min(255, color.r * shade * boost * 255);
        d[i + 1] = Math.min(255, color.g * shade * boost * 255);
        d[i + 2] = Math.min(255, color.b * shade * boost * 255);
    }
    ctx.putImageData(pixels, 0, 0);

    const tinted = new THREE.CanvasTexture(canvas);
    // copy the original's settings so the pixels stay crisp and the UVs line up
    tinted.flipY = texture.flipY;
    tinted.magFilter = texture.magFilter;
    tinted.minFilter = texture.minFilter;
    tinted.wrapS = texture.wrapS;
    tinted.wrapT = texture.wrapT;
    tinted.colorSpace = texture.colorSpace;
    tintCache.set(key, tinted);
    return tinted;
}

// Remember which materials are hoodie the first time we see them (checked once per model)
const hoodieMaterials = new WeakMap();

function applyTint(model, colorHex) {
    model.traverse((child) => {
        if (!child.isMesh || !child.material.map) return;
        const original = child.userData.originalMap || child.material.map;
        child.userData.originalMap = original;

        if (!hoodieMaterials.has(original)) {
            hoodieMaterials.set(original, original.image ? isHoodieTexture(original.image) : false);
        }
        if (hoodieMaterials.get(original)) {
            child.material.map = tintedTexture(original, colorHex);
            child.material.needsUpdate = true;
        }
    });
}

//------------------------------------------------
// Name tags: the player's name in their color, floating above their head.
// Drawn on top of everything so you can find teammates through walls and fog.
function makeNameTag(name, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // dark rounded backing so it reads against the bright sky
    const width = Math.min(250, ctx.measureText(name).width + 28);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(128 - width / 2, 10, width, 44, 10);
    ctx.fill();

    ctx.fillStyle = `#${new THREE.Color(colorHex).getHexString()}`;
    ctx.fillText(name, 128, 33);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        depthTest: false, // visible through walls
        fog: false,       // stays readable in the fog
    }));
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.y = 1.75;
    sprite.renderOrder = 999;
    return sprite;
}

//------------------------------------------------
// Building a remote player

function buildModel(r) {
    const { model: which, color } = r.profile;
    const colorHex = PLAYER_COLORS[color % PLAYER_COLORS.length];

    if (r.model) r.root.remove(r.model);
    if (r.tag) r.root.remove(r.tag);

    const source = playerModels[which] || playerModels.female || playerModels.male;
    let model;
    if (source) {
        model = source.clone();
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.castShadow = true;
            }
        });
        model.scale.setScalar(PLAYER_SCALE);
        model.position.y = FEET_OFFSET;
        applyTint(model, colorHex);
    } else {
        // models failed to load: fall back to a simple colored capsule
        model = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
            new THREE.MeshStandardMaterial({ color: colorHex })
        );
        model.position.y = 0.4;
    }

    r.model = model;
    r.limbs = {
        armL: model.getObjectByName('arm_left'),
        armR: model.getObjectByName('arm_right'),
        legL: model.getObjectByName('leg_left'),
        legR: model.getObjectByName('leg_right'),
    };
    r.tag = makeNameTag(r.profile.name, colorHex);
    r.root.add(model, r.tag);
}

function addRemote(p) {
    if (p.id === myId || remotes.has(p.id)) return;
    const root = new THREE.Group();
    root.position.set(p.x, p.y, p.z);
    root.rotation.y = p.rotY;
    scene.add(root);

    const r = {
        root,
        target: new THREE.Vector3(p.x, p.y, p.z),
        targetRotY: p.rotY,
        lastPos: new THREE.Vector3(p.x, p.y, p.z),
        walkPhase: 0,
        swing: 0,
        profile: { name: p.name, model: p.model, color: p.color },
        dead: !!p.dead,
    };
    buildModel(r);
    remotes.set(p.id, r);
    onStatus(remotes.size);
}

function removeRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    scene.remove(r.root);
    remotes.delete(id);
    onStatus(remotes.size);
}

//------------------------------------------------
// Messages from the server

function listen() {
    socket.on('welcome', (msg) => {
        myId = msg.id;
    });

    // We're in a lobby (we hosted it, joined it, or rejoined after losing connection)
    socket.on('joined', (msg) => {
        myId = msg.id;
        clearRemotes();
        lobby = { code: msg.code, hostId: msg.hostId, dev: !!msg.dev };
        onMyColor(PLAYER_COLORS[msg.color % PLAYER_COLORS.length]);
        // main.js starts a fresh run, then copies the doors other players already changed
        onLobby(lobbyInfo(), { joined: true, doors: msg.doors || {} });
        msg.players.forEach(addRemote);
        onStatus(remotes.size);
        if (pending) pending.resolve(lobbyInfo());
        pending = null;
    });

    socket.on('joinError', (msg) => {
        if (pending) {
            pending.reject(new Error(msg.reason));
        } else {
            // couldn't get back into our lobby after reconnecting (it closed): back to solo
            lobby = null;
            clearRemotes();
            onLobby(null, { error: msg.reason });
        }
        pending = null;
    });

    socket.on('left', () => {
        lobby = null;
        clearRemotes();
        onLobby(null, {});
    });

    // the host left, someone else (maybe us) runs the game now
    socket.on('host', (msg) => {
        if (!lobby) return;
        lobby.hostId = msg.id;
        onLobby(lobbyInfo(), { hostChanged: true });
    });

    socket.on('join', (p) => {
        addRemote(p);
        onPlayerJoin(p.id);
    });

    // someone changed their name or character
    socket.on('profile', (msg) => {
        const r = remotes.get(msg.id);
        if (!r) return;
        r.profile = { name: msg.name, model: msg.model, color: msg.color };
        buildModel(r);
    });

    socket.on('leave', (msg) => removeRemote(msg.id));

    // everyone's latest position, 20 times a second
    socket.on('snapshot', (list) => {
        for (const p of list) {
            if (p.id === myId) continue;
            if (!remotes.has(p.id)) addRemote(p);
            const r = remotes.get(p.id);
            r.target.set(p.x, p.y, p.z);
            r.targetRotY = p.rotY;
            r.dead = !!p.dead;
        }
    });

    socket.on('shot', (msg) => onRemoteShot(msg.from, msg.to));
    socket.on('door', (msg) => onRemoteDoor(msg.id, msg.state));
    socket.on('world', (msg) => onWorld(msg.kind, msg.data, msg.from));

}

function clearRemotes() {
    for (const id of [...remotes.keys()]) removeRemote(id);
}

function lobbyInfo() {
    if (!lobby) return null;
    return { code: lobby.code, isHost: lobby.hostId === myId, players: remotes.size + 1, dev: lobby.dev };
}

// Are we in the development lobby? (no husks spawn there)
export function isDevLobby() {
    return !!lobby && lobby.dev;
}

//------------------------------------------------
// Public functions main.js calls
export function initNetwork(gameScene, options = {}) {
    scene = gameScene;
    playerModels = options.models || {};
    if (options.profile) myProfile = options.profile;
    if (options.statusCallback) onStatus = options.statusCallback;
    if (options.myColorCallback) onMyColor = options.myColorCallback;
    if (options.remoteShotCallback) onRemoteShot = options.remoteShotCallback;
    if (options.remoteDoorCallback) onRemoteDoor = options.remoteDoorCallback;
    if (options.lobbyCallback) onLobby = options.lobbyCallback;
    if (options.worldCallback) onWorld = options.worldCallback;
    if (options.playerJoinCallback) onPlayerJoin = options.playerJoinCallback;

    const url = pickServerUrl();
    if (!url) {
        console.log('No multiplayer server configured, playing solo.');
        return;
    }

    socket = io(url);
    listen();

    socket.on('connect', () => {
        console.log('Connected to', url);
        // lost connection while in a lobby: try to get back into it
        if (lobby) socket.emit('join', { code: lobby.code, ...myProfile });
    });
    socket.on('disconnect', () => {
        console.log('Disconnected, trying to reconnect...');
        clearRemotes();
        if (lobby) onLobby(lobbyInfo(), { reconnecting: true });
    });
}

// Can this copy of the game play online at all? (false on GitHub Pages with no server)
export function multiplayerAvailable() {
    return !!socket;
}

function request(event, data) {
    if (!isOpen()) return Promise.reject(new Error("Can't reach the server right now."));
    if (pending) pending.reject(new Error('Cancelled'));
    return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        socket.emit(event, data);
    });
}

// Start a new lobby and get its code to share. Resolves with { code, isHost, players }.
export function hostGame() {
    return request('host', myProfile);
}

// Join a friend's lobby by its code. Rejects with a message if the code is wrong or full.
export function joinGame(code) {
    return request('join', { code, ...myProfile });
}

// Leave the lobby and go back to playing solo
export function leaveGame() {
    if (isOpen() && lobby) socket.emit('leaveLobby');
}

export function getLobby() {
    return lobbyInfo();
}

// Is this player the one running the game? (always true when playing solo)
export function isHost() {
    return !lobby || lobby.hostId === myId;
}

function isOpen() {
    return socket && socket.connected;
}

// Tell the server (and everyone else) our name and which character we picked
export function sendProfile(profile) {
    myProfile = profile;
    if (!isOpen() || !lobby) return;
    socket.emit('hello', { name: profile.name, model: profile.model });
}

// Call every frame with the player's physics position and the camera's facing
export function sendState(dt, position, rotY, dead = false) {
    if (!isOpen() || !lobby) return;
    sendTimer -= dt;
    if (sendTimer > 0) return;
    sendTimer = 1 / SEND_RATE;
    socket.emit('state', {
        x: +position.x.toFixed(2),
        y: +position.y.toFixed(2),
        z: +position.z.toFixed(2),
        rotY: +rotY.toFixed(3),
        dead,
    });
}

export function sendShot(from, to) {
    if (!isOpen() || !lobby) return;
    socket.emit('shot', {
        from: { x: from.x, y: from.y, z: from.z },
        to: { x: to.x, y: to.y, z: to.z },
    });
}

// A door was opened, closed, unlocked or had boards knocked off
export function sendDoor(id, state) {
    if (!isOpen() || !lobby) return;
    socket.emit('door', { id, state });
}

// Shared world messages (see src/game/coop.js). to: 'all', 'host', or a player's id
export function sendWorld(kind, data, to = 'all') {
    if (!isOpen() || !lobby) return;
    socket.emit('world', { kind, data, to });
}

// Are we in a lobby? (false when playing solo)
export function inLobby() {
    return !!lobby && isOpen();
}

// Where everyone else is: [{ id, x, y, z, dead }] (y is the middle of their body, like ours)
export function playerList() {
    return [...remotes.entries()].map(([id, r]) => ({ id, x: r.target.x, y: r.target.y, z: r.target.z, dead: r.dead }));
}

export function playerName(id) {
    const r = remotes.get(id);
    return r ? r.profile.name : 'Someone';
}

// Is anyone else playing with us right now?
export function othersOnline() {
    return remotes.size > 0;
}

// Smoothly slide other players toward their latest known position and animate walking
export function updateRemotePlayers(dt) {
    if (dt <= 0) return;
    const t = Math.min(1, dt * 12);
    for (const r of remotes.values()) {
        r.root.visible = !r.dead; // downed players disappear until they respawn
        r.root.position.lerp(r.target, t);

        // turn the shortest way around
        let diff = r.targetRotY - r.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        r.root.rotation.y += diff * t;

        // Walk cycle: how fast are they moving along the ground
        const dx = r.root.position.x - r.lastPos.x;
        const dz = r.root.position.z - r.lastPos.z;
        const speed = Math.hypot(dx, dz) / dt;
        r.lastPos.copy(r.root.position);

        // swing size follows speed (bigger when sprinting), and eases back to standing
        const targetSwing = Math.min(speed / 8, 1) * 0.7;
        r.swing += (targetSwing - r.swing) * Math.min(1, dt * 8);
        r.walkPhase += speed * dt * 1.6;

        const angle = Math.sin(r.walkPhase) * r.swing;
        const { armL, armR, legL, legR } = r.limbs;
        if (legL) legL.rotation.x = angle;
        if (legR) legR.rotation.x = -angle;
        if (armL) armL.rotation.x = -angle * 0.8; // arms swing opposite their leg
        if (armR) armR.rotation.x = angle * 0.8;

        // little bounce in each player's step
        if (r.model) r.model.position.y = FEET_OFFSET + Math.abs(Math.sin(r.walkPhase)) * r.swing * 0.08;
    }
}