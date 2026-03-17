import type { Person } from "@/lib/types";

interface RelatedContactsProps {
  contacts: (Person & { relationRole: string })[];
}

export function RelatedContacts({ contacts }: RelatedContactsProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Related Contacts</h3>

      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No related contacts</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-md border p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-navy">{contact.fullName}</p>
                <span className="text-[10px] text-muted-foreground">{contact.relationRole}</span>
              </div>
              {(contact.phone || contact.email || contact.contactCompany) && (
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  {contact.contactCompany && <span>{contact.contactCompany}</span>}
                  {contact.phone && <a href={`tel:${contact.phone}`} className="hover:text-gold">{contact.phone}</a>}
                  {contact.email && <a href={`mailto:${contact.email}`} className="hover:text-gold">{contact.email}</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
