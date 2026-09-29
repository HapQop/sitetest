const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function setupCart({ signedIn = false, catalog = false, detail = false, storage = new Map(), username = "Buyer" } = {}) {
  const listeners = new Map();
  const requests = [];
  let userMenu = null;
  let cartButton;
  let addButton;
  const dialogParts = new Map();
  const cartParts = new Map();

  function element() {
    const events = new Map();
    return {
      dataset: {}, style: {}, children: [], disabled: false,
      classList: { contains: () => false },
      setAttribute(name, value) { this[name] = value; },
      removeAttribute(name) {
        if (name === "data-product-game") delete this.dataset.productGame;
        else delete this[name];
      },
      addEventListener(name, callback) { events.set(name, callback); },
      click() { return events.get("click")?.({ target: this }); },
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
  const stock = element();
  const link = element();
  link.dataset = { productId: "isaeva", productGame: "roblox" };
  link.querySelector = (selector) => selector === ".store-card__stock" ? stock : null;
  link.before = (item) => { link.wrapper = item; };

  const document = {
    readyState: "complete",
    body: { dataset: { page: catalog ? "products" : "isaeva" }, appendChild(node) { this.dialog = node; } },
    createElement(tag) {
      const node = element();
      if (tag === "dialog") {
        for (const selector of ["h2", ".cart-dialog__close", ".cart-dialog__message"]) dialogParts.set(selector, element());
      }
      if (tag === "button" && !cartParts.size) {
        for (const selector of [".cart-trigger__label", ".cart-trigger__count"]) cartParts.set(selector, element());
      }
      return node;
    },
    querySelector(selector) {
      return ({ ".site-controls": controls, ".login-link": loginLink, ".register-link": registerLink,
        ".plan-panel [data-select-plan]": detail ? purchaseButton : null, ".user-menu": userMenu })[selector] || null;
    },
    querySelectorAll(selector) {
      return selector === ".catalog-products > .store-card-link[data-product-id]" && catalog ? [link] : [];
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  const window = {
    location: { href: "", reload() {} },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    CheatBloxI18n: { translate: (key) => ({ "cart-title": "Cart", "cart-add": "Add to cart", "cart-close": "Close cart", "cart-coming-soon": "Checkout is coming soon." })[key] },
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    return signedIn
      ? { ok: true, json: async () => ({ ok: true, user: { username } }) }
      : { ok: false };
  };

  vm.runInNewContext(fs.readFileSync("scripts/site-auth-state.js", "utf8"), {
    document, window, fetch, MutationObserver: class { observe() {} }, console,
  });
  return { document, window, requests, loginLink, registerLink, link, purchaseButton, get cartButton() { return cartButton; }, get addButton() { return addButton; }, get userMenu() { return userMenu; }, clickAdd(button = addButton) { return listeners.get("click")({ target: { closest: () => button } }); } };
}

test("cart shows an icon and zero count, and sends guests to login", async () => {
  const page = setupCart();
  assert.equal(page.cartButton.className, "cart-trigger");
  assert.match(page.cartButton.innerHTML, /<svg/);
  assert.equal(page.cartButton.querySelector(".cart-trigger__label").textContent, "Cart");
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "0");
  await page.cartButton.click();
  assert.equal(page.window.location.href, "auth.html?mode=login");
  assert.equal(page.document.body.dialog.open, undefined);
  assert.ok(page.requests.every(({ url, options }) => url === "/api/auth/session" && options.credentials === "include"));
});

test("signed-in users can add products and see the count", async () => {
  const page = setupCart({ signedIn: true, detail: true });
  await page.window.CheatBloxAuth.checkSession();
  assert.equal(page.loginLink.style.display, "none");
  assert.equal(page.registerLink.style.display, "none");
  assert.equal(page.addButton.textContent, "Add to cart");
  assert.equal(page.addButton.disabled, false);
  assert.ok(page.userMenu);
  await page.clickAdd();
  assert.equal(page.document.body.dialog.open, true);
  assert.equal(page.cartButton.querySelector(".cart-trigger__count").textContent, "1");
  assert.equal(page.document.body.dialog.querySelector("h2").textContent, "Cart (1)");
  assert.equal(page.document.body.dialog.querySelector(".cart-dialog__message").textContent, "Checkout is coming soon.");
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

test("cart count persists across pages for the same account and stays separate for another account", async () => {
  const storage = new Map();
  const firstPage = setupCart({ signedIn: true, detail: true, storage });
  await firstPage.clickAdd();
  await firstPage.clickAdd();
  assert.equal(firstPage.cartButton.querySelector(".cart-trigger__count").textContent, "2");

  const nextPage = setupCart({ signedIn: true, catalog: true, storage });
  await nextPage.window.CheatBloxAuth.checkSession();
  assert.equal(nextPage.cartButton.querySelector(".cart-trigger__count").textContent, "2");
  await nextPage.clickAdd(nextPage.link.wrapper.children[1]);
  assert.equal(storage.get("cheatblox-cart-count:Buyer"), "3");

  const otherAccount = setupCart({ signedIn: true, storage, username: "Other" });
  await otherAccount.window.CheatBloxAuth.checkSession();
  assert.equal(otherAccount.cartButton.querySelector(".cart-trigger__count").textContent, "0");
});

test("catalog buttons remain outside product links and filtering targets their wrapper", () => {
  const page = setupCart({ catalog: true });
  assert.equal(page.link.wrapper.dataset.productGame, "roblox");
  assert.equal(page.link.dataset.productGame, undefined);
  assert.equal(page.link.wrapper.children[0], page.link);
  assert.equal(page.link.wrapper.children[1].textContent, "Add to cart");
});
