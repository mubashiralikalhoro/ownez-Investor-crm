import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LeadershipClient } from "@/components/leadership/leadership-client";

export default async function LeadershipPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.permissions.canViewLeadership) redirect("/");

  // Partial access = user can view leadership but is not a full admin (they
  // only see source attribution, not the full dashboard).
  const isPartialAccess =
    session.permissions.canViewLeadership && !session.permissions.canAccessAdmin;

  return <LeadershipClient isPartialAccess={isPartialAccess} />;
}
