"use client";

import { useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import type { User, UserPermissions, UserRole } from "@/lib/types";

interface UsersTabProps {
  users: User[];
  unassignedCount: number;
}

const ROLE_DEFAULTS: Record<UserRole, UserPermissions> = {
  rep:       { canViewLeadership: false, canAccessAdmin: false, canReassignProspects: false, canViewAllProspects: true,  canMarkDead: true },
  marketing: { canViewLeadership: true,  canAccessAdmin: false, canReassignProspects: false, canViewAllProspects: true,  canMarkDead: true },
  admin:     { canViewLeadership: true,  canAccessAdmin: true,  canReassignProspects: true,  canViewAllProspects: true,  canMarkDead: true },
};

const ROLE_LABELS: Record<UserRole, string> = { rep: "Rep", marketing: "Marketing", admin: "Admin" };

const PERMISSIONS: { key: keyof UserPermissions; label: string; section: "pages" | "actions" }[] = [
  { key: "canViewLeadership",   label: "Leadership Dashboard", section: "pages" },
  { key: "canAccessAdmin",      label: "Admin Panel",          section: "pages" },
  { key: "canReassignProspects",label: "Reassign Prospects",   section: "actions" },
  { key: "canViewAllProspects", label: "View All Prospects",   section: "actions" },
  { key: "canMarkDead",         label: "Mark Prospect Dead",   section: "actions" },
];

export function UsersTab({ users: initialUsers, unassignedCount }: UsersTabProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<UserPermissions>({});
  const [editRole, setEditRole] = useState<UserRole>("rep");
  const [saving, setSaving] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [reassignToId, setReassignToId] = useState<string>("");

  function selectUser(user: User) {
    if (selectedId === user.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(user.id);
    setEditRole(user.role);
    setEditPerms(user.permissions ?? {});
    setDeactivateConfirm(false);
  }

  function resolvePermission(key: keyof UserPermissions): boolean {
    if (editPerms[key] !== undefined) return editPerms[key]!;
    return ROLE_DEFAULTS[editRole][key] ?? false;
  }

  function togglePermission(key: keyof UserPermissions) {
    const current = resolvePermission(key);
    setEditPerms((p) => ({ ...p, [key]: !current }));
  }

  function applyRoleTemplate(role: UserRole) {
    setEditRole(role);
    setEditPerms({});
  }

  async function savePermissions() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${selectedId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPerms),
      });
      setUsers((prev) => prev.map((u) => u.id === selectedId ? { ...u, permissions: editPerms, role: editRole } : u));
      setSelectedId(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${selectedId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignToId: reassignToId || undefined }),
      });
      setUsers((prev) => prev.map((u) => u.id === selectedId ? { ...u, isActive: false } : u));
      setSelectedId(null);
      setDeactivateConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedId);
  const assignedCount = users.filter((u) => u.isActive && u.role === "rep" && u.id !== selectedId).length;
  const activeReps = users.filter((u) => u.isActive && u.role === "rep" && u.id !== selectedId);

  const pagePerms = PERMISSIONS.filter((p) => p.section === "pages");
  const actionPerms = PERMISSIONS.filter((p) => p.section === "actions");

  return (
    <div>
      {unassignedCount > 0 && (
        <div className="flex items-center gap-2 mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            {unassignedCount} prospect{unassignedCount !== 1 ? "s are" : " is"} unassigned —{" "}
            <Link href="/pipeline?assignedRep=unassigned" className="underline font-medium">
              view in pipeline →
            </Link>
          </span>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 bg-muted/40 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
        </div>

        {users.map((user) => (
          <div key={user.id}>
            {/* Row */}
            <button
              onClick={() => selectUser(user)}
              className={`w-full grid grid-cols-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b last:border-0 ${
                !user.isActive ? "opacity-50" : ""
              } ${selectedId === user.id ? "border-l-2 border-l-gold bg-gold/5" : ""}`}
            >
              <div>
                <div className="text-sm font-medium text-navy">{user.fullName}</div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </div>
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === "admin" ? "bg-purple-100 text-purple-700" :
                  user.role === "marketing" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-xs text-muted-foreground">{user.isActive ? "Active" : "Inactive"}</span>
              </div>
            </button>

            {/* Inline edit panel */}
            {selectedId === user.id && (
              <div className="border-b bg-card px-4 py-4 space-y-4 border-l-2 border-l-gold">
                {/* Role Template */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Role Template</div>
                  <div className="flex gap-2">
                    {(["rep", "marketing", "admin"] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => applyRoleTemplate(role)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          editRole === role
                            ? "bg-gold text-white border-gold"
                            : "border-gray-200 text-gray-600 hover:border-gold"
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-3">
                  {[
                    { label: "Pages", perms: pagePerms },
                    { label: "Actions", perms: actionPerms },
                  ].map(({ label, perms }) => (
                    <div key={label}>
                      <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
                      <div className="space-y-2">
                        {perms.map(({ key, label: permLabel }) => {
                          const roleDefault = ROLE_DEFAULTS[editRole][key] ?? false;
                          const current = resolvePermission(key);
                          const isOverride = editPerms[key] !== undefined;
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-navy">{permLabel}</div>
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

                {/* Actions */}
                {user.isActive && !deactivateConfirm && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <button
                      onClick={savePermissions}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-full bg-gold text-white text-sm font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setDeactivateConfirm(true)}
                      className="px-4 py-1.5 rounded-full border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                )}

                {/* Deactivate confirmation */}
                {deactivateConfirm && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-sm text-navy">
                      <strong>{user.fullName}</strong> has prospects assigned. Reassign to:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={reassignToId}
                        onChange={(e) => setReassignToId(e.target.value)}
                        className="text-sm border rounded-md px-2 py-1.5 text-navy"
                      >
                        <option value="">— Skip reassignment —</option>
                        {activeReps.map((r) => (
                          <option key={r.id} value={r.id}>{r.fullName}</option>
                        ))}
                      </select>
                      <button
                        onClick={confirmDeactivate}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Deactivating…" : "Confirm Deactivate"}
                      </button>
                      <button
                        onClick={() => setDeactivateConfirm(false)}
                        className="text-sm text-muted-foreground hover:text-navy transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!user.isActive && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">This user is inactive.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
