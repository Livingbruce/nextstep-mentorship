// Centralized API configuration
// Use relative URLs when on same domain (Netlify), otherwise use env var or localhost

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If env URL is set and not empty, use it
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  
  // In production with no env URL, use relative URL (same domain = no CORS)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

