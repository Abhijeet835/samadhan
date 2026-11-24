import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle standard envelope
api.interceptors.response.use(
  (response) => {
    // Extract data from standard envelope
    if (response.data && response.data.success) {
      return response.data;
    }
    return response.data;
  },
  (error) => {
    // Handle error responses
    if (error.response?.data?.error) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default api;
