export interface AuthSession {
  email: string;
  name: string;
  initials: string;
}

interface StoredAccount {
  email: string;
  password: string;
  name: string;
}

const SESSION_KEY = 'flowforge.session';
const ACCOUNTS_KEY = 'flowforge.accounts';

function initialsFrom(email: string, name?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
  }
  const local = email.split('@')[0] ?? 'u';
  return local.slice(0, 2).toUpperCase();
}

function displayNameFrom(email: string): string {
  const local = email.split('@')[0] ?? 'User';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'User';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertEmail(email: string): string {
  const trimmed = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Enter a valid email address.');
  }
  return trimmed;
}

function assertPassword(password: string): void {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function findAccount(email: string): StoredAccount | undefined {
  return loadAccounts().find((a) => a.email === email);
}

function startSession(account: StoredAccount): AuthSession {
  const session: AuthSession = {
    email: account.email,
    name: account.name,
    initials: initialsFrom(account.email, account.name),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

/** Create an account with email + password, then sign in. */
export function signup(email: string, password: string): AuthSession {
  const trimmed = assertEmail(email);
  assertPassword(password);
  if (findAccount(trimmed)) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  const account: StoredAccount = {
    email: trimmed,
    password,
    name: displayNameFrom(trimmed),
  };
  saveAccounts([...loadAccounts(), account]);
  return startSession(account);
}

/** Sign in with an existing email + password. */
export function login(email: string, password: string): AuthSession {
  const trimmed = assertEmail(email);
  assertPassword(password);
  const account = findAccount(trimmed);
  if (!account) {
    throw new Error('No account found for this email. Create one with Sign up.');
  }
  if (account.password !== password) {
    throw new Error('Incorrect password.');
  }
  return startSession(account);
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
