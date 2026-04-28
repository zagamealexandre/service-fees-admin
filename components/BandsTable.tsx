"use client";
import type { Band } from "@/lib/schema";
import { Button, NumberInput } from "./ui";
import type { ValidationIssue } from "@/lib/validate";
import { validateBands } from "@/lib/validate";
import { useMemo } from "react";

export function BandsTable({
  bands,
  onChange,
  pathPrefix,
}: {
  bands: Band[];
  onChange: (next: Band[]) => void;
  pathPrefix: string;
}) {
  const issues = useMemo(() => validateBands(bands, pathPrefix), [bands, pathPrefix]);
  const issuesByPath = useMemo(() => {
    const m = new Map<string, ValidationIssue[]>();
    for (const i of issues) {
      const arr = m.get(i.path) || [];
      arr.push(i);
      m.set(i.path, arr);
    }
    return m;
  }, [issues]);

  function update(i: number, patch: Partial<Band>) {
    onChange(bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function remove(i: number) {
    onChange(bands.filter((_, idx) => idx !== i));
  }
  function addRow() {
    const last = bands[bands.length - 1];
    const newMin = last?.maxPriceExclusive ?? 0;
    onChange([...bands, { minPriceInclusive: newMin, maxPriceExclusive: null, feePercent: 0 }]);
  }

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-subtle">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Min price (incl)</th>
            <th className="px-3 py-2 text-left font-medium">Max price (excl, blank = ∞)</th>
            <th className="px-3 py-2 text-left font-medium">Fee %</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {bands.map((b, i) => {
            const rowIssues = issuesByPath.get(`${pathPrefix}[${i}]`) || [];
            const error = rowIssues.find((x) => x.level === "error");
            const warning = rowIssues.find((x) => x.level === "warning");
            return (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-2">
                  <NumberInput
                    value={b.minPriceInclusive}
                    onChange={(v) => update(i, { minPriceInclusive: v ?? 0 })}
                    min={0}
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={b.maxPriceExclusive}
                    onChange={(v) => update(i, { maxPriceExclusive: v })}
                    min={0}
                    placeholder="∞"
                  />
                </td>
                <td className="px-3 py-2">
                  <NumberInput
                    value={b.feePercent}
                    onChange={(v) => update(i, { feePercent: v ?? 0 })}
                    min={0}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" onClick={() => remove(i)} aria-label="Remove band">
                    ✕
                  </Button>
                </td>
                {(error || warning) && (
                  <td colSpan={4} className="-mt-2 px-3 pb-2 text-xs">
                    {error && <span className="text-red-600">{error.message}</span>}
                    {!error && warning && <span className="text-amber-600">{warning.message}</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-line bg-slate-50 px-3 py-2">
        <Button onClick={addRow}>+ Add band</Button>
      </div>
    </div>
  );
}
