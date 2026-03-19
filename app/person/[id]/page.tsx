import { notFound } from "next/navigation";
import Link from "next/link";
import { getDataService } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { IdentityBar } from "@/components/person/identity-bar";
import { NextActionBar } from "@/components/person/next-action-bar";
import { QuickLog } from "@/components/person/quick-log";
import { ActivityTimeline } from "@/components/person/activity-timeline";
import { ProfileCard } from "@/components/person/profile-card";
import { RelationshipsSection } from "@/components/person/relationships-section";
import { BackgroundNotes } from "@/components/person/background-notes";
import { SetLastViewed } from "@/components/set-last-viewed";
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
    <div className="max-w-[1100px] overflow-x-hidden">
      <SetLastViewed
        id={person.id}
        fullName={person.fullName}
        pipelineStage={person.pipelineStage}
        organizationName={person.organizationName}
      />
      {/* Back link */}
      <div className="px-3 md:px-8 pt-3 md:pt-6">
        <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
          &larr; Dashboard
        </Link>
      </div>

      {/* Cockpit Zone — sticky below last-viewed bar: identity, quick log, next action */}
      <div className="sticky top-[33px] z-10 bg-background border-b px-3 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3 overflow-hidden">
        <IdentityBar person={person} />
        <QuickLog person={person} />
        <NextActionBar person={person} />
      </div>

      {/* Detail Zone — scrollable */}
      <div className="px-3 md:px-8 py-4 md:py-6 space-y-5">
        {/* Profile Card — stage, org, financials, lead source, rep */}
        <ProfileCard
          person={person}
          users={users}
          orgMembers={orgMembers}
          sessionRole={session?.role ?? "rep"}
        />

        {/* Activity Timeline */}
        <ActivityTimeline activities={activities} users={users} />

        <Separator />

        {/* Relationships — collapsible: referrer, funding entities, related contacts */}
        <RelationshipsSection
          person={person}
          entities={entities}
          relatedContacts={relatedContacts}
          referrer={referrer}
          referrals={referrals}
        />

        <Separator />

        {/* Background Notes */}
        <BackgroundNotes personId={person.id} notes={person.notes} />
      </div>
    </div>
  );
}
