// props.js: Physics props: crates, explosive barrels, the school bus.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, world } from '../core/engine.js';
import { spawnModel } from '../core/models.js';
import { mergeGroup } from '../world/builders.js';
import { buildSchoolBus } from '../world/landmarks.js';

//------------------------------------------------
// Physics Props
export const props = [];
// Props are made in the same order in every player's game, so numbering them in order -- lets everyone agree which barrel blew up
let nextPropId = 0;
export function resetPropIds() {
    nextPropId = 0;
}
export function spawnCrate(x, z) {
    const mesh = spawnModel('crate', 1, -0.5);
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        position: new CANNON.Vec3(x, 0.5, z),
    });
    body.linearDamping = 0.4;
    body.angularDamping = 0.6;
    world.addBody(body);
    const prop = { id: nextPropId++, mesh, body };
    mesh.userData.prop = prop;
    props.push(prop);
}

export function spawnBarrel(x, z) {
    const mesh = spawnModel('barrel', 1, -0.5);
    const body = new CANNON.Body({
        mass: 10,
        shape: new CANNON.Cylinder(0.35, 0.35, 1, 8),
        position: new CANNON.Vec3(x, 0.5, z),
    });
    body.linearDamping = 0.4;
    body.angularDamping = 0.6;
    world.addBody(body);
    const prop = { id: nextPropId++, mesh, body, explosive: true };
    mesh.userData.prop = prop;
    props.push(prop);
}

// Darken the bus to make it look burnt on explosion
    export function charModel(mesh) {
        mesh.traverse((c) => {
            if (c.isMesh) c.material.color.multiplyScalar(0.35);
        });
    }


export function spawnBus(x, z) {
    const busModel = buildSchoolBus();
    busModel.position.y = -1.4;
    mergeGroup(busModel);

    const holder = new THREE.Group();
    holder.add(busModel);
    scene.add(holder);

    const body = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(x, 1.4, z),
    });

    body.addShape(new CANNON.Box(new CANNON.Vec3(5.25, 1.4, 1.35)), new CANNON.Vec3(0.75, 0, 0));
    body.linearDamping = 0.5;
    body.angularDamping = 0.6;
    world.addBody(body);

    const prop = { id: nextPropId++, mesh: holder, body, dormant: true, blastScale: 8 };
    holder.userData.prop = prop;
    props.push(prop);
}
