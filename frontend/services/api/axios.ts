import axios from 'axios';

const PROD_URL = 'https://sohaib125-crm-operations-management-system.hf.space';

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
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      config.baseURL = (h === 'localhost' || h === '127.0.0.1')
        ? 'http://localhost:8000'
        : PROD_URL;
    }

    // Add trailing slash to avoid FastAPI 307 redirect which causes Mixed Content
    if (config.url && !config.url.includes('?') && !config.url.endsWith('/')) {
      config.url = config.url + '/';
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

    if (originalRequest.url?.includes('/auth/login')) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) { logout(); return Promise.reject(error); }

      originalRequest._retry = true;
      try {
        const { data } = await api.post('/auth/refresh/', { refresh_token: refreshToken });
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
