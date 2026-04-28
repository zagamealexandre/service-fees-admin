"use client";
import { useState } from "react";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Button, TextInput } from "./ui";
import { DiffView } from "./DiffView";

export function SavePRDialog({
  before,
  after,
  baseSha,
  onClose,
}: {
  before: ServiceFeeConfig;
  after: ServiceFeeConfig;
  baseSha: string;
  onClose: (result: { prUrl?: string }) => void;
}) {
  const [title, setTitle] = useState("Update service fees");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: after, baseSha, prTitle: title, prBody: body }),
      });
      if (res.status === 409) {
        setError("Someone else updated the file since you loaded it. Reload and re-apply your changes.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { pr: { htmlUrl: string } };
      onClose({ prUrl: data.pr.htmlUrl });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose({});
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header className="border-b border-line px-5 py-3">
          <h3 className="text-base font-semibold text-ink">Open a pull request</h3>
          <p className="text-xs text-subtle">Your change will be committed to a new branch and a PR will be opened against main.</p>
        </header>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">PR title</span>
            <TextInput value={title} onChange={setTitle} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Description (optional)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="What changed and why?"
            />
          </label>
          <div>
            <span className="mb-2 block text-sm font-medium text-ink">Diff preview</span>
            <DiffView before={before} after={after} />
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">
          <Button onClick={() => !submitting && onClose({})} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? "Opening PR…" : "Open PR"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
