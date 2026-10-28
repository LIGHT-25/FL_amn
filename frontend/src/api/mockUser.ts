// Session-backed identity for the shell until a real auth backend lands.
import { getSession, type AuthSession } from '../auth/session';

export interface MockUser {
  name: string;
  initials: string;
  email?: string;
  workspaceLabel: string;
}

function fromSession(session: AuthSession): MockUser {
  const first = session.name.split(/\s+/)[0] || 'You';
  return {
    name: session.name,
    initials: session.initials,
    email: session.email,
    workspaceLabel: `${first}'s…`,
  };
}

export function getMockUser(): MockUser {
  const session = getSession();
  if (session) return fromSession(session);
  return {
    name: 'Guest',
    initials: 'G',
    workspaceLabel: 'Guest…',
  };
}

/** @deprecated Prefer getMockUser() so the UI reflects the logged-in session. */
export const mockUser: MockUser = getMockUser();
