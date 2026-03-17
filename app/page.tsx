import { getDataService } from "@/lib/data";
import { getTodayCT } from "@/lib/format";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { TodaysActions } from "@/components/dashboard/todays-actions";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default async function DashboardPage() {
  const ds = await getDataService();
  const today = getTodayCT();

  const [stats, allPeople, recentActivities, users] = await Promise.all([
    ds.getDashboardStats(),
    ds.getPeople({ roles: ["prospect"] }),
    ds.getRecentActivities({ limit: 20 }),
    ds.getUsers(),
  ]);

  // Today's actions: nextActionDate = today OR nurture with reengageDate = today
  const todaysActions = allPeople.filter(
    (p) =>
      (p.nextActionDate === today && p.pipelineStage !== "dead") ||
      (p.pipelineStage === "nurture" && p.reengageDate === today)
  );

  // Needs attention: stale or overdue
  const needsAttention = allPeople.filter((p) => p.isStale || p.isOverdue);

  // Find next upcoming person for empty state
  const nextUpPerson = allPeople
    .filter((p) => p.nextActionDate && p.nextActionDate > today && p.pipelineStage !== "dead")
    .sort((a, b) => (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? ""))[0] ?? null;

  return (
    <div className="p-8 max-w-[1200px]">
      <h1 className="mb-6 text-lg font-semibold text-navy">Dashboard</h1>

      <div className="space-y-8">
        <StatsBar stats={stats} />
        <TodaysActions
          people={todaysActions}
          needsAttentionCount={needsAttention.length}
          nextUpPerson={nextUpPerson}
        />
        <NeedsAttention people={needsAttention} />
        <RecentActivity activities={recentActivities} users={users} />
      </div>
    </div>
  );
}
