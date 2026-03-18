import { getSession } from "@/lib/auth";
import { SidebarNav, MobileNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";

export async function Sidebar() {
  const session = await getSession();
  if (!session) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-[180px] flex-col bg-navy text-white">
        <div className="border-b border-navy-light px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">
            OwnEZ Capital
          </p>
          <p className="mt-0.5 text-base font-semibold text-white">CRM</p>
        </div>

        <SidebarNav role={session.role} />

        <div className="border-t border-navy-light px-5 py-4">
          <p className="text-sm text-white/60">{session.fullName.split(" ")[0]}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <MobileNav role={session.role} />
    </>
  );
}
