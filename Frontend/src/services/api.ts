// src/services/api.ts
import axios from 'axios';

// Ensure the API base URL always includes the `/api` prefix so frontend
// code can use routes like `/auth/login` and remain agnostic of the host.
const envUrl: string | undefined = import.meta.env.VITE_API_URL;
let API_BASE_URL: string;
let SERVER_BASE_URL: string;

if (envUrl) {
  // Normalize: remove trailing slash
  const normalized = envUrl.replace(/\/+$/, '');
  // If already contains /api at the end, keep it, otherwise append /api
  API_BASE_URL = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  SERVER_BASE_URL = new URL(normalized).origin;
} else {
  API_BASE_URL = 'http://localhost:5000/api';
  SERVER_BASE_URL = 'http://localhost:5000';
}

// Export the server base URL so other modules can reference the API host/origin
export { SERVER_BASE_URL };

console.log('API_BASE_URL:', API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL, // Use normalized environment variable or fallback to localhost
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('exam-spark-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
