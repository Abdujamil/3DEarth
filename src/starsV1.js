import * as THREE from 'three';

export class Stars {
    constructor(args = {}) {
        this.starsCount = args.stars || 200;
        this.velocity = args.velocity || 1;
        this.radius = args.radius || 1;
        this.trail = args.trail || true;
        this.alpha = args.alpha || 0.01;
        this.trailLength = args.trailLength || 0.1; // Длина хвоста
        this.saturation = args.saturation || 1; // Насыщенность цвета
        this.twinkleSpeed = args.twinkleSpeed || 1; // Скорость мерцания
        this.twinkleType = args.twinkleType || 'random'; // Варианты мерцания
        this.panoramaEnabled = args.panoramaEnabled || true; // Панорама
        this.depthEnabled = args.depthEnabled || true; // Глубина
        this.stars = [];
        this.center = new THREE.Vector3(0, 0, 0); // Центр сцены
        this.maxDistance = 1000; // Максимальное расстояние от центра

        this.init();
    }

    init() {
        // Создаём геометрию и материал для звёзд
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.starsCount * 3);
        const colors = new Float32Array(this.starsCount * 3);
        const sizes = new Float32Array(this.starsCount);

        for (let i = 0; i < this.starsCount; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.maxDistance;

            // Позиции звёзд
            positions[i3] = Math.sin(angle) * distance;
            positions[i3 + 1] = (Math.random() - 0.5) * 2 * this.maxDistance;
            positions[i3 + 2] = Math.cos(angle) * distance;

            // Цвета звёзд
            colors[i3] = 1; // Красный
            colors[i3 + 1] = 1; // Зелёный
            colors[i3 + 2] = 1; // Синий

            // Размеры звёзд
            sizes[i] = Math.random() * this.radius;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const vertexShader = `
        varying vec3 vColor;

        void main() {
            vColor = color; // Передаём цвет в фрагментный шейдер
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size; // Размер точки
        }
    `;

        const fragmentShader = `
        varying vec3 vColor;

        void main() {
            // Рисуем круг вместо квадрата
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) {
                discard; // Отбрасываем пиксели за пределами круга
            }
            gl_FragColor = vec4(vColor, 1.0); // Цвет точки
        }
    `;


        this.material = new THREE.PointsMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                size: { value: this.radius }, // Размер точки
            },
            size: this.radius,
            vertexColors: true,
            transparent: true,
            opacity: this.alpha,
            sizeAttenuation: true, // Звёзды уменьшаются с расстоянием
        });

        this.points = new THREE.Points(geometry, this.material);
    }

    animate() {
        const time = performance.now() * 0.00005 * this.velocity;

        const positions = this.points.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const angle = time + (i / positions.length) * Math.PI * 2;
            const distance = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2);

            // Обновляем позиции звёзд
            positions[i] = Math.sin(angle) * distance;
            positions[i + 2] = Math.cos(angle) * distance;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
    }

    getPoints() {
        return this.points;
    }

    // Методы для обновления параметров
    updateStarsCount(value) {
        this.starsCount = value;
        this.init(); // Пересоздаём звёзды
    }

    updateScale(scale) {
        this.points.scale.set(scale, scale, scale); // Изменяем масштаб
    }

    updateRadius(value) {
        this.radius = value;
        this.material.size = value;
        this.material.needsUpdate = true;
    }

    updateTrailLength(value) {
        this.trailLength = value;
        // Логика для обновления длины хвоста
    }

    updateSaturation(value) {
        this.saturation = value;
        // Логика для обновления насыщенности цвета
    }

    updateTwinkleSpeed(value) {
        this.twinkleSpeed = value;
        // Логика для обновления скорости мерцания
    }

    updateTwinkleType(value) {
        this.twinkleType = value;
        // Логика для обновления вариантов мерцания
    }

    updatePanoramaEnabled(value) {
        this.panoramaEnabled = value;
        // Логика для включения/выключения панорамы
    }

    updateDepthEnabled(value) {
        this.depthEnabled = value;
        // Логика для включения/выключения глубины
    }
}