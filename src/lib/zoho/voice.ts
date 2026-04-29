import axios, { type AxiosError } from "axios";
import type { ZohoVoiceCall, ZohoVoiceLogsResponse } from "@/types";

const ZOHO_VOICE_BASE_URL = "https://voice.zoho.com/rest/json/zv";
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

const _client = axios.create({
  baseURL: ZOHO_VOICE_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

_client.interceptors.request.use((config) => {
  console.log(
    `[ZohoVoice] [${new Date().toISOString()}] → ${config.method?.toUpperCase() ?? "GET"} ${config.baseURL}${config.url ?? ""}`,
    { params: config.params },
  );
  return config;
});

_client.interceptors.response.use(
  (res) => {
    const body = res.data as { meta?: { total?: number }; logs?: unknown[] } | undefined;
    console.log(
      `[ZohoVoice] [${new Date().toISOString()}] ← ${res.status} ${res.config.url ?? ""}`,
      { total: body?.meta?.total, returned: body?.logs?.length },
    );
    return res;
  },
  (err: AxiosError) => {
    console.error(
      `[ZohoVoice] [${new Date().toISOString()}] ← ${err.response?.status ?? "network"} ${err.config?.url ?? ""}`,
      { body: err.response?.data, message: err.message },
    );
    return Promise.reject(err);
  },
);

/**
 * Normalize a phone string to the Zoho Voice `userNumber` format:
 * digits only, country prefix included (US: "1" + 10 digits).
 *
 * Returns null when the input doesn't yield a usable number.
 */
export function toVoiceUserNumber(phone: string | null | undefined, defaultCountry = "1"): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return digits;            // already country+10
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length > 11) return digits.slice(-11);   // strip extension/extras
  return null;
}

/**
 * Fetch Voice call logs for a single normalized userNumber. Paginates until
 * the API reports no more records, capped at MAX_PAGES * PAGE_SIZE.
 */
export async function getVoiceCallsByUserNumber(
  accessToken: string,
  userNumber: string,
): Promise<ZohoVoiceCall[]> {
  const all: ZohoVoiceCall[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data } = await _client.get<ZohoVoiceLogsResponse>("/logs", {
      params: { from, size: PAGE_SIZE, userNumber },
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const batch = data?.logs ?? [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    if (data?.meta?.total != null && from + batch.length >= data.meta.total) break;
  }
  return all;
}
