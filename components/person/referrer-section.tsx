import Link from "next/link";
import type { Person, PersonWithComputed } from "@/lib/types";

interface ReferrerSectionProps {
  referrer: Person | null;
  referrals: PersonWithComputed[];
}

export function ReferrerSection({ referrer, referrals }: ReferrerSectionProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Referrer</h3>

      {referrer ? (
        <div>
          <p className="text-sm font-medium text-navy">{referrer.fullName}</p>
          {referrer.contactCompany && (
            <p className="text-xs text-muted-foreground">{referrer.contactCompany}</p>
          )}
          {referrals.length > 1 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Other referrals
              </p>
              {referrals.map((r) => (
                <Link key={r.id} href={`/person/${r.id}`} className="block text-xs text-navy hover:text-gold">
                  {r.fullName}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No referrer</p>
      )}
    </div>
  );
}
