import * as THREE from "three";

// Base
// export function getStars({ numStars = 500, starSize = 0.5 } = {}) {
//     const STAR_COLOR = 0xffffff; // Цвет звёзд
//     const STAR_MIN_SCALE = 0.5;
//     const STAR_MAX_SCALE = 1;

//     const stars = [];
//     const positions = [];
//     const scales = [];
//     const initialOpacity = [];

//     // Генерация звёзд
//     for (let i = 0; i < numStars; i++) {
//         const x = (Math.random() - 0.5) * 100;
//         const y = (Math.random() - 0.5) * 100;
//         const z = (Math.random() - 0.5) * 100;

//         const scale = THREE.MathUtils.lerp(STAR_MIN_SCALE, STAR_MAX_SCALE, Math.random());
//         const opacity = Math.random() * 0.5 + 0.5;

//         positions.push(x, y, z);
//         scales.push(scale);
//         initialOpacity.push(opacity);

//         stars.push({ x, y, z, scale, opacity });
//     }

//     // Создаем геометрию для звёзд
//     const geometry = new THREE.BufferGeometry();
//     geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
//     geometry.setAttribute("scale", new THREE.Float32BufferAttribute(scales, 1));
//     geometry.setAttribute("opacity", new THREE.Float32BufferAttribute(initialOpacity, 1));

//     // Материал для звёзд без текстуры (если не хотите использовать текстуру, удалите map)
//     const material = new THREE.PointsMaterial({
//         color: STAR_COLOR,
//         size: starSize,  // Размер звезды
//         sizeAttenuation: true,  // Отключаем изменение размера в зависимости от расстояния
//         transparent: true,
//         opacity: 1,
//         map: new THREE.TextureLoader().load("./textures/stars/circle.png"), // Картинка с круглыми звездами (обязательно круглая текстура)
//     });

//     // Создаем объект звёзд
//     const points = new THREE.Points(geometry, material);

//     // Метод обновления для анимации
//     points.updateStars = function (velocity = { x: 0, y: 0, z: 0 }, time) {
//         const positions = geometry.attributes.position.array;
//         const scales = geometry.attributes.scale.array;
//         const opacities = geometry.attributes.opacity.array;

//         for (let i = 0; i < positions.length; i += 3) {
//             positions[i] += velocity.x;
//             positions[i + 1] += velocity.y;
//             positions[i + 2] += velocity.z;

//             // Рециклинг звёзд, чтобы они не выходили за пределы
//             if (positions[i] > 50) positions[i] = -50;
//             if (positions[i + 1] > 50) positions[i + 1] = -50;
//             if (positions[i + 2] > 50) positions[i + 2] = -50;

//             // Обновление масштаба и прозрачности для мерцания
//             scales[i / 3] = STAR_MIN_SCALE + Math.sin(time + i) * (STAR_MAX_SCALE - STAR_MIN_SCALE) * 0.5;
//             opacities[i / 3] = 0.5 + Math.sin(time * 0.5 + i * 0.1) * 0.5; // Мерцание прозрачности
//         }

//         geometry.attributes.position.needsUpdate = true;
//         geometry.attributes.scale.needsUpdate = true;
//         geometry.attributes.opacity.needsUpdate = true;

//         // Применение обновлённой прозрачности
//         material.opacity = 1; // Глобальная прозрачность не используется
//     };

//     return points;
// }

export function getStars({ numStars = 500, starSize = 0.5, minDistance = 20, maxDistance = 50 } = {}) {
    const STAR_COLOR = 0xffffff; // Цвет звёзд
    const STAR_MIN_SCALE = 0.5;
    const STAR_MAX_SCALE = 1;

    const stars = [];
    const positions = [];
    const scales = [];
    const initialOpacity = [];

    // Генерация звёзд
    for (let i = 0; i < numStars; i++) {
        let x, y, z, distance;

        // Генерируем координаты до тех пор, пока расстояние от центра не будет удовлетворять условиям
        do {
            x = (Math.random() - 0.5) * 2 * maxDistance;
            y = (Math.random() - 0.5) * 2 * maxDistance;
            z = (Math.random() - 0.5) * 2 * maxDistance;
            distance = Math.sqrt(x * x + y * y + z * z); // Расстояние от центра
        } while (distance < minDistance || distance > maxDistance);

        const scale = THREE.MathUtils.lerp(STAR_MIN_SCALE, STAR_MAX_SCALE, Math.random());
        const opacity = Math.random() * 0.5 + 0.5;

        positions.push(x, y, z);
        scales.push(scale);
        initialOpacity.push(opacity);

        stars.push({ x, y, z, scale, opacity });
    }

    // Создаем геометрию для звёзд
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.Float32BufferAttribute(scales, 1));
    geometry.setAttribute("opacity", new THREE.Float32BufferAttribute(initialOpacity, 1));

    // Материал для звёзд
    const material = new THREE.PointsMaterial({
        color: STAR_COLOR,
        size: starSize, // Размер звезды
        sizeAttenuation: true, // Включаем уменьшение размера звезды с расстоянием
        transparent: true,
        opacity: 1,
        map: new THREE.TextureLoader().load("./textures/stars/circle.png"), // Текстура звезды
    });

    // Создаем объект звёзд
    const points = new THREE.Points(geometry, material);

    // Метод обновления для анимации
    points.updateStars = function (velocity = { x: 0, y: 0, z: 0 }, time) {
        const positions = geometry.attributes.position.array;
        const scales = geometry.attributes.scale.array;
        const opacities = geometry.attributes.opacity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocity.x;
            positions[i + 1] += velocity.y;
            positions[i + 2] += velocity.z;

            // Проверяем расстояние от центра и рециклируем звезды
            const distance = Math.sqrt(
                positions[i] * positions[i] +
                positions[i + 1] * positions[i + 1] +
                positions[i + 2] * positions[i + 2]
            );
            if (distance > maxDistance || distance < minDistance) {
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI;
                const newDistance = THREE.MathUtils.randFloat(minDistance, maxDistance);

                positions[i] = newDistance * Math.sin(angle2) * Math.cos(angle1);
                positions[i + 1] = newDistance * Math.sin(angle2) * Math.sin(angle1);
                positions[i + 2] = newDistance * Math.cos(angle2);
            }

            // Обновление масштаба и прозрачности для мерцания
            scales[i / 3] = STAR_MIN_SCALE + Math.sin(time + i) * (STAR_MAX_SCALE - STAR_MIN_SCALE) * 0.5;
            opacities[i / 3] = 0.5 + Math.sin(time * 0.5 + i * 0.1) * 0.5; // Мерцание прозрачности
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.scale.needsUpdate = true;
        geometry.attributes.opacity.needsUpdate = true;

        // Применение обновлённой прозрачности
        material.opacity = 1; // Глобальная прозрачность не используется
    };

    return points;
}


// base2
// export function getStars({ numStars = 1000, starSize = 0.05 }) {
//     const starsGroup = new THREE.Group(); // Группа для всех звезд
//     const starGeometry = new THREE.SphereGeometry(starSize, 8, 8); // Звезда как маленькая сфера
//     const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }); // Белый цвет с прозрачностью

//     const radius = 1000; // Радиус "пространства звезд"

//     for (let i = 0; i < numStars; i++) {
//         const star = new THREE.Mesh(starGeometry, starMaterial);

//         // Случайное положение звезды в сфере вокруг центра
//         const x = THREE.MathUtils.randFloatSpread(radius);
//         const y = THREE.MathUtils.randFloatSpread(radius);
//         const z = THREE.MathUtils.randFloatSpread(radius);

//         star.position.set(x, y, z);
//         star.userData.baseOpacity = Math.random() * 0.5 + 0.5; // Базовая прозрачность (0.5–1.0)
//         star.userData.timeOffset = Math.random() * Math.PI * 2; // Фаза синусоиды для разнообразия
//         starsGroup.add(star);
//     }

//     // Добавляем метод updateStars в группу
//     starsGroup.updateStars = function ({ x = 0, y = 0, z = 0 }, elapsedTime) {
//         this.children.forEach((star) => {
//             // Обновляем позицию звезды
//             star.position.x += x;
//             star.position.y += y;
//             star.position.z += z;

//             // Если звезда выходит за пределы радиуса, возвращаем её назад
//             if (star.position.length() > radius) {
//                 star.position.set(
//                     THREE.MathUtils.randFloatSpread(radius),
//                     THREE.MathUtils.randFloatSpread(radius),
//                     THREE.MathUtils.randFloatSpread(radius)
//                 );
//             }

//             // Обновляем прозрачность для эффекта мерцания
//             const baseOpacity = star.userData.baseOpacity;
//             const timeOffset = star.userData.timeOffset;
//             star.material.opacity = baseOpacity + Math.sin(elapsedTime + timeOffset) * 0.25; // Колебания прозрачности (0.25–0.75)
//         });
//     };

//     return starsGroup; // Возвращаем группу звезд
// }



