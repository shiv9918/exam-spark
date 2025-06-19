// src/services/api.ts
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // Flask backend
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('exam-spark-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
