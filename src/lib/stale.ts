import type { Activity, PipelineStage } from "./types";
import { TOUCH_ACTIVITY_TYPES, INACTIVE_STAGES } from "./constants";
import { getTodayCT } from "./format";
import { getStageThresholdFromCache } from "./thresholds-cache";

export function computeDaysSinceLastTouch(
  activities: Activity[],
  today?: string
): number | null {
  const touchActivities = activities.filter((a) =>
    TOUCH_ACTIVITY_TYPES.includes(a.activityType)
  );

  if (touchActivities.length === 0) return null;

  const sorted = touchActivities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastTouchDate = new Date(sorted[0].date);
  const todayDate = new Date(today ?? getTodayCT());
  const diffMs = todayDate.getTime() - lastTouchDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function computeIsStale(
  stage: PipelineStage | null,
  daysSinceLastTouch: number | null,
  nextActionDate: string | null,
  today?: string
): boolean {
  if (!stage || INACTIVE_STAGES.includes(stage)) return false;

  const idleThreshold = getStageThresholdFromCache(stage);
  if (idleThreshold === null) return false;
  if (daysSinceLastTouch === null) return false;

  if (daysSinceLastTouch < idleThreshold) return false;

  // Future next action date suppresses stale
  if (nextActionDate) {
    const todayDate = new Date(today ?? getTodayCT());
    const nextDate = new Date(nextActionDate);
    if (nextDate > todayDate) return false;
  }

  return true;
}

export function computeIsOverdue(
  stage: PipelineStage | null,
  nextActionDate: string | null,
  today?: string
): boolean {
  if (!stage || INACTIVE_STAGES.includes(stage)) return false;
  if (!nextActionDate) return false;

  const todayDate = new Date(today ?? getTodayCT());
  const nextDate = new Date(nextActionDate);

  // Overdue only if next action date is strictly before today
  return nextDate < todayDate;
}
