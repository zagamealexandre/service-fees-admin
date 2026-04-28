"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ServiceFeeConfig } from "@/lib/schema";
import { ServiceFeeConfigSchema } from "@/lib/schema";
import { hasBlockingErrors, validateConfig } from "@/lib/validate";
import { Button, TextInput } from "./ui";
import { DiffView } from "./DiffView";

type PreviewView = "diff" | "json";

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
  const [conflict, setConflict] = useState(false);
  const [view, setView] = useState<PreviewView>("diff");

  // Schema check (zod) + semantic checks (band overlap, country format, etc.)
  const schemaResult = useMemo(() => ServiceFeeConfigSchema.safeParse(after), [after]);
  const issues = useMemo(() => validateConfig(after), [after]);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const blocked = !schemaResult.success || hasBlockingErrors(issues);

  const beforeJson = useMemo(() => JSON.stringify(before, null, 2), [before]);
  const afterJson = useMemo(() => JSON.stringify(after, null, 2), [after]);
  const noChanges = beforeJson === afterJson;

  async function submit() {
    setSubmitting(true);
    setError(null);
    setConflict(false);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: after, baseSha, prTitle: title, prBody: body }),
      });
      if (res.status === 409) {
        setConflict(true);
        setError(
          "Main has changed since you loaded the editor (likely a merged PR). Reload to pick up the latest, then re-apply your edits."
        );
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
          <p className="text-xs text-subtle">
            Your change will be committed to a new branch and a PR will be opened against main.
          </p>
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

          {/* Validation */}
          <div>
            <span className="mb-2 block text-sm font-medium text-ink">Validation</span>
            {blocked ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <p className="font-medium">
                  Cannot open PR — {errors.length} error{errors.length === 1 ? "" : "s"}
                  {!schemaResult.success && ` (+ schema invalid)`}
                </p>
                {!schemaResult.success && (
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {schemaResult.error.issues.slice(0, 5).map((iss, i) => (
                      <li key={i}>
                        <span className="font-mono">{iss.path.join(".") || "(root)"}</span> —{" "}
                        {iss.message}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {errors.slice(0, 5).map((iss, i) => (
                      <li key={i}>
                        <span className="font-mono">{iss.path}</span> — {iss.message}
                      </li>
                    ))}
                    {errors.length > 5 && <li>…and {errors.length - 5} more.</li>}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <p>
                  ✓ Schema valid · {warnings.length === 0 ? "no warnings" : `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`}
                </p>
                {warnings.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-amber-700">
                    {warnings.slice(0, 5).map((iss, i) => (
                      <li key={i}>
                        <span className="font-mono">{iss.path}</span> — {iss.message}
                      </li>
                    ))}
                    {warnings.length > 5 && <li>…and {warnings.length - 5} more.</li>}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Preview (diff / full JSON) */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">Preview</span>
              <div className="inline-flex rounded-md border border-line bg-slate-50 p-0.5 text-xs">
                {(["diff", "json"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setView(t)}
                    className={clsx(
                      "rounded px-2 py-1 capitalize transition-colors",
                      view === t ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink"
                    )}
                  >
                    {t === "json" ? "Full JSON" : "Diff"}
                  </button>
                ))}
              </div>
            </div>
            {noChanges ? (
              <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm text-subtle">
                No changes to commit.
              </p>
            ) : view === "diff" ? (
              <DiffView before={before} after={after} />
            ) : (
              <pre className="max-h-[40vh] overflow-auto rounded-md border border-line bg-slate-50 px-3 py-2 text-xs leading-5 text-ink">
                {afterJson}
              </pre>
            )}
          </div>

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>{error}</span>
              {conflict && (
                <Button onClick={() => window.location.reload()} variant="danger">
                  Reload editor
                </Button>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">
          <Button onClick={() => !submitting && onClose({})} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={submitting || !title.trim() || conflict || blocked || noChanges}
            title={blocked ? "Fix the validation errors above first" : noChanges ? "Nothing to commit" : ""}
          >
            {submitting ? "Opening PR…" : "Open PR"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
