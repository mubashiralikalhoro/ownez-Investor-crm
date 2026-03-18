"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["rep", "marketing", "admin"] as UserRole[] },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch, roles: ["rep", "marketing", "admin"] as UserRole[] },
  { href: "/people", label: "People", icon: Users, roles: ["rep", "marketing", "admin"] as UserRole[] },
  { href: "/leadership", label: "Leadership", icon: BarChart3, roles: ["marketing", "admin"] as UserRole[] },
  { href: "/admin", label: "Admin", icon: Settings, roles: ["admin"] as UserRole[] },
];

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-base font-medium transition-colors ${
              isActive
                ? "text-gold bg-navy-light"
                : "text-white/70 hover:bg-navy-light hover:text-white"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  ["Dashboard", "Pipeline", "People"].includes(item.label)
);

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t bg-navy safe-bottom">
      {MOBILE_NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              isActive
                ? "text-gold"
                : "text-white/60"
            }`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
