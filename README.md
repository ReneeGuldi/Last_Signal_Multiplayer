# The Last Signal

A low-poly, first-person survival shooter built with [Three.js](https://threejs.org/) and the [cannon-es](https://pmndrs.github.io/cannon-es/docs/index.html) physics engine, with real-time co-op multiplayer over [Socket.IO](https://socket.io/).

The Bloom has overrun Sector 9. Its spores turn people into *husks*. You're one of the last survivors, and the only way out is to repair the old radio tower, call in an evac chopper, and hold the landing zone until it touches down. Play alone, or host a lobby and survive it together.

**Play with friends in your browser:** https://last-signal-multiplayer.onrender.com/ *(host a lobby and share the code, no download needed)*

**Play solo in your browser:** https://reneeguldi.github.io/Last_Signal_Multiplayer/ *(the GitHub Pages version is single-player only)*

---

## How to Play

1. **Follow the dirt path into town and find the three radio parts**: the battery, the antenna coil and the transmitter. Each one glows yellow and is guarded by husks.
2. **Bring them to the radio tower** to send the distress signal. The beacon starts flashing and a chopper appears overhead.
3. **Fight your way down the evac road** to the south. Watch for wrecks, barbed wire, fire, a barricade and ambushes.
4. **Hold the landing zone for 45 seconds** while the chopper descends and the husks get more aggressive.

Explore along the way. Locked buildings hide better weapons and supplies, keys are tucked away in other buildings, desk drawers can hold loot, supplies respawn, nests can be destroyed, and notes scattered around town tell the story of what happened here.

## Scoring

| Action | Points |
| --- | --- |
| Radio part found | +100 |
| Runner killed | +75 |
| Husk killed | +100 |
| Brute killed | +300 |
| Bloom nest destroyed | +250 |
| Secret found (first time) | +50 |
| Surviving the evac | +5 for every point of health you have left |

In a lobby, kills count for whoever made them.

## Tips
- **Radio parts glow yellow** so you can spot them through the fog.
- **Medkits restore 35 health.** You won't pick one up at full health, so it stays there for later.
- **Press `E` to pick things up, read notes, open doors and open drawers.** A prompt appears when you're close enough.
- **Some doors are locked.** The police station, motel rooms and fire station each need a key, and each key is hidden somewhere else in town. Check desk drawers.
- **Ammo boxes give you 15 pistol bullets. Red ammo boxes give you 6 shotgun shells.** Husks sometimes drop either one.
- **There's no reloading:** ammo comes straight from your pack.
- **Supplies respawn.** Ammo comes back after 40 seconds and medkits after 60. Loot dropped by husks and nests blinks and disappears after 25 seconds, so grab it fast.
- **Out of ammo? Switch to the machete, or press `F` to shove.** A shove knocks husks back and stuns them. Brutes barely move, but it interrupts their charge.
- **Watch for the wind-up.** A husk that crouches and glows orange is about to lunge at you, so sidestep.
- **Gunfire is loud.** Shooting draws in every husk nearby (the shotgun even more), so pick your fights. The machete is silent.
- **Husks follow you inside.** They climb stairs, bash through closed doors, and come through doorways. Brutes are too big for the stairs, so an upper floor is a safe spot to fight one from.
- **Shoot barrels to make them explode.** Explosions kill normal husks and runners, stagger brutes, damage nests, set off other barrels, blow doors open, and can knock the wrecked school bus loose. The barrels near the barricade on the evac road are your way through. Don't stand too close: they hurt you too.
- **Destroy the Bloom nests**, or they keep spawning husks.

### Controls

| Action | Control |
| ---- | ---- |
| Move | `W` `A` `S` `D` |
| Sprint | `Shift` |
| Jump | `Space` |
| Look around | `Mouse` |
| Attack (shoot or swing) | `Left-Click` |
| Interact / pick up / read / open | `E` |
| Switch weapon | `1` `2` `3` or `Mouse Wheel` |
| Shove (works with no ammo) | `F` |
| Pause / release the mouse | `Esc` |
| Restart | **Restart run** button on the pause screen (click twice to confirm) |
| Play again / respawn | `Enter`, or the button on the screen |

### Weapons

| Weapon | Where to find it | What to expect |
| --- | --- | --- |
| **Pistol** (`1`) | You start with it | Accurate, long range, uses pistol ammo. |
| **Shotgun** (`2`) | Police station armory, upstairs | Fires a spread of 7 pellets. Slow between shots and loud, but devastating up close. Uses shells. |
| **Machete** (`3`) | Hardware store workbench | Melee: hits everything in an arc in front of you, never runs out, and doesn't alert other husks. |

### Enemies

| Husk | What to expect |
| --- | --- |
| **Normal** | Human-sized and steady. Crouches and glows before lunging at you, which is your cue to sidestep. |
| **Runner** | Small, fast and fragile. Usually comes in groups. |
| **Brute** | Huge and slow, and shrugs off shoves. Barrels are your friend. |
| **Bloom nests** | Glowing pods inside buildings that keep spawning husks until you destroy them. |

---

## Features
- **Co-op multiplayer with lobbies**: host a game, share a 4-letter code, and play in one shared world with up to 8 survivors.
- **Physics everywhere** (cannon-es): crates tumble, explosive barrels chain-react, doors get blown open, and the bus can be knocked loose.
- **Husk AI** with guarding, wandering, alerting nearby husks, lunging, bashing doors, climbing stairs and losing interest.
- **A town to explore**:
  - **Downtown**: a police station and an apartment block with two floors, a pharmacy, a hardware store, houses and a gas station.
  - **East side**: a motel, a grocery store, a fire station, a warehouse, and a row of suburb houses.
  - **North End**: a two-floor school, a clinic, a laundromat and an auto garage.
  - **Outskirts**: the farm where you start, a diner, a military checkpoint, a crashed bus, a chapel and graveyard, a shed, a crashed helicopter, and a walled evac route to the landing zone.
  - **Streets** with sidewalks, street lamps, traffic lights, parked cars, benches, hydrants and mailboxes.
- **Doors that open and close**, including double doors, locked doors with keys, and boarded-up doorways.
- **Drawers that slide open**, some with loot inside.
- **Three weapons**: pistol, shotgun and machete, with the shotgun and machete found by exploring.
- **Environmental storytelling** through notes you can read, skeletons and other secrets.
- **Custom Blockbench models** for the husks, survivor characters, weapons, nests, pickups, furniture, props and buildings.

---

## Multiplayer

### Play online (easiest)
Open **https://last-signal-multiplayer.onrender.com/**. One player hosts a lobby and shares the code; everyone else joins with it. Nothing to install.

If nobody has played in a while, the first visit can take up to a minute to load while the server wakes up.

### Run your own server
The multiplayer server is a small Node.js app in `server/`. It serves the game files and runs the lobbies with Socket.IO, so everyone connects to the same address. Use one of these options to run it on your own computer.

### Option A: Node.js
Requires [Node.js](https://nodejs.org) 18 or newer.
```bash
cd server
npm install
npm start
```

Open **http://localhost:3000**. To test multiplayer on one computer, open a second browser window at the same address. Players on the same network can join using your computer's local IP address, for example `http://192.168.1.20:3000`.

> **Windows note:** if PowerShell says *"running scripts is disabled on this system"*, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `npm.cmd install` and `npm.cmd start` instead.

### Option B: Docker
From the project root:
```bash
docker build -t last-signal .
docker run -p 3000:3000 last-signal
```

Then open **http://localhost:3000**.

### On the start screen
Enter a name and pick a character (Female or Male). Other players see your choice. Your hoodie color is assigned by the server, so every player in a lobby gets a different one.

To play together, one player clicks **Host game** and shares the 4-letter code that appears. Everyone else types the code and clicks **Join**. Without a lobby, you play solo.

### Playing together
Everyone in a lobby plays in the same world:
- **The host runs the world.** Husks, nests, ambushes and evac waves are controlled by the host's game, and everyone else sees the same husks in the same places.
- **Your shots still count.** Damage you do to husks, nests and the barricade is applied by the host, and kills give the points to whoever made them.
- **Pickups are shared.** Ammo and medkits disappear for everyone when someone grabs them, and come back for everyone. Radio parts count for the whole team. Weapons are the exception: everyone can pick up their own.
- **Doors, drawers, exploding barrels, the tower and the evac** all happen for everyone. When the chopper lands, the whole team wins.
- **Dying doesn't end the run:** press `Enter` or click **Respawn** to get back up at the farm.
- **Restarting mid-run is the host's call,** and it restarts everyone. After a win, anyone can start the next run.
- **Joining late catches you up** on everything that's already been taken, destroyed and found.
- **If the host leaves,** the player who's been there longest takes over.
- **The world doesn't pause in a lobby:** pressing `Esc` just stops your character.

---

## Project Structure

```
Last_Signal_Multiplayer/
|-- index.html     The page: HUD, start screen, lobby panel and import map (Three.js, cannon-es and Socket.IO from CDN)
|-- style.css      Styling for the HUD, start screen, lobby panel and note popup
|-- main.js        Starts the game: loads every file, then runs the game loop
|-- src/
|   |-- net.js         Multiplayer client: lobbies, sending your position, drawing other players, world messages
|   |-- core/          The basics everything else uses
|   |   |-- engine.js      Renderer, scene, camera, lights, physics world, ground
|   |   |-- models.js      Which Blockbench models load (MODEL_FILES, BUILDING_MODELS)
|   |   |-- state.js       Values several files change: game.health, game.ammo, game.score...
|   |-- world/         Building the town
|   |   |-- layout.js      LAYOUT: where every building sits. Move buildings here.
|   |   |-- world.js       buildStaticWorld(): builds the whole town in order
|   |   |-- builders.js    Box/collider helpers and makeBuilder() for code-built buildings
|   |   |-- blockbench.js  building(), placeProp(), placeModelBuilding(), drawers
|   |   |-- doors.js       Doors, keys, boarded doorways
|   |   |-- furniture.js   Code-built furniture (tables, beds, shelves, couches...)
|   |   |-- buildingTypes.js  Two-floor and one-floor building templates
|   |   |-- cityBuildings.js  Downtown: police station, apartment, pharmacy, hardware store, houses
|   |   |-- eastSide.js    Motel, grocery, fire station, warehouse, suburbs
|   |   |-- northEnd.js    School, clinic, laundromat, auto garage
|   |   |-- outskirts.js   Checkpoint, diner, farm, crashed chopper, chapel
|   |   |-- landmarks.js   Gas station, radio tower, collapsed house, school bus
|   |   |-- evacRoute.js   The road to the landing zone, the barricade and the ambushes
|   |   |-- streets.js     Roads, sidewalks, lamps, traffic lights, parked cars, street props
|   |   |-- nature.js      Dead trees, rocks, skeletons, lore notes
|   |-- game/          Gameplay
|   |   |-- player.js      Movement, jumping, knockback, taking damage, respawning
|   |   |-- husks.js       Husk types, HUSK_TUNING, AI
|   |   |-- nests.js       Bloom nests
|   |   |-- weapons.js     Shove, pistol, shotgun, machete, explosions
|   |   |-- effects.js     Gun on screen, muzzle flash, tracers, hit markers
|   |   |-- pickups.js     Ammo, medkits, weapons, keys, radio parts
|   |   |-- spawns.js      Where every husk, pickup and nest starts each run
|   |   |-- interact.js    The E key, notes and secrets
|   |   |-- props.js       Crates, explosive barrels, the school bus
|   |   |-- tower.js       Radio tower, evac countdown, winning
|   |   |-- reset.js       resetGame(): starting a fresh run
|   |   |-- coop.js        Shared world: what players tell each other, and the host running the world
|   |-- ui/            Screen and controls
|       |-- elements.js    The HTML elements the HUD writes to
|       |-- hud.js         Health, ammo, score, objective, messages
|       |-- input.js       Keyboard, mouse, pause, restart and respawn buttons
|       |-- menu.js        Name/character picker and lobby buttons
|-- models/        Blockbench models exported as .gltf
|-- server/
|   |-- server.js     Static file server and Socket.IO lobbies
|   |-- package.json
|-- Dockerfile      Runs the game and server in one container
|-- .dockerignore
```

### How the code fits together
- Each file starts with an `import` list showing what it uses from the other files. If you add a function another file needs, put `export` in front of it and add it to that file's imports.
- A value that more than one file **changes** (health, ammo, score...) lives on the `game` object in `src/core/state.js`, so it's written `game.health` everywhere. Values only one file changes stay in that file.
- The game uses ES modules, so it has to be opened through a server (the Node server above, or GitHub Pages). Opening `index.html` straight from your folder won't load it.

---

## Blockbench Models

Every building and piece of furniture is built in code until its Blockbench model exists. Once the model is added, the game uses it instead.

### Adding a building
1. Export the model as `.gltf` into `models/` (for example `models/motel.gltf`).
2. In `src/core/models.js`, fill in its line in `BUILDING_MODELS`: `motel: 'models/motel.gltf',`
3. Reload. `building()` in `src/world/blockbench.js` places the model instead of the code version.
4. If it faces the wrong way, change that building's `rotY` in `buildStaticWorld()` (`src/world/world.js`). If it's the wrong size, add `scale` (the default is `2.4`). The chapel, for example, uses `scale: 1.2`.

The two-floor buildings (police station, apartment, fire station, school) stay in code for now, because husks find the stairs using data the code version sets up.

### Adding furniture or a prop
1. Export the model into `models/` and add it to `MODEL_FILES` in `src/core/models.js`, for example `couch: 'models/three_couch.gltf',`.
2. Place it with `b.prop('couch', x, z, rotY)` inside a code-built building, or with `placeProp('couch', x, z, rotY)` anywhere in the world. If the model is missing, the code-built fallback is used, so nothing breaks.

Furniture gets one simple collider around the whole piece, so the player doesn't snag on chair legs.

### Naming parts in Blockbench
| Name | What it does |
| --- | --- |
| `door` | An openable door. Put the panel and its handle in one group named `door`. The hinge goes on the end away from the handle. |
| `door_left` / `door_right` | Double doors (as seen from outside). They open together. Don't name the outer group anything that starts with "door". |
| `door_locked_police` (or `_motel`, `_fire`) | A door that needs that key. |
| `door_boarded` | A doorway covered with planks. |
| anything containing `drawer` | Slides open with `E`. Model it open; the game slides it shut at the start. |
| `deco_...` | No collision (signs, grime, small trim). |

### Models in the game
- **Characters and enemies:** female and male survivors, normal husk, runner, brute, Bloom nest.
- **Weapons and pickups:** pistol, shotgun, machete, ammo, medkit, battery, coil, transmitter.
- **Props:** crate, explosive barrel.
- **Furniture:** desk with chair, table with chairs, double bed, twin bed, jail bed, tall and short shelves, couch, washer/dryer set, church pew, altar.
- **Street props:** gas pump, fire hydrant, mailbox, park bench.
- **Buildings:** shed, chapel.

---

## Under the Hood

### Networking
- Each client sends its position and facing to the server **15 times a second** (`state`).
- The server sends everyone's latest state back out **20 times a second** in one batched message (`snapshot`). That's cheaper than forwarding every update individually.
- Clients smoothly interpolate other players between snapshots, so movement doesn't look jittery.
- The host sends every husk's position **10 times a second**. Other players show copies ("puppets") of the host's husks.
- Everything else that changes the shared world (hits, pickups, drawers, barrels, the tower...) goes through one Socket.IO event, `world`. `src/game/coop.js` lists every kind of message at the top of the file.
- Other events: `hello` (name and character), `join` / `leave`, `profile` (character change), `shot` (tracer from another player), `door` (a door changed), and the lobby events (`host`, `join`, `leaveLobby`). Each lobby holds up to 8 players.
- If no server is reachable (for example on GitHub Pages), the game simply runs single-player.

### Tuning difficulty
Husk speed and spawning are set in the `HUSK_TUNING` block at the top of `src/game/husks.js`:

| Setting | What it does |
| --- | --- |
| `speed` | Multiplies every husk's walk and lunge speed |
| `nestInterval` | Seconds between nest spawns |
| `nestCap` | A nest stops spawning once this many husks are near it |
| `nestRange` | Nests only spawn while a player is this close |
| `waveMax` | Most husks alive at once during the evac |
| `waveSlowest` / `waveFastest` | Seconds between evac spawns at the start and at the end |

---

## Roadmap

Planned for upcoming updates:
- **Downed and revive:** in a lobby, players go down instead of dying and teammates can revive them. If everyone is down, the team restarts.
- **Survival needs:** stamina, food and water, shown as real bars instead of numbers.
- **Backpack:** an inventory screen showing what you've picked up, and a backpack model on each character.
- **Better player animations.**
- **A bigger map and a longer story:** more ground to cover before the tower, harder-to-find radio parts, a fenced tower with a gate key, and a keypad code to find before the tower can be repaired.
- **NPCs.**
- **More Blockbench buildings** to replace the code-built placeholders.

---

## Built With
- [Three.js](https://threejs.org/) r160: rendering
- [cannon-es](https://pmndrs.github.io/cannon-es/) 0.20: physics
- [Socket.IO](https://socket.io/) 4.8: real-time networking
- [Blockbench](https://www.blockbench.net/): 3D models
- Node.js and Docker: multiplayer server

## Credits
- Game design, programming and models: Renee Guldi
- Started as a course project for CSCI 310, GUI and Game Development (Project 3: Adding Multiplayer to Project 2), and now continued for fun.