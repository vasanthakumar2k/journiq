import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.example.com/v1', // Replace with actual API base URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token etc.
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
