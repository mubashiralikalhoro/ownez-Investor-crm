import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getRecentActivityNotes,
  getRecentCalls,
  getRecentEvents,
  getAllProspects,
} from "@/services/prospects";
import { fetchZohoOrgUsers } from "@/lib/zoho/oauth";
import { getAuthorizedRoleMap } from "@/services/app-users";
import type { RecentActivityEntry, User, ActivityType } from "@/lib/types";

/**
 * GET /api/dashboard/activity
 *
 * Fetches recent activity from three Zoho sources in parallel (all GET):
 *
 *   1. GET /Notes  — notes logged on prospects        → activityType: "note"
 *   2. GET /Calls  — calls across the CRM             → activityType: "call"
 *   3. GET /Events — meetings/events across the CRM   → activityType: "meeting"
 *
 * Results are merged, sorted by date descending, and the top 20 returned.
 * Each source fails silently so the feed still shows even if one is unavailable.
 */

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseISOToDateAndTime(iso: string | null): { date: string; time: string | null } {
  if (!iso) return { date: "", time: null };
  const date = iso.slice(0, 10);
  try {
    const dt = new Date(iso);
    const h = String(dt.getHours()).padStart(2, "0");
    const m = String(dt.getMinutes()).padStart(2, "0");
    return { date, time: `${h}:${m}` };
  } catch {
    return { date, time: iso.slice(11, 16) || null };
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    // ── Fetch sources in parallel ────────────────────────────────────────────
    // Calls/Events use a server-side `$se_module:equals:Prospect` criteria
    // search, so only Prospect-linked records come back — no client-side
    // filtering and no dependency on the total prospect count. If Zoho
    // rejects that criteria on this org/layout, the services fall through
    // to a broad listing filtered by the prospect-id set, which is loaded
    // lazily (cached in Redis) only when the fallback actually runs.
    let prospectIdsPromise: Promise<Set<string>> | null = null;
    const getProspectIds = () => {
      if (!prospectIdsPromise) {
        prospectIdsPromise = getAllProspects(session.accessToken).then(
          r => new Set(r.data.map(p => p.id)),
        );
      }
      return prospectIdsPromise;
    };

    const [notes, calls, events, orgUsers] = await Promise.all([
      getRecentActivityNotes(session.accessToken, 15),
      getRecentCalls(session.accessToken, 20, getProspectIds),
      getRecentEvents(session.accessToken, 20, getProspectIds),
      fetchZohoOrgUsers(session.accessToken, session.apiDomain).catch(() => []),
    ]);

    const allEntries: RecentActivityEntry[] = [];

    // ── 1. Notes (already filtered to Prospect module in the service) ───────
    for (const note of notes) {
      const { date, time } = parseISOToDateAndTime(note.Created_Time);
      const detail =
        [note.Note_Title, note.Note_Content].filter(Boolean).join(" — ") ||
        "(no content)";

      allEntries.push({
        id: `note-${note.id}`,
        personId: note.Parent_Id?.id ?? "",
        personName: note.Parent_Id?.name ?? "—",
        activityType: "note" as ActivityType,
        source: "manual",
        date,
        time,
        outcome: "connected",
        detail,
        documentsAttached: [],
        loggedById: note.Created_By?.id ?? "",
        annotation: null,
      });
    }

    // ── 2. Calls (already filtered to $se_module=Prospect by the service) ──
    for (const call of calls) {
      const prospectId = call.What_Id?.id;
      if (!prospectId) continue; // missing parent — can't link back to a prospect

      const isoTime = call.Call_Start_Time ?? call.Created_Time;
      const { date, time } = parseISOToDateAndTime(isoTime);
      if (!date) continue;

      const direction = call.Call_Type ? `${call.Call_Type} call` : "Call";
      const status = call.Call_Status ? ` (${call.Call_Status})` : "";
      const detail =
        call.Description ||
        call.Call_Agenda ||
        call.Subject ||
        `${direction}${status}`;

      const isAttempt =
        call.Call_Status?.toLowerCase().includes("not reached") ||
        call.Call_Status?.toLowerCase().includes("attempted") ||
        call.Call_Status?.toLowerCase().includes("no answer") ||
        call.Call_Status?.toLowerCase().includes("busy");

      allEntries.push({
        id: `call-${call.id}`,
        personId: prospectId,
        personName: call.What_Id?.name ?? "—",
        activityType: "call" as ActivityType,
        source: "manual",
        date,
        time,
        outcome: isAttempt ? "attempted" : "connected",
        detail,
        documentsAttached: [],
        loggedById: call.Owner?.id ?? call.Created_By?.id ?? "",
        annotation: null,
      });
    }

    // ── 3. Events — already filtered to Prospect-module ─────────────────────
    for (const event of events) {
      const prospectId = event.What_Id?.id;
      if (!prospectId) continue;

      const isoTime = event.Start_DateTime ?? event.Created_Time;
      const { date, time } = parseISOToDateAndTime(isoTime);
      if (!date) continue;

      const detail =
        event.Description ||
        event.Event_Title ||
        "Meeting";

      allEntries.push({
        id: `event-${event.id}`,
        personId: prospectId,
        personName: event.What_Id?.name ?? "—",
        activityType: "meeting" as ActivityType,
        source: "manual",
        date,
        time,
        outcome: "connected",
        detail: event.Event_Title
          ? `${event.Event_Title}${event.Description ? ` — ${event.Description}` : ""}`
          : detail,
        documentsAttached: [],
        loggedById: event.Owner?.id ?? event.Created_By?.id ?? "",
        annotation: null,
      });
    }

    // ── Sort all entries by date + time desc, take top 20 ───────────────────
    allEntries.sort((a, b) => {
      const aKey = `${a.date}${a.time ?? ""}`;
      const bKey = `${b.date}${b.time ?? ""}`;
      return bKey.localeCompare(aKey);
    });

    const activities = allEntries.slice(0, 20);

    // ── Build rep list from Zoho org users, filtered to authorized app users ──
    // Mirrors the admin page's source so the dropdown shows only users who
    // can actually log in (bootstrap admins + active override rows).
    const roleMap = await getAuthorizedRoleMap();
    const users: User[] = [];
    for (const u of orgUsers) {
      const role = roleMap.get(u.id);
      if (!role) continue;

      users.push({
        id:       u.id,
        username: u.email ?? u.full_name ?? u.id,
        fullName: u.full_name ?? u.email ?? u.id,
        role,
        isActive: true,
        passwordHash: "",
      });
    }
    users.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return NextResponse.json({ activities, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch recent activity.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
