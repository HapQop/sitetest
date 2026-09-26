const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../scripts/lava-bubbles.js"), "utf8");

function createSystem(width, height, seed, devicePixelRatio = 2) {
  class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy(other) { return this.set(other.x, other.y); }
    lerp(other, amount) {
      this.x += (other.x - this.x) * amount;
      this.y += (other.y - this.y) * amount;
      return this;
    }
  }
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  }
  class Mesh {
    constructor(geometry, material) {
      this.material = material;
      this.scale = { setScalar() {} };
      this.position = { set() {} };
    }
  }
  const pixelRatios = [];
  const THREE = {
    Vector2, Vector3, Mesh,
    WebGLRenderer: class {
      constructor() { this.domElement = {}; }
      setPixelRatio(ratio) { pixelRatios.push(ratio); }
      setClearColor() {}
      setSize() {}
      render() {}
    },
    Scene: class { add() {} },
    OrthographicCamera: class {
      constructor() { this.position = {}; }
      updateProjectionMatrix() {}
    },
    SphereGeometry: class {},
    PlaneGeometry: class {},
    ShaderMaterial: class { constructor(options) { Object.assign(this, options); } },
    BackSide: 1,
    FrontSide: 0,
    AdditiveBlending: 2,
    MathUtils: { smoothstep: (value, min, max) => {
      const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return t * t * (3 - 2 * t);
    } }
  };
  const frames = [];
  const window = {
    THREE, innerWidth: width, innerHeight: height, devicePixelRatio,
    matchMedia: () => ({ matches: false }),
    addEventListener() {}
  };
  const document = {
    querySelector: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {} }),
    body: { prepend() {} },
    addEventListener() {},
    hidden: false
  };
  let randomState = seed;
  let randomCalls = 0;
  const math = Object.create(Math);
  math.random = () => {
    randomCalls++;
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  vm.runInNewContext(source, {
    window, document, performance: { now: () => 0 },
    requestAnimationFrame: (callback) => frames.push(callback),
    Math: math
  });
  return { system: new window.LavaBubbleSystem(), frames, pixelRatios,
    get randomCalls() { return randomCalls; } };
}

for (const [name, width, height] of [
  ["desktop", 1280, 720],
  ["mobile", 390, 844],
  ["narrow mobile", 320, 568]
]) {
  test(`${name}: steady liquid flow over multiple cycles`, () => {
    for (const seed of [1, 3, 7, 11, 19, 29, 42, 73, 101, 211, 509, 997,
      0x12345678, 0x9e3779b9, 0xdeadbeef, 0xf00dcafe]) {
      const { system, frames } = createSystem(width, height, seed);
      const orbs = system.orbs;
      assert.equal(orbs.length, 4);
      assert.ok(system.targetVisible >= (name === "desktop" ? 3 : 2));
      assert.ok(system.targetVisible <= (name === "desktop" ? 4 : 3));
      assert.equal(orbs.filter((orb) => orb.active).length, 2);
      assert.ok(orbs.every((orb) => orb.speed >= 0.16 && orb.speed <= 0.25));
      assert.ok(orbs.every((orb) => orb.radius * 2 >= 100));
      assert.ok(orbs.every((orb) => orb.rear && orb.core && orb.front && orb.halo));

      let minimumVisible = 4;
      let recycleCount = 0;
      let targetFrames = 0;
      for (let frame = 1; frame <= 26000; frame++) {
        const before = orbs.map((orb) => ({ active: orb.active, x: orb.x, y: orb.y, radius: orb.radius }));
        frames.shift()(frame * 16.67);
        for (let i = 0; i < orbs.length; i++) {
          const orb = orbs[i];
          if ((!before[i].active && orb.active) || orb.y > before[i].y + 50) {
            if (before[i].y < 0) {
              recycleCount++;
              assert.ok(before[i].y <= -before[i].radius + orb.speed * 2.5 + 0.1);
            }
            assert.ok(orb.y > height + orb.radius * 0.8);
            for (let j = 0; j < orbs.length; j++) {
              if (j === i || !before[j].active || !orbs[j].active) continue;
              const clearance = Math.hypot(orb.x - orbs[j].x, orb.y - orbs[j].y) /
                (orb.radius + orbs[j].radius);
              assert.ok(clearance > 0.8,
                `${name} seed ${seed} frame ${frame}: clearance ${clearance.toFixed(2)}, ` +
                `spawn (${orb.x.toFixed(0)}, ${orb.y.toFixed(0)}, r${orb.radius.toFixed(0)}), ` +
                `neighbor (${orbs[j].x.toFixed(0)}, ${orbs[j].y.toFixed(0)}, r${orbs[j].radius.toFixed(0)})`);
            }
          }
        }
        const visible = orbs.filter((orb) => orb.active && orb.y + orb.radius > 0 && orb.y - orb.radius < height).length;
        minimumVisible = Math.min(minimumVisible, visible);
        if (visible >= (name === "desktop" ? 3 : 2) && visible <= (name === "desktop" ? 4 : 3)) {
          targetFrames++;
        }
      }
      assert.ok(recycleCount >= 6, `only ${recycleCount} recycles with seed ${seed}`);
      assert.ok(minimumVisible >= 2, `minimum visible count was ${minimumVisible} with seed ${seed}`);
      assert.ok(targetFrames / 26000 >= 0.6,
        `flow spent ${(targetFrames / 260).toFixed(1)}% at target density with seed ${seed}`);
    }
  });
}

test("each load gets a different staggered scenario without per-frame random work", () => {
  for (const [width, height, allowedCounts] of [
    [1280, 720, [3, 4]],
    [390, 844, [2, 3]],
    [320, 568, [2, 3]]
  ]) {
    const scenarios = new Set();
    const counts = new Set();
    const firstXs = [];
    for (let index = 1; index <= 32; index++) {
      const session = createSystem(width, height, (index * 2654435761) >>> 0);
      const { system, frames } = session;
      const orbs = system.orbs;
      counts.add(system.targetVisible);
      firstXs.push(orbs[0].x / width);
      assert.equal(orbs.filter((orb) => orb.active).length, 2);
      assert.ok(Math.hypot(orbs[0].x - orbs[1].x, orbs[0].y - orbs[1].y) >
        (orbs[0].radius + orbs[1].radius) * 0.85);
      assert.equal(new Set(orbs.map((orb) => orb.phase)).size, orbs.length);
      if (system.targetVisible > 2) {
        assert.ok(orbs[2].readyAt >= 700 && orbs[2].readyAt <= 2700);
      }
      if (system.targetVisible > 3) {
        assert.ok(orbs[3].readyAt > orbs[2].readyAt);
      }
      scenarios.add(orbs.map((orb) => [orb.x, orb.y, orb.radius, orb.speed,
        orb.driftSpeed, orb.phase, orb.shape.x, orb.readyAt]
        .map((value) => Math.round(value * 1000)).join(",")).join("|"));
      const randomCalls = session.randomCalls;
      for (let frame = 1; frame <= 20; frame++) frames.shift()(frame * 16.67);
      assert.equal(session.randomCalls, randomCalls);
    }
    assert.equal(scenarios.size, 32);
    assert.deepEqual([...counts].sort(), allowedCounts);
    assert.ok(Math.min(...firstXs) < 0.35);
    assert.ok(Math.max(...firstXs) > 0.65);
  }
});

test("late starts remain staggered even when their delays have both elapsed", () => {
  let session;
  for (let index = 1; index <= 32; index++) {
    const candidate = createSystem(1280, 720, (index * 2654435761) >>> 0);
    if (candidate.system.targetVisible === 4) {
      session = candidate;
      break;
    }
  }
  assert.ok(session);
  const activationTimes = [];
  for (let frame = 1; frame <= 480; frame++) {
    const before = session.system.orbs.map((orb) => orb.active);
    session.frames.shift()(frame * 16.67);
    for (let i = 2; i < 4; i++) {
      if (!before[i] && session.system.orbs[i].active) activationTimes.push(frame * 16.67);
    }
  }
  assert.equal(activationTimes.length, 2);
  assert.ok(activationTimes[0] >= 1400);
  assert.ok(activationTimes[1] - activationTimes[0] >= 1400);
});

test("quality falls under sustained low FPS and recovers gradually", () => {
  for (const [width, height, devicePixelRatio, maxRatio, minRatio] of [
    [1280, 720, 2, 1.5, 1],
    [1280, 720, 1, 1, 0.75],
    [390, 844, 2, 1.15, 0.75]
  ]) {
    const { system, frames, pixelRatios } = createSystem(width, height, 7, devicePixelRatio);
    assert.equal(pixelRatios[0], maxRatio);
    let time = 0;
    for (let i = 0; i < 600; i++) {
      time += 1000 / 35;
      frames.shift()(time);
    }
    assert.ok(pixelRatios.at(-1) <= maxRatio - 0.2);
    assert.ok(pixelRatios.at(-1) >= minRatio);
    assert.equal(system.orbs[0].uniforms.uDetail.value, 0);
    const lowestRatio = pixelRatios.at(-1);
    for (let i = 0; i < 1800; i++) {
      time += 1000 / 60;
      frames.shift()(time);
    }
    assert.ok(pixelRatios.at(-1) > lowestRatio);
    assert.equal(pixelRatios.at(-1), maxRatio);
    assert.equal(system.orbs[0].uniforms.uDetail.value, 1);
    assert.ok(pixelRatios.every((ratio) => ratio >= minRatio && ratio <= maxRatio));
  }
});
