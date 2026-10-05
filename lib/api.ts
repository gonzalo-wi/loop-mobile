import axios from 'axios';
import { getToken } from './storage';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

/** Error de API con el status HTTP, para que las pantallas puedan diferenciar (404, 502, etc.). */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Lets the backend audit log tell mobile app actions apart from panel ones.
    'X-Client-App': 'mobile',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // Token vencido o inválido → cerrar sesión. El guard de _layout redirige al login.
    if (status === 401 && !isLoginRequest) {
      void useAuthStore.getState().logout();
    }

    const message =
      error.response?.data?.message ??
      (error.message === 'Network Error' ? 'Sin conexión al servidor' : 'Error inesperado');
    return Promise.reject(new ApiError(message, status));
  }
);
