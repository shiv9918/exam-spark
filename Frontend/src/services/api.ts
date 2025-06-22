// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SERVER_BASE_URL = import.meta.env.VITE_API_URL ? new URL(API_BASE_URL).origin : 'http://localhost:5000';

console.log("API_BASE_URL:", API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL, // Use environment variable or fallback to localhost
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('exam-spark-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
