import axios from 'axios';

// ─── Base URL ────────────────────────────────────────────────────────────────
// We do NOT rely on NEXT_PUBLIC_API_URL because Vercel may bake http:// into
// the bundle if the env var is wrong.  Instead we detect at runtime:
//   • localhost  →  use .env.local value (http://localhost:8000)
//   • production →  always use the hardcoded HTTPS backend URL
// This runs in the browser only, so window is always defined here.

const PROD_URL = 'https://sohaib125-crm-operations-management-system.hf.space';
const DEV_URL  = 'http://localhost:8000';

function getBaseURL(): string {
  // SSR / server build: use PROD_URL (safe default)
  if (typeof window === 'undefined') return PROD_URL;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return DEV_URL;

  // Any deployed domain (vercel.app, custom domain, etc.)
  return PROD_URL;
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (typeof window !== 'undefined') window.location.href = '/login';
};

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Re-evaluate baseURL on every request (handles client-side hydration)
    config.baseURL = getBaseURL();

    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url === '/auth/login') return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) { logout(); return Promise.reject(error); }

      originalRequest._retry = true;
      try {
        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) logout();
    return Promise.reject(error);
  },
);

export default api;
