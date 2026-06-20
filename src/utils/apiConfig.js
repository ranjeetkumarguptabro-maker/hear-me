/**
 * API Configuration Utility
 * Returns the correct backend URL based on environment
 * 
 * In production (Vercel): Uses /api proxy (configured in vercel.json)
 * In development: Uses VITE_BACKEND_URL or localhost
 */

/**
 * Get the base URL for API calls
 * @returns {string} Base URL for backend API
 */
export const getApiBaseUrl = () => {
  // CRITICAL: Check hostname FIRST (before any env vars) to detect Vercel
  // This ensures we ALWAYS use /api/backend proxy on Vercel, even if VITE_BACKEND_URL is set
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isVercel = hostname.includes('vercel.app') || hostname.includes('vercel.com');
    const isHTTPS = window.location.protocol === 'https:';
    
    if (isVercel || isHTTPS) {
      console.log('🔒 Vercel/HTTPS detected, using /api/backend serverless proxy');
      return '/api/backend';
    }
  }
  
  // In production build (but not HTTPS - local testing), use /api/backend if PROD is true
  if (import.meta.env.PROD) {
    console.log('📦 Production build detected, using /api/backend');
    return '/api/backend';
  }
  
  // In development (HTTP localhost), use environment variable or localhost
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    // NEVER use HTTP URLs that would cause mixed content errors
    if (envUrl.startsWith('http://') && !envUrl.includes('localhost')) {
      console.warn('⚠️ VITE_BACKEND_URL is HTTP (not localhost), ignoring to prevent mixed content. Using /api/backend instead.');
      return '/api/backend';
    }
    console.log('🔧 Using VITE_BACKEND_URL:', envUrl);
    return envUrl;
  }
  
  console.log('🏠 Using default localhost:8000');
  return 'http://localhost:8000';
};

/**
 * Get full API URL for an endpoint
 * @param {string} endpoint - API endpoint (e.g., '/room', '/predict', '/api/azure/token')
 * @returns {string} Full URL
 */
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  
  // Remove leading slash from endpoint if present
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If endpoint already starts with 'api/', remove it since baseUrl already includes '/api/backend'
  // This handles cases like '/api/azure/token' -> 'api/azure/token' -> 'azure/token'
  // So final URL: /api/backend/azure/token -> proxies to -> http://51.124.124.18/azure/token
  // But wait, backend has /api/azure/token, so we need to keep the 'api/' part
  // Actually, let's keep it as-is and let the proxy handle it
  // The proxy will forward: /api/backend/api/azure/token -> http://51.124.124.18/api/azure/token
  
  return `${baseUrl}/${cleanEndpoint}`;
};

