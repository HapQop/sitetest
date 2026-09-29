const assert = require("node:assert/strict");
const test = require("node:test");
const handler = require("../api/locale.js");

async function request(headers = {}, method = "GET", extra = {}) {
  const response = { headers: {}, statusCode: 200 };
  response.setHeader = (name, value) => { response.headers[name.toLowerCase()] = value; };
  response.status = (code) => { response.statusCode = code; return response; };
  response.json = (body) => { response.body = body; return response; };
  response.end = (body) => { response.body = body; return response; };
  await handler({ headers, method, ...extra }, response);
  return response;
}

test("locale API normalizes the trusted Vercel country header", async () => {
  for (const [value, country] of [["UA", "UA"], ["ru", "RU"], ["US", "US"]]) {
    const response = await request({ "x-vercel-ip-country": value });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { country });
  }
});

test("locale API returns null for absent, malformed, and sentinel country values", async () => {
  for (const value of [undefined, null, "", "U", "USA", "12", "U!", "UA,RU", "XX", "ZZ", ["UA", "RU"]]) {
    const response = await request(value === undefined ? {} : { "x-vercel-ip-country": value });
    assert.deepEqual(response.body, { country: null }, `country header ${JSON.stringify(value)}`);
  }
});

test("locale API ignores alternative geo headers, user IP, and query input", async () => {
  const response = await request({
    "cf-ipcountry": "RU", "x-country-code": "RU", "x-geo-country": "RU",
    "x-vercel-ip-country-region": "RU", "x-forwarded-for": "8.8.8.8",
    "x-real-ip": "8.8.8.8", "X-Vercel-IP-Country": "RU",
  }, "GET", { query: { country: "RU" }, socket: { remoteAddress: "8.8.8.8" } });
  assert.deepEqual(response.body, { country: null });
  const trusted = await request({ "x-vercel-ip-country": "UA", "cf-ipcountry": "RU" }, "GET", { query: { country: "RU" } });
  assert.deepEqual(trusted.body, { country: "UA" });
});

test("locale API prevents browser and shared CDN caching", async () => {
  const response = await request({ "x-vercel-ip-country": "UA" });
  assert.match(response.headers["cache-control"], /private/i);
  assert.match(response.headers["cache-control"], /no-store/i);
  assert.equal(response.headers["cdn-cache-control"], "no-store");
  assert.equal(response.headers["vercel-cdn-cache-control"], "no-store");
});

test("locale API rejects methods other than GET", async () => {
  for (const method of ["POST", "PUT", "DELETE", "HEAD", "OPTIONS"]) {
    const response = await request({ "x-vercel-ip-country": "UA" }, method);
    assert.equal(response.statusCode, 405, method);
    assert.equal(response.headers.allow, "GET", method);
  }
});
