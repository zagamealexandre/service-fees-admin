"use client";
import type { Band, Rule, ServiceFeeConfig } from "@/lib/schema";

type Change = { kind: "added" | "removed" | "changed"; path: string; before?: unknown; after?: unknown };

function fmt(v: unknown): string {
  if (v === null) return "∞";
  if (v === undefined) return "(unset)";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function bandLabel(b: Band): string {
  const max = b.maxPriceExclusive === null ? "∞" : `$${b.maxPriceExclusive}`;
  return `[$${b.minPriceInclusive}, ${max})`;
}

function diffBands(prefix: string, before: Band[], after: Band[]): Change[] {
  const out: Change[] = [];
  const len = Math.max(before.length, after.length);
  for (let i = 0; i < len; i++) {
    const b = before[i];
    const a = after[i];
    const path = `${prefix}[${i}]`;
    if (!b && a) {
      out.push({ kind: "added", path, after: `${bandLabel(a)} ${a.feePercent}%` });
    } else if (b && !a) {
      out.push({ kind: "removed", path, before: `${bandLabel(b)} ${b.feePercent}%` });
    } else if (b && a) {
      if (b.minPriceInclusive !== a.minPriceInclusive || b.maxPriceExclusive !== a.maxPriceExclusive) {
        out.push({
          kind: "changed",
          path: `${path} range`,
          before: bandLabel(b),
          after: bandLabel(a),
        });
      }
      if (b.feePercent !== a.feePercent) {
        out.push({
          kind: "changed",
          path: `${path} feePercent`,
          before: `${b.feePercent}%`,
          after: `${a.feePercent}%`,
        });
      }
    }
  }
  return out;
}

function diffRule(prefix: string, before: Rule | undefined, after: Rule | undefined): Change[] {
  const out: Change[] = [];
  if (!before && after) {
    out.push({ kind: "added", path: prefix, after: scopeSummary(after) });
    return out;
  }
  if (before && !after) {
    out.push({ kind: "removed", path: prefix, before: scopeSummary(before) });
    return out;
  }
  if (!before || !after) return out;

  // Scope dimensions
  for (const k of ["country", "category", "segment", "app"] as const) {
    if (before.scope[k] !== after.scope[k]) {
      out.push({
        kind: "changed",
        path: `${prefix}.scope.${k}`,
        before: fmt(before.scope[k]),
        after: fmt(after.scope[k]),
      });
    }
  }
  if ((before.enabled === false) !== (after.enabled === false)) {
    out.push({
      kind: "changed",
      path: `${prefix}.enabled`,
      before: before.enabled === false ? "off" : "on",
      after: after.enabled === false ? "off" : "on",
    });
  }
  if ((before.note ?? "") !== (after.note ?? "")) {
    out.push({
      kind: "changed",
      path: `${prefix}.note`,
      before: fmt(before.note ?? ""),
      after: fmt(after.note ?? ""),
    });
  }

  // Override.relative
  const br = before.override.relative;
  const ar = after.override.relative;
  for (const k of ["minFee", "newUserFeeEnabled"] as const) {
    if ((br?.[k] ?? null) !== (ar?.[k] ?? null)) {
      out.push({
        kind: "changed",
        path: `${prefix}.override.relative.${k}`,
        before: fmt(br?.[k]),
        after: fmt(ar?.[k]),
      });
    }
  }
  if ((br?.bands?.length ?? 0) !== (ar?.bands?.length ?? 0) || JSON.stringify(br?.bands) !== JSON.stringify(ar?.bands)) {
    out.push(...diffBands(`${prefix}.override.relative.bands`, br?.bands ?? [], ar?.bands ?? []));
  }

  // Override.fixed
  const bf = JSON.stringify(before.override.fixed ?? {});
  const af = JSON.stringify(after.override.fixed ?? {});
  if (bf !== af) {
    out.push({ kind: "changed", path: `${prefix}.override.fixed`, before: "(changed)", after: "(see Full JSON)" });
  }

  return out;
}

function scopeSummary(r: Rule): string {
  const parts: string[] = [];
  for (const k of ["country", "category", "segment", "app"] as const) {
    const v = r.scope[k];
    if (v) parts.push(`${k}: ${v}`);
  }
  return parts.length ? parts.join(", ") : "fallback (no scope)";
}

export function diffConfig(before: ServiceFeeConfig, after: ServiceFeeConfig): Change[] {
  const out: Change[] = [];
  const bsf = before.serviceFee;
  const asf = after.serviceFee;

  if (bsf.enabled !== asf.enabled) {
    out.push({
      kind: "changed",
      path: "serviceFee.enabled",
      before: bsf.enabled ? "on" : "off",
      after: asf.enabled ? "on" : "off",
    });
  }
  if (bsf.relative.defaults.minFee !== asf.relative.defaults.minFee) {
    out.push({
      kind: "changed",
      path: "defaults.minFee",
      before: bsf.relative.defaults.minFee,
      after: asf.relative.defaults.minFee,
    });
  }
  if (bsf.relative.defaults.newUserFeeEnabled !== asf.relative.defaults.newUserFeeEnabled) {
    out.push({
      kind: "changed",
      path: "defaults.newUserFeeEnabled",
      before: bsf.relative.defaults.newUserFeeEnabled,
      after: asf.relative.defaults.newUserFeeEnabled,
    });
  }
  out.push(
    ...diffBands(
      "defaults.bands",
      bsf.relative.defaults.bands,
      asf.relative.defaults.bands
    )
  );

  if (
    JSON.stringify(bsf.fixed.defaults.productFee) !==
    JSON.stringify(asf.fixed.defaults.productFee)
  ) {
    out.push({
      kind: "changed",
      path: "defaults.productFee",
      before: "(changed)",
      after: "(see Full JSON)",
    });
  }

  const len = Math.max(bsf.rules.length, asf.rules.length);
  for (let i = 0; i < len; i++) {
    out.push(...diffRule(`rule[${i + 1}]`, bsf.rules[i], asf.rules[i]));
  }

  return out;
}

export function SemanticDiff({ before, after }: { before: ServiceFeeConfig; after: ServiceFeeConfig }) {
  const changes = diffConfig(before, after);
  if (changes.length === 0) {
    return <p className="text-sm text-subtle">No semantic changes.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <ul className="max-h-[40vh] overflow-y-auto divide-y divide-line text-sm">
        {changes.map((c, i) => (
          <li key={i} className="flex items-start gap-2 px-3 py-1.5">
            <span
              className={
                c.kind === "added"
                  ? "mt-0.5 inline-flex h-4 w-12 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-medium uppercase text-emerald-700"
                  : c.kind === "removed"
                  ? "mt-0.5 inline-flex h-4 w-12 items-center justify-center rounded-full bg-red-100 text-[10px] font-medium uppercase text-red-700"
                  : "mt-0.5 inline-flex h-4 w-12 items-center justify-center rounded-full bg-amber-100 text-[10px] font-medium uppercase text-amber-700"
              }
            >
              {c.kind}
            </span>
            <span className="font-mono text-xs text-subtle">{c.path}</span>
            <span className="ml-auto text-right">
              {c.kind === "changed" && (
                <>
                  <span className="text-red-700">{fmt(c.before)}</span>
                  <span className="px-1 text-subtle">→</span>
                  <span className="text-emerald-700">{fmt(c.after)}</span>
                </>
              )}
              {c.kind === "added" && <span className="text-emerald-700">{fmt(c.after)}</span>}
              {c.kind === "removed" && <span className="text-red-700">{fmt(c.before)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
