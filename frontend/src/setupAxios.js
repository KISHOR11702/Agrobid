import axios from 'axios';
import { API_BASE_URL } from './config/api';

const LOCAL_API_ORIGIN = 'http://localhost:5000';

axios.interceptors.request.use((config) => {
  if (typeof config.url === 'string' && config.url.startsWith(LOCAL_API_ORIGIN)) {
    config.url = `${API_BASE_URL}${config.url.substring(LOCAL_API_ORIGIN.length)}`;
  }

  return config;
});
