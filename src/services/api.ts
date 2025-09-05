import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';

// Small contract for API errors
export type ApiError = {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
};

// Base config: you can override VITE_API_BASE_URL in .env files
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true, // send cookies if your API needs them
  timeout: 20000, // 20s default timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Helper to safely read tokens from localStorage
function getAccessToken(): string | null {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
}

// Request interceptor: attach auth token and any custom headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      // axios v1 uses AxiosHeaders which supports .set(); fall back to plain object merge
      const headersUnknown = (config.headers ?? {}) as unknown as {
        set?: (key: string, value: string) => void;
      } & Record<string, string>;
      if (typeof headersUnknown.set === 'function') {
        headersUnknown.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...(headersUnknown as Record<string, string>),
          Authorization: `Bearer ${token}`,
        } as AxiosRequestHeaders;
      }
    }

    // Example: add a request id or locale
    // config.headers = { ...(config.headers || {}), 'x-request-id': crypto.randomUUID() };

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Simple refresh token flow placeholder
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

async function onTokenRefreshed(newToken: string) {
  // store new token
  try {
    localStorage.setItem('access_token', newToken);
  } catch {
    // ignore
  }
  pendingQueue.forEach(({ resolve }) => resolve(undefined));
  pendingQueue = [];
}

function onTokenRefreshFailed(err: unknown) {
  pendingQueue.forEach(({ reject }) => reject(err));
  pendingQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  // TODO: wire to your backend refresh endpoint
  // Example:
  // const res = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
  // return res.data.access_token;
  throw new Error('Refresh token endpoint not implemented');
}

// Response interceptor: normalize errors and handle 401 with token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Network/timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const apiError: ApiError = { status: 0, message: 'Request timed out', code: 'TIMEOUT' };
      return Promise.reject(apiError);
    }

    const status = error.response?.status;

    // Try refresh once on 401
    if (status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;
        try {
          const newToken = await refreshAccessToken();
          await onTokenRefreshed(newToken);
          isRefreshing = false;

          // retry original with new token
          const hUnknown = (originalRequest.headers ?? {}) as unknown as {
            set?: (key: string, value: string) => void;
          } & Record<string, string>;
          if (typeof hUnknown.set === 'function') {
            hUnknown.set('Authorization', `Bearer ${newToken}`);
          } else {
            originalRequest.headers = {
              ...(hUnknown as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            } as AxiosRequestHeaders;
          }

          return api(originalRequest);
        } catch (err) {
          isRefreshing = false;
          onTokenRefreshFailed(err);
          const apiError: ApiError = { status: 401, message: 'Unauthorized', code: 'UNAUTHORIZED' };
          return Promise.reject(apiError);
        }
      }

      // queue while refreshing
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    // Build a normalized error
    const data = error.response?.data as unknown;
    let message = error.message || 'Request failed';
    let code: string | undefined;
    if (data && typeof data === 'object') {
      const obj = data as { message?: unknown; code?: unknown };
      if (typeof obj.message === 'string') message = obj.message;
      if (typeof obj.code === 'string') code = obj.code;
    }

    const apiError: ApiError = {
      status: status ?? 0,
      message,
      code,
      details: data,
    };

    return Promise.reject(apiError);
  },
);

export default api;

// Convenience typed helpers
export async function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function post<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<T>(url, body, config);
  return res.data;
}

export async function put<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.put<T>(url, body, config);
  return res.data;
}

export async function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<T>(url, config);
  return res.data;
}
