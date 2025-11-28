// src/api/index.js
import axios from 'axios';

// Backend Go Anda berjalan di port 8080
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;