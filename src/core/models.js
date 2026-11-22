// models.js: Loading Blockbench models (MODEL_FILES, BUILDING_MODELS) and making copies of them.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './engine.js';

//------------------------------------------------
// Loading Blockbench models
// All models load at once before the game starts
// If a model fails to load, it gets a placeholder instead
const MODEL_FILES = {
    husk: 'models/husk_new_1.gltf',
    battery: 'models/battery.gltf',
    coil: 'models/coil.gltf',
    transmitter: 'models/transmitter.gltf',
    barrel: 'models/barrel.gltf',
    medkit: 'models/medkit.gltf',
    crate: 'models/crate.gltf',
    ammo: 'models/ammo.gltf',
    female: 'models/player_female.gltf',
    male: 'models/player_male.gltf',
    pistol: 'models/pistol.gltf',
    shotgun: 'models/shotgun.gltf',
    machete: 'models/machete.gltf',
    nest: 'models/nest.gltf',
    runner: 'models/husk_ver_3.gltf',
    brute: 'models/husk_ver_2.gltf',


    // Furniture & Buildings (some not implemented at the moment)
    shed: 'models/shed.gltf',
    desk_chair: 'models/desk_chair.gltf',
    table_chairs: 'models/table_chairs.gltf',
    bed_double: 'models/bed_double.gltf',
    bed_twin: 'models/bed_twin.gltf',
    jail_bed: 'models/jail_bed.gltf',
    shelves_tall: 'models/shelves_tall.gltf',
    shelves_short: 'models/shelves_short.gltf',
    church_pew: 'models/church_pew.gltf',
    altar: 'models/altar.gltf',
    couch: 'models/three_couch.gltf',
    washer_dryer: 'models/washer_dryer_set.gltf',
    gas_pump: 'models/gas_pump.gltf',
    fire_hydrant: 'models/fire_hydrant.gltf',
    mailbox: 'models/mailbox.gltf',
    park_bench: 'models/park_bench.gltf',
};

// Buildings that are still built in code. To be eventually replaced by blockbench models. Until then, placeholder buildings created with code.
// Two-story buildings (police, apartment, fire, school) to stay in code for now: husks find the stairs using data the code version sets up.
const BUILDING_MODELS = {
    chapel: 'models/chapel.gltf',
    diner: null,
    farmhouse: null,
    gasStation: null,
    pharmacy: null,
    hardware: null,
    houseB: null,
    motel: null,
    grocery: null,
    warehouse: null,
    clinic: null,
    laundromat: null,
    garage: null,
};
for (const [name, file] of Object.entries(BUILDING_MODELS)) {
    if (file) MODEL_FILES[name] = file;
}

export const models = {};
const loader = new GLTFLoader();

export async function loadModels() {
    const names = Object.keys(MODEL_FILES);
    const results = await Promise.allSettled(names.map((n) => loader.loadAsync(MODEL_FILES[n])));
    names.forEach((name, i) => {
        if (results[i].status === 'rejected') {
            const fallback = (name === 'runner' || name === 'brute') ? 'the normal husk' : 'a placeholder';
            console.warn(`Couldn't load ${name} (${MODEL_FILES[name]}), using ${fallback}`);
            return;
        }
        const model = results[i].value.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (isSeeThrough(child.material)) {
                    // glass painted to be partially see-through in Blockbench (chapel's stained glass, shed window)
                    child.material.transport = true;
                    child.material.alphaTest = 0;
                    child.material.depthWrite = false;
                    child.castShadow = false;
                }
            }
        });
        models[name] = model;
    });
}

// Check whether a texture has partly see-through pixels, not just fully clear or fully solid
// Fixing export textures that really have glass in them to achieve a real window effect
const seeThroughCache = newMap();
function isSeeThrough(material) {
    const img = material?.map?.image;
    if (!img) return false;
    if (seeThroughCache.has(img)) return seeThroughCache.get(img);
    let result = false;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        let partial = 0;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 10 && data[i] < 245) partial++;
        }

        result = partial > (data.length / 4) * 0.01; // atleast 1% of the texture is see-through
    } catch {
        result = false;
    }

    seeThroughCache.set(img, result);
    return result;
}



// Stand-in models if something doesn't load: a plain item-sized box
function placeholderModel() {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x8a7a5a })
    );
    mesh.position.y = 0.15;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
}


// Adds a copy of a model to the scene.
export function spawnModel(name, scale = 1, yOffset = 0) {
    const inner = models[name] ? models[name].clone() : placeholderModel();
    // Keeps material changes separate between model copies.
    inner.traverse((child) => {
        if (child.isMesh) child.material = child.material.clone();
    });
    inner.scale.setScalar(scale);
    inner.position.y = yOffset;

    const holder = new THREE.Group();
    holder.add(inner);
    scene.add(holder);
    return holder;
}

// Prepares a model for use as a weapon by centering, scaling, and orienting it.
export function sizedModel(name, length, flip = false) {
    const src = models[name] ? models[name].clone() : placeholderModel();
    src.traverse((c) => {
        if (c.isMesh) c.material = c.material.clone();
    });
 
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    src.position.sub(center);
 
    const orient = new THREE.Group();
    orient.add(src);
    const longest = Math.max(size.x, size.y, size.z) || 1;
    if (size.x === longest) orient.rotation.y = Math.PI / 2;       // long along x: turn it forward
    else if (size.y === longest) orient.rotation.x = -Math.PI / 2; // modeled standing up: lay it forward
    if (flip) orient.rotateY(Math.PI);
 
    const holder = new THREE.Group();
    holder.add(orient);
    holder.scale.setScalar(length / longest);
    return holder;
}

// How tall a model is, in its own units (cached, so each model is only measured once)
const modelHeights = {};
export function modelHeight(name) {
    if (!(name in modelHeights)) {
        const size = new THREE.Box3().setFromObject(models[name]).getSize(new THREE.Vector3());
        modelHeights[name] = size.y || 1;
    }
    return modelHeights[name];
}