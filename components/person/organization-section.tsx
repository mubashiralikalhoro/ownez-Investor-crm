import type { PersonWithComputed } from "@/lib/types";

export function OrganizationSection({
  person,
  orgMembers,
}: {
  person: PersonWithComputed;
  orgMembers: PersonWithComputed[];
}) {
  const others = orgMembers.filter((m) => m.id !== person.id);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Organization</h3>
      {person.organizationName ? (
        <div>
          <p className="text-sm">{person.organizationName}</p>
          {others.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Other contacts at this org
              </p>
              {others.map((m) => (
                <p key={m.id} className="text-xs text-muted-foreground">{m.fullName}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No organization linked</p>
      )}
    </div>
  );
}
