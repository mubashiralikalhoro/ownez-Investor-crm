"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Check } from "lucide-react";
import { ROLE_DEFAULTS } from "@/lib/permissions";
import type { UserPermissions, UserRole } from "@/lib/types";
import type { AdminUserRow } from "@/services/app-users";

interface UsersTabProps {
  users: AdminUserRow[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  rep:       "Rep",
  marketing: "Marketing",
  admin:     "Admin",
};

const PERMISSION_FIELDS: { key: keyof UserPermissions; label: string; section: "pages" | "actions" }[] = [
  { key: "canViewLeadership",    label: "Leadership Dashboard", section: "pages"   },
  { key: "canAccessAdmin",       label: "Admin Panel",          section: "pages"   },
  { key: "canReassignProspects", label: "Reassign Prospects",   section: "actions" },
  { key: "canViewAllProspects",  label: "View All Prospects",   section: "actions" },
  { key: "canMarkDead",          label: "Mark Prospect Dead",   section: "actions" },
];

type RowState = {
  role:        UserRole;
  active:      boolean;
  permissions: Required<UserPermissions>;
};

export function UsersTab({ users: initialUsers }: UsersTabProps) {
  const [users, setUsers]           = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edit, setEdit]             = useState<RowState | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  function openRow(user: AdminUserRow) {
    if (selectedId === user.zohoUserId) {
      setSelectedId(null);
      setEdit(null);
      setError(null);
      return;
    }
    setSelectedId(user.zohoUserId);
    setEdit({
      role:        user.effectiveRole,
      active:      user.active,
      permissions: { ...user.permissions },
    });
    setError(null);
  }

  function togglePermission(key: keyof UserPermissions) {
    setEdit((prev) =>
      prev
        ? { ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }
        : prev,
    );
  }

  function applyRoleTemplate(role: UserRole) {
    setEdit((prev) =>
      prev ? { ...prev, role, permissions: { ...ROLE_DEFAULTS[role] } } : prev,
    );
  }

  async function save() {
    if (!selectedId || !edit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedId}`, {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({
          role:        edit.role,
          active:      edit.active,
          permissions: edit.permissions,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.zohoUserId === selectedId
            ? {
                ...u,
                effectiveRole: edit.role,
                active:        edit.active,
                hasOverride:   true,
                permissions:   edit.permissions,
              }
            : u,
        ),
      );
      setSelectedId(null);
      setEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No Zoho users found with an allowed role. Verify <code className="text-navy">ZOHO_ADMIN_ROLE_IDS</code> /
        <code className="text-navy"> ZOHO_REP_ROLE_IDS</code> are set in your <code>.env</code>.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_120px_100px] bg-muted/40 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
        </div>

        {users.map((user) => (
          <div key={user.zohoUserId}>
            <button
              onClick={() => openRow(user)}
              className={`w-full grid grid-cols-[1fr_120px_100px] px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b last:border-0 ${
                !user.active ? "opacity-50" : ""
              } ${selectedId === user.zohoUserId ? "border-l-2 border-l-gold bg-gold/5" : ""}`}
            >
              <div>
                <div className="text-sm font-medium text-navy">{user.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {user.email ?? "—"}
                  {user.zohoRoleName && (
                    <span className="ml-2 text-muted-foreground/70">· zoho: {user.zohoRoleName}</span>
                  )}
                </div>
              </div>
              <div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.effectiveRole === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : user.effectiveRole === "marketing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ROLE_LABELS[user.effectiveRole]}
                </span>
                {user.hasOverride && (
                  <span className="ml-1 text-[9px] text-gold uppercase tracking-wider">override</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-muted-foreground">{user.active ? "Active" : "Inactive"}</span>
              </div>
            </button>

            {selectedId === user.zohoUserId && edit && (
              <div className="border-b bg-card px-4 py-4 space-y-4 border-l-2 border-l-gold">
                {/* Permissions */}
                <div className="space-y-3">
                  {[
                    { title: "Pages",   keys: PERMISSION_FIELDS.filter((p) => {
                      // Hide "Admin Panel" toggle for rep users — they can never access it
                      if (p.key === "canAccessAdmin" && user.envRole === "rep") return false;
                      return p.section === "pages";
                    })},
                    { title: "Actions", keys: PERMISSION_FIELDS.filter((p) => p.section === "actions") },
                  ].map(({ title, keys }) => (
                    <div key={title}>
                      <div className="text-xs font-medium text-muted-foreground mb-2">{title}</div>
                      <div className="space-y-2">
                        {keys.map(({ key, label }) => {
                          const roleDefault = ROLE_DEFAULTS[edit.role][key];
                          const current     = edit.permissions[key];
                          const isOverride  = current !== roleDefault;
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-navy">{label}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Role default: {roleDefault ? "on" : "off"}
                                  {isOverride && <span className="text-gold"> · overridden</span>}
                                </div>
                              </div>
                              <Switch
                                checked={current}
                                onCheckedChange={() => togglePermission(key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <div className="text-sm text-navy">Active</div>
                    <div className="text-[10px] text-muted-foreground">
                      If off, this user is blocked from logging in.
                    </div>
                  </div>
                  <Switch
                    checked={edit.active}
                    onCheckedChange={(v) => setEdit((prev) => (prev ? { ...prev, active: v } : prev))}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gold text-navy text-sm font-medium hover:bg-gold-hover transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : (<><Check size={14} />Save changes</>)}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedId(null);
                      setEdit(null);
                      setError(null);
                    }}
                    className="px-4 py-1.5 rounded-full border border-gray-200 text-sm text-muted-foreground hover:border-navy hover:text-navy transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
