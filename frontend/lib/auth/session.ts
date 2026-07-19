'use client';

/**
 * Why localStorage and not an httpOnly cookie: this project's backend
 * expects the JWT in an `Authorization: Bearer <token>` header — both for
 * REST requests AND the Socket.io handshake (`socket.handshake.auth.token`).
 * An httpOnly cookie can't be read by client-side JS to attach as a header,
 * and Socket.io's auth handshake isn't a normal browser request that
 * automatically carries cookies the way fetch() can be configured to.
 * localStorage keeps this simple and consistent across both transports —
 * the real production tradeoff (XSS risk vs. httpOnly cookies) is worth
 * naming explicitly in an interview as a deliberate simplification, not
 * an oversight.
 */

const TOKEN_KEY = 'collabdocs_token';
const USER_KEY = 'collabdocs_user';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}