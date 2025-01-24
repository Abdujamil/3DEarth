import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { TextGeometry } from 'jsm/geometries/TextGeometry.js';
import { FontLoader } from 'jsm/loaders/FontLoader.js';

// import './src/loader.js';
import getStarfield from "./src/getStarfield.js";
import { getStars } from './src/stars.js';
import { Stars } from "./src/starsV1.js";
import { getFresnelMat } from "./src/getFresnelMat.js";
import { createLightPillar } from "./src/LightPillars.js";

const w = window.innerWidth;
const h = window.innerHeight;
let isRotating = true;
let isRotating1 = false;
let isMouseDown = false;

let lastX = 0;
let lastY = 0;
let velocityX = 0; // Начальная скорость вращения по оси X
let velocityY = 0; // Начальная скорость вращения по оси Y
let damping = 0.98; // Коэффициент затухания (чем ближе к 1, тем дольше вращение)
let scaleFactor = 1;
let isHoverable = true;
let pointer;
let horizontalOnly = false;

const params = {
    rotationSpeed: 0.0003,
    starSpeed: 0.0001,
    numStars: 50000, // Количество звёзд
    starSize: 0.04,   // Размер звёзд

    buttonOpacity: 1,
    cityFlagOpacity: 1,

    cloudeOpacity: 0.35,
    texture: "Variant 1",
    cloudesTextures: "Variant 1",

    bumpScale: 0.05, // Глубина вжатия
    saturation: 1.0, // Насыщенность цвета
    brightness: 1.0, // Яркость цвета
    color: "#000000", // Цвет фона сферы


    atmosphereOpacity: 0.5, // Прозрачность атмосферы
    atmosphereColor: "#0bbcff", // Цвет атмосферы
    scaleX: 1.02, // Масштаб по X
    scaleY: 1.02, // Масштаб по Y
    scaleZ: 1.02, // Масштаб по Z

    starVariant: "Первый вариант",
};

let colors = [
    { name: "White", hex: 0xffffff, rgb: "rgb(255, 255, 255)" },
    { name: "Sky Blue", hex: 0x87CEEB, rgb: "rgb(135, 206, 235)" }, // Голубой
    { name: "Steel Blue", hex: 0x4682B4, rgb: "rgb(70, 130, 180)" }, // Глубокий синий
    { name: "Turquoise", hex: 0x40E0D0, rgb: "rgb(64, 224, 208)" }, // Бирюзовый
    { name: "Dodger Blue", hex: 0x1E90FF, rgb: "rgb(30, 144, 255)" }, // Глубокая морская вода
    { name: "Teal", hex: 0x008080, rgb: "rgb(0, 128, 128)" }, // Тёмно-бирюзовый
    { name: "Blue-Green", hex: 0x5F9EA0, rgb: "rgb(95, 158, 160)" }, // Серо-зелёный (Cadet Blue)
];

const textures = [
    { name: "Variant 1", path: "./textures/2k_earth_daymap.webp" },
    { name: "Variant 2", path: "./textures/00_earthmap1k.webp" },
    // { name: "Variant 3", path: "./textures/2k_earth_nightmap.webp" },
    // { name: "Variant 4", path: "./textures/03_earthlights1k.webp" },
    { name: "Variant 5", path: "./textures/8k_earth_daymap.jpg" },
    // { name: "Variant 6", path: "./textures/8k_earth_nightmap.webp" },
    { name: "Variant 7", path: "./textures/earth_atmos_2048.webp" },
    { name: "China", path: "./textures/Earth_Diffuse_6K.jpg" },
    // { name: "Variant 9", path: "./textures/Earth_Illumination_6K.jpg" },
];

const cloudesTextures = [
    { name: "Variant 1", path: "./textures/Earth_Clouds_6K.jpg" },
    { name: "Variant 2", path: "./textures/04_earthcloudmap.webp" },
    { name: "Variant 3", path: "./textures/05_earthcloudmap.webp" },
    { name: "Variant 4", path: "./textures/8k_earth_clouds.webp" },
    { name: "China", path: "./textures/2k_earth_clouds.webp" },
];

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
camera.position.z = 4;
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(w, h);

document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
// earthGroup.rotation.z = -23.4 * Math.PI / 180;
earthGroup.rotation.z = 0;
scene.add(earthGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.minDistance = 5;
controls.maxDistance = 5;

if (isRotating1 === true) {
    controls.minPolarAngle = Math.PI / 2; // Ограничить угол (горизонтальная плоскость)
    controls.maxPolarAngle = Math.PI / 2; // Ограничить угол (горизонтальная плоскость)
    controls.enablePan = false; // Отключить панорамирование
}


const detail = 12;
const loader = new THREE.TextureLoader();

const dayTexture = loader.load('./textures/Earth_Diffuse_6K.jpg');
const nightTexture = loader.load('./textures/Earth_Illumination_6K.jpg');
const bumpTexture = loader.load("./textures/earth_atmos_2048.webp");
// const specularTexture = loader.load("./textures/8k_earth_specular_map.jpg");
const cloudsTexture = loader.load("./textures/Earth_Clouds_6K.jpg");

// === Earth Material ===
const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        lightDirection: { value: new THREE.Vector3(1, 0, 1).normalize() },
        bumpTexture: { value: bumpTexture },
        bumpScale: { value: params.bumpScale },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform vec3 lightDirection;
      uniform sampler2D bumpTexture;
      uniform float bumpScale;

      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        float intensity = dot(normal, lightDirection);

        vec4 dayColor = texture2D(dayTexture, vec2(vPosition.x, vPosition.y) * 0.5 + 0.5);
        vec4 nightColor = texture2D(nightTexture, vec2(vPosition.x, vPosition.y) * 0.5 + 0.5);

        vec4 color = mix(nightColor, dayColor, intensity);
        gl_FragColor = vec4(color.rgb, 1.0);
      }
    `,
});


const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
    // map: loader.load("./textures/00_earthmap1k.webp"),
    // specularMap: loader.load("./textures/02_earthspec1k.webp"),
    specularMap: loader.load("./textures/Earth_NormalNRM_6K.jpg"),
    // bumpMap: loader.load("./textures/01_earthbump1k.webp"),
    // map: loader.load("./textures/Earth_Diffuse_6K.jpg"),
    // bumpMap: loader.load("./textures/Earth_NormalNRM_6K.jpg"),
    bumpScale: 1,
    color: params.color,
    shininess: 100,
    saturation: 1,
});


const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/8k_earth_daymap.jpg"),
    // map: loader.load("./textures/Earth_Illumination_6K.jpg"),
    // map: loader.load("./textures/8k_earth_nightmap.webp"),

    // map: loader.load("./textures/Earth_Clouds_6K.jpg"),
    map: loader.load(cloudesTextures[0].path),
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
    shininess: 50,
    opacity: params.cloudeOpacity,
});

const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);


const lightsMat1 = new THREE.MeshBasicMaterial({
    // map: loader.load("./textures/8k_earth_daymap.jpg"),
    // map: loader.load("./textures/Earth_Clouds_6K.jpg"),
    // map: loader.load("./textures/Earth_Illumination_6K.jpg"),
    map: loader.load(textures[0].path), // Первая текстура по умолчанию
    // map: loader.load("./textures/8k_earth_nightmap.webp"),
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
    shininess: 50,
    opacity: .5,
});
const lightsMesh1 = new THREE.Mesh(geometry, lightsMat1);
earthGroup.add(lightsMesh1);


// === Clouds ===
const cloudsMaterial = new THREE.MeshPhongMaterial({
    map: cloudsTexture,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
});

const cloudsMat = new THREE.MeshStandardMaterial({
    map: cloudsTexture,
    // transparent: false,
    // opacity: 1,  // Reduced from 0.8 to make clouds less dense
    blending: THREE.AdditiveBlending,
    // alphaMap: loader.load('./textures/05_earthcloudmaptrans.webp'),
    // alphaMap: loader.load('./textures/Earth_Clouds_6K.jpg'),
    color: 0xffffff,  // Changed from 0xe0e0e0 to white for brighter clouds
    transparent: false,
    opacity: params.cloudeOpacity, // Более плотные облака
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
});

const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.set(1.01, 1.01, 1.01);
earthGroup.add(cloudsMesh);


// const fresnelMat = getFresnelMat();
// const glowMesh = new THREE.Mesh(geometry, fresnelMat);
// glowMesh.scale.setScalar(1.01);
// earthGroup.add(glowMesh);

// === Atmosphere (Glow) ===
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        blurAmount: { value: params.atmosphereOpacity },
        atmosphereColor: { value: new THREE.Color(params.atmosphereColor) },
    },
    vertexShader: `
      varying vec3 vNormal;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    uniform float blurAmount; // Добавляем uniform для прозрачности
    uniform vec3 atmosphereColor; // Цвет атмосферы
    varying vec3 vNormal;

    void main() {
        float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);

        // Используем blurAmount для управления прозрачностью
        gl_FragColor = vec4(atmosphereColor, blurAmount) * intensity;
    }
`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
});
const atmosphereMesh = new THREE.Mesh(geometry, atmosphereMaterial);
atmosphereMesh.scale.set(params.scaleX, params.scaleY, params.scaleZ);
scene.add(atmosphereMesh);


// const stars = getStarfield({ numStars: 50000 });
// stars.material.transparent = true;
// scene.add(stars);


// ------- первый вариант -----------//
// const stars = new Stars({ stars: 10000, velocity: 1, radius: .2, alpha: 1 });
// scene.add(stars.getPoints());

// ------- второй вариант -----------//
//let stars = getStars({ numStars: params.numStars, starSize: params.starSize });
//scene.add(stars);


let currentStars; // Текущий объект звёзд

function updateStars() {
    // Удаляем текущие звёзды из сцены
    if (currentStars) {
        scene.remove(currentStars.getPoints ? currentStars.getPoints() : currentStars);
    }

    // Проверяем выбранный вариант
    if (params.starVariant === "Первый вариант") {
        // Создаём звёзды первого варианта
        const stars = new Stars({ stars: 10000, velocity: 1, radius: 0.2, alpha: 1 });
        scene.add(stars.getPoints());
        currentStars = stars; // Сохраняем объект звёзд
    } else if (params.starVariant === "Второй вариант") {
        // Создаём звёзды второго варианта
        const stars = getStars({ numStars: params.numStars, starSize: params.starSize });
        scene.add(stars);
        currentStars = stars; // Сохраняем объект звёзд
    }
}


// Улучшение освещения
const pointLight = new THREE.PointLight(0xffffff, 2, 10); // Увеличена яркость
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1); // Увеличена интенсивность
scene.add(ambientLight);

// Освещение
const light = new THREE.AmbientLight(0x404040);
scene.add(light);


// const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity from 2.0 to 2.5
// sunLight.position.set(-2, 1.5, 1.5);
// scene.add(sunLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5, 2);
sunLight.position.set(-2, 1.5, 1.5);
scene.add(sunLight);

const organizations = {
    BRICS: [
        { name: "Бразилия", lat: -8.7667, lon: -63.9, flag: "./images/png22.webp" },
        { name: "Эфиопия", lat: 9.1958, lon: 40.4925, flag: "./images/png19.webp" },
        { name: "Россия", lat: 62.14389, lon: 105.57000, flag: "./images/png26.webp" },
        { name: "Индия", lat: 20.93972, lon: 78.92000, flag: "./images/png16.webp" },
        { name: "Китай", lat: 36.89389, lon: 104.08444, flag: "./images/png24.webp" },
        { name: "ОАЭ", lat: 23.46611, lon: 53.84917, flag: "./images/png12.webp" },
        { name: "ЮАР", lat: -30.12889, lon: 22.95722, flag: "./images/png10.webp" },
        { name: "Иран", lat: 32.83056, lon: 53.71222, flag: "./images/png14.webp" },
        { name: "Египет", lat: 27.11194, lon: 30.77722, flag: "./images/png06.webp" },
        { name: "Саудовская Аравия", lat: 24.34944, lon: 44.95917, flag: "./images/png02.webp" }
    ],
    SCO: [
        { name: "Казахстан", lat: 48.30444, lon: 66.92583, flag: "./images/png21.webp" },
        { name: "Пакистан", lat: 30.61917, lon: 69.35250, flag: "./images/png18.webp" },
        { name: "Беларусь", lat: 53.79389, lon: 27.98500, flag: "./images/png27.webp" },
        { name: "Россия", lat: 62.14389, lon: 105.57000, flag: "./images/png26.webp" },
        { name: "Иран", lat: 32.83056, lon: 53.71222, flag: "./images/png14.webp" },
        { name: "Китай", lat: 36.89389, lon: 104.08444, flag: "./images/png24.webp" },
        { name: "Индия", lat: 20.93972, lon: 78.92000, flag: "./images/png16.webp" },
        { name: "Узбекистан", lat: 41.65417, lon: 64.56194, flag: "./images/png17.webp" },
        { name: "Кыргызстан", lat: 41.32667, lon: 74.77333, flag: "./images/png20.webp" },
        { name: "Таджикистан", lat: 38.94917, lon: 71.29667, flag: "./images/png15.webp" }
    ],
    CIS: [
        { name: "Россия", lat: 62.14389, lon: 105.57000, flag: "./images/png26.webp" },
        { name: "Армения", lat: 40.10889, lon: 45.04444, flag: "./images/png29.webp" },
        { name: "Беларусь", lat: 53.79389, lon: 27.98500, flag: "./images/png27.webp" },
        { name: "Молдавия", lat: 47.46028, lon: 28.34972, flag: "./images/png28.webp" },
        { name: "Узбекистан", lat: 41.65417, lon: 64.56194, flag: "./images/png17.webp" },
        { name: "Кыргызстан", lat: 41.32667, lon: 74.77333, flag: "./images/png20.webp" },
        { name: "Таджикистан", lat: 38.94917, lon: 71.29667, flag: "./images/png15.webp" },
        { name: "Азербайджан", lat: 40.24111, lon: 47.58333, flag: "./images/png25.webp" }
    ],
    EAEU: [
        { name: "Россия", lat: 62.14389, lon: 105.57000, flag: "./images/png26.webp" },
        { name: "Беларусь", lat: 53.79389, lon: 27.98500, flag: "./images/png27.webp" },
        { name: "Казахстан", lat: 48.30444, lon: 66.92583, flag: "./images/png21.webp" },
        { name: "Кыргызстан", lat: 41.32667, lon: 74.77333, flag: "./images/png20.webp" },
        { name: "Таджикистан", lat: 38.94917, lon: 71.29667, flag: "./images/png15.webp" }
    ],
    APEC: [
        { name: "Филиппины", lat: 13.1875, lon: 121.7844, flag: "./images/png32.webp" },
        { name: "Австралия", lat: -24.3336, lon: 133.692, flag: "./images/png31.webp" },
        { name: "Сингапур", lat: 1.3642, lon: 103.8192, flag: "./images/png30.webp" },
        { name: "Канада", lat: 56.7656, lon: -106.5872, flag: "./images/png28.webp" },
        { name: "Россия", lat: 62.14389, lon: 105.57000, flag: "./images/png26.webp" },
        { name: "Китай", lat: 36.89389, lon: 104.08444, flag: "./images/png24.webp" },
        { name: "Бруней", lat: 4.5714, lon: 114.7292, flag: "./images/png17.webp" },
        { name: "Япония", lat: 36.5556, lon: 138.2319, flag: "./images/png13.webp" },
        { name: "Таиланд", lat: 16.0928, lon: 100.9325, flag: "./images/png09.webp" },
        { name: "Малайзия", lat: 4.4483, lon: 101.9172, flag: "./images/png04.webp" },
        { name: "Индонезия", lat: 0.5225, lon: 114.0325, flag: "./images/png03.webp" },
        { name: "Республика Корея", lat: 36.002, lon: 127.7617, flag: "./images/png01.webp" }
    ]
};

let activeOrganization = null;
let activePillars = [];

// Update the DOM with country list
function updateCountryList(orgName) {
    const countryList = document.getElementById('country-list');
    countryList.innerHTML = '';

    organizations[orgName].forEach((country, index) => {
        const countryItem = document.createElement('div');
        countryItem.className = 'country-item';

        const flag = document.createElement('img');
        flag.alt = country.name;
        flag.src = country.flag;

        const name = document.createElement('span');
        name.className = 'country-name';
        name.textContent = country.name;

        countryItem.appendChild(name);
        countryItem.appendChild(flag);
        countryItem.addEventListener('click', () => focusOnCountry(index, orgName));

        countryList.appendChild(countryItem);
    });
}

// Add event listeners to organization buttons
document.querySelectorAll('.organization-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const orgName = btn.dataset.org;

        // Remove active class from all buttons
        document.querySelectorAll('.organization-btn').forEach(b => b.classList.remove('active'));

        // Add active class to clicked button
        btn.classList.add('active');

        // Remove existing pillars
        activePillars.forEach(pillar => earthGroup.remove(pillar));
        activePillars = [];

        // Create new pillars for selected organization
        organizations[orgName].forEach(country => {
            const pillar = createLightPillar(country.name, country.lat, country.lon);
            earthGroup.add(pillar);
            activePillars.push(pillar);
        });

        // Update country list
        updateCountryList(orgName);
        activeOrganization = orgName;
    });
});

let currentFocusedGroup = null;

// Update focusOnCountry function to work with organization structure
function focusOnCountry(index, orgName) {
    const country = organizations[orgName][index];
    const phi = (90 - country.lat) * (Math.PI / 180);
    const theta = (country.lon + 200) * (Math.PI / 180);
    // const theta = (country.lon + 180) * (Math.PI / 180);

    // Calculate the position on the surface of the Earth
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = -Math.sin(phi) * Math.sin(theta);

    // Position camera further from the pillar
    const distance = 3; // Increased from 2 to stay further out
    const targetX = x * distance;
    const targetY = y * distance;
    const targetZ = z * distance;

    // Reset previous focused group
    if (currentFocusedGroup) {
        const pillar = currentFocusedGroup.children[0];
        pillar.material.uniforms.hoverIntensity.value = 0.0;
    }

    // Set new focused group
    currentFocusedGroup = earthGroup.children.find(child =>
        child.userData && child.userData.country === country.name
    );

    if (currentFocusedGroup) {
        const pillar = currentFocusedGroup.children[0];
        pillar.material.uniforms.hoverIntensity.value = 2.0;
    }

    // Calculate arc path points
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(targetX, targetY, targetZ);
    const arcPoints = calculateArcPath(startPos, endPos, 10);

    // Animate along the arc path
    let progress = 0;
    gsap.to({}, {
        progress: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function () {
            progress = this.progress();
            const point = getPointOnPath(arcPoints, progress);
            camera.position.copy(point);
            camera.lookAt(new THREE.Vector3(targetX, targetY, targetZ)); // Look at target position
            checkCameraMovement();
        },
        onComplete: () => {
            controls.update();
            isMoving = false;
        }
    });
}

// Helper function to calculate arc path points
function calculateArcPath(start, end, numPoints) {
    const points = [];
    const center = new THREE.Vector3(0, 0, 0);

    // Ensure minimum distance from Earth's surface
    const minRadius = Math.max(start.length(), end.length(), 2.5);

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const point = new THREE.Vector3().lerpVectors(start, end, t);
        // Maintain distance from center
        point.normalize().multiplyScalar(minRadius);
        points.push(point);
    }
    return points;
}

// Helper function to get point on path
function getPointOnPath(points, progress) {
    const index = (points.length - 1) * progress;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const t = index % 1;

    if (upper >= points.length) return points[points.length - 1];

    const point = new THREE.Vector3();
    point.lerpVectors(points[lower], points[upper], t);
    return point;
}

let isMoving = false;
let movementTimeout;

function checkCameraMovement() {
    isMoving = true;
    clearTimeout(movementTimeout);
    movementTimeout = setTimeout(() => {
        isMoving = false;
    }, 500);
}

controls.addEventListener('change', checkCameraMovement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousemove', onMouseMove, false);

// controls.addEventListener("start", () => {
//     isHoverable = false;
//     isRotating1 = true;
//     pointer = new THREE.Vector2(-1, -1);
//     gsap.to(earthGroup.scale, {
//         duration: 0.3,
//         x: 0.9,
//         y: 0.9,
//         z: 0.9,
//         ease: "power1.inOut",
//     });
//     gsap.to(atmosphereMesh.scale, {
//         duration: 0.3,
//         x: 0.92, // Минимальный масштаб выше 0.01
//         y: 0.92,
//         z: 0.92,
//         ease: "power1.inOut",
//     });
//     // gsap.to(stars.scale, {
//     //     duration: 0.3,
//     //     x: 0.5,
//     //     y: 0.5,
//     //     z: 0.5,
//     //     ease: "power1.inOut",
//     // });

//     if (currentStars) {
//         gsap.to(currentStars.scale, {
//             duration: 0.3,
//             x: 0.5,
//             y: 0.5,
//             z: 0.5,
//             ease: "power1.inOut",
//         });
//     }
// });

// controls.addEventListener("end", () => {
//     gsap.to(earthGroup.scale, {
//         duration: 0.6,
//         x: 1,
//         y: 1,
//         z: 1,
//         ease: "back(1.7).out",
//         onComplete: () => {
//             isHoverable = true;
//             isRotating1 = false;
//         },
//     });
//     gsap.to(atmosphereMesh.scale, {
//         duration: 0.6,
//         x: 1.02,
//         y: 1.02,
//         z: 1.02,
//         ease: "back(1.7).out",
//         onComplete: () => {
//             isHoverable = true;
//             isRotating1 = false;
//         },
//     });
//     // gsap.to(stars.scale, {
//     //     duration: 0.6,
//     //     x: 1,
//     //     y: 1,
//     //     z: 1,
//     //     ease: "back(1.7).out",
//     // });
//     if (currentStars) {
//         gsap.to(currentStars.scale, {
//             duration: 0.6,
//             x: 1,
//             y: 1,
//             z: 1,
//             ease: "back(1.7).out",
//         });
//     }
// });

controls.addEventListener("start", () => {
    isHoverable = false;
    isRotating1 = true;
    pointer = new THREE.Vector2(-1, -1);

    gsap.to(earthGroup.scale, {
        duration: 0.3,
        x: 0.9,
        y: 0.9,
        z: 0.9,
        ease: "power1.inOut",
    });
    gsap.to(atmosphereMesh.scale, {
        duration: 0.3,
        x: 0.92,
        y: 0.92,
        z: 0.92,
        ease: "power1.inOut",
    });

    // Универсальная анимация сжатия звёзд
    if (params.starVariant === "Первый вариант" && currentStars instanceof Stars) {
        gsap.to(currentStars.getPoints().scale, {
            duration: 0.3,
            x: 0.5,
            y: 0.5,
            z: 0.5,
            ease: "power1.inOut",
        });
    } else if (params.starVariant === "Второй вариант" && currentStars) {
        // Сжимаем все звезды второго варианта
        gsap.to(currentStars.scale, {
            duration: 0.3,
            x: 0.5,
            y: 0.5,
            z: 0.5,
            ease: "power1.inOut",
        });
    }
});

controls.addEventListener("end", () => {
    gsap.to(earthGroup.scale, {
        duration: 0.6,
        x: 1,
        y: 1,
        z: 1,
        ease: "back(1.7).out",
        onComplete: () => {
            isHoverable = true;
            isRotating1 = false;
        },
    });
    gsap.to(atmosphereMesh.scale, {
        duration: 0.6,
        x: 1.02,
        y: 1.02,
        z: 1.02,
        ease: "back(1.7).out",
    });

    // Восстанавливаем звезды
    if (params.starVariant === "Первый вариант" && currentStars instanceof Stars) {
        gsap.to(currentStars.getPoints().scale, {
            duration: 0.6,
            x: 1,
            y: 1,
            z: 1,
            ease: "back(1.7).out",
        });
    } else if (params.starVariant === "Второй вариант" && currentStars) {
        gsap.to(currentStars.scale, {
            duration: 0.6,
            x: 1,
            y: 1,
            z: 1,
            ease: "back(1.7).out",
        });
    }
});


let hoveredGroup = null;

function checkIntersections() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(earthGroup.children);

    if (intersects.length > 0) {
        const intersectedGroup = intersects[0].object;
        if (intersectedGroup.userData && intersectedGroup.userData.country) {
            highlightPillar(intersectedGroup);
        }
    }
}

function highlightPillar(group) {
    group.children.forEach(child => {
        if (child.material && child.material.uniforms) {
            gsap.to(child.material.uniforms.hoverIntensity, { value: 5.0, duration: 0.3 });
        }
    });
}

// Функция для анимации вращения
function animateRotation() {
    if (!isMouseDown) {
        // Вращение по оси Y с инерцией
        earthGroup.rotation.y += velocityX;

        // Если включён возврат к горизонтальному вращению
        if (horizontalOnly) {
            // Плавно уменьшаем угол по оси X до 0
            earthGroup.rotation.x *= damping;
            if (Math.abs(earthGroup.rotation.x) < 0.001) {
                earthGroup.rotation.x = 0; // Останавливаем вращение
            }
        } else {
            // Вращение по оси X с инерцией
            earthGroup.rotation.x += velocityY;
        }

        // Применяем затухание к скоростям
        velocityX *= damping;
        velocityY *= damping;

        // Останавливаем вращение, если скорости почти равны 0
        if (Math.abs(velocityX) < 0.0001) velocityX = 0;
        if (Math.abs(velocityY) < 0.0001) velocityY = 0;

    }

    // Обновляем рендер сцены
    renderer.render(scene, camera);
    requestAnimationFrame(animateRotation);
}

// Запуск анимации вращения
animateRotation();

const initialCameraPosition = camera.position.clone(); // Позиция камеры
const initialCameraTarget = controls.target.clone(); // Точка, куда камера смотрит

function resetCameraPosition() {
    // Плавное возвращение камеры
    gsap.to(camera.position, {
        x: initialCameraPosition.x,
        y: initialCameraPosition.y,
        z: initialCameraPosition.z,
        duration: 1.5, // Время анимации
        ease: "power2.out",
        onUpdate: () => {
            camera.lookAt(controls.target); // Сохраняем направление взгляда
        },
        onComplete: () => {
            // Восстановление target для OrbitControls
            controls.target.copy(initialCameraTarget);
            controls.update();
        },
    });
}

// function resetCameraPosition() {
//     // Определяем только горизонтальное смещение
//     const horizontalPosition = {
//         x: camera.position.x,
//         z: camera.position.z,
//     };

//     // Плавное возвращение камеры
//     gsap.to(camera.position, {
//         x: horizontalPosition.x, // Возвращаем только горизонтальную позицию
//         y: initialCameraPosition.y, // Возвращаем высоту к начальному значению
//         z: horizontalPosition.z, // Возвращаем только горизонтальную позицию
//         duration: 1.5, // Время анимации
//         ease: "power2.out",
//         onUpdate: () => {
//             // Плавно следим за движением камеры
//             camera.lookAt(controls.target);
//         },
//         onComplete: () => {
//             // Обновляем target для OrbitControls
//             controls.target.copy(initialCameraTarget);
//             controls.update();
//         },
//     });
// }

window.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        // Изменение координат мыши
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        // Определяем скорость вращения по осям X 
        velocityX = deltaX * 0.001;
        velocityY = deltaY * 0.001;

        // Обновляем последние координаты мыши
        lastX = event.clientX;
        lastY = event.clientY;
    }
});

window.addEventListener("mousedown", (event) => {
    // isMouseDown = true; // Начинаем движение
    // lastX = event.clientX;
    // velocityX = 0;  // Сбрасываем начальную скорость

    isMouseDown = true; // Начинаем вращение
    horizontalOnly = false; // Отключаем возврат к горизонтальному
    lastX = event.clientX;
    lastY = event.clientY;
    velocityX = 0; // Сбрасываем скорость
    velocityY = 0; // Сбрасываем скорость

});

window.addEventListener("mouseup", () => {
    isMouseDown = false; // Останавливаем движение
    horizontalOnly = true; // Включаем возврат к горизонтальному вращению

    resetCameraPosition();
});

window.addEventListener("wheel", () => {
    // Остановить вращение при прокрутке колесика
    velocityX = 0;
    velocityY = 0;
});

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleWindowResize, false);

// Create GUI for controlling rotation and starfield speed
const gui = new dat.GUI();

//----------------- Планета -------------------//
const planetFolder = gui.addFolder("Планета");

planetFolder.add(params, 'bumpScale', 0.3, 2.0).name('Глубина рельефа').onChange((value) => {
    earthMaterial.bumpScale = value;
});

planetFolder.add(params, 'atmosphereOpacity', 0.0, 1.0).name('Прозрачность атмосферы').onChange((value) => {
    atmosphereMaterial.uniforms.blurAmount.value = value;
});

planetFolder.addColor(params, "atmosphereColor").name("Цвет атмосферы").onChange((value) => {
    // Обновляем цвет в uniform
    atmosphereMaterial.uniforms.atmosphereColor.value.set(value);
    console.log(`Выбранный цвет атмосферы: ${value}`); // Лог выбранного цвета
});

planetFolder.add(params, 'scaleX', 0.5, 2.0).name('Масштаб X').onChange((value) => {
    atmosphereMesh.scale.x = value;
});

planetFolder.add(params, 'scaleY', 0.5, 2.0).name('Масштаб Y').onChange((value) => {
    atmosphereMesh.scale.y = value;
});

planetFolder.add(params, 'scaleZ', 0.5, 2.0).name('Масштаб Z').onChange((value) => {
    atmosphereMesh.scale.z = value;
});



planetFolder.add(params, 'cloudeOpacity', 0.1, 1).step(0.01).name('Прозрачность облаков').onChange(value => {
    lightsMat.opacity = value;
    lightsMat.needsUpdate = true;
});

planetFolder.add(params, 'cloudeOpacity', 0.0, 1.0).name("Прозрачность облаков-внутреняя").onChange((value) => {
    cloudsMat.opacity = value;
});

planetFolder.add(params, 'saturation', 0.0, 2.0).name('Насыщенность цвета').onChange((value) => {
    earthMaterial.color.setHSL(0.6, value, params.brightness);
});

planetFolder.add(params, 'brightness', 0.0, 2.0).name('Яркость цвета').onChange((value) => {
    earthMaterial.color.setHSL(0.6, params.saturation, value);
});

planetFolder.add(params, 'rotationSpeed', 0.0001, 1).name('Cкорость вращения планеты').onChange(value => {
    velocityX = value;
});

// Добавляем выбор цвета
planetFolder.addColor(params, 'color').name('Цвет планеты').onChange((value) => {
    material.color.set(value);  // Обновляем цвет материала
});

//----------------- Космос -------------------//
const spaceFolder = gui.addFolder("Космос");

spaceFolder.add(params, 'starSpeed', 0.0001, 1).name('Скорость движения звёзд').onChange(value => {
    stars.speed = value;
});

spaceFolder.add(params, 'numStars', 1000, 100000).step(1000).name('Количество звёзд').onChange(() => {
    scene.remove(stars); // Удаляем старую группу звёзд
    stars = getStars({ numStars: params.numStars, starSize: params.starSize });
    scene.add(stars);
});

spaceFolder.add(params, 'starSize', 0.01, 0.5).step(0.01).name('Размер звёзд').onChange(() => {
    scene.remove(stars);
    stars = getStars({ numStars: params.numStars, starSize: params.starSize });
    scene.add(stars);
});

// Добавляем параметры

// spaceFolder.add(stars, 'starsCount', 100, 1000000).name('Количество звёзд').onChange(value => stars.updateStarsCount(value));

// spaceFolder.add(stars, 'radius', 0.1, 5).name('Размер звёзд').onChange(value => stars.updateRadius(value));

// spaceFolder.add(stars, 'trailLength', 0, 1).name('Длина хвоста').onChange(value => stars.updateTrailLength(value));

// spaceFolder.add(stars, 'saturation', 0, 2).name('Насыщенность цвета').onChange(value => stars.updateSaturation(value));

// spaceFolder.add(stars, 'twinkleType', ['random', 'smooth']).name('Варианты мерцания').onChange(value => stars.updateTwinkleType(value));

// spaceFolder.add(stars, 'panoramaEnabled').name('Панорама').onChange(value => stars.updatePanoramaEnabled(value));

// spaceFolder.add(stars, 'depthEnabled').name('Глубина').onChange(value => stars.updateDepthEnabled(value));

//----------------- Прочее -------------------//
const miscFolder = gui.addFolder("Прочее");

miscFolder.add(params, 'buttonOpacity', 0, 1).step(0.1).name('Прозрачность кнопок').onChange((value) => {
    document.querySelectorAll('.organization-btn').forEach(btn => {
        btn.style.opacity = value;
    });
});

miscFolder.add(params, 'cityFlagOpacity', 0, 1).step(0.1).name('Прозрачность флагов').onChange((value) => {
    document.querySelectorAll('.country-item').forEach(btn => {
        btn.style.opacity = value;
    });
});

miscFolder.add(params, 'texture', textures.map(t => t.name)) // Добавляем текстуры
    .name('Текстура')
    .onChange((selectedName) => {
        const selectedTexture = textures.find(t => t.name === selectedName);
        if (selectedTexture) {
            const newTexture = loader.load(selectedTexture.path);
            lightsMat1.map = newTexture;
            lightsMat1.needsUpdate = true;
            renderer.render(scene, camera);
        } else {
            console.error("Texture not found");
        }
    });

miscFolder.add(params, 'cloudesTextures', cloudesTextures.map(t => t.name)) // Добавляем текстуры
    .name('Текстура облаков')
    .onChange((selectedName) => {
        const selectedTexture = cloudesTextures.find(t => t.name === selectedName);
        if (selectedTexture) {
            const newTexture = loader.load(selectedTexture.path);
            lightsMat.map = newTexture;
            lightsMat.needsUpdate = true;
            renderer.render(scene, camera);
        } else {
            console.error("Texture not found");
        }
    });

//----------------- Варианты звёзд -------------------//
const starsFolder = gui.addFolder("Звёзды");

starsFolder.add(params, "starVariant", ["Первый вариант", "Второй вариант"])
    .name("Вариант звёзд")
    .onChange(() => {
        updateStars(); // Обновляем звёзды при изменении варианта
    });

starsFolder.add(params, "numStars", 1000, 10000).step(500).name("Кол-во звёзд (2 вариант)");
starsFolder.add(params, "starSize", 0.1, 1).step(0.1).name("Размер звёзд (2 вариант)");
updateStars();

// Настраиваем внешний вид панели
const panel = gui.domElement;
panel.style.position = 'absolute';
panel.style.top = '10px';
panel.style.right = '10px';
panel.style.backgroundColor = 'rgba(30, 30, 30, 0.8)';
panel.style.borderRadius = '8px';
panel.style.boxShadow = '0px 5px 15px rgba(0, 0, 0, 0.3)';
document.body.appendChild(panel);


// Stats for performance monitoring

// Подключение stats.js
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.dom.style.position = 'absolute';
stats.dom.style.left = '10px';
stats.dom.style.top = '10px';

// Логирование производительности
function logPerformance() {
    const performanceEntries = performance.getEntriesByType("navigation")[0];
    // console.log("Время загрузки страницы:", performanceEntries.loadEventEnd.toFixed(2), "мс");
    // console.log("Время DOMContentLoaded:", performanceEntries.domContentLoadedEventEnd.toFixed(2), "мс");
}

window.addEventListener('load', logPerformance);

// Анимация с измерением
function animateStats() {
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animateStats);
}

// Запуск анимации
animateStats();

// function animate(currentTime) {
//     requestAnimationFrame(animate);

//     if (isRotating) {
//         earthGroup.rotation.y += params.rotationSpeed;
//     }

//     // stars.rotation.x += params.starSpeed;

//     stars.rotation.y += params.starSpeed;
//     // Pass camera to updateStarVisibility
//     stars.updateStarVisibility(isMoving, currentTime, camera);

//     checkIntersections();

//     controls.update();
//     renderer.render(scene, camera);
// }
// animate();

function animate(currentTime) {
    requestAnimationFrame(animate);

    // Вращение группы с Землёй
    if (isRotating) {
        earthGroup.rotation.y += params.rotationSpeed;
    } else if (isRotating1) {
        earthGroup.rotation.x -= params.rotationSpeed;
    }

    // cloudsMesh.rotation.y -= params.rotationSpeed * 2;

    // Вращение звёзд
    // stars.rotation.y += params.starSpeed;

    // Обновление звёзд (анимация видимости)
    // stars.updateStars({
    //     x: camera.position.x * 0.001,
    //     y: camera.position.y * 0.001,
    //     z: camera.position.z * 0.001
    // }, currentTime * 0.001);

    if (params.starVariant === "Первый вариант" && currentStars instanceof Stars) {
        currentStars.animate();
    }


    // Обновляем видимость звёзд (если используется логика видимости)
    // stars.updateStarVisibility(isMoving, currentTime, camera);

    // Проверка пересечений (например, для кликов или взаимодействий)
    checkIntersections();

    // Обновление управления камерой
    controls.update();

    // Рендер сцены
    renderer.render(scene, camera);
}
animate();
