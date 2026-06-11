import axios from 'axios';

// In production on Vercel, all API calls go through /api/* which Vercel rewrites
// to https://sohaib125-crm-operations-management-system.hf.space/* — no Mixed Content.
// In local dev, we call the backend directly via NEXT_PUBLIC_API_URL.
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const api = axios.create({
  baseURL: isLocalDev
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : '/api',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url === '/auth/login') {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const refreshResponse = await api.post('/auth/refresh', {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token } = refreshResponse.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      logout();
    }

    return Promise.reject(error);
  }
);

export default api;
