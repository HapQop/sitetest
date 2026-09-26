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
    const targetVisible = mobile ? 2 + (Math.random() < 0.65 ? 1 : 0) :
      3 + (Math.random() < 0.55 ? 1 : 0);
    const poolSize = targetVisible + 3;
    const world = [];
    let lastSpawnX = null;

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
        float dent = exp(-dot(delta, delta) * 7.0) * uPressure * smoothstep(-0.1, 0.45, n.z);
        p -= n * dent * 0.23;
        float travelingWave = sin(length(delta) * 9.0 - uTime * 1.3) * exp(-length(delta) * 3.5);
        p += n * travelingWave * uPressure * 0.022;
        p.xy -= normalize(uPointer + vec2(0.0001)) * uPressure * 0.028 *
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
        gl_FragColor = vec4(color, min(alpha, 0.74));
      }
    `;

    const coreShader = `
      uniform float uTime;
      uniform float uFlowTime;
      uniform float uPhase;
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
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const haloShader = `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `;
    const haloFragment = `
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float glow = exp(-r * r * 6.0) * (1.0 - smoothstep(0.55, 1.0, r));
        gl_FragColor = vec4(1.0, 0.29, 0.045, glow * 0.13);
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
        uTint: { value: orb.tint }
      };
    }

    const lake = document.createElement("div");
    lake.className = "lava-source";
    lake.setAttribute("aria-hidden", "true");
    document.body.appendChild(lake);
    const lakeUniforms = {
      uTime: { value: 0 },
      uDetail: { value: 1 },
      uPulse: { value: 0 },
      uBirthX: { value: 0.5 }
    };
    const lakeVertex = `
      uniform float uTime;
      uniform float uPulse;
      uniform float uBirthX;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float along = uv.x * 6.28318;
        float wave = sin(along * 1.7 + uTime * 0.42) * 0.026
                   + sin(along * 4.1 - uTime * 0.71) * 0.014;
        float birth = exp(-pow((uv.x - uBirthX) * 8.0, 2.0)) * uPulse * 0.085;
        p.y += (wave + birth) * smoothstep(0.72, 1.0, uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `;
    const lakeFragment = `
      uniform float uTime;
      uniform float uPulse;
      uniform float uBirthX;
      varying vec2 vUv;
      ${liquidFunctions}
      void main() {
        vec2 uv = vUv;
        float surface = smoothstep(0.80, 1.0, uv.y);
        vec3 p = vec3(uv.x * 7.2, uv.y * 2.6, 0.38);
        vec4 fluid = liquid(p, uTime * 1.15, 3.7);
        vec4 deep = liquid(p * 0.74 + vec3(1.7, 0.4, 2.1), uTime * 0.73, 8.4);
        float current = sin(uv.x * 19.0 + fluid.x * 8.0 - uTime * 0.30) * 0.5 + 0.5;
        float hot = fluid.z * 0.55 + deep.z * 0.42 + fluid.w * 0.10;
        float birth = exp(-pow((uv.x - uBirthX) * 9.0, 2.0)) * uPulse * surface;
        vec3 color = mix(vec3(0.14, 0.025, 0.015), vec3(0.67, 0.17, 0.035),
                         smoothstep(0.22, 0.73, fluid.x) * 0.75 + surface * 0.12);
        color += vec3(0.95, 0.36, 0.055) * (hot * 0.44 + current * fluid.z * 0.12);
        color += vec3(1.0, 0.68, 0.20) * (fluid.z * 0.18 + birth * 0.5);
        color += vec3(0.87, 0.31, 0.08) * surface * (0.20 + deep.x * 0.25);
        float rim = smoothstep(0.935, 0.995, uv.y) * (0.30 + fluid.x * 0.25);
        color += vec3(1.0, 0.57, 0.17) * rim;
        float alpha = 0.75 + fluid.x * 0.17 + surface * 0.06;
        gl_FragColor = vec4(color, min(alpha, 0.98));
      }
    `;
    const lakeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, mobile ? 48 : 80, 4),
      new THREE.ShaderMaterial({
        uniforms: lakeUniforms, vertexShader: lakeVertex, fragmentShader: lakeFragment,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      })
    );
    lakeMesh.renderOrder = 0;
    scene.add(lakeMesh);

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
        this.halo = new THREE.Mesh(quad, new THREE.ShaderMaterial({
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
        const target = 0.95 * proximity * proximity;
        const spring = Math.min(delta, 2.5);
        this.pressureVelocity = (this.pressureVelocity + (target - this.pressure) * 0.018 * spring) * Math.pow(0.84, spring);
        this.pressure = Math.max(0, Math.min(1, this.pressure + this.pressureVelocity * spring));
        const targetX = pointer.x === null ? this.impactX : localX;
        const targetY = pointer.y === null ? this.impactY : localY;
        this.impactVX = (this.impactVX + (targetX - this.impactX) * 0.025 * spring) * Math.pow(0.79, spring);
        this.impactVY = (this.impactVY + (targetY - this.impactY) * 0.025 * spring) * Math.pow(0.79, spring);
        this.impactX += this.impactVX * spring;
        this.impactY += this.impactVY * spring;
        this.uniforms.uPointer.value.set(this.impactX, this.impactY);
        this.uniforms.uPressure.value = this.pressure;
        this.uniforms.uNeighbor.value.copy(this.neighbor);
        this.uniforms.uNeighborStrength.value = this.neighborStrength;
        this.uniforms.uTime.value = time * 0.001;
        this.uniforms.uFlowTime.value = flowTime * 0.001;
        this.uniforms.uEmergence.value = record.bornAt < 0 ? 1 :
          THREE.MathUtils.smoothstep(time - record.bornAt, 0, 4800);

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
    let scrollY = window.scrollY || 0;
    let sourceY = 0;
    let lastBirthX = 0.5;
    let birthPulse = 0;
    const spacing = Math.max(170, height / (targetVisible + 0.3));

    function radiusFor(sizeRatio) {
      const diameter = Math.min(390, Math.max(210, width * 0.29), height * 0.62);
      return diameter * sizeRatio * 0.5;
    }

    function chooseSpawnX(record) {
      const inset = Math.min(record.radius * 0.65, width * 0.12);
      const minX = inset;
      const maxX = width - inset;
      let bestX = width / 2;
      let bestScore = -Infinity;
      for (let attempt = 0; attempt < 16; attempt++) {
        const x = minX + Math.random() * (maxX - minX);
        let clearance = 2;
        for (const other of world) {
          if (Math.abs(record.worldY - other.worldY) > spacing * 1.8) continue;
          clearance = Math.min(clearance,
            Math.hypot(x - other.x, record.worldY - other.worldY) / (record.radius + other.radius));
        }
        const spread = lastSpawnX === null ? 1 : Math.abs(x - lastSpawnX) / width;
        const score = clearance * 3 + spread;
        if (score > bestScore) { bestScore = score; bestX = x; }
        if (clearance > 1.15 && spread > 0.3) break;
      }
      lastSpawnX = bestX;
      return bestX;
    }

    function createRecord(worldY, bornAt = -1) {
      const sizeRatio = 0.65 + Math.random() * 0.37;
      const record = {
        x: 0, worldY, sizeRatio, radius: radiusFor(sizeRatio),
        speed: 0.16 + Math.random() * 0.09,
        driftSpeed: (Math.random() - 0.5) * 0.028,
        vx: 0, vy: 0, phase: Math.random() * 20,
        shape: new THREE.Vector3(
          0.96 + Math.random() * 0.14,
          0.92 + Math.random() * 0.13,
          0.82 + Math.random() * 0.18
        ),
        bornAt
      };
      record.x = chooseSpawnX(record);
      return record;
    }

    function readSourceY() {
      const rect = lake.getBoundingClientRect();
      return rect.top + (window.scrollY || 0) + 20;
    }

    function seedWorld() {
      sourceY = readSourceY();
      const count = Math.min(80, Math.ceil((sourceY + height * 0.5) / spacing));
      const actualSpacing = (sourceY + height * 0.5) / count;
      for (let index = 0; index < count; index++) {
        const y = sourceY - actualSpacing * (index + 0.42 + Math.random() * 0.16);
        world.push(createRecord(y));
      }
      world.sort((a, b) => a.worldY - b.worldY);
    }

    function getVisibleRecords() {
      return world.filter((record) => {
        const screenY = record.worldY - scrollY;
        return screenY + record.radius * 1.2 > 0 && screenY - record.radius * 1.2 < height;
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

    function updateLake(time) {
      const rect = lake.getBoundingClientRect();
      const top = rect.top + 20;
      const depth = Math.max(1, rect.height - 20);
      lakeMesh.visible = top < height && top + depth > 0;
      if (!lakeMesh.visible) return;
      lakeMesh.scale.set(width, depth, 1);
      lakeMesh.position.set(0, height / 2 - top - depth / 2, -20);
      lakeUniforms.uTime.value = time * 0.001;
      lakeUniforms.uPulse.value = birthPulse;
      lakeUniforms.uBirthX.value = lastBirthX;
    }

    function updateWorld(delta, time) {
      for (const record of world) {
        record.vx *= Math.pow(0.96, delta);
        record.vy *= Math.pow(0.94, delta);
        record.x += (record.driftSpeed + record.vx) * delta;
        record.worldY += (record.vy - record.speed) * delta;
        const inset = Math.min(record.radius * 0.65, width * 0.12);
        record.x = Math.max(inset, Math.min(width - inset, record.x));
      }
      while (world.length && world[0].worldY < -world[0].radius * 1.5) world.shift();
      sourceY = readSourceY();
      const lowest = world[world.length - 1];
      if (world.length < 80 && (!lowest || sourceY - lowest.worldY > spacing * 0.88)) {
        const record = createRecord(sourceY + radiusFor(0.8) * 0.72, time);
        world.push(record);
        lastBirthX = record.x / width;
        birthPulse = 1;
      }
      birthPulse *= Math.pow(0.989, delta);
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
            const force = Math.min(0.024, overlap * 0.00018) * delta;
            a.record.vx -= dx / distance * force;
            a.record.vy -= dy / distance * force;
            b.record.vx += dx / distance * force;
            b.record.vy += dy / distance * force;
          }
        }
      }
    }

    function renderFrame(time, delta, flowTime = time) {
      scrollY = window.scrollY || 0;
      this.scrollY = scrollY;
      updateWorld(delta, time);
      bindVisible();
      interact(delta);
      for (const orb of orbs) orb.update(time, delta, width, height, scrollY, flowTime);
      updateLake(time);
      this.sourceY = sourceY;
      renderer.render(scene, camera);
    }

    function resize() {
      const oldWidth = width;
      width = window.innerWidth;
      height = window.innerHeight;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      for (const record of world) {
        record.x *= width / oldWidth;
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
    this.lake = lake;
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
            const detail = pixelRatio < maxPixelRatio * 0.82 ? 0 : 1;
            orbs.forEach((orb) => { orb.uniforms.uDetail.value = detail; });
            lakeUniforms.uDetail.value = detail;
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
