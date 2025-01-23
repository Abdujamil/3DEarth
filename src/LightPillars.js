import * as THREE from "three";

export function createLightPillar(country, lat, lon, color = 0xffffff) {
    // Calculate the position of the pillar based on latitude and longitude
    const position = getPositionFromLatLon(lat, lon);

    // Create the main pillar
    const pillarGeometry = new THREE.CylinderGeometry(0.002, 0.002, 2, 8, 1, true);
    const pillarMaterial = createPillarMaterial(color);
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);

    // Create the triangular base
    const baseGeometry = new THREE.CylinderGeometry(0, 0.024, 0.015, 8, 1, false);
    const base = new THREE.Mesh(baseGeometry, pillarMaterial);

    // Position and orient the pillar and base
    pillar.position.copy(position);
    pillar.lookAt(0, 0, 0);
    pillar.rotateX(Math.PI / 2);

    base.position.copy(position);
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
        ease: "power2.out",
    });

    return group;
}

function getPositionFromLatLon(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        -Math.sin(phi) * Math.sin(theta)
    );
}

function createPillarMaterial(color) {
    return new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(color) },
            glowIntensity: { value: 0.0 },
            hoverIntensity: { value: 0.0 },
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
}