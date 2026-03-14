import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true, // Required for Better-Auth cookies/sessions
});

api.interceptors.request.use((config) => {
  // Better-Auth uses cookies, but we can add extra headers here if needed
  return config;
});

export default api;
