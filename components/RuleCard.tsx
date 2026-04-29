"use client";
import clsx from "clsx";
import { useState } from "react";
import type { Rule } from "@/lib/schema";
import { Button, Toggle } from "./ui";
import { ScopeChips, ScopeEditor } from "./ScopeEditor";
import { OverrideEditor } from "./OverrideEditor";

export function RuleCard({
  rule,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  defaultOpen = false,
}: {
  rule: Rule;
  index: number;
  total: number;
  onChange: (next: Rule) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showViewer, setShowViewer] = useState(false);
  const enabled = rule.enabled !== false;

  return (
    <div
      className={clsx(
        "rounded-md border bg-white",
        enabled ? "border-line" : "border-dashed border-slate-300 bg-slate-50/60"
      )}
    >
      <div className={clsx("flex flex-wrap items-center gap-3 px-4 py-3", !enabled && "opacity-70")}>
        <span className="font-mono text-xs text-subtle">#{index + 1}</span>
        <div className={clsx("min-w-0 flex-1", !enabled && "line-through decoration-slate-400")}>
          <ScopeChips scope={rule.scope} />
        </div>
        <Toggle
          checked={enabled}
          onChange={(v) => onChange({ ...rule, enabled: v ? undefined : false })}
          label={enabled ? "On" : "Off"}
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            ↑
          </Button>
          <Button variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">
            ↓
          </Button>
          <Button variant="ghost" onClick={() => setShowViewer(true)}>
            View
          </Button>
          <Button variant="ghost" onClick={() => setOpen((s) => !s)}>
            {open ? "Collapse" : "Edit"}
          </Button>
          <Button variant="danger" onClick={onRemove}>
            Delete
          </Button>
        </div>
      </div>
      {rule.note && !open && (
        <p className="border-t border-line bg-slate-50/60 px-4 py-1.5 text-xs italic text-subtle">
          {rule.note}
        </p>
      )}
      {open && (
        <div className="space-y-4 border-t border-line bg-slate-50/60 px-4 py-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Scope</h4>
            <ScopeEditor scope={rule.scope} onChange={(scope) => onChange({ ...rule, scope })} />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Override</h4>
            <OverrideEditor
              override={rule.override}
              onChange={(override) => onChange({ ...rule, override })}
              pathPrefix={`serviceFee.rules[${index}].override`}
            />
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
              Note (optional)
            </h4>
            <textarea
              value={rule.note ?? ""}
              onChange={(e) => onChange({ ...rule, note: e.target.value || undefined })}
              rows={2}
              placeholder="Why does this rule exist? E.g. 'Approved by Legal 2026-Q2 to comply with X'."
              className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-subtle">
              Stored in the file alongside the rule; ignored by the backend. Useful context for the
              next person editing this.
            </p>
          </div>
        </div>
      )}

      {showViewer && (
        <RuleViewerModal rule={rule} index={index} onClose={() => setShowViewer(false)} />
      )}
    </div>
  );
}

function RuleViewerModal({
  rule,
  index,
  onClose,
}: {
  rule: Rule;
  index: number;
  onClose: () => void;
}) {
  const json = JSON.stringify(rule, null, 2);
  const [copied, setCopied] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-ink">Rule #{index + 1}</h3>
            <p className="mt-0.5 text-xs text-subtle">
              Read-only. Close this dialog and click <strong>Edit</strong> to modify.
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </header>
        <pre className="flex-1 overflow-auto bg-slate-50 px-5 py-4 text-xs leading-5 text-ink">
          {json}
        </pre>
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
}
