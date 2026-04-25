"use client";

import { useEffect, useState } from "react";
import { X, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export type EditableContent = {
  id: number;
  kind: "youtube" | "web" | "mtrly" | string;
  rawUrl: string | null;
  normalizedUrl: string | null;
  title: string | null;
  description: string | null;
  previewImageUrl: string | null;
  bodyMarkdown: string | null;
};

export function EditContentDialog({
  content,
  onClose,
  onSaved,
}: {
  content: EditableContent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isMtrly = content.kind === "mtrly";
  const [title, setTitle] = useState(content.title ?? "");
  const [description, setDescription] = useState(content.description ?? "");
  const [previewImageUrl, setPreviewImageUrl] = useState(content.previewImageUrl ?? "");
  const [body, setBody] = useState(content.bodyMarkdown ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const payload: Record<string, unknown> = {
      id: content.id,
      title: title || null,
      description: description || null,
      previewImageUrl: previewImageUrl || null,
    };
    if (isMtrly) payload.body = body;
    try {
      const res = await fetch("/api/creator/content", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "save_failed");
      } else {
        onSaved();
        onClose();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center">
      <button onClick={onClose} className="absolute inset-0" aria-label="close" />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 p-5 backdrop-blur">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Edit content</h2>
              <Badge variant="kind">{content.kind}</Badge>
            </div>
            {content.normalizedUrl && (
              <a
                href={isMtrly ? `/a/${content.id}` : content.normalizedUrl}
                target={isMtrly ? "_self" : "_blank"}
                rel="noreferrer"
                className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-muted hover:text-fg"
              >
                {isMtrly ? `/a/${content.id}` : content.normalizedUrl}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-bg hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-5 p-5">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 280))}
              rows={2}
              className="mt-1.5"
              placeholder="Shown on previews (max 280 chars)"
            />
            <div className="mt-1 text-right font-mono text-[10px] text-muted">{description.length}/280</div>
          </div>

          <div>
            <Label htmlFor="edit-preview">Preview image URL</Label>
            <Input
              id="edit-preview"
              type="url"
              value={previewImageUrl}
              onChange={(e) => setPreviewImageUrl(e.target.value)}
              className="mt-1.5"
              placeholder="https://… (optional)"
            />
            <p className="mt-1 font-mono text-[10px] text-muted">
              Leave blank for an auto-generated gradient based on the title.
            </p>
          </div>

          {isMtrly && (
            <div>
              <Label htmlFor="edit-body">Article body</Label>
              <Textarea
                id="edit-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 50000))}
                rows={14}
                className="mt-1.5 leading-relaxed"
                placeholder="Markdown light: **bold**, *italic*, [link](https://…). Blank line = new paragraph."
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                <span>
                  {body.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length} paragraphs
                </span>
                <span>{body.length}/50000</span>
              </div>
            </div>
          )}

          {err && (
            <div className="rounded-md border border-red-400/40 bg-red-400/10 p-2 text-xs text-red-400">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={14} /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
