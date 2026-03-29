import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Activity } from "@/lib/types";

export function RecentSnapshot({ activities }: { activities: Activity[] }) {
  const recent = activities
    .filter((a) => a.activityType !== "stage_change")
    .slice(0, 3);

  if (recent.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        No activity logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {recent.map((activity) => {
        const typeConfig = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
        return (
          <div key={activity.id} className="flex items-center gap-2 text-xs">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[9px]"
              style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }}
            >
              {typeConfig?.label?.[0] ?? "?"}
            </div>
            <span className="text-muted-foreground shrink-0">{formatDate(activity.date)}</span>
            <span className="truncate text-navy">{activity.detail}</span>
          </div>
        );
      })}
    </div>
  );
}
