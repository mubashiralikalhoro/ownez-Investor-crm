import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDashboardStatsFromZoho, type ZohoDashboardStats } from "@/services/prospects";
import { serverCache } from "@/lib/server-cache";

const CACHE_KEY = "dashboard:stats";
const CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes

/**
 * GET /api/dashboard/stats
 *
 * Returns pipeline stats computed from ALL Prospect records (all pages).
 *
 * Caching strategy (server-side in-memory):
 *   • MISS → pages through every /Prospect page (200 records each) until
 *            more_records = false, computes stats, caches for 12 min.
 *   • HIT  → returns instantly from memory, zero Zoho API calls.
 *
 * Response headers:
 *   X-Cache      : HIT | MISS
 *   X-Cache-Age  : seconds since last cache write
 *   X-Cache-TTL  : seconds until cache expires
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Cache HIT ────────────────────────────────────────────────────────────
  const cached = serverCache.get<ZohoDashboardStats>(CACHE_KEY);
  if (cached) {
    const ttlRemaining = Math.round(serverCache.ttlRemainingMs(CACHE_KEY) / 1000);
    const cachedAt     = serverCache.cachedAtISO(CACHE_KEY) ?? "";
    const ageSeconds   = Math.round((Date.now() - new Date(cachedAt).getTime()) / 1000);

    console.log(
      `[dashboard/stats] Cache HIT — age ${ageSeconds}s, ${ttlRemaining}s remaining`
    );

    return NextResponse.json(cached, {
      headers: {
        "X-Cache":     "HIT",
        "X-Cache-Age": String(ageSeconds),
        "X-Cache-TTL": String(ttlRemaining),
      },
    });
  }

  // ── Cache MISS — fetch from Zoho ─────────────────────────────────────────
  try {
    console.log("[dashboard/stats] Cache MISS — fetching all pages from Zoho...");
    const stats = await getDashboardStatsFromZoho(session.accessToken);

    serverCache.set(CACHE_KEY, stats, CACHE_TTL_MS);
    console.log(
      `[dashboard/stats] Cached stats for ${CACHE_TTL_MS / 60_000} min`
    );

    return NextResponse.json(stats, {
      headers: {
        "X-Cache":     "MISS",
        "X-Cache-Age": "0",
        "X-Cache-TTL": String(Math.round(CACHE_TTL_MS / 1000)),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch dashboard stats.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
