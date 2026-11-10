# The Last Signal

A low-poly, first-person survival, first-person survival shooter built with [Three.js](https://threejs.org/) and the [cannon-es](https://pmndrs.github.io/cannon-es/docs/index.html) physics engine, with real-time multiplayer over [Socket.IO](https://socket.io/)

The Bloom has overrun Sector 9. Its spores turn people into *husks*. You're one of the last survivors, and the only way out is to repair the old radio tower, call in an evac chopper, and hold the landing zone until it touches down. 

**Play solo in your browser:** `https://reneeguldi.github.io/Last_Signal/` *(the GitHub Pages version is single-player; see [Multiplayer](#multiplayer) to play together)

## How to Play

1. **Find the three radio parts**: the battery, antenna coil, and the transmitter. Each one glows yellow and is guarded by husks.
2. **Bring them to the radio tower** to send the distress signal. The beacon starts flashing and a chopper appears overhead.
3. **Fight your way down the evac road** to the south. Watch for wrecks, barbed wire, fire, a barricade and ambushes.
4. **Hold the landing zone for 45 seconds** while the chopper descends and the husks get more aggressive.

Explore along the way. Supplies respawn, nests can be destroyed, and the wasteland hides the story of what happened here.

### Controls

| Action | Control |
| ---- | ---- |
| Move | `W` `A` `S` `D` |
| Sprint | `Shift` |
| Jump | `Space` |
| Look around | `Mouse` |
| Shove (works with no ammo) | `F` |
| Shoot | `Left-Click` | 
| Restart | `R` |
| Pause / Release mouse | `Esc` |

### Enemies
| Husk | What to expect |
| --- | --- |
| **Normal** | Human-sized and steady. Crouches and glows before lunging at you, which is your cue to sidestep. |
| **Runner** | Small, fast, and fragile. Usually comes in groups. |
| **Brute** | Huge and slow, and shrugs off shoves. Barrels are your friend. |
| **Bloom Nests** | Glowing pods that keep spawning husks until you destroy them. |

Gunshots and explosions are loud: husks nearby will come looking for you.

----

## Features
- **Physics everywhere** (cannon-es): crates tumble, explosive barrels chain-react, and the bus can be blown loose.
- **Husk AI** with guarding, wandering, alerting nearby husks, lunging and losing interest.
- **A large map** with a gas station, a collapsed house, a crashed bus, a military checkpoint, a diner, a farm, a chapel and graveyard, a crashed helicopter, and a walled evacuation route to the landing zone.
- **Environmental storytelling** through hidden journal pages and other secrets.
- **Custom Blockbench models** for the husks, survivor characters, pickups, and props.
- **Multiplayer**: see the other survivors in real-time, each with a hoodie tinted in their own color, a name tag, walking animation, and visible gunfire.

---

## Multiplayer
The multiplayer server is a small Node.js app in `server/`. It serves the game files and relays player updates with Socket.IO, so everyone connects to the same address.

### Option A: Node.js
Requires [Node.js](https://nodejs.org) 18 or newer.
```
bash
cd server
npm install
npm start
```

Open **http://localhost:3000**. To test multiplayer on one computer, open a second browser window to the same address. Players on the same network can join using your computer's local IP address, for example: `http://192.168.1.20:3000`.

### Option B: Docker

From the project root:
```
bash
docker build -t last-signal
docker run -p 3000:3000 last-signal
```

Then open **http://localhost:3000**.

### On the start screen

Enter a name and pick a character (Female or Male). Other players see your choice. Your hoodie color is assigned by the server, so every player gets a different one, for up to 8 players.

> **Windows note:** if PowerShell says *"running scripts is disabled on this system"*, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `npm.cmd install` and `npm.cmd start` instead.

---

## Project Structure

```
Last_Signal/
|-- index.html     Page, HUD, start screen and import map (Three.js, cannon-es, and Socket.IO from CDN)
|-- main.js    The game: world, physics, husks, pickups, shooting, evac sequence
|-- net.js      Multiplayer client: connects to the server and draws other players.
|-- models/      Blockbench models exported as .gltf
|-- server/
|   |-- sever.js      Static file server and Socket.IO relay
|   |-- package.json
|-- Dockerfile      Runs the game and server in one container
|-- .dockerignore
```


### How the networking works
- Each client sends its position and facing to the server **15 times a second** (`state`)
- The server sends everyone's latest state back out **20 times a second** in one batched message (`snapshot`). That's cheaper than forwarding every update individually.
- Clients smoothly interpolate other players between snapshots, so movement doesn't look jittery.
- Other events: `hello` (name and character), `join` / `leave`, `profile` (character change), `shot` (tracer from another player), and `full` (server at its 8-player limit).
- If no server is reachable, for example on GitHub Pages, or when opened as a file, the game simply runs single-player.

---

## Built with
- [Three.js](https://threejs.org/) r160: rendering
- [cannon-es](https://pmndrs.github.io/cannon-es/) 0.20: physics
- [Socket.IO](https://socket.io/) 4.8: real-time networking
- [Blockbench](https://www.blockbench.net/): 3D models
- Node.js and Docker: multiplayer server.



## Credits
- Game Design, programming, and models: Renee Guldi
- Course: CSCI 310, GUI and Game Development, Project 4

** Tips **
- Radio parts glow yellow so you're able to spot them through the fog.
- Medkits restore 35 health.
- Ammo boxes give you an extra 15 bullets.
- Shoot barrels to make them explode, explosions kill nearby husks, set off other barrels, and move the decayed school bus in the map. Don't stand too close, they can injure you too!
- There are a few hidden secrets around the map.

## Scoring
- Radio part found: + 100
- Husk killed: + 100
- Surviving evac: + 5 for every point of health you have left
