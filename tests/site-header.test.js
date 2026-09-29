const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function setupHeader(scrollY = 0, { storage = new Map(), href = "https://site.test/pages/index.html", readyState = "complete" } = {}) {
  const classes = new Set();
  const listeners = new Map();
  const headerListeners = new Map();
  const frames = [];
  const timers = [];
  let expandedHeight = 74;
  let loader;
  const spacer = { style: {}, setAttribute() {} };
  const header = {
    get offsetHeight() { return expandedHeight - (classes.has("is-scrolled") ? 10 : 0); },
    style: {},
    inert: false,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
    },
    after() {},
    addEventListener(name, callback) { headerListeners.set(name, callback); },
  };
  const location = new URL(href);
  const window = {
    scrollY,
    location: { href: location.href, origin: location.origin },
    sessionStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
    setTimeout(callback) { timers.push(callback); },
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  let createdSpacer = false;
  vm.runInNewContext(fs.readFileSync("scripts/site-header.js", "utf8"), {
    window, URL,
    document: {
      readyState,
      documentElement: {},
      body: { appendChild(node) { loader = node; } },
      querySelector() { return header; },
      createElement() {
        if (!createdSpacer) {
          createdSpacer = true;
          return spacer;
        }
        const loaderClasses = new Set();
        const label = {};
        return {
          classList: {
            add(name) { loaderClasses.add(name); },
            remove(name) { loaderClasses.delete(name); },
            contains(name) { return loaderClasses.has(name); },
          },
          setAttribute() {},
          querySelector() { return label; },
        };
      },
      addEventListener() {},
    },
    getComputedStyle() { return { getPropertyValue() { return "34px"; } }; },
    requestAnimationFrame(callback) { frames.push(callback); },
  });

  return {
    header,
    classes,
    spacer,
    storage,
    get loader() { return loader; },
    clickNav(destination, options = {}) {
      const link = { href: destination, target: options.target || "", hasAttribute: () => Boolean(options.download) };
      headerListeners.get("click")({ target: { closest: () => link }, button: 0, ...options });
    },
    runTimers() { timers.splice(0).forEach((callback) => callback()); },
    load() { listeners.get("load")?.(); },
    pageShow(persisted) { listeners.get("pageshow")?.({ persisted }); },
    scrollTo(y) {
      window.scrollY = y;
      listeners.get("scroll")();
      frames.splice(0).forEach((callback) => callback());
    },
    resize(height) {
      expandedHeight = height;
      listeners.get("resize")();
    },
  };
}

test("header stays visible and interactive while scrolling in either direction", () => {
  const page = setupHeader();
  const reservedHeight = page.spacer.style.height;
  for (const y of [10, 150, 800, 1600, 1500, 700, 40, 2]) {
    page.scrollTo(y);
    assert.equal(page.classes.has("is-hidden"), false, `hidden at scrollY=${y}`);
    assert.equal(page.header.inert, false, `inert at scrollY=${y}`);
    assert.equal(page.classes.has("is-scrolled"), true);
    assert.equal(page.spacer.style.height, reservedHeight);
  }
});

test("header is visible and compact when the browser restores a scrolled page", () => {
  const page = setupHeader(900);
  assert.equal(page.classes.has("is-scrolled"), true);
  assert.equal(page.classes.has("is-hidden"), false);
  assert.equal(page.header.inert, false);
  assert.equal(page.spacer.style.height, "108px");
});

test("header expands only after returning to the very top", () => {
  const page = setupHeader();
  assert.equal(page.classes.has("is-scrolled"), false);
  page.scrollTo(500);
  page.scrollTo(2);
  assert.equal(page.classes.has("is-scrolled"), true);
  page.scrollTo(0);
  assert.equal(page.classes.has("is-scrolled"), false);
});

test("resizing a scrolled page reserves the expanded height without expanding the header", () => {
  const page = setupHeader(900);
  page.resize(122);
  assert.equal(page.spacer.style.height, "156px");
  assert.equal(page.classes.has("is-scrolled"), true);
  page.scrollTo(0);
  assert.equal(page.spacer.style.height, "156px");
});

test("section navigation shows the loader across pages and clears it after load", () => {
  const storage = new Map();
  const page = setupHeader(0, { storage });
  page.clickNav("https://site.test/pages/products.html");
  assert.equal(page.loader.classList.contains("is-visible"), true);
  assert.ok(Number(storage.get("cheatblox-navigation-start")) > 0);

  const destination = setupHeader(0, { storage, href: "https://site.test/pages/products.html", readyState: "interactive" });
  assert.equal(destination.loader.classList.contains("is-visible"), true);
  assert.equal(storage.has("cheatblox-navigation-start"), false);
  destination.load();
  destination.runTimers();
  assert.equal(destination.loader.classList.contains("is-visible"), false);
});

test("current, external, and modified links do not show the loader", () => {
  const page = setupHeader();
  page.clickNav("https://site.test/pages/index.html");
  page.clickNav("https://other.test/products.html");
  page.clickNav("https://site.test/pages/products.html", { ctrlKey: true });
  page.clickNav("https://site.test/pages/products.html", { target: "_blank" });
  assert.equal(page.loader, undefined);
});

test("back-forward cache restores a page without a stuck loader", () => {
  const page = setupHeader();
  page.clickNav("https://site.test/pages/products.html");
  page.pageShow(true);
  assert.equal(page.loader.classList.contains("is-visible"), false);
});
