import axios from 'axios';

// ✅ SMART BASE URL
// If we are in development (localhost), use port 5000.
// If we are in production (Render), use the relative path (so it talks to the same domain).
const baseURL = import.meta.env.MODE === "development" 
    ? "http://localhost:5000/api/v1" 
    : "/api/v1"; 

const instance = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ✅ ATTACH TOKEN AUTOMATICALLY
// This ensures every request (like Update Profile) sends your login token.
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default instance;