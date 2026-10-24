import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { getBearerToken, handleMock, MockApiError } from "@/mocks/handlers";

function resolvePath(config: InternalAxiosRequestConfig): { path: string; searchParams: URLSearchParams } {
  const base = config.baseURL ?? "";
  const raw = config.url ?? "";
  const combined = raw.startsWith("http") ? raw : `${base.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
  const url = new URL(combined, "http://localhost");
  let path = url.pathname;
  if (path.startsWith("/api/")) path = path.slice(4);
  if (!path.startsWith("/")) path = `/${path}`;
  return { path, searchParams: url.searchParams };
}

function delay(ms = 240): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function handleMockRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await delay();
  const { path, searchParams } = resolvePath(config);
  const header = config.headers?.Authorization;
  const token = getBearerToken(typeof header === "string" ? header : undefined);

  try {
    const result = handleMock({
      method: (config.method ?? "get").toUpperCase(),
      path,
      searchParams,
      body: config.data,
      token,
    });

    return {
      data: result.data,
      status: result.status,
      statusText: result.status === 204 ? "No Content" : "OK",
      headers: { "content-type": "application/json" },
      config,
    };
  } catch (error) {
    if (error instanceof MockApiError) {
      const axiosError = new axios.AxiosError(error.message, "ERR_BAD_RESPONSE", config, undefined, {
        data: {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        status: error.status,
        statusText: "Error",
        headers: { "content-type": "application/json" },
        config,
      });
      return Promise.reject(axiosError);
    }
    throw error;
  }
}

export { store } from "@/mocks/data";
export { MockApiError } from "@/mocks/handlers";
