// effects.js: Visual effects: the gun on screen, muzzle flash, tracers, impact puffs, hit markers.

import * as THREE from 'three';
import { camera, scene } from '../core/engine.js';
import { crosshairEl } from '../ui/elements.js';

//------------------------------------------------
// Shooting & Barrel Explostions
export const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
export const effects = [];

// Reusable light for explosion flashes
export const blastLight = new THREE.PointLight(0xff8030, 0, 20);
scene.add(blastLight);



scene.add(camera);

// simple gun like model, built from boxes, attached to the camera so it follows player view
export const gun = new THREE.Group();
export const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
);

export const gunBarrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
);
gunBarrel.position.set(0, 0.02, -0.3);

export const gunGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.14, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2a})
);


gunGrip.position.set(0, -0.1, 0.1);
gunGrip.rotation.x = 0.3;
gun.add(gunBody, gunBarrel, gunGrip);

export const GUN_REST = new THREE.Vector3(0.25, -0.22, -0.5); 
gun.position.copy(GUN_REST);
camera.add(gun);

// Light at tip of barrel for muzzle flash simulation
export const muzzleLight = new THREE.PointLight(0xffc060, 0, 6);
muzzleLight.position.set(0, 0.02, -0.45);
gun.add(muzzleLight);

export const fx = [];

function addFx(mesh, life, grow) {
    scene.add(mesh);
    fx.push({ mesh, age: 0, life, grow });
}

export function updateFx(dt) {
    for (let i = fx.length -1; i >= 0; i--) {
        const f = fx[i];
        f.age += dt;
        const t = f.age / f.life;
        f.mesh.scale.setScalar(1 + t * f.grow);
        f.mesh.material.opacity = 1 - t;
        if (t >= 1) {
            scene.remove(f.mesh);
            f.mesh.geometry.dispose();
            f.mesh.material.dispose();
            fx.splice(i, 1);
        }
    }
}

export function spawnTracer(end, start = null) {
    // start at the tip of the gun barrel, not the camera
    // our own shots start at the gun barrel; other players' shots pass in their own start
    if (!start) {
        start = new THREE.Vector3();
        muzzleLight.getWorldPosition(start);
    }

    const length = start.distanceTo(end);
    const tracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, length, 4),
        new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true })
    );

    // place it half way between start and end
    tracer.position.copy(start).add(end).multiplyScalar(0.5);
    // rotate it to point from start to end
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    addFx(tracer, 0.08, 0);
}

export function spawnImpact(point, color) {
    const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true })
    );
    puff.position.copy(point);
    addFx(puff, 0.25, 3);
}


export function flashRed(mesh) {
    mesh.traverse((child) => {
        if (child.isMesh && child.material.emissive) {
            child.material.emissive.setHex(0xff0000);
            setTimeout(() => child.material.emissive.setHex(0x000000), 100);
        }
    });
}

export function hitMarker() {
    crosshairEl.style.background = '#ff4040';
    setTimeout(() => (crosshairEl.style.background = '#fff'), 100);
}
