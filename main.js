// Last Signal: starts the game. Each part of the game lives in its own file under src/:
//   src/core   engine, models, shared game state
//   src/world  building the town (layout, buildings, furniture, doors, Blockbench models)
//   src/game   gameplay (player, husks, weapons, pickups, the tower, resetting)
//   src/ui     HUD, keyboard/mouse, start menu and lobbies
// These imports load every file, basics first
import './src/core/engine.js';
import './src/core/state.js';
import './src/core/models.js';
import './src/ui/elements.js';
import './src/world/layout.js';
import './src/world/builders.js';
import './src/world/furniture.js';
import './src/world/doors.js';
import './src/world/blockbench.js';
import './src/ui/hud.js';
import './src/game/player.js';
import './src/ui/input.js';
import './src/ui/menu.js';
import './src/game/coop.js';
import './src/game/effects.js';
import './src/game/husks.js';
import './src/game/interact.js';
import './src/game/nests.js';
import './src/game/pickups.js';
import './src/game/props.js';
import './src/game/reset.js';
import './src/game/spawns.js';
import './src/game/tower.js';
import './src/game/weapons.js';
import './src/world/buildingTypes.js';
import './src/world/cityBuildings.js';
import './src/world/eastSide.js';
import './src/world/evacRoute.js';
import './src/world/landmarks.js';
import './src/world/nature.js';
import './src/world/northEnd.js';
import './src/world/outskirts.js';
import './src/world/streets.js';
import './src/world/world.js';
import * as THREE from 'three';
import { inLobby, initNetwork, multiplayerAvailable, sendState, updateRemotePlayers } from './src/net.js';
import { camera, renderer, scene, sun, world } from './src/core/engine.js';
import { loadModels, models } from './src/core/models.js';
import { game } from './src/core/state.js';
import { onWorldMessage, shareHusks, syncNewPlayer } from './src/game/coop.js';
import { spawnTracer } from './src/game/effects.js';
import { updateHusks } from './src/game/husks.js';
import { updateInteraction } from './src/game/interact.js';
import { updateNests } from './src/game/nests.js';
import { updatePickups } from './src/game/pickups.js';
import { EYE_HEIGHT, SPAWN, playerBody, updatePlayer } from './src/game/player.js';
import { props } from './src/game/props.js';
import { resetGame } from './src/game/reset.js';
import { spawnEntities } from './src/game/spawns.js';
import { updateTower } from './src/game/tower.js';
import { initWeapons, updateEffects } from './src/game/weapons.js';
import { overlayText, overlayTitle } from './src/ui/elements.js';
import { updateHUD } from './src/ui/hud.js';
import { controls, updateRestartButton } from './src/ui/input.js';
import { myProfile, onLobbyChange, setLobbyStatus, updateLobbyUI, youEl } from './src/ui/menu.js';
import { updateDrawers } from './src/world/blockbench.js';
import { applyDoorState, updateDoors } from './src/world/doors.js';
import { updateHazards, updateTriggers } from './src/world/evacRoute.js';
import { updateCity } from './src/world/streets.js';
import { buildStaticWorld } from './src/world/world.js';

//------------------------------------------------
// Game Loop
const clock = new THREE.Clock();
const lookDir = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;

    // playing: you're in control. worldRuns: husks, doors, the evac... keep going.
    // Solo, pausing freezes everything. In a lobby the world never pauses (your teammates
    // are still playing), so a paused or dead player just stands still.
    const playing = !game.gameOver && !game.dead && controls.isLocked;
    const worldRuns = !game.gameOver && (playing || inLobby());
    if (playing) {
        game.meleeCooldown -= dt;
        game.weaponCooldown -= dt;
        updatePlayer(dt);
        updateHazards(dt, time);
        updateInteraction();
    } else if (worldRuns) {
        playerBody.velocity.x = 0;
        playerBody.velocity.z = 0;
    }
    if (worldRuns) {
        updateHusks(dt, time);
        updateNests(dt, time);
        updatePickups(dt, time);
        updateDoors(dt, time);
        updateDrawers(dt);
        updateTriggers(playing);
        updateTower(dt, time, playing);
        updateEffects(dt);
        world.step(1 / 60, dt, 3);
        shareHusks(dt); // host only: send the husks to everyone else
    }

    // Multiplayer: share where players are and which way they're facing, then move other players
    if (!game.gameOver) {
        camera.getWorldDirection(lookDir);
        sendState(dt, playerBody.position, Math.atan2(-lookDir.x, -lookDir.z), game.dead);
    }
    updateRemotePlayers(dt);

    // Sync crates & barrels, (positions & rotation so they are able to tumble)
    for (const p of props) {
        p.mesh.position.copy(p.body.position);
        p.mesh.quaternion.copy(p.body.quaternion);
    }

    // Keep the sun's shadow box centered on the player so shadows work on the evac route too
    sun.position.set(playerBody.position.x + 30, 50, playerBody.position.z + 20);
    sun.target.position.set(playerBody.position.x, 0, playerBody.position.z);

    updateCity(time);
    updateHUD();
    if (game.health <= 0 && !game.gameOver && !game.dead) {
        if (inLobby()) {
            // your team keeps going: respawn at the farm when you're ready
            game.dead = true;
            controls.unlock();
            overlayTitle.textContent = 'YOU DIED';
            overlayText.textContent = 'Your team fights on. Press Enter or click Respawn to get back up at the farm.';
        } else {
            game.gameOver = true;
            controls.unlock();
            overlayTitle.textContent = 'YOU DIED';
            overlayText.textContent = 'The Bloom claims another. Press Enter or click Play again.';
        }
        updateRestartButton();
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { 
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


//------------------------------------------------
// New game start

try {
    await loadModels();
    initWeapons();
    buildStaticWorld();
    spawnEntities();
    camera.position.set(SPAWN.x, 2 + EYE_HEIGHT, SPAWN.z);
    camera.rotation.set(0, SPAWN.yaw, 0);
    initNetwork(scene, {
        models: { female: models.female, male: models.male },
        profile: myProfile(),
        statusCallback: () => updateLobbyUI(),
        lobbyCallback: onLobbyChange,
        myColorCallback: (hex) => {
            youEl.style.color = `#${hex.toString(16).padStart(6, '0')}`;
            youEl.textContent = `You: ${myProfile().name}`;
        },
        remoteShotCallback: (from, to) => {
            spawnTracer(new THREE.Vector3(to.x, to.y, to.z), new THREE.Vector3(from.x, from.y, from.z));
        },
        remoteDoorCallback: applyDoorState,
        worldCallback: (kind, data, from) => onWorldMessage(kind, data, from, resetGame),
        playerJoinCallback: syncNewPlayer,
    });
    if (!multiplayerAvailable()) {
        document.getElementById('lobby-menu').hidden = true;
        setLobbyStatus('Online play needs the game server (see the README). Playing solo.');
    }
    game.ready = true;
    overlayText.textContent = 'Click to Start';
    animate();
} catch (err) {
    console.error(err);
    overlayText.textContent = "Couldn't load models. Press F12 and check the console."
}
