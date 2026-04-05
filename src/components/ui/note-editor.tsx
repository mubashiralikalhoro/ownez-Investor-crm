"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Heading2, Minus, Undo, Redo,
} from "lucide-react";
import { useEffect } from "react";

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-xs transition-colors disabled:opacity-30 ${
        active
          ? "bg-navy text-white"
          : "text-muted-foreground hover:bg-muted hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  /** Initial HTML content */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function NoteEditor({
  value,
  onChange,
  placeholder = "Write a note…",
  minHeight = 120,
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // Return empty string when only whitespace / empty paragraphs remain
      const html = editor.getText().trim() ? editor.getHTML() : "";
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none text-navy leading-relaxed",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value reset (e.g. after cancel)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-border bg-white focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30 transition-colors overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
        <ToolBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          <UnderlineIcon size={13} />
        </ToolBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <ToolBtn title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 size={13} />
        </ToolBtn>
        <ToolBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List size={13} />
        </ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered size={13} />
        </ToolBtn>
        <ToolBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={13} />
        </ToolBtn>

        <span className="w-px h-4 bg-border mx-1" />

        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={13} />
        </ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={13} />
        </ToolBtn>
      </div>

      {/* Content area */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-3 py-2.5 text-sm cursor-text [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}

// ─── Read-only HTML renderer ──────────────────────────────────────────────────

export function NoteContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-foreground/80 leading-relaxed
        prose-headings:text-navy prose-headings:font-semibold
        prose-strong:text-navy prose-strong:font-semibold
        prose-ul:my-1 prose-ol:my-1 prose-li:my-0
        prose-hr:my-2 prose-p:my-0.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
