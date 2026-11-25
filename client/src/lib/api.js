import axios from 'axios';

export function normalizeApiBaseUrl(raw) {
  const fallback = 'http://localhost:5000/api';
  const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return fallback;
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

const BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

// "Server is waking up…" banner for free-tier cold starts.
let pending = 0;
let wakeTimer = null;
const emit = (name) => { try { window.dispatchEvent(new CustomEvent(name)); } catch { /* SSR */ } };
function trackStart() {
  pending += 1;
  if (pending === 1) {
    wakeTimer = setTimeout(() => { if (pending > 0) emit('samadhan:waking'); }, 6000);
  }
}
function trackEnd() {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    clearTimeout(wakeTimer);
    emit('samadhan:settled');
  }
}

let refreshPromise = null;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    trackStart();
    return config;
  },
  (error) => { trackEnd(); return Promise.reject(error); },
);

api.interceptors.response.use(
  (response) => {
    trackEnd();
    return response.data;
  },
  async (error) => {
    trackEnd();
    const original = error.config;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes('/auth/refresh');
    const isAuthAttempt = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register');

    if (status === 401 && original && !original._retry && !isRefreshCall && !isAuthAttempt) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        original._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/auth/refresh`, null, {
                headers: { Authorization: `Bearer ${refreshToken}` },
              })
              .then((res) => res.data?.data ?? res.data)
              .finally(() => { refreshPromise = null; });
          }
          const refreshed = await refreshPromise;
          if (refreshed?.accessToken && refreshed?.refreshToken) {
            localStorage.setItem('accessToken', refreshed.accessToken);
            localStorage.setItem('refreshToken', refreshed.refreshToken);
            original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
            return api(original);
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          emit('samadhan:auth-expired');
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
