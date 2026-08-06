import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";

async function withServer(run) {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("POST /api/users returns 400 for invalid payload", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" })
    });

    assert.equal(res.status, 400);
  });
});

test("POST /api/users creates valid users without client-owned id or role", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "valid@example.com",
        name: "Valid User",
        id: "usr_attacker",
        role: "admin"
      })
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.email, "valid@example.com");
    assert.equal(body.data.name, "Valid User");
    assert.notEqual(body.data.id, "usr_attacker");
    assert.notEqual(body.data.role, "admin");
  });
});
