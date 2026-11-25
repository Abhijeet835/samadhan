import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30_000,
  headers: { Accept: 'application/json' },
});

// "Server is waking up…" banner for free-tier cold starts: if a request is
// still pending after 6 s, signal the UI until it settles. Non-blocking.
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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    trackStart();
    return config;
  },
  (error) => { trackEnd(); return Promise.reject(error); },
);

api.interceptors.response.use(
  (response) => {
    trackEnd();
    if (response.data && response.data.success) return response.data;
    return response.data;
  },
  (error) => {
    trackEnd();
    return Promise.reject(error);
  },
);

export default api;
