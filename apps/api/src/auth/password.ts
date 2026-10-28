import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function assertEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw Object.assign(new Error("Enter a valid email address."), { code: "INVALID_EMAIL", statusCode: 400 });
  }
  return trimmed;
}

export function assertPassword(password: string): void {
  if (typeof password !== "string" || password.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters."), {
      code: "INVALID_PASSWORD",
      statusCode: 400,
    });
  }
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return (
    local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "User"
  );
}
