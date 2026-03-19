"use client";

import { useState } from "react";
import { ChevronUp, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  rep: "Rep",
  marketing: "Marketing",
  admin: "Admin",
};

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface SidebarUserMenuProps {
  fullName: string;
  role: UserRole;
}

export function SidebarUserMenu({ fullName, role }: SidebarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const firstName = fullName.trim().split(/\s+/)[0] || "?";
  const initials = getInitials(fullName);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Open user menu"
        className="flex items-center gap-2.5 w-full px-5 py-4 rounded-lg hover:bg-white/5 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-white/10 text-gold flex items-center justify-center text-[11px] font-bold shrink-0">
          {initials}
        </span>
        <span className="text-sm text-white/80 font-medium flex-1 text-left">
          {firstName}
        </span>
        <ChevronUp
          size={14}
          className={`text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-52 rounded-xl shadow-lg p-1"
      >
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-navy truncate">{fullName}</span>
          <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
        </div>
        <div className="border-t my-1" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-alert-red hover:bg-alert-red-light transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
