export interface AuthSession {
  email: string
  name: string
  initials: string
  userId?: string
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

const SESSION_KEY = 'flowforge.session'
const ACCESS_KEY = 'flowforge.accessToken'
// Empty = same-origin via Vite proxy; set VITE_API_URL for direct API.
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

let memoryAccessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

function initialsFrom(email: string, name?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
  }
  const local = email.split('@')[0] ?? 'u'
  return local.slice(0, 2).toUpperCase()
}

function assertEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Enter a valid email address.')
  }
  return trimmed
}

function assertPassword(password: string): void {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }
}

function toSession(user: AuthUser): AuthSession {
  return {
    email: user.email,
    name: user.displayName,
    initials: initialsFrom(user.email, user.displayName),
    userId: user.id,
  }
}

function persistSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function persistAccessToken(token: string): void {
  memoryAccessToken = token
  try {
    sessionStorage.setItem(ACCESS_KEY, token)
  } catch {
    // sessionStorage may be unavailable; memory still works for the tab.
  }
}

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken
  try {
    memoryAccessToken = sessionStorage.getItem(ACCESS_KEY)
  } catch {
    memoryAccessToken = null
  }
  return memoryAccessToken
}

function clearAccessToken(): void {
  memoryAccessToken = null
  try {
    sessionStorage.removeItem(ACCESS_KEY)
  } catch {
    /* ignore */
  }
}

type AuthResponse = {
  accessToken: string
  user: AuthUser
  message?: string
}

async function authRequest(path: string, init?: RequestInit): Promise<AuthResponse | void> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return
  const body = (await res.json().catch(() => ({}))) as AuthResponse & { message?: string; code?: string }
  if (!res.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : `HTTP ${res.status}`)
  }
  return body
}

function applyAuthResponse(body: AuthResponse): AuthSession {
  persistAccessToken(body.accessToken)
  const session = toSession(body.user)
  persistSession(session)
  return session
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null && Boolean(getAccessToken())
}

/** Create an account with email + password, then sign in. */
export async function signup(email: string, password: string): Promise<AuthSession> {
  const trimmed = assertEmail(email)
  assertPassword(password)
  const body = await authRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: trimmed, password }),
  })
  if (!body || !('accessToken' in body)) throw new Error('Registration failed.')
  return applyAuthResponse(body)
}

/** Sign in with an existing email + password. */
export async function login(email: string, password: string): Promise<AuthSession> {
  const trimmed = assertEmail(email)
  assertPassword(password)
  const body = await authRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: trimmed, password }),
  })
  if (!body || !('accessToken' in body)) throw new Error('Sign in failed.')
  return applyAuthResponse(body)
}

/** Refresh access token using HttpOnly cookie. Returns false if session is dead. */
export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const body = await authRequest('/api/v1/auth/refresh', { method: 'POST' })
      if (!body || !('accessToken' in body)) {
        clearLocalSession()
        return false
      }
      applyAuthResponse(body)
      return true
    } catch {
      clearLocalSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getAccessToken()
  if (!token) return null
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    const ok = await refreshSession()
    if (!ok) return null
    return fetchMe()
  }
  if (!res.ok) return null
  const user = (await res.json()) as AuthUser
  persistSession(toSession(user))
  return user
}

function clearLocalSession(): void {
  clearAccessToken()
  localStorage.removeItem(SESSION_KEY)
}

export async function logout(): Promise<void> {
  try {
    await authRequest('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    /* still clear local */
  }
  clearLocalSession()
}

/** Drop local session without calling the API (e.g. after failed refresh). */
export function clearSession(): void {
  clearLocalSession()
}
