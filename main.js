import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { TextGeometry } from 'jsm/geometries/TextGeometry.js';
import { FontLoader } from 'jsm/loaders/FontLoader.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

window.addEventListener('load', () => {
    // Симуляция загрузки от 0 до 100 (прогресс)
    let progress = 0;
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');
    const loadingText = document.querySelector('.loading-text');

    // Функция для обновления прогресса загрузки
    function updateProgress() {
        if (progress < 100) {
            progress++;
            loadingText.textContent = `Загрузка... ${progress}%`;
            setTimeout(updateProgress, 20);  // Частота обновления (20 мс)
        } else {
            // Завершаем анимацию прелоадера
            setTimeout(() => {
                // Плавное исчезновение
                preloader.style.opacity = '0'; // Начинаем плавное исчезновение
                preloader.style.transition = 'opacity 1s ease'; // Задаем плавный переход

                // После завершения анимации прелоадера показываем основной контент
                setTimeout(() => {
                    preloader.style.display = 'none';  // Полностью скрываем прелоадер
                    mainContent.style.display = 'block'; // Показываем основной контент
                }, 1000);  // Задержка для завершения анимации исчезновения (1 секунда)
            }, 500); // Задержка перед началом анимации исчезновения
        }
    }

    updateProgress();
});



const w = window.innerWidth;
const h = window.innerHeight;
let isRotating = true;
let isMouseDown = false;

let lastX = 0;
let lastY = 0;
let velocityX = 0; // Начальная скорость вращения по оси X
let velocityY = 0; // Начальная скорость вращения по оси Y
let damping = 0.98; // Коэффициент затухания (чем ближе к 1, тем дольше вращение)
let scaleFactor = 1;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
camera.position.z = 4.5;
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(w, h);

document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.minDistance = 5;
controls.maxDistance = 5;
controls.minPolarAngle = Math.PI / 2; // Ограничить угол (горизонтальная плоскость)
controls.maxPolarAngle = Math.PI / 2; // Ограничить угол (горизонтальная плоскость)
controls.enablePan = false; // Отключить панорамирование

const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
    map: loader.load("./textures/00_earthmap1k.webp"),
    specularMap: loader.load("./textures/02_earthspec1k.webp"),
    bumpMap: loader.load("./textures/01_earthbump1k.webp"),
    bumpScale: 0.04,
    color: 0x9aa5a6,
    saturation: 0,
});

const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/8k_earth_nightmap.webp"),
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
    opacity: 1
});

const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
    map: loader.load("./textures/8k_earth_clouds.webp"),
    transparent: true,
    opacity: 0.7,  // Reduced from 0.8 to make clouds less dense
    blending: THREE.AdditiveBlending,
    alphaMap: loader.load('./textures/05_earthcloudmaptrans.webp'),
    color: 0xffffff  // Changed from 0xe0e0e0 to white for brighter clouds
});

const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({ numStars: 2000 });
stars.material.transparent = true;
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.5); // Increased intensity from 2.0 to 2.5
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

function createLightPillar(country, lat, lon, color = 0xffffff) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = -Math.sin(phi) * Math.sin(theta);

    const pillarHeight = 2;
    const pillarRadius = 0.002;
    const baseHeight = 0.015;
    const baseRadius = pillarRadius * 12;

    // Create the main pillar
    const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 8, 1, true);

    // Create the triangular base
    const baseGeometry = new THREE.CylinderGeometry(0, baseRadius, baseHeight, 8, 1, false);

    const pillarMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(color) },
            glowIntensity: { value: 2.0 },
            hoverIntensity: { value: 0.0 }
        },
        vertexShader: `
      uniform float hoverIntensity;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;

        // Simple scale effect on hover
        vec3 scaled = position * (1.0 + hoverIntensity * 0.15);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled, 1.0);
      }
    `,
        fragmentShader: `
      uniform vec3 color;
      uniform float glowIntensity;
      uniform float hoverIntensity;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float facing = dot(vNormal, viewDir);

        float distanceFromCenter = length(vUv - vec2(0.5, 0.5)) * 2.0;
        float intensity = exp(-distanceFromCenter * 4.0) * (glowIntensity + (hoverIntensity * step(facing, 0.0)));
        float yFalloff = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        intensity *= yFalloff;
        gl_FragColor = vec4(color * intensity, intensity * 0.8);
      }
    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });

    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    const base = new THREE.Mesh(baseGeometry, pillarMaterial);

    // Position and orient the pillar and base
    pillar.position.set(x, y, z);
    pillar.lookAt(0, 0, 0);
    pillar.rotateX(Math.PI / 2);

    base.position.set(x, y, z);
    base.lookAt(0, 0, 0);
    base.rotateX(Math.PI / 2);

    // Adjust the scale to position slightly above the Earth's surface
    const scaleAboveEarth = 1.01;
    pillar.scale.setScalar(scaleAboveEarth);
    base.scale.setScalar(scaleAboveEarth);

    const group = new THREE.Group();
    group.add(pillar);
    group.add(base);
    group.userData = { country: country };

    // Animate only the pillar, not the base
    gsap.from(pillar.scale, {
        y: 0,
        duration: 2,
        ease: "power2.out"
    });

    return group;
}

// Replace the existing countries array with this organization structure
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
            gsap.to(child.material.uniforms.hoverIntensity, { value: 2.0, duration: 0.3 });
        }
    });
}


// Анимация вращения с инерцией
function animateRotation() {
    if (!isMouseDown) {
        // Вращение по осям с инерцией
        earthGroup.rotation.y += velocityX;
        earthGroup.rotation.x += velocityY;

        // Применяем затухание скорости
        velocityX *= damping;
        velocityY *= damping;

        // Останавливаем вращение, если скорость становится очень маленькой
        if (Math.abs(velocityX) < 0.0001) velocityX = 0;
        if (Math.abs(velocityY) < 0.0001) velocityY = 0;
    }

    // Обновляем рендер сцены
    renderer.render(scene, camera);
    requestAnimationFrame(animateRotation);
}

// Запуск анимации вращения
animateRotation();

window.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        // Изменение координат мыши
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        // Определяем скорость вращения по осям X и Y
        velocityX = deltaX * 0.001;
        velocityY = deltaY * 0.001;

        // Обновляем последние координаты мыши
        lastX = event.clientX;
        lastY = event.clientY;
    }
});

window.addEventListener("mousedown", (event) => {
    isMouseDown = true; // Начинаем движение
    lastX = event.clientX;
    lastY = event.clientY;
    velocityX = 0;  // Сбрасываем начальную скорость
    velocityY = 0;
});

window.addEventListener("mouseup", () => {
    isMouseDown = false; // Останавливаем движение
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
const params = {
    rotationSpeed: 0.0003,
    starSpeed: 0.0001
};

gui.add(params, 'rotationSpeed', 0.0001, 0.005).name('Speed Rotation').onChange(value => {
    velocityX = value;
    velocityY = value;
});

gui.add(params, 'starSpeed', 0.0001, 0.005).name('Speed Stars').onChange(value => {
    stars.speed = value;
});

const panel = gui.domElement;
panel.style.position = 'absolute';
panel.style.top = '10px';
panel.style.right = '10px';
panel.style.backgroundColor = 'rgba(30, 30, 30, 0.8)'; // Тёмный полупрозрачный фон
panel.style.borderRadius = '8px'; // Скругленные углы
panel.style.boxShadow = '0px 5px 15px rgba(0, 0, 0, 0.3)'; // Тень для панели
document.body.appendChild(panel);


function animate(currentTime) {
    requestAnimationFrame(animate);

    if (isRotating) {
        earthGroup.rotation.y += params.rotationSpeed;
    }

    // stars.rotation.x += params.starSpeed;
    stars.rotation.y += params.starSpeed;

    // Pass camera to updateStarVisibility
    stars.updateStarVisibility(isMoving, currentTime, camera);

    checkIntersections();

    controls.update();
    renderer.render(scene, camera);
}
animate();
