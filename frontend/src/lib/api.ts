import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { TOKEN_STORAGE_KEY } from "@/lib/constants";
import { handleMockRequest } from "@/mocks";
import type { ApiError, ApiErrorBody, PaginationMeta } from "@/types";

/** Flip this with VITE_USE_MOCKS. Going live later is a one-line env change. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export interface UnwrappedResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
});

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

if (USE_MOCKS) {
  api.defaults.adapter = handleMockRequest;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function toRequestError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiError | undefined;
    if (envelope?.error) {
      return {
        code: envelope.error.code,
        message: envelope.error.message,
        details: envelope.error.details,
      };
    }
    return {
      code: "INTERNAL_ERROR",
      message: error.message || "Something went wrong",
    };
  }
  if (error && typeof error === "object" && "message" in error) {
    const body = error as Partial<ApiErrorBody>;
    return {
      code: body.code ?? "INTERNAL_ERROR",
      message: String(body.message),
      details: body.details,
    };
  }
  return { code: "INTERNAL_ERROR", message: "Something went wrong" };
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data as { success?: boolean; data?: unknown; meta?: PaginationMeta } | undefined;
    if (response.status === 204 || payload == null) {
      response.data = { data: undefined, meta: undefined } satisfies UnwrappedResponse<undefined>;
      return response;
    }
    if (typeof payload === "object" && payload.success === true && "data" in payload) {
      response.data = {
        data: payload.data,
        meta: payload.meta,
      } satisfies UnwrappedResponse<unknown>;
      return response;
    }
    response.data = { data: payload, meta: undefined } satisfies UnwrappedResponse<unknown>;
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setStoredToken(null);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(toRequestError(error));
  },
);

export async function apiRequest<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<UnwrappedResponse<T>> {
  const response = await api.request<UnwrappedResponse<T>>({
    method,
    url,
    data: body,
    ...config,
  });
  return response.data;
}

export async function apiData<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const result = await apiRequest<T>(method, url, body, config);
  return result.data;
}
