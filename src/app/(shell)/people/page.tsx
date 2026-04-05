import Link from "next/link";
import { PeopleClient } from "@/components/people/people-client";

export default function PeoplePage() {
  return (
    <div className="p-8 w-full">
      <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
        &larr; Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-lg font-semibold text-navy">People</h1>
      <PeopleClient />
    </div>
  );
}
