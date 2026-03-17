import { getDataService } from "@/lib/data";
import { PeopleSearch } from "@/components/people/people-search";

export default async function PeoplePage() {
  const ds = await getDataService();
  const allPeople = await ds.getPeople();

  return (
    <div className="p-8 max-w-[900px]">
      <h1 className="mb-6 text-lg font-semibold text-navy">People</h1>
      <PeopleSearch allPeople={allPeople} />
    </div>
  );
}
