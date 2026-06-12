import axios from 'axios';

const PROD_URL = 'https://sohaib125-crm-operations-management-system.hf.space';

// Always start with PROD_URL — no conditions, no env vars, no build-time baking
const api = axios.create({
  baseURL: PROD_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (typeof window !== 'undefined') window.location.href = '/login';
};

api.interceptors.request.use(
  (config) => {
    // Switch to local backend only when running on localhost
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        config.baseURL = 'https://sohaib125-crm-operations-management-system.hf.space';
      } else {
        // Guarantee HTTPS on every request in production
        config.baseURL = PROD_URL;
      }
    }

    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

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
  
