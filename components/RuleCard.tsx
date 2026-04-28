"use client";
import { useState } from "react";
import type { Rule } from "@/lib/schema";
import { Button } from "./ui";
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
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="font-mono text-xs text-subtle">#{index + 1}</span>
        <div className="min-w-0 flex-1">
          <ScopeChips scope={rule.scope} />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            ↑
          </Button>
          <Button variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">
            ↓
          </Button>
          <Button variant="ghost" onClick={() => setOpen((s) => !s)}>
            {open ? "Collapse" : "Edit"}
          </Button>
          <Button variant="danger" onClick={onRemove}>
            Delete
          </Button>
        </div>
      </div>
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
        </div>
      )}
    </div>
  );
}
