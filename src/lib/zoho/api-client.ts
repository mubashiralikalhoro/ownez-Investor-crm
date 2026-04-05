import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { ZOHO_CRM_BASE_URL } from "@/lib/constants";

// ─── Extend axios types to carry request metadata ────────────────────────────
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _meta?: { startTime: number };
  }
}

// ─── Logger ──────────────────────────────────────────────────────────────────
type LogMeta = Record<string, unknown>;

const logger = {
  info(msg: string, meta?: LogMeta): void {
    console.log(`[ZohoAPI] [${new Date().toISOString()}] INFO  ${msg}`, meta !== undefined ? meta : "");
  },
  error(msg: string, meta?: LogMeta): void {
    console.error(`[ZohoAPI] [${new Date().toISOString()}] ERROR ${msg}`, meta !== undefined ? meta : "");
  },
};

// ─── Singleton client (no token — base URL + timeout only) ───────────────────
const _client = axios.create({
  baseURL: ZOHO_CRM_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

_client.interceptors.request.use((config) => {
  config._meta = { startTime: Date.now() };
  logger.info(`→ ${config.method?.toUpperCase() ?? "GET"} ${config.baseURL}${config.url ?? ""}`, {
    params: config.params,
  });
  return config;
});

_client.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (response.config._meta?.startTime ?? Date.now());
    const body = response.data as Record<string, unknown> | undefined;
    const dataArr = Array.isArray(body?.data) ? body.data : Array.isArray(body?.__timeline) ? body.__timeline : null;
    logger.info(
      `← ${response.status} ${response.config.url ?? ""} (${ms}ms)`,
      {
        info: (body as { info?: unknown })?.info ?? undefined,
        count: dataArr ? dataArr.length : undefined,
      }
    );
    return response;
  },
  (error: AxiosError) => {
    const ms = Date.now() - (error.config?._meta?.startTime ?? Date.now());
    const body = error.response?.data as Record<string, unknown> | undefined;
    logger.error(
      `← ${error.response?.status ?? "network_error"} ${error.config?.url ?? ""} (${ms}ms)`,
      {
        // JSON.stringify so nested objects are fully visible in the server log
        zoho_response: body ? JSON.stringify(body) : undefined,
        axios_message: error.message,
      }
    );
    return Promise.reject(error);
  }
);

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Token-aware wrappers around the singleton Zoho CRM client.
 * Pass the Zoho OAuth access token per-call — it is never stored on the instance.
 */
export const zohoApi = {
  get<T = unknown>(
    token: string,
    url: string,
    params?: Record<string, string | number>,
    config?: AxiosRequestConfig
  ) {
    return _client.get<T>(url, {
      ...config,
      params,
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
  },

  post<T = unknown>(
    token: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) {
    return _client.post<T>(url, data, {
      ...config,
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
  },

  put<T = unknown>(
    token: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) {
    return _client.put<T>(url, data, {
      ...config,
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
  },

  delete<T = unknown>(
    token: string,
    url: string,
    config?: AxiosRequestConfig
  ) {
    return _client.delete<T>(url, {
      ...config,
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
  },
};
