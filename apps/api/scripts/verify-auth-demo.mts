/**
 * Smoke: register → login → me → IDOR → quota endpoint.
 * Usage (API running, ALLOW_DEV_USER=false recommended):
 *   pnpm --filter @flowforge/api exec tsx --env-file=../../.env scripts/verify-auth-demo.mts
 */
const API = (process.env.VITE_API_URL || process.env.API_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

type Session = {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
};

async function req(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const stamp = Date.now();
  const emailA = `verify-a-${stamp}@flowforge.test`;
  const emailB = `verify-b-${stamp}@flowforge.test`;
  const password = "verify-pass-1";

  console.log("API", API);

  const regA = await req("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: emailA, password }),
  });
  assert(regA.res.status === 201, `register A failed: ${regA.res.status} ${JSON.stringify(regA.body)}`);
  const sessionA = regA.body as Session;

  const regB = await req("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: emailB, password }),
  });
  assert(regB.res.status === 201, `register B failed: ${regB.res.status}`);
  const sessionB = regB.body as Session;

  const me = await req("/api/v1/auth/me", { token: sessionA.accessToken });
  assert(me.res.ok, "me failed");
  assert((me.body as { email: string }).email === emailA, "me email mismatch");

  const badLogin = await req("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: emailA, password: "wrong-password" }),
  });
  assert(badLogin.res.status === 401, "bad password should 401");

  const createA = await req("/api/v1/workflows", {
    method: "POST",
    token: sessionA.accessToken,
    body: JSON.stringify({ name: "A private flow" }),
  });
  assert(createA.res.status === 201, "create workflow A failed");
  const wfA = createA.body as { id: string };

  const idor = await req(`/api/v1/workflows/${wfA.id}`, { token: sessionB.accessToken });
  assert(idor.res.status === 404, `IDOR: B should not see A's workflow (got ${idor.res.status})`);

  const idorRun = await req(`/api/v1/workflows/${wfA.id}/run`, {
    method: "POST",
    token: sessionB.accessToken,
    body: JSON.stringify({}),
  });
  assert(idorRun.res.status === 404, `IDOR run: expected 404 got ${idorRun.res.status}`);

  const quota = await req("/api/v1/me/quota", { token: sessionA.accessToken });
  assert(quota.res.ok, "quota failed");
  const q = quota.body as { runsLimit: number; runsRemaining: number };
  assert(q.runsLimit >= 1, "runsLimit missing");
  console.log("quota", q);

  const unauth = await req("/api/v1/workflows");
  assert(unauth.res.status === 401 || unauth.res.status === 200, "unexpected unauth status");
  if (unauth.res.status === 200) {
    console.warn("WARN: ALLOW_DEV_USER appears enabled — unauthenticated list succeeded");
  } else {
    console.log("unauthenticated workflows → 401 OK");
  }

  console.log("verify-auth-demo: PASS");
}

main().catch((err) => {
  console.error("verify-auth-demo: FAIL", err);
  process.exit(1);
});
