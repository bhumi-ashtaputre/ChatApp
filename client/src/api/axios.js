import axios from 'axios';

// Create a custom axios instance
// withCredentials: true means cookies are sent with every request
// This is how the JWT token gets sent to the server automatically
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default api;