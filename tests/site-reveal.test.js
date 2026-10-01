const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("scripts/site-reveal.js", "utf8");
const productsPage = fs.readFileSync("pages/products.html", "utf8");

function card(parent, top) {
  const classes = new Set();
  const attributes = new Map();
  const styles = new Map();
  return {
    parentElement: parent,
    classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); } },
    style: { setProperty(name, value) { styles.set(name, value); }, getPropertyValue(name) { return styles.get(name) || ""; } },
    setAttribute(name, value) { attributes.set(name, value); },
    getBoundingClientRect() { return { top }; },
    matches(selector) { return selector === ".catalog-products > .store-card-link"; },
    classes, attributes,
  };
}

function setup({ reducedMotion = false } = {}) {
  const parent = {};
  const cards = [card(parent, 900), card(parent, 1040)];
  let selector = "";
  let observer;
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; this.observed = []; this.unobserved = []; observer = this; }
    observe(element) { this.observed.push(element); }
    unobserve(element) { this.unobserved.push(element); }
  }
  const window = { innerHeight: 800, matchMedia: () => ({ matches: reducedMotion }), IntersectionObserver };
  vm.runInNewContext(source, {
    window,
    IntersectionObserver,
    document: { querySelectorAll(value) { selector = value; return cards; } },
  });
  return { cards, observer, selector };
}

test("catalog cards reveal from the left as they scroll into view", () => {
  const page = setup();
  assert.match(page.selector, /main \.catalog-products > \.store-card-link/, "the nested product grid is included in scroll reveal selection");
  assert.equal(page.cards.every((item) => item.attributes.has("data-scroll-reveal")), true);
  assert.equal(page.cards.every((item) => item.classes.has("scroll-reveal-pending")), true);
  assert.deepEqual(page.cards.map((item) => item.style.getPropertyValue("--scroll-reveal-delay")), ["0ms", "55ms"]);

  page.observer.callback([{ isIntersecting: true, target: page.cards[0] }]);
  assert.equal(page.cards[0].classes.has("scroll-reveal-pending"), false);
  assert.deepEqual(page.observer.unobserved, [page.cards[0]]);
  assert.match(productsPage, /catalog-card-enter 320ms/, "filter results use the same fast entrance duration");
  assert.match(productsPage, /translate3d\(-22px,0,0\)/, "the product-card animation begins left of its final position");
});

test("reduced motion skips product-card reveal effects", () => {
  const page = setup({ reducedMotion: true });
  assert.equal(page.observer, undefined);
  assert.equal(page.cards.every((item) => item.classes.size === 0), true);
});
