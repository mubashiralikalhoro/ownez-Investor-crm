import Link from "next/link";
import { getDataService } from "@/data";
import { PeopleSearch } from "@/components/people/people-search";

export default async function PeoplePage() {
  const ds = await getDataService();
  const allPeople = await ds.getPeople();

  return (
    <div className="p-8 max-w-[900px]">
      <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
        &larr; Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-lg font-semibold text-navy">People</h1>
      <PeopleSearch allPeople={allPeople} />
    </div>
  );
}
