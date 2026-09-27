const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../scripts/lava-bubbles.js"), "utf8");
<<<<<<< ours

function createSystem(width = 1280, height = 720, seed = 7, reducedMotion = false) {
=======
const styles = fs.readFileSync(path.join(__dirname, "../styles/site-header.css"), "utf8");

function createSystem(width = 1280, height = 720, seed = 7, reducedMotion = false) {
  const stageTop = height * 10;
  const layout = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      top: h * 10,
      stageHeight: w <= 680 ? Math.min(480, Math.max(370, h * 0.50)) :
        Math.min(500, Math.max(380, h * 0.50)),
      lakeHeight: w <= 680 ? Math.min(190, Math.max(125, h * 0.20)) :
        Math.min(235, Math.max(155, h * 0.22))
    };
  };
>>>>>>> theirs
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
<<<<<<< ours
      getBoundingClientRect() {
        const top = height * 11 - (window?.scrollY || 0);
        return { top, height: height * 1.2, bottom: top + height * 1.2 };
=======
      after(sibling) {
        const index = this.parentNode.children.indexOf(this);
        this.parentNode.children.splice(index + 1, 0, sibling);
        sibling.parentNode = this.parentNode;
      },
      getBoundingClientRect() {
        const { top: currentStageTop, stageHeight, lakeHeight } = layout();
        const documentTop = this.className === "lava-stage" ? currentStageTop :
          this.className === "lava-source" ? currentStageTop + stageHeight - lakeHeight : currentStageTop - window.innerHeight * 0.4;
        const elementHeight = this.className === "lava-stage" ? stageHeight :
          this.className === "lava-source" ? lakeHeight : window.innerHeight * 0.4;
        const top = documentTop - (window?.scrollY || 0);
        return { top, height: elementHeight, bottom: top + elementHeight };
>>>>>>> theirs
      } };
    nodes.push(node);
    return node;
  };
  const THREE = {
    Vector2, Vector3, Mesh,
    WebGLRenderer: class { constructor() { this.domElement = makeElement("canvas"); } setPixelRatio() {} setClearColor() {} setSize() {} render() {} },
    Scene: class { add(...items) { this.items = [...(this.items || []), ...items]; } },
    OrthographicCamera: class { constructor() { this.position = {}; } updateProjectionMatrix() {} },
<<<<<<< ours
    SphereGeometry: class {}, PlaneGeometry: class {},
=======
    SphereGeometry: class {}, PlaneGeometry: class {}, CylinderGeometry: class {},
>>>>>>> theirs
    ShaderMaterial: class { constructor(options) { Object.assign(this, options); } },
    BackSide: 1, FrontSide: 0, DoubleSide: 2, AdditiveBlending: 3,
    MathUtils: { smoothstep: (value, min, max) => { const t = Math.max(0, Math.min(1, (value - min) / (max - min))); return t * t * (3 - 2 * t); } }
  };
  const frames = [];
  const window = {
    THREE, innerWidth: width, innerHeight: height, devicePixelRatio: 2, scrollY: 0, pageYOffset: 0,
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener(type, listener) { listen("window", type, listener); },
<<<<<<< ours
    scrollTo(x, y) { this.scrollY = y; this.pageYOffset = y; dispatch("window", "scroll"); }
  };
  const body = makeElement("body");
  const document = {
    body, hidden: false, documentElement: { scrollHeight: height * 12, clientHeight: height },
=======
    scrollTo(x, y) { this.scrollY = y; this.pageYOffset = y; dispatch("window", "scroll"); },
    resizeTo(w, h) { this.innerWidth = w; this.innerHeight = h; dispatch("window", "resize"); }
  };
  const body = makeElement("body");
  body.dataset = { page: "nav-home" };
  const footer = makeElement("footer");
  footer.className = "site-footer";
  body.appendChild(footer);
  const document = {
    body, hidden: false, documentElement: { scrollHeight: stageTop + layout().stageHeight, clientHeight: height },
>>>>>>> theirs
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
<<<<<<< ours
  return { system, window, document,
=======
  return { system, window, document, stageTop,
>>>>>>> theirs
    frame(milliseconds = 16.67) { now += milliseconds; const callback = frames.shift(); assert.ok(callback, "animation frame was scheduled"); callback(now); },
    pointer(x, y) { dispatch("document", "pointermove", { clientX: x, clientY: y }); } };
}

function assertWorldContract(system) {
  assert.ok(Array.isArray(system.world), "world records are public");
  assert.ok(Array.isArray(system.orbs), "shader mesh pool is public");
  assert.ok(system.lake, "lava lake DOM element is public");
<<<<<<< ours
=======
  assert.ok(system.stage, "lava stage DOM element is public");
>>>>>>> theirs
  assert.equal(typeof system.scrollY, "number");
  assert.equal(typeof system.sourceY, "number");
  assert.equal(typeof system.targetVisible, "number");
  assert.ok(system.lake.className.includes("lava"), "lake has a lava class");
<<<<<<< ours
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
=======
  assert.equal(system.lake.parentNode, system.stage, "lake sits inside its clear animation stage");
}

function assertLifecycleRecord(record) {
  for (const property of ["worldY", "bornAt", "opacity", "verticalVelocity", "emergence", "sizeScale", "apexY", "endDuration"]) {
    assert.equal(typeof record[property], "number", `${property} is public on each world record`);
  }
  assert.ok(["forming", "detaching", "rising", "settling"].includes(record.state), "record has a lava-lamp lifecycle state");
  assert.ok(record.opacity >= 0 && record.opacity <= 1, "record opacity is normalized");
  assert.ok(record.emergence >= 0 && record.emergence <= 1, "record emergence is normalized");
  assert.ok(record.sizeScale > 0, "record retains a positive organic size");
}

function findFreshRecord(system, frame, maximumFrames = 1800) {
  const existing = new Set(system.world);
  for (let index = 0; index < maximumFrames; index++) {
    frame();
    const born = system.world.find((record) => !existing.has(record) && record.bornAt >= 0);
    if (born) return born;
  }
  assert.fail("a fresh bubble should emerge from the lava source");
}

test("the lava lake is substantially shorter on desktop and mobile", () => {
  const desktop = styles.match(/\.lava-source\s*\{[^}]*height:\s*clamp\(\s*(\d+)px\s*,\s*(\d+)vh\s*,\s*(\d+)px\s*\)/);
  const mobile = styles.match(/@media\s*\(max-width:\s*680px\)\s*\{[\s\S]*?\.lava-source\s*\{[^}]*height:\s*clamp\(\s*(\d+)px\s*,\s*(\d+)vh\s*,\s*(\d+)px\s*\)/);
  assert.ok(desktop, "desktop lava height uses an explicit responsive clamp");
  assert.ok(mobile, "mobile lava height uses an explicit responsive clamp");
  assert.ok(Number(desktop[1]) <= 200 && Number(desktop[2]) <= 28 && Number(desktop[3]) <= 300,
    "desktop lava height is reduced by roughly one third");
  assert.ok(Number(mobile[1]) <= 160 && Number(mobile[2]) <= 25 && Number(mobile[3]) <= 230,
    "mobile lava height leaves room for the page content");
});

test("world records are page-space entities and shader meshes are a bounded pool", () => {
  const { system, document, stageTop } = createSystem();
  assertWorldContract(system);
  assert.equal(document.body.children.indexOf(system.stage), document.body.children.indexOf(document.querySelector(".site-footer")) + 1,
    "the lava stage follows the footer");
  assert.ok(system.sourceY > stageTop, "lava source is below the footer");
  assert.ok(system.world.length > 0, "initial world contains bubble records");
  assert.ok(system.world.length <= 80, "offscreen world records remain bounded");
  assert.ok(system.orbs.length >= system.targetVisible);
  assert.ok(system.orbs.length <= 13, "desktop mesh pool never exceeds the requested visible-orb cap");
  for (const record of system.world) {
    for (const property of ["x", "worldY", "radius", "speed"]) assert.equal(typeof record[property], "number");
    assertLifecycleRecord(record);
    assert.ok(record.radius >= 90, "desktop bubbles have substantial volume");
    assert.ok(record.x >= -record.radius * 0.55, "a bubble retains a visible portion past the left edge");
    assert.ok(record.x <= 1280 + record.radius * 0.55, "a bubble retains a visible portion past the right edge");
>>>>>>> theirs
  }
  for (const orb of system.orbs) {
    assert.ok(Object.hasOwn(orb, "record"), "pooled orb tracks its assigned record");
    assert.equal(typeof orb.screenY, "number");
  }
<<<<<<< ours
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
=======
  assert.ok(system.world.some((record) => record.worldY < stageTop),
    "the initial world includes already-rising bubbles above the footer");
});

test("no more than thirteen bubbles are displayed at once", () => {
  const { system, window, frame, stageTop } = createSystem(1440, 900, 31);
  for (const scrollY of [0, stageTop - 900, stageTop, stageTop + 360, stageTop + 720]) {
    window.scrollTo(0, scrollY);
    for (let index = 0; index < 12; index++) frame();
    const displayed = system.orbs.filter((orb) => orb.record);
    assert.ok(displayed.length <= 13, `only ${displayed.length} bubbles are displayed at scroll ${scrollY}`);
    assert.equal(new Set(displayed.map((orb) => orb.record)).size, displayed.length,
      "a displayed record is assigned to one pooled orb");
  }
});

test("mobile bubbles stay large but retain several visible trajectories", () => {
  const { system, window, frame, stageTop } = createSystem(390, 844, 31);
  window.scrollTo(0, stageTop);
  for (let index = 0; index < 400; index++) frame();
  assert.ok(system.world.some((record) => record.radius > 85),
    "mobile bubbles are visibly larger than before");
  assert.ok(system.world.every((record) => record.radius <= 115),
    "mobile bubbles stay bounded for the narrow viewport");
  assert.ok(system.orbs.filter((orb) => orb.record).length <= 8,
    "the mobile mesh pool stays bounded");
});

test("partially offscreen bubbles keep their path instead of snapping inside", () => {
  const { system, frame } = createSystem();
  const record = system.world.find((candidate) => candidate.worldY < 720);
  record.x = -record.radius * 0.30;
  frame();
  assert.ok(record.x < 0 && record.x > -record.radius * 0.55,
    "the bubble remains partly outside the viewport while moving");
});

test("scroll moves the camera through the world without changing a bubble's world trajectory", () => {
  const { system, window, frame, stageTop } = createSystem();
  assertWorldContract(system);
  window.scrollTo(0, stageTop);
  frame();
  const record = system.orbs.find((orb) => orb.record && orb.screenY > 150 && orb.screenY < 500)?.record;
  assert.ok(record, "a rendered record is available in the lava stage");
  const beforeWorldY = record.worldY;
  window.scrollTo(0, stageTop + 100);
  frame();
  const orb = system.orbs.find((candidate) => candidate.record === record);
  assert.ok(orb, "the same record is rendered after the camera scrolls to it");
  assert.equal(system.scrollY, stageTop + 100);
  assert.equal(orb.screenY, record.worldY - system.scrollY);
  assert.ok(record.worldY < beforeWorldY, "physics continues to raise bubbles");
  assert.ok(beforeWorldY - record.worldY < 20, "scroll delta is not applied to world physics");
  assert.ok(orb.screenY < beforeWorldY - stageTop, "camera exposes a lower part of the world");
});

test("the first viewport already contains moving bubbles at varied heights", () => {
  const { system, window, frame, stageTop } = createSystem();
  assertWorldContract(system);
  frame();
  const openingOrbs = system.orbs.filter((orb) => orb.record);
  assert.ok(openingOrbs.length >= 3, "the opening view is populated immediately");
  const openingYs = openingOrbs.map((orb) => orb.screenY);
  assert.ok(Math.max(...openingYs) - Math.min(...openingYs) > window.innerHeight * 0.4,
    "opening bubbles are spread across the screen height");
  const tracked = openingOrbs.find((orb) => orb.screenY > window.innerHeight * 0.5).record;
  const startingY = tracked.worldY;
  for (let index = 0; index < 240; index++) frame();
  assert.ok(startingY - tracked.worldY > 50, "an opening bubble visibly climbs within four seconds");
  window.scrollTo(0, stageTop);
  for (let index = 0; index < 3; index++) frame();
  assert.ok(system.orbs.some((orb) => orb.record?.bornAt >= 0),
    "the lava stage continues forming new bubbles");
});

test("reduced motion still projects page-space bubbles while scrolling", () => {
  const { system, window, stageTop } = createSystem(1280, 720, 7, true);
  const record = system.world.find((candidate) => candidate.worldY > stageTop);
  assert.ok(record);
  const initialWorldY = record.worldY;
  window.scrollTo(0, stageTop);
  const orb = system.orbs.find((candidate) => candidate.record === record);
  assert.ok(orb);
  assert.equal(record.worldY, initialWorldY);
  assert.equal(orb.screenY, record.worldY - stageTop);
});

test("resizing preserves each bubble's height relative to the lava", () => {
  const { system, window } = createSystem(390, 844, 23);
  const record = system.world.find((candidate) => candidate.bornAt >= 0);
  const before = record.worldY - system.sourceY;
  const beforeRadius = record.radius;
  window.resizeTo(1280, 800);
  assert.ok(Math.abs(record.worldY - system.sourceY - before) < 0.001,
    "bubbles follow the source when the footer and stage reflow");
  assert.ok(record.apexY < system.stage.getBoundingClientRect().top + window.scrollY,
    "the rising target stays well above the lava stage after resizing");
  assert.ok(record.radius > beforeRadius,
    "bubble size follows the new desktop layout after resizing");
});

test("a bubble forms in lava, rises continuously, then settles and dissolves", () => {
  const { system, frame } = createSystem(390, 844, 29);
  assertWorldContract(system);
  assert.ok(system.orbs.length <= 13, "mobile mesh pool respects the visible-orb cap");
  const born = findFreshRecord(system, frame);
  assertLifecycleRecord(born);
  assert.ok(born.formationFrames > 210 + born.radius * 2.7,
    "a larger bubble receives a proportionally longer inflation stage");
  assert.equal(born.state, "forming", "new bubble begins by forming inside the lava");
  assert.ok(born.worldY >= system.sourceY && born.worldY <= system.sourceY + born.radius,
    "new bubble starts submerged in the lake");

  const positions = [];
  let sawRising = false;
  for (let index = 0; index < 650; index++) {
    positions.push([born.x, born.worldY]);
    frame();
    assertLifecycleRecord(born);
    sawRising ||= born.state === "rising";
  }
  assert.ok(sawRising, "bubble transitions from formation to a rising state");
  assert.ok(born.worldY < positions[0][1], "bubble rises through page space");
  for (let index = 1; index < positions.length; index++) {
    const distance = Math.hypot(positions[index][0] - positions[index - 1][0], positions[index][1] - positions[index - 1][1]);
    assert.ok(distance < born.radius * 0.35 + 8, "bubble position remains continuous between animation frames");
  }

  born.apexY = born.worldY - Math.max(8, born.radius * 0.08);
  let sawSettling = false;
  let minimumOpacity = born.opacity;
  for (let index = 0; index < 900; index++) {
    frame();
    assertLifecycleRecord(born);
    sawSettling ||= born.state === "settling";
    minimumOpacity = Math.min(minimumOpacity, born.opacity);
    if (sawSettling && born.opacity < 0.25) break;
  }
  assert.ok(sawSettling, "bubble slows and enters a settling state after its apex");
  assert.ok(minimumOpacity < 0.25, "bubble fades as it dissolves");
});

test("the lava surface swells throughout formation and eases down at detachment", () => {
  const { system, window, frame, stageTop } = createSystem(1280, 720, 43);
  window.scrollTo(0, stageTop);
  const born = findFreshRecord(system, frame);
  let peak = 0;
  let latePulse = 0;
  for (let index = 0; index < 900 && born.state === "forming"; index++) {
    frame();
    const positions = Object.values(system.lakeUniforms.uBirthX.value);
    const pulses = Object.values(system.lakeUniforms.uPulse.value);
    const slot = positions.findIndex((x) => Math.abs(x - born.x / window.innerWidth) < 0.04);
    assert.ok(slot >= 0, "the active lava swell follows its bubble horizontally");
    peak = Math.max(peak, pulses[slot]);
    if (born.age / born.formationFrames > 0.92) latePulse = pulses[slot];
  }
  assert.ok(peak > 0.6, "inflation produces a visible rise in the lava surface");
  assert.ok(latePulse < peak * 0.5, "the surface relaxes as the bubble separates");
});

test("a new bubble detaches and crosses substantial page height before fading", () => {
  const { system, frame } = createSystem(390, 844, 47);
  const born = findFreshRecord(system, frame);
  assert.ok(born.apexY < 0, "a lava-born bubble targets the top of the page, beyond the footer");
  let sawDetaching = false;
  for (let index = 0; index < 800 && born.state !== "rising"; index++) {
    frame();
    sawDetaching ||= born.state === "detaching";
  }
  assert.ok(sawDetaching && born.state === "rising", "inflation transitions through a separate detachment phase");
  const detachedY = born.worldY;
  for (let index = 0; index < 700; index++) frame();
  assert.ok(detachedY - born.worldY > 844 * 0.22,
    "the bubble continues upward well beyond its original lava stage");
  assert.equal(born.opacity, 1, "it does not dissolve near the bottom");
});

test("after startup every new bubble comes from the lava", () => {
  const { system, frame } = createSystem(390, 844, 61);
  const initial = new Set(system.world);
  let births = 0;
  for (let index = 0; index < 1100; index++) {
    frame();
    for (const record of system.world) {
      if (initial.has(record)) continue;
      initial.add(record);
      births++;
      assert.ok(record.bornAt >= 0, "new records begin in the lava formation phase");
      assert.ok(Math.abs(record.birthY - system.sourceY) <= record.radius,
        "each new bubble starts at the lava surface");
      assert.ok(record.apexY < 0, "the new bubble continues toward the top of the page");
    }
  }
  assert.ok(births >= 2, "new lava bubbles keep appearing during continuous animation");
});

test("an emerging bubble grows a molten neck before it detaches", () => {
  const { system, window, frame, stageTop } = createSystem(390, 844, 19);
  window.scrollTo(0, stageTop);
  const born = findFreshRecord(system, frame);
  assert.ok(born.x >= born.radius && born.x <= window.innerWidth - born.radius,
    "new bubbles form fully inside the visible stage");
  let connected = false;
  let detached = false;
  for (let index = 0; index < 1100; index++) {
    frame();
    const orb = system.orbs.find((candidate) => candidate.record === born);
    if (orb?.neck.visible) {
      connected = true;
      assert.ok(orb.neckUniforms.uFade.value > 0, "molten neck uses the orb material while attached");
      const bottomWorldY = window.innerHeight / 2 - (orb.neck.position.y - orb.neck.scale.y / 2) + window.scrollY;
      assert.ok(Math.abs(bottomWorldY - system.sourceY) < born.radius * 0.3,
        "neck reaches the lava surface");
    }
    if (connected && orb && !orb.neck.visible) { detached = true; break; }
  }
  assert.ok(connected, "neck appears during emergence");
  assert.ok(detached, "neck retracts after the bubble rises");
});

test("bubbles keep rising and growing before their high-altitude fade", () => {
  const { system, window, frame, stageTop } = createSystem(390, 844, 41);
  window.scrollTo(0, stageTop);
  const born = findFreshRecord(system, frame);
  while (born.state === "forming") frame();
  const emergenceY = born.worldY;
  const emergenceSize = born.sizeScale;
  for (let index = 0; index < 130; index++) frame();
  assert.ok(born.worldY < emergenceY - born.radius * 0.35,
    "the separated bubble gains visible height within two seconds");
  assert.ok(born.sizeScale > emergenceSize,
    "the bubble grows gradually during its climb");
  assert.equal(born.opacity, 1, "shader and glow stay fully visible during the climb");
  assert.ok(born.worldY > stageTop + born.radius,
    "bubble remains inside the animation area while rising");
});

test("several bubbles coexist with varied birth times and shader detail", () => {
  const { system, window, frame, stageTop } = createSystem(1280, 800, 53);
  window.scrollTo(0, stageTop);
  const births = new Set(system.world.filter((record) => record.bornAt >= 0).map((record) => record.bornAt));
  let peakVisible = 0;
  for (let index = 0; index < 1200; index++) {
    frame(33.34);
    system.world.forEach((record) => { if (record.bornAt >= 0) births.add(record.bornAt); });
    peakVisible = Math.max(peakVisible, system.orbs.filter((orb) => orb.record).length);
  }
  assert.ok(peakVisible >= 5, "the lamp displays noticeably more than the old three or four bubbles");
  assert.ok(peakVisible <= 13, "the visible cap remains intact");
  const orderedBirths = [...births].sort((a, b) => a - b);
  const intervals = orderedBirths.slice(1).map((birth, index) => birth - orderedBirths[index]);
  assert.ok(new Set(intervals.map((interval) => Math.round(interval / 100))).size > 1,
    "birth intervals are not identical");
  assert.ok(system.orbs.every((orb) => orb.uniforms.uDetail.value === 1),
    "adaptive resolution never removes the orb texture detail");
>>>>>>> theirs
});

test("new visits distribute different records across the page", () => {
  const first = createSystem(1280, 720, 13).system.world;
  const second = createSystem(1280, 720, 37).system.world;
  assert.notDeepEqual(first.map((record) => [record.x, record.worldY, record.radius]),
    second.map((record) => [record.x, record.worldY, record.radius]));
});

<<<<<<< ours
test("pointer pressure approaches and recovers smoothly without translating the record", () => {
  const { system, frame, pointer } = createSystem();
  assertWorldContract(system);
  frame();
  const orb = system.orbs.find((candidate) => candidate.record);
  assert.ok(orb, "a record is available for interaction");
=======
test("different seeds produce distinct organic bubble trajectories", () => {
  const first = createSystem(1280, 720, 13);
  const second = createSystem(1280, 720, 37);
  const firstBorn = findFreshRecord(first.system, first.frame);
  const secondBorn = findFreshRecord(second.system, second.frame);
  const firstPath = [];
  const secondPath = [];
  for (let index = 0; index < 160; index++) {
    first.frame();
    second.frame();
    firstPath.push([Math.round(firstBorn.x), Math.round(firstBorn.worldY), Math.round(firstBorn.sizeScale * 100)]);
    secondPath.push([Math.round(secondBorn.x), Math.round(secondBorn.worldY), Math.round(secondBorn.sizeScale * 100)]);
  }
  assert.notDeepEqual(firstPath, secondPath, "seeds produce different speed, drift, and shape paths");
  assert.ok(new Set(firstPath.map(([x, y]) => `${x}:${y}`)).size > 12,
    "a single bubble follows an evolving path instead of repeating one position");
});

test("pointer pressure approaches and recovers smoothly without translating the record", () => {
  const { system, window, frame, pointer, stageTop } = createSystem();
  assertWorldContract(system);
  window.scrollTo(0, stageTop - 400);
  frame();
  const orb = system.orbs.find((candidate) => candidate.record?.state === "rising" &&
    candidate.screenY > candidate.radius * 1.5 && candidate.screenY < window.innerHeight - candidate.radius * 1.5);
  assert.ok(orb, "a stable rising bubble is available for interaction");
>>>>>>> theirs
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
<<<<<<< ours
=======
  assert.ok(sustainedPressure < 0.55, "cursor pressure stays gentle");
>>>>>>> theirs
  pointer(-1000, -1000);
  frame();
  const recoveryStart = orb.pressure ?? orb.uniforms?.uPressure?.value;
  assert.ok(recoveryStart > 0, "pressure retains momentum after pointer exit");
  assert.ok(Math.abs(record.x - originalX) < 5, "pointer does not directly drag the record");
  assert.ok(record.worldY < originalWorldY, "vertical world motion remains physical");
});
