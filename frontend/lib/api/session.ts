import { apiRequest } from './client ';
import { SessionUser } from '../auth/session';

interface AuthResponse {
  token: string;
  user: SessionUser;
}

export function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: { email, password, name },
    requiresAuth: false,
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    requiresAuth: false,
  });
}