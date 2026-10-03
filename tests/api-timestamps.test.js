const assert = require("node:assert/strict");
const test = require("node:test");

const exploitsApi = require("../api/exploits");
const versionsApi = require("../api/versions");

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("exploit API returns Unix timestamps for exploit and response update dates", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => [{
      title: "Potassium",
      version: "2.5.1",
      updatedDate: "10/01/2026 at 12:04 AM UTC",
      platform: "Windows",
    }],
  });

  try {
    const res = response();
    await exploitsApi({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.exploits[0].updatedDate, 1790813040);
    assert.equal(typeof res.body.updatedAt, "number");
  } finally {
    global.fetch = originalFetch;
  }
});

test("versions API replaces platform date text with Unix timestamps", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      Windows: "version-a",
      WindowsDate: "9/30/2026, 4:00:15 PM UTC",
      WindowsResponse: { timestamp: 1790784015 },
      Mac: "version-b",
      MacDate: "9/29/2026, 10:45:58 PM UTC",
      Android: "2.741.1061",
      AndroidDate: "10/2/2026, 10:54:02 PM UTC",
      iOS: "2.741.1062",
      iOSDate: "10/2/2026, 9:05:01 AM UTC",
    }),
  });

  try {
    const res = response();
    await versionsApi({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual({
      WindowsDate: res.body.WindowsDate,
      MacDate: res.body.MacDate,
      AndroidDate: res.body.AndroidDate,
      iOSDate: res.body.iOSDate,
    }, {
      WindowsDate: 1790784015,
      MacDate: 1790721958,
      AndroidDate: 1790981642,
      iOSDate: 1790931901,
    });
  } finally {
    global.fetch = originalFetch;
  }
});
