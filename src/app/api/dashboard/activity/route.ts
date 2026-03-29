import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getRecentActivityNotes,
  getRecentCalls,
  getRecentEvents,
} from "@/services/prospects";
import type { RecentActivityEntry, User, UserRole, ActivityType } from "@/lib/types";

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

// ─── Type for collecting unique users ─────────────────────────────────────────

type UserSeed = { id: string; name: string; email?: string };

function addUser(map: Map<string, UserSeed>, seed: UserSeed | null | undefined) {
  if (seed?.id) map.set(seed.id, seed);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Zoho access token in Authorization: Bearer <token> header." },
      { status: 400 }
    );
  }

  try {
    // ── Fetch all three sources in parallel ──────────────────────────────────
    const [notes, calls, events] = await Promise.all([
      getRecentActivityNotes(accessToken, 15),
      getRecentCalls(accessToken, 10),
      getRecentEvents(accessToken, 8),
    ]);

    const allEntries: RecentActivityEntry[] = [];
    const userMap = new Map<string, UserSeed>();

    // ── 1. Notes ─────────────────────────────────────────────────────────────
    for (const note of notes) {
      const { date, time } = parseISOToDateAndTime(note.Created_Time);
      const detail =
        [note.Note_Title, note.Note_Content].filter(Boolean).join(" — ") ||
        "(no content)";

      addUser(userMap, note.Created_By);

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

    // ── 2. Calls ─────────────────────────────────────────────────────────────
    for (const call of calls) {
      // Use the best available timestamp
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

      addUser(userMap, call.Owner ?? call.Created_By);

      allEntries.push({
        id: `call-${call.id}`,
        // Who_Id is the prospect/contact the call is with
        personId: call.Who_Id?.id ?? "",
        personName: call.Who_Id?.name ?? "—",
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

    // ── 3. Events (Meetings) ─────────────────────────────────────────────────
    for (const event of events) {
      const isoTime = event.Start_DateTime ?? event.Created_Time;
      const { date, time } = parseISOToDateAndTime(isoTime);
      if (!date) continue;

      const detail =
        event.Description ||
        event.Event_Title ||
        "Meeting";

      addUser(userMap, event.Owner ?? event.Created_By);

      allEntries.push({
        id: `event-${event.id}`,
        personId: "",
        personName: "—",
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

    // ── Build unique users list for the rep-filter dropdown ─────────────────
    const users: User[] = Array.from(userMap.values()).map(u => ({
      id: u.id,
      username: u.email ?? u.name,
      fullName: u.name,
      role: "rep" as UserRole,
      isActive: true,
      passwordHash: "",
    }));

    return NextResponse.json({ activities, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch recent activity.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
