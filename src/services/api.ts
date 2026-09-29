const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'scraplink_session_token';

export class ApiError extends Error { status?: number; constructor(message: string, status?: number) { super(message); this.status = status; } }

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export function apiOrigin() {
  if (API_BASE_URL.startsWith('http')) return API_BASE_URL.replace(/\/api\/?$/, '');
  return window.location.origin;
}

async function request<T>(path: string, options: RequestInit, authenticated: boolean): Promise<T> {
  const token = authenticated ? getToken() : null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch {
    throw new ApiError('Cannot reach the ScrapLink API. Run npm run dev and check the API at /api/health.');
  }
  const payload = await response.json().catch(() => ({}));
  if (response.status === 502) throw new ApiError('The API server is not running or cannot be reached. Run npm run dev to start the frontend and API together.', response.status);
  if (response.status === 503) throw new ApiError('The API is running but its database is unavailable. Check the MongoDB connection and /api/health.', response.status);
  if (response.status >= 500) throw new ApiError('The API returned a server error. Check the API terminal logs and /api/health.', response.status);
  if (!response.ok) {
    const message = payload.error?.message || payload.message || (response.status === 401
      ? 'The account identifier or password is incorrect.'
      : response.status === 404
        ? 'The sign-in endpoint was not found. Check the configured API URL.'
        : `Sign-in request failed (HTTP ${response.status}). Please try again.`);
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, true);
}

/** Requests a public resource without attaching a logged-in user's session token. */
export function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, false);
}
