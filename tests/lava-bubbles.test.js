const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../scripts/lava-bubbles.js"), "utf8");

function createSystem(width = 1280, height = 720, seed = 7, reducedMotion = false) {
  class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
    copy(vector) { return this.set(vector.x, vector.y); }
    lerp(vector, amount) { this.x += (vector.x - this.x) * amount; this.y += (vector.y - this.y) * amount; return this; }
  }
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(vector) { return this.set(vector.x, vector.y, vector.z); }
  }
  class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry; this.material = material;
      this.scale = {
        setScalar: (value) => { this.scale.value = value; },
        set: (x, y, z) => { this.scale.x = x; this.scale.y = y; this.scale.z = z; }
      };
      this.position = { set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } };
    }
  }
  const listeners = new Map();
  const listen = (target, type, listener) => listeners.set(`${target}:${type}`, [...(listeners.get(`${target}:${type}`) || []), listener]);
  const dispatch = (target, type, event = {}) => (listeners.get(`${target}:${type}`) || []).forEach((listener) => listener(event));
  const nodes = [];
  const makeElement = (tagName) => {
    const node = { tagName: tagName.toUpperCase(), children: [], style: {}, className: "",
      setAttribute(name, value) { this[name] = value; },
      appendChild(child) { this.children.push(child); child.parentNode = this; },
      prepend(child) { this.children.unshift(child); child.parentNode = this; },
      getBoundingClientRect() {
        const top = height * 11 - (window?.scrollY || 0);
        return { top, height: height * 1.2, bottom: top + height * 1.2 };
      } };
    nodes.push(node);
    return node;
  };
  const THREE = {
    Vector2, Vector3, Mesh,
    WebGLRenderer: class { constructor() { this.domElement = makeElement("canvas"); } setPixelRatio() {} setClearColor() {} setSize() {} render() {} },
    Scene: class { add(...items) { this.items = [...(this.items || []), ...items]; } },
    OrthographicCamera: class { constructor() { this.position = {}; } updateProjectionMatrix() {} },
    SphereGeometry: class {}, PlaneGeometry: class {},
    ShaderMaterial: class { constructor(options) { Object.assign(this, options); } },
    BackSide: 1, FrontSide: 0, DoubleSide: 2, AdditiveBlending: 3,
    MathUtils: { smoothstep: (value, min, max) => { const t = Math.max(0, Math.min(1, (value - min) / (max - min))); return t * t * (3 - 2 * t); } }
  };
  const frames = [];
  const window = {
    THREE, innerWidth: width, innerHeight: height, devicePixelRatio: 2, scrollY: 0, pageYOffset: 0,
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener(type, listener) { listen("window", type, listener); },
    scrollTo(x, y) { this.scrollY = y; this.pageYOffset = y; dispatch("window", "scroll"); }
  };
  const body = makeElement("body");
  const document = {
    body, hidden: false, documentElement: { scrollHeight: height * 12, clientHeight: height },
    querySelector(selector) { return selector.startsWith(".") ? nodes.find((node) => node.className.split(/\s+/).includes(selector.slice(1))) || null : null; },
    createElement: makeElement,
    addEventListener(type, listener) { listen("document", type, listener); }
  };
  let randomState = seed;
  const math = Object.create(Math);
  math.random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  vm.runInNewContext(source, { window, document, performance: { now: () => 0 }, requestAnimationFrame: (callback) => frames.push(callback), Math: math });
  const system = new window.LavaBubbleSystem();
  let now = 0;
  return { system, window, document,
    frame(milliseconds = 16.67) { now += milliseconds; const callback = frames.shift(); assert.ok(callback, "animation frame was scheduled"); callback(now); },
    pointer(x, y) { dispatch("document", "pointermove", { clientX: x, clientY: y }); } };
}

function assertWorldContract(system) {
  assert.ok(Array.isArray(system.world), "world records are public");
  assert.ok(Array.isArray(system.orbs), "shader mesh pool is public");
  assert.ok(system.lake, "lava lake DOM element is public");
  assert.equal(typeof system.scrollY, "number");
  assert.equal(typeof system.sourceY, "number");
  assert.equal(typeof system.targetVisible, "number");
  assert.ok(system.lake.className.includes("lava"), "lake has a lava class");
}

test("world records are page-space entities and shader meshes are a bounded pool", () => {
  const { system } = createSystem();
  assertWorldContract(system);
  assert.ok(system.world.length > 0, "initial world contains bubble records");
  assert.ok(system.world.length <= 80, "world record set remains bounded");
  assert.ok(system.orbs.length >= system.targetVisible);
  assert.ok(system.orbs.length <= 8, "desktop mesh pool remains bounded");
  for (const record of system.world) {
    for (const property of ["x", "worldY", "radius", "speed"]) assert.equal(typeof record[property], "number");
    assert.ok(record.radius >= 100, "the system does not create tiny bubbles");
    assert.ok(record.x >= Math.min(record.radius * 0.65, 1280 * 0.12), "left crop remains moderate");
    assert.ok(record.x <= 1280 - Math.min(record.radius * 0.65, 1280 * 0.12), "right crop remains moderate");
  }
  for (const orb of system.orbs) {
    assert.ok(Object.hasOwn(orb, "record"), "pooled orb tracks its assigned record");
    assert.equal(typeof orb.screenY, "number");
  }
});

test("scroll moves the camera through the world without changing a bubble's world trajectory", () => {
  const { system, window, frame } = createSystem();
  assertWorldContract(system);
  frame();
  const record = system.world.find((candidate) => candidate.worldY > 600 && candidate.worldY < 900);
  assert.ok(record, "a world record is available in the next camera position");
  const beforeWorldY = record.worldY;
  window.scrollTo(0, 480);
  frame();
  const orb = system.orbs.find((candidate) => candidate.record === record);
  assert.ok(orb, "the same record is rendered after the camera scrolls to it");
  assert.equal(system.scrollY, 480);
  assert.equal(orb.screenY, record.worldY - system.scrollY);
  assert.ok(record.worldY < beforeWorldY, "physics continues to raise bubbles");
  assert.ok(beforeWorldY - record.worldY < 20, "scroll delta is not applied to world physics");
  assert.ok(orb.screenY < beforeWorldY - 400, "camera exposes a lower part of the world");
});

test("different scroll positions reveal distinct world records", () => {
  const { system, window, frame } = createSystem();
  assertWorldContract(system);
  frame();
  const topRecords = new Set(system.orbs.filter((orb) => orb.record).map((orb) => orb.record));
  window.scrollTo(0, 3600);
  for (let index = 0; index < 3; index++) frame();
  const lowerRecords = new Set(system.orbs.filter((orb) => orb.record).map((orb) => orb.record));
  assert.ok(lowerRecords.size > 0, "lower viewport renders world records");
  assert.ok([...lowerRecords].some((record) => !topRecords.has(record)), "scrolling reveals records from another section of the world");
});

test("reduced motion still projects page-space bubbles while scrolling", () => {
  const { system, window } = createSystem(1280, 720, 7, true);
  const record = system.world.find((candidate) => candidate.worldY > 600 && candidate.worldY < 900);
  assert.ok(record);
  const initialWorldY = record.worldY;
  window.scrollTo(0, 480);
  const orb = system.orbs.find((candidate) => candidate.record === record);
  assert.ok(orb);
  assert.equal(record.worldY, initialWorldY);
  assert.equal(orb.screenY, record.worldY - 480);
});

test("new bubbles are born near the lava source", () => {
  const { system, frame } = createSystem(390, 844, 29);
  assertWorldContract(system);
  const nearest = Math.min(...system.world.map((record) => Math.abs(record.worldY - system.sourceY)));
  const largestRadius = Math.max(...system.world.map((record) => record.radius));
  assert.ok(nearest <= largestRadius * 2.25, `nearest record starts ${nearest.toFixed(0)}px from source ${system.sourceY}`);
  assert.ok(system.orbs.length <= 6, "mobile mesh pool remains bounded");
  let born;
  for (let index = 0; index < 3000 && !born; index++) {
    frame();
    born = system.world.find((record) => record.bornAt >= 0);
  }
  assert.ok(born, "a fresh bubble eventually separates from the source");
  assert.ok(born.worldY > system.sourceY && born.worldY < system.sourceY + born.radius,
    "new bubble begins partially submerged in the lake");
  const birthY = born.worldY;
  for (let index = 0; index < 90; index++) frame();
  assert.ok(born.worldY < birthY, "new bubble rises through page space");
});

test("new visits distribute different records across the page", () => {
  const first = createSystem(1280, 720, 13).system.world;
  const second = createSystem(1280, 720, 37).system.world;
  assert.notDeepEqual(first.map((record) => [record.x, record.worldY, record.radius]),
    second.map((record) => [record.x, record.worldY, record.radius]));
});

test("pointer pressure approaches and recovers smoothly without translating the record", () => {
  const { system, frame, pointer } = createSystem();
  assertWorldContract(system);
  frame();
  const orb = system.orbs.find((candidate) => candidate.record);
  assert.ok(orb, "a record is available for interaction");
  const record = orb.record;
  const originalX = record.x;
  const originalWorldY = record.worldY;
  pointer(record.x, orb.screenY);
  frame();
  const firstPressure = orb.pressure ?? orb.uniforms?.uPressure?.value;
  assert.ok(firstPressure > 0 && firstPressure < 0.9, "surface pressure ramps instead of jumping to full strength");
  for (let index = 0; index < 8; index++) frame();
  const sustainedPressure = orb.pressure ?? orb.uniforms?.uPressure?.value;
  assert.ok(sustainedPressure > firstPressure, "pressure accumulates with inertia");
  pointer(-1000, -1000);
  frame();
  const recoveryStart = orb.pressure ?? orb.uniforms?.uPressure?.value;
  assert.ok(recoveryStart > 0, "pressure retains momentum after pointer exit");
  assert.ok(Math.abs(record.x - originalX) < 5, "pointer does not directly drag the record");
  assert.ok(record.worldY < originalWorldY, "vertical world motion remains physical");
});
