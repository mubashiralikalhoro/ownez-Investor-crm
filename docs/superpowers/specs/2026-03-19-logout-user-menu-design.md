# Logout / User Menu — Design Spec
**Date:** 2026-03-19
**Status:** Approved

---

## Problem

Logout exists (`LogoutButton` renders "Sign out" as 12px, 40%-opacity text in the sidebar footer) but is practically invisible. Mobile has no logout path at all.

## Goal

Make session management (primarily logout) globally accessible and discoverable on both desktop and mobile — without adding visual noise.

---

## Solution Overview

Replace the bare "first name + Sign out text" sidebar footer with an **interactive avatar row** that opens a user menu popover. Add a matching **4th tab** to the mobile bottom nav that opens a bottom sheet.

No new routes, API changes, or session schema changes required. `fullName` and `role` are already in `SessionPayload` and already read by `Sidebar`.

---

## Prerequisites

`Popover` is not yet installed in this project. Before implementation:

```bash
npx shadcn@latest add popover
```

---

## Color Tokens

Defined in `app/globals.css` as CSS custom properties. Tailwind utilities use the token name with any prefix (`bg-`, `text-`, `border-`, etc.):

| Token name | Hex | Common usage |
|---|---|---|
| `alert-red` | `#ef4444` | `text-alert-red`, `border-alert-red` |
| `alert-red-light` | `#fef2f2` | `bg-alert-red-light` (hover backgrounds) |
| `navy-light` | `#122d5c` | `bg-navy-light` |
| `gold` | `#e8ba30` | `text-gold`, `ring-gold` |

---

## Role Display Labels

`UserRole` values map to human-readable labels:
- `"rep"` → `"Rep"`
- `"marketing"` → `"Marketing"`
- `"admin"` → `"Admin"`

Use shadcn `Badge variant="secondary"` (gray pill). No color-coding by role.

---

## Initials Logic

```ts
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
```

First-name display (avatar row label): `fullName.trim().split(/\s+/)[0] || "?"`.

---

## Desktop: SidebarUserMenu Component

### File

New file: **`components/sidebar-user-menu.tsx`** — `"use client"`, desktop only.

Props: `{ fullName: string; role: UserRole }`

### Avatar Row (trigger button)

Full-width button in the sidebar footer (`px-5 py-4`):

```
[CG]  Chad          ˄
```

- **Button**: `flex items-center gap-2.5 w-full rounded-lg hover:bg-white/5 transition-colors`
- **`aria-label`**: `"Open user menu"`
- **Avatar circle**: `w-7 h-7 rounded-full bg-white/10 text-gold flex items-center justify-center text-[11px] font-bold shrink-0` — displays initials from `getInitials(fullName)`; fallback `"?"` if blank
- **Name**: first name (`fullName.trim().split(/\s+/)[0] || "?"`), `text-sm text-white/80 font-medium flex-1`
- **ChevronUp**: `size={14}`, `text-white/30`, `transition-transform`, add `rotate-180` class when popover open

### Popover

Uses shadcn `Popover` + `PopoverTrigger` + `PopoverContent` (after running `npx shadcn@latest add popover`).

```tsx
<PopoverContent side="top" align="start" avoidCollisions sideOffset={8} className="w-52 rounded-xl shadow-lg p-1">
```

Content layout:
1. **User info row** (`px-3 py-2.5 flex items-center justify-between gap-2`):
   - Full name: `text-sm font-medium text-navy`
   - Role badge: `<Badge variant="secondary">` with label from role map
2. **Divider**: `<div className="border-t my-1" />`
3. **Sign out row** — `<button>` element:
   - Classes: `flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-alert-red hover:bg-alert-red-light transition-colors`
   - `<LogOut size={14} />` + `"Sign out"`

### Logout behavior

```ts
async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  router.push("/login");
  router.refresh();
}
```

No error state — matches existing behavior. Clicking outside the popover closes it (Radix/shadcn default).

---

## Mobile: MobileNav 4th Tab + Bottom Sheet

### Component changes

`MobileNav` in `components/sidebar-nav.tsx` gains two new props:

```ts
{ role: UserRole; fullName: string }
```

`MobileNav` is already `"use client"`. Add local `const [sheetOpen, setSheetOpen] = useState(false)`.

### Updated MobileNav call in `sidebar.tsx`

The existing call `<MobileNav role={session.role} />` must be updated to:

```tsx
<MobileNav role={session.role} fullName={session.fullName} />
```

### 4th Tab (avatar button)

Added as the rightmost tab. `onClick={() => setSheetOpen(true)}` (does not navigate).

```tsx
<button
  onClick={() => setSheetOpen(true)}
  aria-label="Open user menu"
  className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
    sheetOpen ? "text-gold" : "text-white/60"
  }`}
>
  <span className={`w-[22px] h-[22px] rounded-full bg-white/15 text-gold text-[10px] font-bold flex items-center justify-center ${
    sheetOpen ? "ring-1 ring-gold ring-offset-1 ring-offset-navy" : ""
  }`}>
    {getInitials(fullName)}
  </span>
  {fullName.trim().split(/\s+/)[0] || "?"}
</button>
```

### Bottom Sheet

Uses existing shadcn `Sheet` component with `side="bottom"`. Apply `rounded-t-2xl` by passing `className` to `SheetContent`:

```tsx
<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
  <SheetContent side="bottom" className="rounded-t-2xl pb-safe px-6 pt-0">
    ...
  </SheetContent>
</Sheet>
```

Sheet content layout (top to bottom):

1. **Drag handle**: `<div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-5" />` — cosmetic only, no swipe gesture
2. **User identity row** (`flex items-center gap-3 mb-6`):
   - Avatar: `w-10 h-10 rounded-full bg-navy/10 text-gold text-base font-bold flex items-center justify-center`
   - Name + role stacked:
     - `<p className="text-base font-semibold text-navy">{fullName}</p>`
     - `<Badge variant="secondary">` with role label
3. **Divider**: `<div className="border-t mb-4" />`
4. **Sign out button**:
   ```tsx
   <button
     onClick={handleLogout}
     className="w-full rounded-full border border-alert-red/30 py-3 text-sm font-medium text-alert-red hover:bg-alert-red-light transition-colors"
   >
     Sign out
   </button>
   ```

Logout behavior: same `handleLogout` function as desktop.

---

## File Summary

| File | Change |
|------|--------|
| `components/sidebar.tsx` | (1) Replace `import { LogoutButton }` with `import { SidebarUserMenu }`. (2) Replace footer `<p>` + `<LogoutButton />` with `<SidebarUserMenu fullName={session.fullName} role={session.role} />`. (3) Update `<MobileNav role={session.role} />` → `<MobileNav role={session.role} fullName={session.fullName} />` |
| `components/sidebar-user-menu.tsx` | **New file** — desktop avatar row + popover |
| `components/sidebar-nav.tsx` | Add `fullName` prop to `MobileNav`; add 4th avatar tab + sheet |
| `components/logout-button.tsx` | **Delete** — logout logic is inlined into the two new components |
| `components/ui/popover.tsx` | **New file** — added by `npx shadcn@latest add popover` |

---

## What Does NOT Change

- `lib/auth.ts`
- `app/api/auth/logout/route.ts`
- `SessionPayload` type
- All page-level components and E2E tests

---

## Avatar Sizes (Intentional)

| Context | Size | Rationale |
|---------|------|-----------|
| Desktop sidebar row | 28px (`w-7 h-7`) | Fits sidebar footer line height |
| Mobile bottom tab | 22px (`w-[22px] h-[22px]`) | Matches mobile tab icon footprint |
| Mobile sheet header | 40px (`w-10 h-10`) | Larger identity confirmation context |

---

## Success Criteria

1. Desktop: clicking the avatar row opens the user popover
2. Desktop: "Sign out" logs out and redirects to `/login`
3. Desktop: clicking outside the popover closes it
4. Mobile: a 4th tab appears with the user's initials and first name
5. Mobile: tapping the tab opens the bottom sheet
6. Mobile: "Sign out" logs out and redirects to `/login`
7. All existing E2E tests continue to pass
