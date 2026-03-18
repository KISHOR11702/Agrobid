const trimTrailingSlash = (value) => value.replace(/\/$/, '');

const rawApiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const rawSocketUrl = process.env.REACT_APP_SOCKET_URL || rawApiBaseUrl;

export const API_BASE_URL = trimTrailingSlash(rawApiBaseUrl);
export const SOCKET_URL = trimTrailingSlash(rawSocketUrl);

export const apiUrl = (path) => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${safePath}`;
};
