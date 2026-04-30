"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Loader2, Pencil, Trash2,
} from "lucide-react";
import { NoteEditor, NoteContent } from "@/components/ui/note-editor";
import { formatDate } from "@/lib/format";
import type { ZohoNote } from "@/types";

// ─── 6. Notes Section with full CRUD ─────────────────────────────────────────

export function ProspectNotesSection({
  notes, onAdd, onEdit, onDelete,
}: {
  notes: ZohoNote[];
  onAdd: (title: string, content: string) => Promise<void>;
  onEdit: (noteId: string, title: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!addContent.trim() || addSubmitting) return;
    setAddSubmitting(true); setAddError(null);
    try {
      await onAdd(addTitle, addContent);
      setAddTitle(""); setAddContent(""); setAddingNote(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setAddSubmitting(false);
    }
  };

  const startEdit = (note: ZohoNote) => {
    setEditingId(note.id);
    setEditTitle(note.Note_Title ?? "");
    setEditContent(note.Note_Content ?? "");
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editingId || !editContent.trim() || editSubmitting) return;
    setEditSubmitting(true); setEditError(null);
    try {
      await onEdit(editingId, editTitle, editContent);
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update note");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try { await onDelete(noteId); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to delete note"); }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 text-left group">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
          <h3 className="text-sm font-semibold text-navy">Notes</h3>
          <span className="ml-1 text-[10px] text-muted-foreground">{notes.length}</span>
        </button>
        <button
          onClick={() => { setAddingNote(!addingNote); setExpanded(true); }}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gold hover:text-gold/80 transition-colors"
        >
          <Plus size={11} />
          Add note
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pl-5">
          {/* Add note form */}
          {addingNote && (
            <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-2">
              <input
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full border border-border rounded px-2 py-1.5 text-xs font-medium text-navy bg-white focus:outline-none focus:border-gold"
              />
              <NoteEditor
                value={addContent}
                onChange={setAddContent}
                placeholder="Write a note…"
                minHeight={100}
              />
              {addError && <p className="text-[10px] text-alert-red">{addError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!addContent.trim() || addSubmitting}
                  className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                >
                  {addSubmitting ? <Loader2 size={11} className="animate-spin inline" /> : "Save Note"}
                </button>
                <button
                  onClick={() => { setAddingNote(false); setAddTitle(""); setAddContent(""); setAddError(null); }}
                  className="text-xs text-muted-foreground hover:text-navy transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {notes.length === 0 && !addingNote && (
            <p className="text-sm text-muted-foreground italic">No notes yet.</p>
          )}

          {notes.map(note => (
            <div key={note.id}>
              {editingId === note.id ? (
                <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-2">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full border border-border rounded px-2 py-1.5 text-xs font-medium text-navy bg-white focus:outline-none focus:border-gold"
                  />
                  <NoteEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Note content…"
                    minHeight={100}
                  />
                  {editError && <p className="text-[10px] text-alert-red">{editError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEdit}
                      disabled={!editContent.trim() || editSubmitting}
                      className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                    >
                      {editSubmitting ? <Loader2 size={11} className="animate-spin inline" /> : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-muted-foreground hover:text-navy transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border bg-card px-3 py-2.5 group/note relative">
                  {note.Note_Title && <p className="text-xs font-semibold text-navy mb-1.5">{note.Note_Title}</p>}
                  {note.Note_Content && (
                    <NoteContent html={note.Note_Content} />
                  )}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t">
                    <span className="text-[10px] text-muted-foreground">{note.Created_By?.name ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(note.Created_Time)}</span>
                  </div>
                  {/* Edit / Delete icons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 rounded text-muted-foreground hover:text-navy hover:bg-muted/60 transition-colors"
                      title="Edit note"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded text-muted-foreground hover:text-alert-red hover:bg-alert-red/10 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
