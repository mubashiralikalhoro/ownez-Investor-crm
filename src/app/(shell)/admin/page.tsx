import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "@/components/admin/users-tab";
import { LeadSourcesTab } from "@/components/admin/lead-sources-tab";
import { PipelineStagesTab } from "@/components/admin/pipeline-stages-tab";
import { SystemSettingsTab } from "@/components/admin/system-settings-tab";
import { listAdminUsers } from "@/services/app-users";
import { listAllLeadSources } from "@/services/lead-sources";
import { getAppSettings } from "@/services/app-settings";
import { listThresholds } from "@/services/pipeline-thresholds";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!session.permissions.canAccessAdmin) redirect("/");

  const [adminUsers, leadSources, settings, pipelineStages] = await Promise.all([
    listAdminUsers(session.accessToken, session.apiDomain, session.userId),
    listAllLeadSources(),
    getAppSettings(),
    listThresholds(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-navy">Admin</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="lead-sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab users={adminUsers} />
        </TabsContent>

        <TabsContent value="lead-sources">
          <LeadSourcesTab sources={leadSources} />
        </TabsContent>

        <TabsContent value="stages">
          <PipelineStagesTab stages={pipelineStages} />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettingsTab config={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
