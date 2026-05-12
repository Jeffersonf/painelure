"use strict";

const env = (name, fallback = "") => process.env[name] || fallback;

function apiUrl(pathname) {
  const base = env("P2_API_URL", "https://painelure2-api.onrender.com").replace(/\/+$/, "");
  return `${base}${pathname}`;
}

async function request(pathname, options = {}) {
  const response = await fetch(apiUrl(pathname), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${response.status} ${payload.error || response.statusText}`);
  return payload;
}

async function login() {
  const username = env("P2_ADMIN_USER");
  const password = env("P2_ADMIN_PASSWORD");
  const key = env("P2_ADMIN_KEY");
  const body = username && password ? { username, password } : { key };
  const payload = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body)
  });
  if (!payload.token) throw new Error("Login nao retornou token.");
  return payload.token;
}

async function main() {
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };
  const pin = env("P2_INITIAL_PIN", "1234");
  const users = (await request("/api/users", { headers })).users || [];
  let updated = 0;

  for (const user of users) {
    await request(`/api/users/${encodeURIComponent(user.id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        password: pin,
        preferences: {
          ...(user.preferences || {}),
          forcePinChange: true,
          initialPinIssuedAt: new Date().toISOString()
        }
      })
    });
    updated += 1;
  }

  console.log(JSON.stringify({ ok: true, updated, pin }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
