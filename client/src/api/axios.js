import axios from 'axios';

// ✅ SMART BASE URL
// If we are in "development" (coding on laptop), use localhost:5000
// If we are in "production" (on Render), use the relative path "/api/v1"
const BASE_URL = import.meta.env.MODE === "development" 
    ? "http://localhost:5000/api/v1" 
    : "/api/v1";

const API = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
});

API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;