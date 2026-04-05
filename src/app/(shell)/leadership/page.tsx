import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LeadershipClient } from "@/components/leadership/leadership-client";

export default async function LeadershipPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "marketing" && session.role !== "admin") redirect("/");

  return <LeadershipClient isPartialAccess={session.role === "marketing"} />;
}
