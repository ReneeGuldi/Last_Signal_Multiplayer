// nests.js: Bloom nests: spawning husks, taking damage, being destroyed.

import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { models, spawnModel } from '../core/models.js';
import { game } from '../core/state.js';
import { HUSK_TUNING, alertHusks, createHusk, husks } from './husks.js';
import { spawnPickup } from './pickups.js';
import { playerBody } from './player.js';
import { showMessage } from '../ui/hud.js';
import { part } from '../world/builders.js';

//------------------------------------------------
// Bloom Nests
// Glowing pods inside buildings that keep spawning husks until you destroy them.
export const nests = [];
const NEST_GLOW = 0x66ff44;
const NEST_HEIGHT = 2.2; 
 
export function spawnNest(x, z) {
    const g = new THREE.Group();
 
    let pod;
    if (models.nest) {
        const raw = new THREE.Box3().setFromObject(models.nest).getSize(new THREE.Vector3()).y || 1;
        pod = spawnModel('nest', NEST_HEIGHT / raw, 0);
        g.add(pod);
        // only the "core" group glows, the rest keeps its texture
        const core = pod.getObjectByName('core');
        if (core) core.traverse((c) => {
            if (c.isMesh) {
                c.material.emissive.setHex(NEST_GLOW);
                c.material.emissiveIntensity = 0.6;
            }
        });
    } else {
        pod = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x3f6a2a, emissive: NEST_GLOW, emissiveIntensity: 0.5, flatShading: true })
        );
        pod.position.y = 0.9;
        g.add(pod);
 
        // roots spreading out across the floor
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            part(g, 0.15, 0.1, 1.6, Math.cos(a) * 1.1, 0.05, Math.sin(a) * 1.1, 0x2f4a22, 0, Math.PI / 2 - a, 0);
        }
    }
 
    const light = new THREE.PointLight(NEST_GLOW, 4, 12);
    light.position.y = 1.2;
    g.add(light);
 
    g.position.set(x, 0, z);
    scene.add(g);
 
    const nest = { group: g, pod, light, x, z, hp: 12, spawnTimer: 3, dead: false, baseScale: pod.scale.x };
    g.userData.nest = nest;
    nests.push(nest);
}
 
export function updateNests(dt, time) {
    for (const n of nests) {
        if (n.dead) continue;
 
        // slow breathing pulse
        n.pod.scale.setScalar(n.baseScale * (1 + Math.sin(time * 3) * 0.06));
 
        // only active while the player is nearby
        const dist = Math.hypot(playerBody.position.x - n.x, playerBody.position.z - n.z);
        if (dist > HUSK_TUNING.nestRange) continue;
 
        n.spawnTimer -= dt;
        if (n.spawnTimer > 0) continue;
        n.spawnTimer = HUSK_TUNING.nestInterval;
 
        // cap how many husks one nest can have around it
        const nearby = husks.filter((h) => !h.dead &&
            Math.hypot(h.body.position.x - n.x, h.body.position.z - n.z) < 15).length;
        if (nearby >= HUSK_TUNING.nestCap) continue;
 
        const a = Math.random() * Math.PI * 2;
        createHusk(n.x + Math.cos(a) * 1.5, n.z + Math.sin(a) * 1.5,
            Math.random() < 0.3 ? 'runner' : 'normal',
            { home: { x: n.x, z: n.z }, alerted: dist < 20 });
    }
}
 
export function damageNest(n, amount) {
    if (n.dead) return;
    n.hp -= amount;
    // flash the light red (works for the model and the egg)
    n.light.color.setHex(0xff3030);
    setTimeout(() => n.light.color.setHex(NEST_GLOW), 100);
    if (n.hp <= 0) destroyNest(n);
}
 
function destroyNest(n) {
    n.dead = true;
    scene.remove(n.group);
    game.score += 250;
    spawnPickup('ammo', n.x + 1, n.z, { temporary: true });
    spawnPickup('medkit', n.x - 1, n.z, { temporary: true });
    alertHusks(n.x, n.z, 25);
    const left = nests.filter((other) => !other.dead).length;
    showMessage(`Bloom nest destroyed! (${nests.length - left}/${nests.length})`);
}
