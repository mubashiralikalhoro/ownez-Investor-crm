"use client";

import dynamic from "next/dynamic";
import { ChevronUp } from "lucide-react";
import type { UserRole } from "@/lib/types";

function UserMenuButtonSkeleton() {
  return (
    <button
      type="button"
      aria-label="Open user menu"
      className="flex items-center gap-2.5 w-full px-5 py-4 rounded-lg hover:bg-white/5 transition-colors"
    >
      <span className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
      <span className="text-sm text-white/80 font-medium flex-1 text-left">
        …
      </span>
      <ChevronUp size={14} className="text-white/30" />
    </button>
  );
}

// Rendered client-only — base-ui's Popover useId generates non-deterministic
// ids across SSR/CSR, which produced a hydration mismatch on navigation.
const SidebarUserMenuPopover = dynamic(
  () => import("./sidebar-user-menu-popover"),
  {
    ssr: false,
    loading: () => <UserMenuButtonSkeleton />,
  },
);

interface SidebarUserMenuProps {
  fullName: string;
  role: UserRole;
}

export function SidebarUserMenu({ fullName, role }: SidebarUserMenuProps) {
  return <SidebarUserMenuPopover fullName={fullName} role={role} />;
}
