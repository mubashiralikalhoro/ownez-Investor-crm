import { getSession } from "@/lib/session";
import { getAppSettings } from "@/services/app-settings";
import { SidebarNav, MobileNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";

export async function Sidebar() {
  const session = await getSession();
  if (!session) return null;

  // Company name comes from the admin-editable AppSettings singleton.
  // Default is "OwnEZ Capital" (defined in the Prisma schema + service).
  const settings = await getAppSettings();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-[180px] flex-col bg-navy text-white">
        <div className="border-b border-navy-light px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">
            {settings.companyName}
          </p>
          <p className="mt-0.5 text-base font-semibold text-white">CRM</p>
        </div>

        <SidebarNav role={session.role} permissions={session.permissions} />

        <div className="border-t border-navy-light">
          <SidebarUserMenu fullName={session.fullName} role={session.role} />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <MobileNav role={session.role} fullName={session.fullName} />
    </>
  );
}
