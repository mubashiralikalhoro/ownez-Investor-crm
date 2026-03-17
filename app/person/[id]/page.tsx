import { notFound } from "next/navigation";
import Link from "next/link";
import { getDataService } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { IdentityBar } from "@/components/person/identity-bar";
import { NextActionBar } from "@/components/person/next-action-bar";
import { RecentSnapshot } from "@/components/person/recent-snapshot";
import { QuickLog } from "@/components/person/quick-log";
import { ActivityTimeline } from "@/components/person/activity-timeline";
import { StageBar } from "@/components/person/stage-bar";
import { OrganizationSection } from "@/components/person/organization-section";
import { FundingEntitiesPanel } from "@/components/person/funding-entities";
import { RelatedContacts } from "@/components/person/related-contacts";
import { ReferrerSection } from "@/components/person/referrer-section";
import { BackgroundNotes } from "@/components/person/background-notes";
import { ProspectFields } from "@/components/person/prospect-fields";
import { Separator } from "@/components/ui/separator";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const ds = await getDataService();

  const person = await ds.getPerson(id);
  if (!person) notFound();

  const [activities, entities, relatedContacts, referrer, users] = await Promise.all([
    ds.getActivities(id),
    ds.getFundingEntities(id),
    ds.getRelatedContacts(id),
    ds.getReferrerForProspect(id),
    ds.getUsers(),
  ]);

  // Get referrals if there's a referrer
  const referrals = referrer ? await ds.getReferrals(referrer.id) : [];

  // Get org members
  const orgMembers = person.organizationId
    ? await ds.getPeople({ search: "" }).then((all) =>
        all.filter((p) => p.organizationId === person.organizationId)
      )
    : [];

  return (
    <div className="max-w-[1100px]">
      {/* Back link */}
      <div className="px-8 pt-6">
        <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
          &larr; Dashboard
        </Link>
      </div>

      {/* Cockpit Zone — fixed top section */}
      <div className="sticky top-0 z-10 bg-background border-b px-8 py-5 space-y-4">
        <IdentityBar person={person} />
        <NextActionBar person={person} />
        <RecentSnapshot activities={activities} />
        <QuickLog person={person} />
      </div>

      {/* Detail Zone — scrollable */}
      <div className="px-8 py-6 space-y-8">
        {/* Activity Timeline */}
        <ActivityTimeline activities={activities} users={users} />

        <Separator />

        {/* Stage Progression */}
        {person.pipelineStage && (
          <>
            <StageBar currentStage={person.pipelineStage} personId={person.id} />
            <Separator />
          </>
        )}

        {/* Two-column layout for details */}
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <OrganizationSection person={person} orgMembers={orgMembers} />
            <FundingEntitiesPanel entities={entities} person={person} />
            <RelatedContacts contacts={relatedContacts} />
          </div>
          <div className="space-y-6">
            <ReferrerSection referrer={referrer} referrals={referrals} />
            <ProspectFields person={person} users={users} sessionRole={session?.role ?? "rep"} />
          </div>
        </div>

        <Separator />

        <BackgroundNotes personId={person.id} notes={person.notes} />
      </div>
    </div>
  );
}
