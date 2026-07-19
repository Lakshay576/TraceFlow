import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, clearSession } from '../auth/session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.skipAuth) {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; details?: unknown }>) => {
    const status = error.response?.status ?? 0;

    if (status === 401 && !error.config?.skipAuth) {
      clearSession();
    }

    const message = error.response?.data?.message ?? 'Something went wrong';
    const details = error.response?.data?.details;

    return Promise.reject(new ApiError(message, status, details));
  }
);

interface RequestOptions {
  requiresAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } & RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, requiresAuth = true } = options;

  const response = await apiClient.request<T>({
    url: path,
    method,
    data: body,
    skipAuth: !requiresAuth,
  });

  return response.data;
}