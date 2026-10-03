const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function setupCart({ signedIn = false, catalog = false, detail = false, storage = new Map(), username = "Buyer" } = {}) {
  const documentListeners = new Map();
  const requests = [];
  const dialogParts = new Map();
  const cartParts = new Map();
  let userMenu = null;
  let cartButton;
  let addButton;
  let dialog;

  function element() {
    const events = new Map();
    const classes = new Set();
    let html = "";
    return {
      dataset: {}, style: {}, children: [], disabled: false, className: "", textContent: "",
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle: (name, force) => force === undefined ? (classes.has(name) ? (classes.delete(name), false) : (classes.add(name), true)) : (force ? classes.add(name) : classes.delete(name), force),
      },
      get innerHTML() { return html || this.textContent; },
      set innerHTML(value) { html = value; },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { events.set(name, callback); },
      click() { return events.get("click")?.({ target: this }); },
      emit(name, event) { return events.get(name)?.(event); },
      appendChild(child) { this.children.push(child); if (child.className === "user-menu") userMenu = child; },
      insertAdjacentElement(position, child) {
        assert.equal(position, "afterend");
        if (child.className === "cart-trigger") cartButton = child;
        if (child.className === "detail-add-to-cart") addButton = child;
      },
      querySelector(selector) {
        if (selector === ".logout-btn") return element();
        return dialogParts.get(selector) || cartParts.get(selector) || null;
      },
      showModal() { this.open = true; },
      close() { this.open = false; },
    };
  }

  const controls = element();
  const language = element();
  controls.querySelector = (selector) => selector === ".language-toggle" ? language : null;
  const loginLink = element();
  const registerLink = element();
  const purchaseButton = element();
  const main = element();
  main.dataset.plan = "weekly";
  const productName = element();
  productName.textContent = "Isaeva";
  const planName = element();
  planName.textContent = "Weekly";
  const price = element();
  price.dataset.promoBasePrice = "2.99";
  const catalogLink = element();
  catalogLink.dataset = { productId: "isaeva", productGame: "roblox" };

  const document = {
    readyState: "complete",
    body: {
      dataset: { page: catalog ? "products" : "isaeva" },
      appendChild(node) { if (node.className === "cart-dialog") dialog = node; },
    },
    createElement(tag) {
      const node = element();
      if (tag === "dialog") {
        for (const selector of ["h2", ".cart-dialog__close", ".cart-dialog__subtitle", ".cart-dialog__items", ".cart-dialog__total span", ".cart-dialog__total strong"]) {
          dialogParts.set(selector, element());
        }
      }
      if (tag === "button" && !cartParts.size) {
        for (const selector of [".cart-trigger__label", ".cart-trigger__count"]) cartParts.set(selector, element());
      }
      return node;
    },
    querySelector(selector) {
      return ({
        ".site-controls": controls,
        ".login-link": loginLink,
        ".register-link": registerLink,
        ".plan-panel [data-select-plan]": detail ? purchaseButton : null,
        ".user-menu": userMenu,
        "main[data-plan]": detail ? main : null,
        main: detail ? main : null,
        "[data-plan-price]": detail ? price : null,
        ".product-heading h1": detail ? productName : null,
        "[data-plan-summary-name]": detail ? planName : null,
      })[selector] || null;
    },
    querySelectorAll(selector) {
      return selector === ".catalog-products > .store-card-link[data-product-id]" && catalog ? [catalogLink] : [];
    },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
  };
  const translations = {
    "cart-title": "Cart", "cart-add": "Add to cart", "cart-close": "Close cart", "cart-items": "items", "cart-empty": "Your cart is empty.",
    "cart-quantity": "Qty:", "cart-total": "Total", "cart-increase": "Increase quantity", "cart-decrease": "Decrease quantity", "cart-remove": "Remove",
  };
  const window = {
    location: { href: "", reload() {} },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    CheatBloxI18n: { translate: (key) => translations[key] },
    setTimeout() {},
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    return signedIn ? { ok: true, json: async () => ({ ok: true, user: { username } }) } : { ok: false };
  };

  vm.runInNewContext(fs.readFileSync("scripts/site-auth-state.js", "utf8"), {
    document, window, fetch, MutationObserver: class { observe() {} }, console,
  });

  return {
    document, window, requests, loginLink, registerLink, purchaseButton, catalogLink,
    get cartButton() { return cartButton; }, get addButton() { return addButton; }, get dialog() { return dialog; }, get userMenu() { return userMenu; },
    clickAdd(button = addButton) { return documentListeners.get("click")({ target: { closest: () => button } }); },
    cartAction(action) { return dialog.emit("click", { target: { closest: () => ({ dataset: { cartAction: action, cartItemIndex: "0" } }) } }); },
  };
}

test("cart shows an icon and sends guests to login", async () => {
  const page = setupCart();
  assert.equal(page.cartButton.className, "cart-trigger");
  assert.match(page.cartButton.innerHTML, /<svg/);
  assert.equal(page.cartButton.querySelector(".cart-trigger__label").textContent, "Cart");
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "0");
  await page.cartButton.click();
  assert.equal(page.window.location.href, "auth.html?mode=login");
  assert.equal(page.dialog.open, undefined);
  assert.ok(page.requests.every(({ url, options }) => url === "/api/auth/session" && options.credentials === "include"));
});

test("adding a product stores its plan, updates the badge, and leaves the cart closed", async () => {
  const page = setupCart({ signedIn: true, detail: true });
  await page.window.CheatBloxAuth.checkSession();
  assert.equal(page.addButton.textContent, "Add to cart");
  await page.clickAdd();

  assert.equal(page.dialog.open, undefined, "adding uses the cart animation instead of opening a popup");
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "1");
  assert.match(page.dialog.querySelector(".cart-dialog__items").innerHTML, /Isaeva/);
  assert.match(page.dialog.querySelector(".cart-dialog__items").innerHTML, /Weekly/);
  assert.match(page.dialog.querySelector(".cart-dialog__items").innerHTML, /\$2\.99/);
  assert.equal(page.dialog.querySelector(".cart-dialog__total strong").textContent, "$2.99");
  assert.deepEqual(JSON.parse(page.window.localStorage.getItem("cheatblox-cart:Buyer")), [
    { productId: "isaeva", planId: "weekly", productName: "Isaeva", planName: "Weekly", unitPrice: 2.99, quantity: 1 },
  ]);
});

test("cart drawer changes quantities, updates the total, and removes items", async () => {
  const page = setupCart({ signedIn: true, detail: true });
  await page.clickAdd();
  const requestCountBeforeOpening = page.requests.length;
  await page.cartButton.click();
  assert.equal(page.dialog.open, true);
  assert.equal(page.requests.length, requestCountBeforeOpening, "opening an already authenticated cart does not wait for another session request");
  assert.equal(page.dialog.querySelector("h2").textContent, "Cart");
  assert.equal(page.dialog.querySelector(".cart-dialog__subtitle").textContent, "1 items");

  page.cartAction("increase");
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "2");
  assert.equal(page.dialog.querySelector(".cart-dialog__total strong").textContent, "$5.98");
  page.cartAction("remove");
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "0");
  assert.equal(page.dialog.querySelector(".cart-dialog__total strong").textContent, "$0.00");
});

test("disabled buttons and guest clicks do not add to the cart", async () => {
  const disabledPage = setupCart({ signedIn: true, detail: true });
  disabledPage.addButton.disabled = true;
  await disabledPage.clickAdd();
  assert.equal(disabledPage.cartButton.querySelector(".cart-trigger__count").textContent, "0");

  const guestPage = setupCart({ detail: true });
  await guestPage.clickAdd();
  assert.equal(guestPage.window.location.href, "auth.html?mode=login");
  assert.equal(guestPage.cartButton.querySelector(".cart-trigger__count").textContent, "0");
});

test("cart items persist for one account and stay separate for another", async () => {
  const storage = new Map();
  const firstPage = setupCart({ signedIn: true, detail: true, storage });
  await firstPage.clickAdd();
  await firstPage.clickAdd();
  assert.equal(firstPage.cartButton.querySelector(".cart-trigger__count").textContent, "2");

  const nextPage = setupCart({ signedIn: true, catalog: true, storage });
  await nextPage.window.CheatBloxAuth.checkSession();
  assert.equal(nextPage.cartButton.querySelector(".cart-trigger__count").textContent, "2");

  const otherAccount = setupCart({ signedIn: true, storage, username: "Other" });
  await otherAccount.window.CheatBloxAuth.checkSession();
  assert.equal(otherAccount.cartButton.querySelector(".cart-trigger__count").textContent, "0");
});

test("catalog cards remain direct links without add-to-cart buttons", () => {
  const page = setupCart({ catalog: true });
  assert.equal(page.catalogLink.dataset.productGame, "roblox");
  assert.equal(page.addButton, undefined);
});
