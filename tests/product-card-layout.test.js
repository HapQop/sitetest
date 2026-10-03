const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productsPage = fs.readFileSync("products.html", "utf8");
const cards = productsPage.match(/<a class="store-card-link"[\s\S]*?<\/a>/g) || [];
const categoryLabels = { executor: "Executor", external: "External", script: "Script" };

test("catalog cards reserve the upper-right visual area for framed operational status", () => {
  assert.equal(cards.length, 18, "all product cards are present");
  const orderedIds = cards.map((card) => /data-product-id="([^"]+)"/.exec(card)?.[1]);
  assert.deepEqual(orderedIds, [
    "pottasium", "isaeva", "volt", "cosmic", "real", "wave", "sirhurt", "synapsez",
    "lumen", "matcha", "serotonin", "severe", "matrixhub", "ronin", "axis",
    "kiciahook", "yabujin", "mspaint",
  ], "All Products lists executors first, then externals, then scripts");

  for (const card of cards) {
    const productId = /data-product-id="([^"]+)"/.exec(card)?.[1];
    const type = /data-product-type="([^"]+)"/.exec(card)?.[1];
    const visual = /<div class="store-card__visual">([\s\S]*?)<\/div>\s*<div class="store-card__body">/.exec(card)?.[1] || "";
    const body = /<div class="store-card__body">([\s\S]*?)<\/article>/.exec(card)?.[1] || "";

    assert.match(visual, /<div class="store-card__meta"><span class="store-card__status-badge[^"]*" data-product-status-label>/, `${productId} has a framed status badge in the visual`);
    assert.doesNotMatch(visual, /store-card__(?:type|stock|access)/, `${productId} visual does not stack type, stock, or category labels`);
    assert.match(body, new RegExp(`<p class="store-card__access" data-i18n="product-${type}">${categoryLabels[type]}<\/p>`), `${productId} shows its category below the product name`);
    assert.match(body, /<div class="store-card__signals"[^>]*>\s*<span class="store-card__stock/, `${productId} keeps stock below its category`);
    assert.doesNotMatch(body, /store-card__status(?!-badge)/, `${productId} does not repeat status next to stock`);
  }

  const serotonin = cards.find((card) => card.includes('data-product-id="serotonin"'));
  assert.match(serotonin, /href="serotonin\.html"/, "Serotonin card opens its detail page");
  assert.match(serotonin, /data-product-type="external"/, "Serotonin is presented as an External product");
  assert.match(serotonin, /data-currency-price="9\.99">\$9\.99/, "Serotonin card starts at $9.99");

  const kiciaHook = cards.find((card) => card.includes('data-product-id="kiciahook"'));
  assert.match(kiciaHook, /href="kiciahook\.html"/, "KiciaHook card opens its detail page");
  assert.match(kiciaHook, /data-product-type="script"/, "KiciaHook is presented as a Script product");
  assert.match(kiciaHook, /data-product-status="online"/, "KiciaHook is online before remote status data loads");
  assert.match(kiciaHook, /store-card__status-badge is-online" data-product-status-label>Online/, "KiciaHook initially displays Online");
  assert.match(kiciaHook, /data-currency-price="2\.99">\$2\.99/, "KiciaHook card starts at $2.99");

  const yabujin = cards.find((card) => card.includes('data-product-id="yabujin"'));
  assert.match(yabujin, /href="yabujin\.html"/, "Yabujin card opens its detail page");
  assert.match(yabujin, /data-product-type="script"/, "Yabujin is presented as a Script product");
  assert.match(yabujin, /data-product-status="online"/, "Yabujin is online before remote status data loads");
  assert.match(yabujin, /store-card__status-badge is-online" data-product-status-label>Online/, "Yabujin initially displays Online");
  assert.match(yabujin, /src="\.\.\/assets\/yabujin-logo\.png"/, "Yabujin uses the supplied logo");
  assert.match(yabujin, /data-currency-price="2\.99">\$2\.99/, "Yabujin card starts at $2.99");

  const severe = cards.find((card) => card.includes('data-product-id="severe"'));
  assert.match(severe, /href="severe\.html"/, "Severe card opens its detail page");
  assert.match(severe, /data-product-type="external"/, "Severe is presented as an External product");
  assert.match(severe, /src="\.\.\/assets\/severe-logo\.png"/, "Severe uses the supplied logo");
  assert.match(severe, /data-currency-price="9\.99">\$9\.99/, "Severe card starts at $9.99");

  const mspaint = cards.find((card) => card.includes('data-product-id="mspaint"'));
  assert.match(mspaint, /href="mspaint\.html"/, "MsPaint card opens its detail page");
  assert.match(mspaint, /data-product-type="script"/, "MsPaint is presented as a Script product");
  assert.match(mspaint, /data-product-status="online"/, "MsPaint is online before remote status data loads");
  assert.match(mspaint, /store-card__status-badge is-online" data-product-status-label>Online/, "MsPaint initially displays Online");
  assert.match(mspaint, /src="\.\.\/assets\/mspaint-logo\.png"/, "MsPaint uses the cleaned supplied logo");
  assert.match(mspaint, /data-currency-price="2\.99">\$2\.99/, "MsPaint card starts at $2.99");

  const synapsez = cards.find((card) => card.includes('data-product-id="synapsez"'));
  assert.match(synapsez, /href="synapsez\.html"/, "SynapseZ card opens its detail page");
  assert.match(synapsez, /data-product-type="executor"/, "SynapseZ is presented as an Executor product");
  assert.match(synapsez, /src="\.\.\/assets\/synapsez-logo\.png"/, "SynapseZ uses the supplied logo");
  assert.match(synapsez, /data-currency-price="3\.99">\$3\.99/, "SynapseZ card starts at $3.99");

  const matrixHub = cards.find((card) => card.includes('data-product-id="matrixhub"'));
  assert.match(matrixHub, /href="matrixhub\.html"/, "Matrix Hub card opens its detail page");
  assert.match(matrixHub, /data-product-type="external"/, "Matrix Hub is presented as an External product");
  assert.match(matrixHub, /src="\.\.\/assets\/matrixhub-logo\.png"/, "Matrix Hub uses the supplied logo");
  assert.match(matrixHub, /data-currency-price="7\.99">\$7\.99/, "Matrix Hub card starts at $7.99");

  const ronin = cards.find((card) => card.includes('data-product-id="ronin"'));
  assert.match(ronin, /href="ronin\.html"/, "Ronin card opens its detail page");
  assert.match(ronin, /data-product-type="external"/, "Ronin is presented as an External product");
  assert.match(ronin, /src="\.\.\/assets\/ronin-logo\.png"/, "Ronin uses the supplied logo");
  assert.match(ronin, /data-currency-price="9\.99">\$9\.99/, "Ronin card starts at $9.99");

  const axis = cards.find((card) => card.includes('data-product-id="axis"'));
  assert.match(axis, /href="axis\.html"/, "Axis card opens its detail page");
  assert.match(axis, /data-product-type="external"/, "Axis is presented as an External product");
  assert.match(axis, /src="\.\.\/assets\/axis-logo\.png"/, "Axis uses the supplied logo");
  assert.match(axis, /data-currency-price="4\.99">\$4\.99/, "Axis card starts at $4.99");
});
