import axios, { type AxiosError } from "axios";
import type {
  ZohoVoiceCall, ZohoVoiceLogsResponse, ZohoVoiceSms, ZohoVoiceSmsLogsResponse,
} from "@/types";

const ZOHO_VOICE_BASE_URL = "https://voice.zoho.com/rest/json/zv";
const ZOHO_VOICE_SMS_BASE_URL = "https://voice.zoho.com/rest/json/v1/sms";
const PAGE_SIZE = 200;
const SMS_PAGE_SIZE = 100; // /sms/logs default page size
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

/**
 * Fetch Zoho Voice SMS logs for a single normalized customer number
 * (same digits-only country+10 format as `toVoiceUserNumber`). Both
 * directions (incoming + outgoing) are returned — it's a conversation.
 * Paginates like the call-log fetch, capped at MAX_PAGES * SMS_PAGE_SIZE.
 *
 * Requires the ZohoVoice.sms.READ OAuth scope.
 */
export async function getSmsByCustomerNumber(
  accessToken: string,
  customerNumber: string,
): Promise<ZohoVoiceSms[]> {
  const all: ZohoVoiceSms[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * SMS_PAGE_SIZE;
    const { data } = await _client.get<ZohoVoiceSmsLogsResponse>("/logs", {
      baseURL: ZOHO_VOICE_SMS_BASE_URL,
      params: { from, size: SMS_PAGE_SIZE, customerNumber, messageType: "all" },
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const batch = data?.logs ?? data?.smslogs ?? [];
    all.push(...batch);
    if (batch.length < SMS_PAGE_SIZE) break;
    if (data?.meta?.total != null && from + batch.length >= data.meta.total) break;
  }
  return all;
}
