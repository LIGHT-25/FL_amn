import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL = "15m";
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const REFRESH_COOKIE = "ff_refresh";

function requireSecret(name: string): Uint8Array {
  const value = process.env[name]?.trim();
  if (!value || value.length < 16) {
    throw new Error(`${name} must be set (min 16 chars)`);
  }
  return new TextEncoder().encode(value);
}

export type AccessClaims = {
  sub: string;
  email: string;
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(requireSecret("JWT_ACCESS_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, requireSecret("JWT_ACCESS_SECRET"));
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!sub || !email) throw new Error("Invalid access token");
  return { sub, email };
}

export function createRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(48).toString("base64url");
  const hash = hashRefreshToken(raw);
  return { raw, hash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) };
}

export function hashRefreshToken(raw: string): string {
  const pepper = process.env.JWT_REFRESH_SECRET ?? "";
  return createHash("sha256").update(`${pepper}:${raw}`).digest("hex");
}

export function refreshCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  const secure = (process.env.NODE_ENV ?? "development") === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: Math.floor(REFRESH_TTL_MS / 1000),
  };
}
