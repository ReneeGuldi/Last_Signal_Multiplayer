// Last Signal multiplayer server
// ------------------------------------------------
// Does two jobs on ONE port:
//   1. Serves the game files (index.html, style.css, main.js, src/, models/...) like GitHub Pages did
//   2. Runs Socket.IO lobbies: each game has a join code, a host, and its own players
//
// Run it with:   cd server && npm install && npm start
// Then open:     http://localhost:3000

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000; // hosting sites (Render, Railway...) set PORT for you
const GAME_DIR = fileURLToPath(new URL('..', import.meta.url)); // repo root, one folder up

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

//------------------------------------------------
// 1. Static file server
const httpServer = createServer(async (req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // normalize() + the startsWith check stop "../../" tricks from reading files outside the game
    const filePath = normalize(join(GAME_DIR, urlPath));
    if (!filePath.startsWith(GAME_DIR) || filePath.includes(`${GAME_DIR}server`)) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404).end('Not found');
    }
});

//------------------------------------------------
// 2. Socket.IO lobbies
// Socket.IO sends named events: socket.emit('name', data) on one side
// arrives at socket.on('name', (data) => ...) on the other.
// cors lets the GitHub Pages copy of the game connect to this server too.
//
// Every game is a "lobby" with a short code (like "K7QM"). One player hosts it and
// shares the code; friends type it on the start menu to join. Each lobby has its own
// players, colors and doors, so several groups can play on one server at once.
// If the host leaves, the player who has been there longest becomes the new host.
const io = new Server(httpServer, { cors: { origin: '*' } });

const MAX_PLAYERS = 8;    // per lobby
const MAX_LOBBIES = 100;
const MODELS = ['female', 'male'];
const DOOR_KINDS = ['closed', 'locked', 'boarded', 'broken'];
const MAX_DOORS = 500;
// No 0/O or 1/I, so codes are easy to read out loud
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// code -> { code, players: Map(socket.id -> player), hostId, doorStates: Map }
const lobbies = new Map();
let nextId = 1;

function makeCode() {
    let code;
    do {
        code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
    } while (lobbies.has(code));
    return code;
}

// Everything other players need to know about someone
function publicInfo(p) {
    return { id: p.id, ...p.state, ...p.profile, color: p.color };
}

// Lowest color slot nobody in this lobby is using, so 4 players get 4 different colors
function freeColor(lobby) {
    const used = new Set([...lobby.players.values()].map((p) => p.color));
    let c = 0;
    while (used.has(c)) c++;
    return c;
}

// Names come from other people's browsers, so clean them up before sharing
function cleanName(name, id) {
    if (typeof name !== 'string') return `Survivor ${id}`;
    const cleaned = name.replace(/[^\w .'-]/g, '').trim().slice(0, 16);
    return cleaned || `Survivor ${id}`;
}

function cleanProfile(msg, id) {
    return {
        name: cleanName(msg && msg.name, id),
        model: msg && MODELS.includes(msg.model) ? msg.model : 'female',
    };
}

io.on('connection', (socket) => {
    // our own short number for each player (socket.id is a long random string)
    const player = { id: nextId++, socket, state: { x: 0, y: 2, z: 10, rotY: 0 }, profile: null, color: 0, lobby: null };
    socket.emit('welcome', { id: player.id });

    function joinLobby(lobby, profile) {
        player.profile = profile;
        player.color = freeColor(lobby);
        player.lobby = lobby;
        lobby.players.set(socket.id, player);
        socket.join(lobby.code);

        const others = [...lobby.players.values()].filter((p) => p !== player).map(publicInfo);
        socket.emit('joined', {
            code: lobby.code,
            id: player.id,
            color: player.color,
            hostId: lobby.hostId,
            players: others,
            doors: Object.fromEntries(lobby.doorStates),
        });
        socket.to(lobby.code).emit('join', publicInfo(player));
        console.log(`"${profile.name}" joined lobby ${lobby.code} (${lobby.players.size} players)`);
    }

    function leaveLobby() {
        const lobby = player.lobby;
        if (!lobby) return;
        lobby.players.delete(socket.id);
        socket.leave(lobby.code);
        player.lobby = null;
        io.to(lobby.code).emit('leave', { id: player.id });

        if (lobby.players.size === 0) {
            lobbies.delete(lobby.code); // everyone left: the lobby is gone
            console.log(`Lobby ${lobby.code} closed`);
            return;
        }
        if (lobby.hostId === player.id) {
            // hand hosting to whoever has been in the lobby longest (lowest id)
            const next = [...lobby.players.values()].sort((a, b) => a.id - b.id)[0];
            lobby.hostId = next.id;
            io.to(lobby.code).emit('host', { id: next.id });
            console.log(`Lobby ${lobby.code}: "${next.profile.name}" is the new host`);
        }
    }

    // Start a new lobby and become its host
    socket.on('host', (msg) => {
        leaveLobby();
        if (lobbies.size >= MAX_LOBBIES) {
            socket.emit('joinError', { reason: 'The server is busy. Try again in a bit.' });
            return;
        }
        const lobby = { code: makeCode(), players: new Map(), hostId: player.id, doorStates: new Map() };
        lobbies.set(lobby.code, lobby);
        joinLobby(lobby, cleanProfile(msg, player.id));
    });

    // Join a friend's lobby by its code
    socket.on('join', (msg) => {
        const code = typeof msg?.code === 'string' ? msg.code.trim().toUpperCase() : '';
        const lobby = lobbies.get(code);
        if (!lobby) {
            socket.emit('joinError', { reason: `No game with the code "${code}".` });
            return;
        }
        if (lobby === player.lobby) return;
        if (lobby.players.size >= MAX_PLAYERS) {
            socket.emit('joinError', { reason: 'That game is full (8 players).' });
            return;
        }
        leaveLobby();
        joinLobby(lobby, cleanProfile(msg, player.id));
    });

    // Back to playing solo
    socket.on('leaveLobby', () => {
        leaveLobby();
        socket.emit('left');
    });

    // Changed name or character while in a lobby
    socket.on('hello', (msg) => {
        if (!player.lobby) return;
        player.profile = cleanProfile(msg, player.id);
        socket.to(player.lobby.code).emit('profile', publicInfo(player));
    });

    socket.on('state', (msg) => {
        if (!msg || !player.lobby) return;
        // Only copy the fields we expect, as numbers, never trust the client blindly
        const s = player.state;
        for (const key of ['x', 'y', 'z', 'rotY']) {
            if (Number.isFinite(msg[key])) s[key] = msg[key];
        }
    });

    socket.on('shot', (msg) => {
        // Cosmetic only for now: lets other players see your tracer
        if (!msg || !player.lobby) return;
        socket.to(player.lobby.code).emit('shot', { id: player.id, from: msg.from, to: msg.to });
    });

    socket.on('door', (msg) => {
        // Only keep fields we expect, with sensible values
        if (!msg || !player.lobby || !msg.state) return;
        const id = msg.id;
        if (!Number.isInteger(id) || id < 0 || id >= MAX_DOORS) return;
        const s = msg.state;
        const state = {
            kind: DOOR_KINDS.includes(s.kind) ? s.kind : 'closed',
            open: !!s.open,
            target: Number.isFinite(s.target) ? Math.max(-Math.PI, Math.min(Math.PI, s.target)) : 0,
            planks: Number.isInteger(s.planks) ? Math.max(0, Math.min(10, s.planks)) : 0,
        };
        player.lobby.doorStates.set(id, state);
        socket.to(player.lobby.code).emit('door', { id, state });
    });

    socket.on('disconnect', () => leaveLobby());
});

//------------------------------------------------
// Send everyone's position to their own lobby 20 times a second (a "tick")
// Batching like this is much cheaper than forwarding every single message
const TICK_RATE = 20;
setInterval(() => {
    for (const lobby of lobbies.values()) {
        if (lobby.players.size < 2) continue;
        io.to(lobby.code).emit('snapshot', [...lobby.players.values()].map(publicInfo));
    }
}, 1000 / TICK_RATE);

httpServer.listen(PORT, () => {
    console.log(`Last Signal running at http://localhost:${PORT}`);
});