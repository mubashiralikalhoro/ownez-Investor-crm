import { PeopleSkeleton } from "@/components/people/people-skeleton";

export default function PeopleLoading() {
  return (
    <div className="p-4 md:p-8">
      <PeopleSkeleton />
    </div>
  );
}
