"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Check, Plus, Trash2, X } from "lucide-react";
import { ROLE_DEFAULTS } from "@/lib/permissions";
import type { UserPermissions, UserRole } from "@/lib/types";
import type { AdminUserRow, AvailableUserRow } from "@/services/app-users";

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
  permissions: Required<UserPermissions>;
};

export function UsersTab({ users: initialUsers }: UsersTabProps) {
  const router = useRouter();
  const [users, setUsers]           = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edit, setEdit]             = useState<RowState | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [removing, setRemoving]     = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  // Keep local state in sync with the server snapshot so tab-switch remounts
  // don't lose user-initiated changes (TabsContent unmounts inactive panels).
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  function openRow(user: AdminUserRow) {
    if (user.source === "env") return; // env users are not editable
    if (selectedId === user.zohoUserId) {
      setSelectedId(null);
      setEdit(null);
      setError(null);
      return;
    }
    setSelectedId(user.zohoUserId);
    setEdit({
      role:        user.effectiveRole,
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
          active:      true,
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
                hasOverride:   true,
                permissions:   edit.permissions,
              }
            : u,
        ),
      );
      setSelectedId(null);
      setEdit(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!selectedId) return;
    if (!confirm("Remove this user? They will lose access immediately. You can re-add them later from the Add user dialog.")) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedId}`, {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({
          role:        edit?.role ?? "rep",
          active:      false,
          permissions: edit?.permissions ?? {},
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Remove failed (${res.status})`);
      }
      setUsers((prev) => prev.filter((u) => u.zohoUserId !== selectedId));
      setSelectedId(null);
      setEdit(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setRemoving(false);
    }
  }

  function handleUserAdded(row: AdminUserRow) {
    setUsers((prev) => {
      const filtered = prev.filter((u) => u.zohoUserId !== row.zohoUserId);
      return [...filtered, row].sort((a, b) => {
        if (a.effectiveRole !== b.effectiveRole) {
          return a.effectiveRole === "admin" ? -1 : b.effectiveRole === "admin" ? 1 : 0;
        }
        return a.fullName.localeCompare(b.fullName);
      });
    });
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground">
          Authorized users. Bootstrap admins (marked <span className="text-navy">env</span>) are controlled by <code className="text-navy">BOOTSTRAP_ADMIN_USER_IDS</code>.
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover"
        >
          <Plus size={12} /> Add user
        </button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No authorized users yet. Add one from your Zoho org or set{" "}
          <code className="text-navy">BOOTSTRAP_ADMIN_USER_IDS</code> in <code>.env</code>.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_100px] bg-muted/40 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>User</span>
            <span>Role</span>
            <span>Source</span>
          </div>

          {users.map((user) => {
            const isEnv = user.source === "env";
            return (
              <div key={user.zohoUserId}>
                <button
                  onClick={() => openRow(user)}
                  disabled={isEnv}
                  className={`w-full grid grid-cols-[1fr_140px_100px] px-4 py-3 text-left transition-colors border-b last:border-0 ${
                    isEnv ? "cursor-default bg-muted/10" : "hover:bg-muted/30"
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
                  <div className="flex items-center">
                    {isEnv ? (
                      <span className="text-[10px] uppercase tracking-wider text-navy/70 bg-navy/10 px-1.5 py-0.5 rounded">
                        env
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        added
                      </span>
                    )}
                  </div>
                </button>

                {selectedId === user.zohoUserId && edit && !isEnv && (
                  <div className="border-b bg-card px-4 py-4 space-y-4 border-l-2 border-l-gold">
                    {/* Role picker */}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">Role</div>
                      <div className="flex gap-1.5">
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setEdit((prev) => prev ? { ...prev, role: r, permissions: { ...ROLE_DEFAULTS[r] } } : prev)}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              edit.role === r
                                ? "bg-gold text-navy"
                                : "bg-muted text-muted-foreground hover:bg-gold/15 hover:text-navy"
                            }`}
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                      {[
                        { title: "Pages",   keys: PERMISSION_FIELDS.filter((p) => p.section === "pages")   },
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

                    {error && (
                      <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t">
                      <button
                        onClick={save}
                        disabled={saving || removing}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gold text-navy text-sm font-medium hover:bg-gold-hover transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving…" : (<><Check size={14} />Save changes</>)}
                      </button>
                      <button
                        onClick={() => { setSelectedId(null); setEdit(null); setError(null); }}
                        disabled={saving || removing}
                        className="px-4 py-1.5 rounded-full border border-gray-200 text-sm text-muted-foreground hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={removeUser}
                        disabled={saving || removing}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-alert-red/40 text-sm text-alert-red hover:bg-alert-red/5 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} /> {removing ? "Removing…" : "Remove user"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addOpen && (
        <AddUserDialog
          onClose={() => setAddOpen(false)}
          onAdded={handleUserAdded}
        />
      )}
    </div>
  );
}

function AddUserDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (row: AdminUserRow) => void;
}) {
  const [candidates, setCandidates] = useState<AvailableUserRow[] | null>(null);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [pickedId, setPickedId]     = useState<string | null>(null);
  const [role, setRole]             = useState<UserRole>("rep");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/admin/users/available", {
          credentials: "same-origin",
          signal:      controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Failed to load (${res.status})`);
        }
        const json = (await res.json()) as { data?: AvailableUserRow[] };
        setCandidates(json.data ?? []);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "Failed to load Zoho users.");
      }
    })();
    return () => controller.abort();
  }, []);

  const filtered = (candidates ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q) ?? false)
    );
  });

  async function submit() {
    if (!pickedId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({ zohoUserId: pickedId, role }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Add failed (${res.status})`);
      }
      const picked = candidates?.find((u) => u.zohoUserId === pickedId);
      if (picked) {
        onAdded({
          zohoUserId:    picked.zohoUserId,
          email:         picked.email,
          fullName:      picked.fullName,
          zohoRoleId:    picked.zohoRoleId,
          zohoRoleName:  picked.zohoRoleName,
          source:        "override",
          effectiveRole: role,
          active:        true,
          hasOverride:   true,
          permissions:   { ...ROLE_DEFAULTS[role] },
          zohoStatus:    picked.zohoStatus,
        });
      } else {
        onClose();
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Add failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-medium text-navy">Add user from Zoho</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-navy" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loadError && (
            <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{loadError}</span>
            </div>
          )}

          {!loadError && candidates === null && (
            <div className="text-xs text-muted-foreground">Loading Zoho users…</div>
          )}

          {candidates !== null && candidates.length === 0 && (
            <div className="text-xs text-muted-foreground italic">
              All Zoho org users are already authorized.
            </div>
          )}

          {candidates !== null && candidates.length > 0 && (
            <>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">User</div>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-muted-foreground/25 bg-card px-3 py-1.5 text-xs outline-none focus:border-gold mb-2"
                />
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  {filtered.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">No matches.</div>
                  )}
                  {filtered.map((u) => (
                    <button
                      key={u.zohoUserId}
                      type="button"
                      onClick={() => setPickedId(u.zohoUserId)}
                      className={`w-full text-left px-3 py-2 text-xs border-b last:border-0 hover:bg-muted/30 transition-colors ${
                        pickedId === u.zohoUserId ? "bg-gold/10" : ""
                      }`}
                    >
                      <div className="text-sm text-navy font-medium">{u.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.email ?? "—"}
                        {u.zohoRoleName && <span className="ml-1.5">· {u.zohoRoleName}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Role</div>
                <div className="flex gap-1.5">
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        role === r
                          ? "bg-gold text-navy"
                          : "bg-muted text-muted-foreground hover:bg-gold/15 hover:text-navy"
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {saveError && (
            <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-1.5 rounded-full border border-gray-200 text-sm text-muted-foreground hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !pickedId || !candidates || candidates.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gold text-navy text-sm font-medium hover:bg-gold-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add user"}
          </button>
        </div>
      </div>
    </div>
  );
}
