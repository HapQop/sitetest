const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("login errors appear before the social sign-in controls", () => {
  const markup = fs.readFileSync("auth.html", "utf8");
  const statusPosition = markup.indexOf('class="auth-status"');
  const socialPosition = markup.indexOf('data-login-social-choice');

  assert.ok(statusPosition >= 0);
  assert.ok(socialPosition > statusPosition);
  assert.match(fs.readFileSync("scripts/auth.js", "utf8"), /loginSocialChoice\.hidden = mode !== "login"/);
});
