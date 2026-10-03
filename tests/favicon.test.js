const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("the shared header and standalone pages use the CheatBlox mark as favicon", () => {
  const favicon = "./assets/icons/cheatblox-mark.svg";
  assert.match(fs.readFileSync("scripts/site-header.js", "utf8"), new RegExp(`favicon\\.href = "${favicon.replaceAll(".", "\\.").replaceAll("/", "\\/")}"`));
  assert.match(fs.readFileSync("checkout.html", "utf8"), /rel="icon" type="image\/svg\+xml" href="\.\/assets\/icons\/cheatblox-mark\.svg"/);
  assert.match(fs.readFileSync("account.html", "utf8"), /rel="icon" type="image\/svg\+xml" href="\.\/assets\/icons\/cheatblox-mark\.svg"/);
});
