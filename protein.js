import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const container = document.getElementById("sim-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.update();
controls.addEventListener('start', () => {
    controls.autoRotate = false;
});

const clock = new THREE.Clock();
const framerateClock = new THREE.Clock();

const dampener = 0.90;

const white = "#ffffff";

const ambientLight = new THREE.AmbientLight(white, 0.8);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 5.0);
scene.add(keyLight);

const red = "#fe5186";
const blue = "#5186fe";
const green = "#86fe51";
const bondRadius = 0.2;
const aaRadius = 1.9; // Angstrom

// Units in mdyn, Angstrom, 100 kg, and elementary charge (so the math works out nicely)
const aaMass = 1.83e-27; // * 100 kg, but ten times higher
const r0 = 3.8; // Angstrom
const rminLocal = 3.2; // Angstorm
const rminDistal = 4.8; // Angstrom
const ka = 2.0; // angle constraint, mdyn/Angstrom (approximative)
const kb = 8.0; // approx. bond spring force, mdyn/Angstrom
const kc = 2.307; // coulomb constant, mdyn * Angstrom^2/e^2
const kd = 0.1; // dihedral constraint, mdyn/Angstrom (approximative)
const kh = 2.5; // hydrogen bonding, mdyn/Angstrom
const kr = 100.0; // collision force, mdyn/Angstrom

const ed = 0.3; // energy depth, mdyn*Angstrom
const sg = 3.0; // distance parameter, Angstrom

const disorderliness = 3; // higher numbers make the protein start in more disordered states
const boundingBox = r0 * 5;
const bondDampening = 0.05;
const frameRate = 1 / 30;
const timeScale = 2.5e-13;
const proteinSize = 400;

const forceMax = 1e10;
const speedMax = 1e13;

let beads = []
let center = zero3();

function zero3() {
    return { x: 0, y: 0, z: 0 };
}

function random3() {
    return {
        x: Math.random(),
        y: Math.random(),
        z: Math.random()
    };
}

function randomNormalizedPosition() {
    return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1
    };
}

const coefs = random3();
const coefs_norm = scale(0.5 / (coefs.x + coefs.y + coefs.z), coefs);
const periods = scale(128, random3());
const phaseShifts = scale(128, random3());
function hydrophobicDistribution(x) {
    let y = 0;
    for (let i = 0; i < periods.length; i++) {
        y += coefs_norm[i] * Math.sin(2 * Math.PI * x / periods[i] + phaseShifts[i]);
    }
    return 0.5 + y;
}

function randomAminoAcid(i) {
    const hydrophobic = Math.random() < hydrophobicDistribution(i);
    let charge = 0;
    if (!hydrophobic) {
        charge = Math.floor(Math.random() * 3) - 1;
    }
    return {
        s: zero3(),
        v: zero3(),
        a: zero3(),
        hydrophobic: hydrophobic,
        charge: charge,
        mesh: null,
        bondMesh: null
    };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function scale(s, v) {
    return { x: s * v.x, y: s * v.y, z: s * v.z };
}

function normalize(v) {
    const mag = distance(zero3(), v);
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

function displacement(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add3(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function distance(a, b) {
    const d = displacement(a, b);
    return Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
}

function start() {
    if (container.style.display == "none") {
        return;
    }

    let currentPosition = zero3();
    let maxDist = 0;
    let deltaPosition = scale(r0, randomNormalizedPosition());
    let averagePosition = zero3();

    for (let i = 0; i < proteinSize; i++) {
        beads.push(randomAminoAcid(i));
        beads[i].s.x = currentPosition.x;
        beads[i].s.y = currentPosition.y;
        beads[i].s.z = currentPosition.z;
        currentPosition = add3(currentPosition, deltaPosition);
        deltaPosition = add3(deltaPosition, scale(disorderliness, randomNormalizedPosition()));
        deltaPosition = scale(r0, normalize(deltaPosition))
        const dist = distance(zero3(), currentPosition);
        if (dist > maxDist) {
            maxDist = dist;
        }
        averagePosition = add3(currentPosition, averagePosition);

        const geo = new THREE.SphereGeometry(aaRadius, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: beads[i].hydrophobic ? green :
                (beads[i].charge > 0 ? blue :
                    (beads[i].charge < 0 ? red : white))
        });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(beads[i].s.x, beads[i].s.y, beads[i].s.z);
        scene.add(mesh);

        beads[i].mesh = mesh;

        if (i > 0) {
            const cylinderGeo = new THREE.CylinderGeometry(bondRadius, bondRadius, 1, 6);
            const cylinderMat = new THREE.MeshStandardMaterial({ color: white });
            const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
            scene.add(cylinder);

            beads[i].bondMesh = cylinder;
        }

    }
    
    center = scale(1 / proteinSize, averagePosition);
    
    controls.target.set(center.x, center.y, center.z);
    camera.position.set(maxDist + 10, 0, 0);
    update();
}

function update() {
    requestAnimationFrame(update);

    let frameDelta = 0;
    applyPhysics();

    for (let i = 0; i < beads.length; i++) {
        const cur = beads[i];
        cur.mesh.position.set(cur.s.x, cur.s.y, cur.s.z);

        if (i > 0) {
            const prev = beads[i - 1];
            const p1 = new THREE.Vector3(prev.s.x, prev.s.y, prev.s.z);
            const p2 = new THREE.Vector3(cur.s.x, cur.s.y, cur.s.z);
            const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            cur.bondMesh.position.copy(midpoint);
            const distance = p1.distanceTo(p2);
            cur.bondMesh.scale.set(1, distance, 1);
            cur.bondMesh.lookAt(p2);
            cur.bondMesh.rotateX(Math.PI / 2);
        }
    }

    while (frameDelta < frameRate) {
        frameDelta += framerateClock.getDelta();
    }
    controls.update();
    keyLight.position.copy(camera.position);

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, forward);

    keyLight.position.addScaledVector(right, 2);
    keyLight.position.addScaledVector(up, 2);

    renderer.render(scene, camera);
}

function applyPhysics() {
    const dt = Math.min(clock.getDelta() * timeScale, frameRate * timeScale);
    beads.forEach((bead) => {
        bead.v = scale(dampener, bead.v);
        bead.s = {
            x: bead.s.x + bead.v.x * dt + bead.a.x * (0.5 * dt * dt),
            y: bead.s.y + bead.v.y * dt + bead.a.y * (0.5 * dt * dt),
            z: bead.s.z + bead.v.z * dt + bead.a.z * (0.5 * dt * dt)
        };
    })

    for (let i = 0; i < beads.length; i++) {
        for (let j = i + 1; j < beads.length; j++) {
            let aa1 = beads[i];
            let aa2 = beads[j];

            const r = displacement(aa1.s, aa2.s);

            if (r.x > boundingBox || r.x < -boundingBox) continue;
            if (r.y > boundingBox || r.y < -boundingBox) continue;
            if (r.z > boundingBox || r.z < -boundingBox) continue;

            const rHat = normalize(r);
            const d = distance(aa1.s, aa2.s);

            let fnet = zero3();

            // spring-like forces
            let fs = zero3();
            if (j == i + 1) {
                const fsmag = -kb * (d - r0);
                fnet = add3(fnet, scale(fsmag, rHat));
            }
            if (j == i + 2) {
                const fsmag = -ka * (d - r0 * 1.8);
                fnet = add3(fnet, scale(fsmag, rHat));
            }
            if (j == i + 3) {
                const fsmag = -kd * (d - r0 * 2.5);
                fnet = add3(fnet, scale(fsmag, rHat));
            }
            if (j == i + 4) {
                const fsmag = -kh * (d - r0 * 2.5);
                fnet = add3(fnet, scale(fsmag, rHat));
            }

            const rmin = j > i + 4 ? rminDistal : rminLocal;
            if (d < rmin) {
                const fsmag = -kr * (d - rmin);
                fnet = add3(fnet, scale(fsmag, rHat));
            }

            const fcmag = kc * aa1.charge * aa2.charge / (d * d + 0.1);
            fnet = add3(fnet, scale(fcmag, rHat));
        
            // Approximated Gaussian curve
            if (aa1.hydrophobic && aa2.hydrophobic) {
                const x = (d - r0) / sg;
                const fhmag = -ed * x / (1 + x*x)
                fnet = add3(fnet, scale(fhmag, rHat));
            }
            if (aa1.hydrophobic != aa2.hydrophobic) {
                const x = (d - r0) / sg;
                const fhmag = ed * x / (1 + x*x)
                fnet = add3(fnet, scale(fhmag, rHat));
            }
            

            const fmag = distance(zero3(), fnet);
            if (fmag > forceMax) {
                fnet = scale(forceMax / fmag, fnet);
            }
            const a = scale(1 / aaMass, fnet);

            aa1.v = {
                x: aa1.v.x + (a.x + aa1.a.x) * (dt * 0.5),
                y: aa1.v.y + (a.y + aa1.a.y) * (dt * 0.5),
                z: aa1.v.z + (a.z + aa1.a.z) * (dt * 0.5)
            }
            const speed1 = distance(zero3(), aa1.v);
            if (speed1 > speedMax) {
                aa1.v = scale(speedMax / speed1, aa1.v);
            }

            aa2.v = {
                x: aa2.v.x - (a.x + aa1.a.x) * (dt * 0.5),
                y: aa2.v.y - (a.y + aa1.a.y) * (dt * 0.5),
                z: aa2.v.z - (a.z + aa1.a.z) * (dt * 0.5)
            }
            const speed2 = distance(zero3(), aa2.v);
            if (speed2 > speedMax) {
                aa2.v = scale(speedMax / speed2, aa2.v);
            }
            
            aa1.a = a;
            aa2.a = scale(-1, a);
        }
    }
}

start()

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});