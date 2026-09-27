export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface RequestOptions extends RequestInit {
  cachePolicy?: 'default' | 'no-cache' | 'reload' | 'force-cache';
  ttl?: number; // Custom TTL in ms
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number; // -1 for session-persistent
}

// In-memory cache storage
const memoryCache = new Map<string, CacheEntry<unknown>>();

// In-flight GET promises for request deduplication
const inFlightRequests = new Map<string, Promise<unknown>>();

// Session storage prefix for persisted static data
const SESSION_CACHE_PREFIX = 'sc_cache:';

/**
 * Normalize path for caching (e.g., alias '/reference/wilayas' -> '/wilayas')
 */
function normalizePath(path: string): string {
  if (path === '/reference/wilayas') return '/wilayas';
  if (path === '/reference/cities') return '/cities';
  return path;
}

/**
 * Determine default caching behavior for a given path
 */
function getDefaultCacheConfig(normalizedPath: string): { cacheable: boolean; ttl: number; persist: boolean } {
  const basePath = normalizedPath.split('?')[0];

  // Permanent reference data (Algerian wilayas & communes)
  if (basePath === '/wilayas' || basePath === '/cities') {
    return { cacheable: true, ttl: -1, persist: true };
  }

  // Semi-static templates (Karate, MMA, JKD, etc.)
  if (basePath === '/templates' || basePath?.startsWith('/templates/')) {
    return { cacheable: true, ttl: 5 * 60 * 1000, persist: false }; // 5 min TTL
  }

  return { cacheable: false, ttl: 0, persist: false };
}

function getFromSessionStorage<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setToSessionStorage<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // SessionStorage full or unavailable, ignore safely
  }
}

function removeFromSessionStorage(keyPrefix: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && (k === SESSION_CACHE_PREFIX + keyPrefix || k.startsWith(SESSION_CACHE_PREFIX + keyPrefix))) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

function getCached<T>(path: string, options?: RequestOptions): T | null {
  if (options?.cachePolicy === 'no-cache' || options?.cachePolicy === 'reload') {
    return null;
  }

  const norm = normalizePath(path);
  const config = getDefaultCacheConfig(norm);
  const isCacheable = options?.cachePolicy === 'force-cache' || config.cacheable;
  if (!isCacheable) return null;

  const now = Date.now();
  const entry = memoryCache.get(norm);
  if (entry) {
    if (entry.ttl === -1 || now - entry.timestamp < entry.ttl) {
      return entry.data as T;
    }
    // Expired
    memoryCache.delete(norm);
  }

  // Check sessionStorage for persisted reference data
  if (config.persist) {
    const persisted = getFromSessionStorage<T>(norm);
    if (persisted !== null) {
      memoryCache.set(norm, { data: persisted, timestamp: now, ttl: -1 });
      return persisted;
    }
  }

  return null;
}

function setCache<T>(path: string, data: T, options?: RequestOptions): void {
  const norm = normalizePath(path);
  const config = getDefaultCacheConfig(norm);
  const isCacheable = options?.cachePolicy === 'force-cache' || config.cacheable;
  if (!isCacheable) return;

  const ttl = options?.ttl ?? config.ttl;
  const now = Date.now();
  memoryCache.set(norm, { data, timestamp: now, ttl });

  if (config.persist) {
    setToSessionStorage(norm, data);
  }
}

export function invalidateCache(pathPattern?: string): void {
  if (!pathPattern) {
    memoryCache.clear();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        }
      }
    } catch {
      // ignore
    }
    return;
  }

  const norm = normalizePath(pathPattern);
  for (const key of Array.from(memoryCache.keys())) {
    if (key === norm || key.startsWith(norm)) {
      memoryCache.delete(key);
    }
  }
  removeFromSessionStorage(norm);
}

function autoInvalidateOnMutation(path: string): void {
  const norm = normalizePath(path);
  if (norm.startsWith('/templates')) {
    invalidateCache('/templates');
  }
  if (norm.startsWith('/wilayas') || norm.startsWith('/cities')) {
    invalidateCache('/wilayas');
    invalidateCache('/cities');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error ?? body.message ?? detail;
    } catch {
      // ignore
    }
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/public/') && !window.location.pathname.startsWith('/register/')) {
        window.location.href = '/login';
      }
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function getRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const norm = normalizePath(path);

  // 1. Check client-side cache
  const cached = getCached<T>(norm, options);
  if (cached !== null) {
    return cached;
  }

  // 2. In-flight request deduplication
  const token = localStorage.getItem('token') ?? '';
  const flightKey = `${norm}::${token}`;

  const pending = inFlightRequests.get(flightKey);
  if (pending) {
    return pending as Promise<T>;
  }

  // 3. Initiate network request
  const promise = (async () => {
    try {
      const data = await request<T>(norm, { method: 'GET', ...options });
      setCache(norm, data, options);
      return data;
    } finally {
      inFlightRequests.delete(flightKey);
    }
  })();

  inFlightRequests.set(flightKey, promise);
  return promise;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => getRequest<T>(path, options),
  post: async <T>(path: string, body?: unknown, options?: RequestInit) => {
    const res = await request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), ...options });
    autoInvalidateOnMutation(path);
    return res;
  },
  put: async <T>(path: string, body?: unknown, options?: RequestInit) => {
    const res = await request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}), ...options });
    autoInvalidateOnMutation(path);
    return res;
  },
  del: async <T>(path: string, options?: RequestInit) => {
    const res = await request<T>(path, { method: 'DELETE', ...options });
    autoInvalidateOnMutation(path);
    return res;
  },
  invalidate: invalidateCache,
  clearCache: () => invalidateCache(),
};