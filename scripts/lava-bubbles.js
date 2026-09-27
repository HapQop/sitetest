class LavaBubbleSystem {
  constructor() {
    if (!window.THREE || document.querySelector(".ambient-orbs")) return;

    const system = this;
    const THREE = window.THREE;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 700;
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
    const minPixelRatio = Math.min(maxPixelRatio, mobile ? 0.75 : Math.max(0.75, maxPixelRatio * 0.67));
    let pixelRatio = maxPixelRatio;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      return;
    }

    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    const container = document.createElement("div");
    container.className = "ambient-orbs";
    container.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    document.body.prepend(container);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2200);
    camera.position.z = 1000;
    const sphere = new THREE.SphereGeometry(1, mobile ? 64 : 88, mobile ? 48 : 64);
    const quad = new THREE.PlaneGeometry(2, 2);
    const pointer = { x: null, y: null };
    const targetVisible = 8;
    const poolSize = targetVisible;
    const world = [];

    const vertexShader = `
      uniform float uTime;
      uniform float uPhase;
      uniform vec3 uShape;
      uniform vec2 uPointer;
      uniform float uPressure;
      uniform vec2 uNeighbor;
      uniform float uNeighborStrength;
      uniform float uEmergence;
      varying vec3 vPoint;
      varying vec3 vNormal;
      varying vec3 vView;

      void main() {
        vec3 n = normalize(position);
        float slow = uTime * 0.19 + uPhase;
        float swell = 0.060 * sin(n.x * 3.8 + slow) * sin(n.y * 4.5 - n.z * 1.8)
                    + 0.042 * sin(n.y * 5.7 + n.z * 3.1 - slow * 0.8)
                    + 0.020 * sin(n.x * 8.4 - n.z * 5.2 + slow * 0.65);
        vec3 p = n * (1.0 + swell) * uShape;
        p.xy *= mix(vec2(0.57, 0.82), vec2(1.0), uEmergence);
        p.y += (1.0 - uEmergence) * (0.14 + 0.11 * (1.0 - n.y));
        vec2 delta = p.xy - uPointer;
        float dent = exp(-dot(delta, delta) * 6.0) * uPressure * smoothstep(-0.1, 0.45, n.z);
        p -= n * dent * 0.13;
        float travelingWave = sin(length(delta) * 9.0 - uTime * 1.3) * exp(-length(delta) * 3.5);
        p += n * travelingWave * uPressure * 0.012;
        p.xy -= normalize(uPointer + vec2(0.0001)) * uPressure * 0.014 *
                (1.0 - smoothstep(-0.7, 0.0, dot(n.xy, normalize(uPointer + vec2(0.0001)))));

        vec2 towardNeighbor = normalize(uNeighbor + vec2(0.0001));
        float meeting = pow(max(dot(normalize(n.xy + vec2(0.0001)), towardNeighbor), 0.0), 5.0);
        p.xy += towardNeighbor * meeting * uNeighborStrength * 0.11;

        vec3 normal = normalize(n / uShape);
        normal.xy += delta * dent * 1.35;
        normal.xy += vec2(swell * 0.5, -swell * 0.4);
        vNormal = normalize(normalMatrix * normal);
        vPoint = p;
        vec4 eye = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-eye.xyz);
        gl_Position = projectionMatrix * eye;
      }
    `;

    const liquidFunctions = `
      uniform float uDetail;
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }
      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
          mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        float value = noise3(p) * 0.56 + noise3(p * 2.03) * 0.29;
        if (uDetail > 0.5) value += noise3(p * 4.07) * 0.15;
        return value;
      }
      vec4 liquid(vec3 p, float time, float phase) {
        float t = time * 0.10;
        vec3 q = p * 2.2 + vec3(phase * 0.37, -t, t * 0.46);
        vec3 warp = vec3(
          fbm(q + vec3(0.0, t, 1.7)),
          fbm(q + vec3(8.3, -t * 0.8, 3.1)),
          fbm(q + vec3(2.4, 5.7, t * 0.7))
        );
        vec3 flow = q + (warp - 0.5) * 2.1;
        float body = fbm(flow * 1.10);
        float folds = fbm(flow * 1.45 + vec3(-t * 0.45, 2.0, t));
        float thread = abs(folds - 0.51 + 0.08 * sin(flow.y * 2.5 + flow.z));
        float veins = 1.0 - smoothstep(0.012, 0.063, thread);
        float fine = 0.0;
        if (uDetail > 0.5) {
          fine = 1.0 - smoothstep(0.012, 0.050,
            abs(fbm(flow * 3.2 + 9.0) - 0.51));
        }
        return vec4(body, folds, veins, fine);
      }
    `;

    const shellShader = `
      uniform float uTime;
      uniform float uFlowTime;
      uniform float uPhase;
      uniform float uFade;
      uniform vec3 uTint;
      varying vec3 vPoint;
      varying vec3 vNormal;
      varying vec3 vView;
      ${liquidFunctions}
      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(vView);
        vec4 fluid = liquid(vPoint, uFlowTime, uPhase);
        float facing = max(dot(n, view), 0.0);
        float rim = pow(1.0 - facing, 2.0);
        vec3 key = normalize(vec3(-0.52, 0.73, 0.48));
        float light = max(dot(n, key), 0.0);
        float shade = max(dot(n, normalize(vec3(0.8, -0.3, 0.35))), 0.0);
        float glint = pow(max(dot(reflect(-key, n), view), 0.0), 38.0);
        float hot = smoothstep(0.48, 0.72, fluid.x) * 0.30 + fluid.z * 0.57 + fluid.w * 0.08;
        vec3 dark = vec3(0.24, 0.055, 0.025);
        vec3 molten = uTint * (0.58 + fluid.y * 0.55 + light * 0.45 - shade * 0.18);
        vec3 color = mix(dark, molten, smoothstep(0.23, 0.68, fluid.x));
        color = mix(color, vec3(0.39, 0.23, 0.16),
                    smoothstep(0.61, 0.78, fluid.y) * (1.0 - fluid.z) * 0.32);
        color += vec3(1.0, 0.46, 0.09) * hot;
        color += vec3(1.0, 0.70, 0.27) * fluid.z * 0.34;
        color += vec3(1.0, 0.66, 0.32) * rim * (0.22 + fluid.x * 0.18);
        color += vec3(1.0, 0.79, 0.51) * glint * 0.23;
        float alpha = 0.37 + fluid.x * 0.18 + fluid.z * 0.12 + rim * 0.10;
        if (!gl_FrontFacing) alpha *= 0.35;
        gl_FragColor = vec4(color, min(alpha, 0.74) * uFade);
      }
    `;

    const coreShader = `
      uniform float uTime;
      uniform float uFlowTime;
      uniform float uPhase;
      uniform float uFade;
      uniform vec3 uTint;
      varying vec3 vPoint;
      varying vec3 vNormal;
      varying vec3 vView;
      ${liquidFunctions}
      void main() {
        vec4 deep = liquid(vPoint * 1.13 + vec3(1.4, -2.3, 0.8), uFlowTime * 0.75, uPhase + 5.1);
        vec4 near = liquid(vPoint * 0.82 + vec3(-1.7, 1.1, 2.2), uFlowTime * 1.18, uPhase + 1.8);
        float swirl = sin(vPoint.x * 3.7 + deep.x * 4.0 - uFlowTime * 0.17) *
                      sin(vPoint.y * 4.5 - near.y * 3.2 + uFlowTime * 0.12);
        float glow = deep.z * 0.67 + near.z * 0.55 + deep.w * 0.12;
        vec2 pocketCenter = vec2(0.16 * sin(uFlowTime * 0.12 + uPhase),
                                 -0.10 + 0.12 * cos(uFlowTime * 0.09 + uPhase));
        float pocket = exp(-dot(vPoint.xy - pocketCenter, vPoint.xy - pocketCenter) * 2.8) *
                       (0.55 + deep.x * 0.45);
        vec3 color = uTint * (0.30 + deep.x * 0.59 + near.y * 0.42 + swirl * 0.07);
        color += vec3(1.0, 0.42, 0.07) * (0.17 + glow * 0.50);
        color += vec3(1.0, 0.69, 0.25) * glow * 0.23;
        color += vec3(0.54, 0.26, 0.12) * pocket * 0.40;
        float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
        float alpha = (0.31 + deep.x * 0.17 + glow * 0.12 + pocket * 0.06) * smoothstep(0.0, 0.38, facing);
        gl_FragColor = vec4(color, alpha * uFade);
      }
    `;

    const haloShader = `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `;
    const haloFragment = `
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float glow = exp(-r * r * 6.0) * (1.0 - smoothstep(0.55, 1.0, r));
        gl_FragColor = vec4(1.0, 0.32, 0.055, glow * 0.22 * uFade);
      }
    `;
    function makeUniforms(orb) {
      return {
        uTime: { value: 0 },
        uFlowTime: { value: 0 },
        uDetail: { value: 1 },
        uPhase: { value: orb.phase },
        uShape: { value: orb.shape },
        uPointer: { value: new THREE.Vector2() },
        uPressure: { value: 0 },
        uNeighbor: { value: new THREE.Vector2() },
        uNeighborStrength: { value: 0 },
        uEmergence: { value: 1 },
        uFade: { value: 1 },
        uTint: { value: orb.tint }
      };
    }

    class LiquidOrb {
      constructor(index) {
        this.index = index;
        this.record = null;
        this.screenY = Infinity;
        this.pressure = 0;
        this.pressureVelocity = 0;
        this.impactX = 0;
        this.impactY = 0;
        this.impactVX = 0;
        this.impactVY = 0;
        this.neighbor = new THREE.Vector2();
        this.neighborStrength = 0;
        this.phase = 0;
        this.shape = new THREE.Vector3(1, 1, 1);
        this.tint = new THREE.Vector3(0.88, 0.30, 0.045);
        this.uniforms = makeUniforms(this);

        const material = (fragmentShader, side) => new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          vertexShader,
          fragmentShader,
          side,
          transparent: true,
          depthWrite: false
        });
        this.rear = new THREE.Mesh(sphere, material(shellShader, THREE.BackSide));
        this.core = new THREE.Mesh(sphere, material(coreShader, THREE.FrontSide));
        this.front = new THREE.Mesh(sphere, material(shellShader, THREE.FrontSide));
        this.haloUniforms = { ...this.uniforms, uFade: { value: 1 } };
        this.halo = new THREE.Mesh(quad, new THREE.ShaderMaterial({
          uniforms: this.haloUniforms,
          vertexShader: haloShader,
          fragmentShader: haloFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        }));
        this.halo.renderOrder = 0;
        this.rear.renderOrder = 1;
        this.core.renderOrder = 2;
        this.front.renderOrder = 3;
        scene.add(this.halo, this.rear, this.core, this.front);
        this.setActive(false);
      }

      setActive(active) {
        this.active = active;
        this.halo.visible = active;
        this.rear.visible = active;
        this.core.visible = active;
        this.front.visible = active;
      }

      bind(record) {
        if (this.record === record) return;
        this.record = record;
        this.pressure = 0;
        this.pressureVelocity = 0;
        this.impactX = 0;
        this.impactY = 0;
        this.impactVX = 0;
        this.impactVY = 0;
        if (!record) { this.setActive(false); return; }
        this.radius = record.radius;
        this.phase = record.phase;
        this.shape.copy(record.shape);
        this.tint.copy(record.tint);
        this.uniforms.uPhase.value = this.phase;
        this.rear.scale.setScalar(this.radius);
        this.front.scale.setScalar(this.radius);
        this.core.scale.setScalar(this.radius * 0.84);
        this.halo.scale.setScalar(this.radius * 1.75);
        this.setActive(true);
      }

      update(time, delta, width, height, scrollY, flowTime = time) {
        if (!this.record) return;
        const record = this.record;
        this.screenY = record.worldY - scrollY;
        const localX = pointer.x === null ? 0 : (pointer.x - record.x) / this.radius;
        const localY = pointer.y === null ? 0 : (this.screenY - pointer.y) / this.radius;
        const distance = Math.hypot(localX, localY);
        const proximity = pointer.x === null ? 0 : 1 - THREE.MathUtils.smoothstep(distance, 0.45, 1.35);
        const target = 0.48 * proximity * proximity;
        const spring = Math.min(delta, 2.5);
        this.pressureVelocity = (this.pressureVelocity + (target - this.pressure) * 0.009 * spring) * Math.pow(0.88, spring);
        this.pressure = Math.max(0, Math.min(1, this.pressure + this.pressureVelocity * spring));
        const targetX = pointer.x === null ? this.impactX : localX;
        const targetY = pointer.y === null ? this.impactY : localY;
        this.impactVX = (this.impactVX + (targetX - this.impactX) * 0.013 * spring) * Math.pow(0.86, spring);
        this.impactVY = (this.impactVY + (targetY - this.impactY) * 0.013 * spring) * Math.pow(0.86, spring);
        this.impactX += this.impactVX * spring;
        this.impactY += this.impactVY * spring;
        this.uniforms.uPointer.value.set(this.impactX, this.impactY);
        this.uniforms.uPressure.value = this.pressure;
        this.uniforms.uNeighbor.value.copy(this.neighbor);
        this.uniforms.uNeighborStrength.value = this.neighborStrength;
        this.uniforms.uTime.value = time * 0.001;
        this.uniforms.uFlowTime.value = flowTime * 0.001;
        this.uniforms.uEmergence.value = record.emergence;
        this.uniforms.uFade.value = Math.sqrt(record.opacity);
        this.haloUniforms.uFade.value = Math.sqrt(Math.sqrt(record.opacity));
        const size = this.radius;
        this.rear.scale.setScalar(size);
        this.front.scale.setScalar(size);
        this.core.scale.setScalar(size * 0.84);
        this.halo.scale.setScalar(size * 1.75);

        const x = record.x - width / 2;
        const y = height / 2 - this.screenY;
        this.rear.position.set(x, y, 0);
        this.core.position.set(x, y, 0);
        this.front.position.set(x, y, 0);
        this.halo.position.set(x, y, -this.radius * 0.5);
      }
    }

    const orbs = Array.from({ length: poolSize }, (_, index) => new LiquidOrb(index));
    let width = window.innerWidth;
    let height = window.innerHeight;
    const spacing = Math.max(170, height / (targetVisible + 0.3));
    const riseSpeed = 0.42;

    function radiusFor(sizeRatio) {
      const diameter = Math.min(330, Math.max(150, width * 0.25), height * 0.48);
      const stageLimit = width < 700 ? Math.max(58, height * 0.14) : Math.max(80, height * 0.20);
      return Math.min(diameter * 0.5, stageLimit) * sizeRatio * 1.10;
    }

    function verticalMargin() {
      return radiusFor(1.02) * 1.85;
    }

    function cycleHeight() {
      const pageHeight = Math.max(height, document.documentElement.scrollHeight || height);
      return pageHeight + verticalMargin() * 2;
    }

    function chooseSpawnX(record) {
      const inset = -record.radius * 0.55;
      const minX = inset;
      const maxX = width - inset;
      const laneCounts = [0, 0, 0];
      for (const other of world) {
        if (other !== record && Number.isInteger(other.lane)) laneCounts[other.lane]++;
      }
      const fewest = Math.min(...laneCounts);
      const availableLanes = laneCounts.map((count, lane) => count === fewest ? lane : -1)
        .filter((lane) => lane >= 0);
      const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
      const laneWidth = (maxX - minX) / laneCounts.length;
      let bestX = width / 2;
      let bestScore = -Infinity;
      for (let attempt = 0; attempt < 16; attempt++) {
        const x = minX + laneWidth * (lane + 0.12 + Math.random() * 0.76);
        let clearance = 2;
        for (const other of world) {
          if (Math.abs(record.worldY - other.worldY) > spacing * 1.8) continue;
          clearance = Math.min(clearance,
            Math.hypot(x - other.x, record.worldY - other.worldY) / (record.radius + other.radius));
        }
        const score = clearance * 3 + Math.random();
        if (score > bestScore) { bestScore = score; bestX = x; }
        if (clearance > 1.15) break;
      }
      record.lane = lane;
      return bestX;
    }

    function createRecord(worldY, reuse = null) {
      const sizeRatio = 0.72 + Math.random() * 0.30;
      const record = reuse || {
        shape: new THREE.Vector3(1, 1, 1),
        tint: new THREE.Vector3(0.88, 0.30, 0.045)
      };
      Object.assign(record, {
        x: 0, worldY, sizeRatio, radius: radiusFor(sizeRatio), speed: riseSpeed,
        driftSpeed: (Math.random() - 0.5) * 0.070,
        driftAmplitude: 0.045 + Math.random() * 0.065,
        driftFrequency: 0.00014 + Math.random() * 0.00014,
        vx: 0, phase: Math.random() * 20,
        state: "rising", emergence: 1, sizeScale: 1, opacity: 1
      });
      record.shape.set(
        0.88 + Math.random() * 0.25,
        0.82 + Math.random() * 0.28,
        0.80 + Math.random() * 0.24
      );
      record.tint.set(
        0.82 + Math.random() * 0.08,
        0.25 + Math.random() * 0.08,
        0.035 + Math.random() * 0.020
      );
      record.x = chooseSpawnX(record);
      return record;
    }

    function seedWorld() {
      const margin = verticalMargin();
      const cycle = cycleHeight();
      const viewportSpacing = (height + margin * 2) / targetVisible;
      const count = Math.max(targetVisible, Math.floor(cycle / viewportSpacing));
      const phase = Math.random();
      for (let index = 0; index < count; index++) {
        const band = (index + phase) / count;
        world.push(createRecord(-margin + cycle * band));
      }
    }

    function getVisibleRecords() {
      return world.filter((record) => {
        const screenY = record.worldY - (window.scrollY || 0);
        return screenY + record.radius * 1.85 > 0 && screenY - record.radius * 1.85 < height;
      }).sort((a, b) => a.worldY - b.worldY).slice(0, poolSize);
    }

    function bindVisible() {
      const visible = getVisibleRecords();
      for (const orb of orbs) {
        if (orb.record && !visible.includes(orb.record)) orb.bind(null);
      }
      for (const record of visible) {
        if (orbs.some((orb) => orb.record === record)) continue;
        const free = orbs.find((orb) => !orb.record);
        if (free) free.bind(record);
      }
    }


    function updateWorld(delta, time) {
      for (const record of world) {
        record.vx *= Math.pow(0.96, delta);
        const drift = record.driftSpeed +
          record.driftAmplitude * Math.sin(time * record.driftFrequency + record.phase) +
          record.driftAmplitude * 0.5 * Math.sin(time * record.driftFrequency * 0.43 + record.phase * 1.7);
        record.x += (drift + record.vx) * delta;
        record.worldY -= record.speed * delta;
        const laneWidth = (width + record.radius * 1.1) / 3;
        const laneLeft = -record.radius * 0.55 + record.lane * laneWidth;
        const laneRight = laneLeft + laneWidth;
        if (record.x < laneLeft || record.x > laneRight) record.driftSpeed *= -1;
        record.x = Math.max(laneLeft, Math.min(laneRight, record.x));
      }
      const cycle = cycleHeight();
      const top = -verticalMargin();
      for (const record of world) {
        if (record.worldY < top) createRecord(record.worldY + cycle, record);
      }
    }

    function interact(delta) {
      for (const orb of orbs) { orb.neighbor.set(0, 0); orb.neighborStrength = 0; }
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i];
          const b = orbs[j];
          if (!a.record || !b.record) continue;
          const dx = b.record.x - a.record.x;
          const dy = b.record.worldY - a.record.worldY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const reach = (a.radius + b.radius) * 1.22;
          if (distance >= reach) continue;
          const closeness = 1 - distance / reach;
          if (closeness > a.neighborStrength) {
            a.neighbor.set(dx / a.radius, -dy / a.radius);
            a.neighborStrength = closeness;
          }
          if (closeness > b.neighborStrength) {
            b.neighbor.set(-dx / b.radius, dy / b.radius);
            b.neighborStrength = closeness;
          }
          const overlap = a.radius + b.radius - distance;
          if (overlap > 0) {
            const force = Math.min(0.045, overlap * 0.00032) * delta;
            a.record.vx -= dx / distance * force;
            b.record.vx += dx / distance * force;
          }
        }
      }
    }

    function renderFrame(time, delta, flowTime = time) {
      this.scrollY = window.scrollY || 0;
      updateWorld(delta, time);
      bindVisible();
      interact(delta);
      for (const orb of orbs) orb.update(time, delta, width, height, this.scrollY, flowTime);
      renderer.render(scene, camera);
    }

    function resize() {
      const oldWidth = width;
      const oldMargin = verticalMargin();
      const oldCycle = cycleHeight();
      width = window.innerWidth;
      height = window.innerHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      const newMargin = verticalMargin();
      const newCycle = cycleHeight();
      for (const record of world) {
        record.x *= width / oldWidth;
        record.worldY = -newMargin + (record.worldY + oldMargin) / oldCycle * newCycle;
        record.radius = radiusFor(record.sizeRatio);
      }
      for (const orb of orbs) orb.bind(null);
      renderFrame.call(system, performance.now(), 0);
    }

    document.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });
    const clearPointer = () => { pointer.x = null; pointer.y = null; };
    document.addEventListener("pointerleave", clearPointer);
    window.addEventListener("blur", clearPointer);
    window.addEventListener("resize", resize);
    seedWorld();
    this.renderer = renderer;
    this.orbs = orbs;
    this.world = world;
    this.targetVisible = targetVisible;
    this.getVisibleRecords = getVisibleRecords;
    resize();
    if (reducedMotion) {
      window.addEventListener("scroll", () => renderFrame.call(system, performance.now(), 0), { passive: true });
      return;
    }
    let lastTime = performance.now();
    let sampleStart = lastTime;
    let sampleFrames = 0;
    let flowTime = lastTime;
    const animate = (time) => {
      const delta = Math.min((time - lastTime) / 16.67, 2.5);
      lastTime = time;
      if (!document.hidden) {
        const flowInterval = pixelRatio < maxPixelRatio * 0.75 ? 66 :
          pixelRatio < maxPixelRatio * 0.9 ? 50 : mobile ? 33 : 0;
        if (time - flowTime >= flowInterval) flowTime = time;
        renderFrame.call(system, time, delta, flowTime);

        sampleFrames++;
        const sampleDuration = time - sampleStart;
        if (sampleDuration >= 2000) {
          const fps = sampleFrames * 1000 / sampleDuration;
          const nextRatio = fps < 45 ? Math.max(minPixelRatio, pixelRatio - 0.1) :
            fps > 56 ? Math.min(maxPixelRatio, pixelRatio + 0.05) : pixelRatio;
          if (nextRatio !== pixelRatio) {
            pixelRatio = nextRatio;
            renderer.setPixelRatio(pixelRatio);
          }
          sampleStart = time;
          sampleFrames = 0;
        }
      } else {
        sampleStart = time;
        sampleFrames = 0;
        flowTime = time;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

window.LavaBubbleSystem = LavaBubbleSystem;
document.addEventListener("DOMContentLoaded", () => {
  new LavaBubbleSystem();
});
