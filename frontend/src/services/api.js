import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login/', { email, password }),
  register: (data) =>
    api.post('/users/register/', data),
  me: () =>
    api.get('/users/me/'),
};

// ── Listings ─────────────────────────────────────────────────
export const listingsAPI = {
  list: (params = {}) =>
    api.get('/listings/', { params }),
  get: (id) =>
    api.get(`/listings/${id}/`),
  create: (data) =>
    api.post('/listings/', data),
  update: (id, data) =>
    api.patch(`/listings/${id}/`, data),
};

// ── AI Engines ───────────────────────────────────────────────
export const recommendAPI = {
  get: (payload) =>
    api.post('/recommendations/', payload),
};

export const predictAPI = {
  get: (payload) =>
    api.post('/predictions/', payload),
};

export const extractAPI = {
  parse: (text) =>
    api.post('/extract/', { text }),
};

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  submit: (data) =>
    api.post('/reports/', data),
  list: (spaceId) =>
    api.get('/reports/list/', { params: { space: spaceId } }),
};

export default api;
