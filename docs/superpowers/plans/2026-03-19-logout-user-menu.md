# Logout / User Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invisible "Sign out" text in the sidebar footer with a discoverable avatar-row user menu (desktop popover + mobile bottom sheet).

**Architecture:** New `SidebarUserMenu` client component handles the desktop popover. `MobileNav` in `sidebar-nav.tsx` gains a 4th avatar tab + Sheet. `sidebar.tsx` wires both. `logout-button.tsx` is deleted — logout logic inlined.

**Tech Stack:** Next.js 15 App Router, shadcn/ui (Popover — must install, Sheet — already installed), Radix UI, Tailwind CSS, Playwright E2E tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/ui/popover.tsx` | Create (via CLI) | shadcn Popover primitive |
| `components/sidebar-user-menu.tsx` | Create | Desktop avatar row + Radix Popover |
| `components/sidebar-nav.tsx` | Modify | Add `fullName` prop + 4th avatar tab + bottom Sheet to `MobileNav` |
| `components/sidebar.tsx` | Modify | Swap `LogoutButton` → `SidebarUserMenu`; pass `fullName` to `MobileNav` |
| `components/logout-button.tsx` | Delete | Replaced by inlined logout in new components |
| `e2e/auth.spec.ts` | Modify | Add E2E tests for desktop popover + mobile sheet |

---

## Task 1: Write Failing E2E Tests

**Files:**
- Modify: `e2e/auth.spec.ts`

Add the following describe blocks at the bottom of `e2e/auth.spec.ts`, after the existing tests.

- [ ] **Step 1: Add desktop + mobile user menu tests to e2e/auth.spec.ts**

Append to the end of `e2e/auth.spec.ts` (after the last `});`):

```ts
// ─── User Menu — Desktop ──────────────────────────────────────────────────────

test.describe("User menu — desktop sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "chad");
  });

  test("shows avatar row button in sidebar footer", async ({ page }) => {
    await expect(
      page.locator("aside").getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
  });

  test("clicking avatar row opens popover with user info and sign out", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByText("Chad Cormier")).toBeVisible();
    await expect(page.getByText("Rep")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out from popover redirects to login", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── User Menu — Mobile ───────────────────────────────────────────────────────

test.describe("User menu — mobile nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, "chad");
  });

  test("shows user avatar tab in mobile bottom nav", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Open user menu" })
    ).toBeVisible();
  });

  test("tapping user tab opens bottom sheet with user info and sign out", async ({ page }) => {
    await page.getByRole("button", { name: "Open user menu" }).click();
    await expect(page.getByText("Chad Cormier")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out from sheet redirects to login", async ({ page }) => {
    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: Run the new tests — verify all 6 fail**

```bash
cd "c:\Users\erezg\Documents\OwnEZ CRM"
npx playwright test e2e/auth.spec.ts --reporter=line 2>&1 | tail -15
```

Expected: 6 new failures (the old tests should still pass). You'll see errors like "locator resolved to 0 elements" or "button not found" — that's correct, the feature doesn't exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add e2e/auth.spec.ts
git commit -m "test: add failing E2E tests for user menu (desktop + mobile)"
```

---

## Task 2: Install Popover Component

**Files:**
- Create: `components/ui/popover.tsx` (via CLI)

- [ ] **Step 1: Install shadcn Popover**

```bash
cd "c:\Users\erezg\Documents\OwnEZ CRM"
npx shadcn@latest add popover
```

When prompted about overwriting existing files, answer yes if asked. Expected: creates `components/ui/popover.tsx`.

- [ ] **Step 2: Verify the file was created**

```bash
ls components/ui/popover.tsx
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add components/ui/popover.tsx
git commit -m "feat: install shadcn Popover component"
```

---

## Task 3: Create SidebarUserMenu (Desktop)

**Files:**
- Create: `components/sidebar-user-menu.tsx`

- [ ] **Step 1: Create the file**

Create `components/sidebar-user-menu.tsx` with this exact content:

```tsx
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
      <PopoverTrigger asChild>
        <button
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
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        avoidCollisions
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:\Users\erezg\Documents\OwnEZ CRM"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add components/sidebar-user-menu.tsx
git commit -m "feat: add SidebarUserMenu desktop popover component"
```

---

## Task 4: Update MobileNav (Mobile Tab + Sheet)

**Files:**
- Modify: `components/sidebar-nav.tsx`

The current `MobileNav` function signature is `({ role }: { role: UserRole })`. You'll add `fullName`, `useState`, `Sheet` import, and the 4th tab + sheet.

- [ ] **Step 1: Add imports to sidebar-nav.tsx**

At the top of `components/sidebar-nav.tsx`, add to the existing imports:

```tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
```

The file already imports `useState`-compatible hooks setup (it's already `"use client"`). Add these specific imports. The existing lucide-react import line already has `LayoutDashboard, GitBranch, Users, BarChart3, Settings` — no changes needed there.

- [ ] **Step 2: Add helpers above MobileNav**

Add the following constants and function directly above the `MobileNav` function (after the `MOBILE_NAV_ITEMS` const):

```ts
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
```

- [ ] **Step 3: Replace the MobileNav function**

Replace the entire `MobileNav` function (lines 56–84 in the current file) with:

```tsx
export function MobileNav({ role, fullName }: { role: UserRole; fullName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const firstName = fullName.trim().split(/\s+/)[0] || "?";
  const initials = getInitials(fullName);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
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
                isActive ? "text-gold" : "text-white/60"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}

        {/* User / logout tab */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Open user menu"
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
            sheetOpen ? "text-gold" : "text-white/60"
          }`}
        >
          <span
            className={`w-[22px] h-[22px] rounded-full bg-white/15 text-gold text-[10px] font-bold flex items-center justify-center ${
              sheetOpen ? "ring-1 ring-gold ring-offset-1 ring-offset-navy" : ""
            }`}
          >
            {initials}
          </span>
          {firstName}
        </button>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe px-6 pt-0">
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-5" />
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-full bg-navy/10 text-gold text-base font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <div>
              <p className="text-base font-semibold text-navy">{fullName}</p>
              <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            </div>
          </div>
          <div className="border-t mb-4" />
          <button
            onClick={handleLogout}
            className="w-full rounded-full border border-alert-red/30 py-3 text-sm font-medium text-alert-red hover:bg-alert-red-light transition-colors"
          >
            Sign out
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/sidebar-nav.tsx
git commit -m "feat: add user menu tab + bottom sheet to mobile nav"
```

---

## Task 5: Wire sidebar.tsx + Delete LogoutButton

**Files:**
- Modify: `components/sidebar.tsx`
- Delete: `components/logout-button.tsx`

- [ ] **Step 1: Update sidebar.tsx**

The current `components/sidebar.tsx` is:

```tsx
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
```

Replace it entirely with:

```tsx
import { getSession } from "@/lib/auth";
import { SidebarNav, MobileNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";

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

        <div className="border-t border-navy-light">
          <SidebarUserMenu fullName={session.fullName} role={session.role} />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <MobileNav role={session.role} fullName={session.fullName} />
    </>
  );
}
```

Key changes:
1. Import `SidebarUserMenu` instead of `LogoutButton`
2. Footer `<div>` removes `px-5 py-4` (padding now lives inside `SidebarUserMenu` button)
3. Replace `<p>` + `<LogoutButton />` with `<SidebarUserMenu fullName={...} role={...} />`
4. Add `fullName={session.fullName}` to `<MobileNav>`

- [ ] **Step 2: Delete logout-button.tsx (staged)**

```bash
git rm components/logout-button.tsx
```

This deletes the file and stages the deletion in one step.

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: wire user menu into sidebar (desktop + mobile)"
```

---

## Task 6: Verify — Tests + Build

- [ ] **Step 1: Run the new user menu E2E tests**

```bash
npx playwright test e2e/auth.spec.ts --reporter=line 2>&1 | tail -15
```

Expected: all tests pass (including the 6 new ones added in Task 1).

- [ ] **Step 2: Run the full auth + leadership test suites to confirm no regressions**

```bash
npx playwright test e2e/auth.spec.ts e2e/leadership-admin.spec.ts --reporter=line 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

```bash
npm run build 2>&1 | tail -20
```

Expected: `Route (app) ...` table with no errors. Exit code 0.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify logout user menu — all tests pass, build clean"
```

Only commit if there are unstaged changes. If everything was committed in prior steps, skip this.
