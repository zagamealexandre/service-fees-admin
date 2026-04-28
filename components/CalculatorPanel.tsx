"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ServiceFeeConfig } from "@/lib/schema";
import { resolveFee, type Transaction } from "@/lib/rules";
import { NumberInput, TextInput, Toggle } from "./ui";

const APPS = ["", "web", "android", "ios"] as const;

export function CalculatorPanel({ config }: { config: ServiceFeeConfig }) {
  const [t, setT] = useState<Transaction>({ price: 4, country: "IN", category: "", segment: "", app: "" });
  const result = useMemo(() => resolveFee(config, t), [config, t]);
  const sourceColor = {
    band: "text-emerald-700",
    "min-floor": "text-amber-700",
    fixed: "text-sky-700",
    disabled: "text-slate-500",
    "new-user-waived": "text-amber-700",
    "no-band": "text-red-700",
  }[result.source];

  function patch(p: Partial<Transaction>) {
    setT((prev) => ({ ...prev, ...p }));
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Fee calculator</h3>
        <span className="text-[10px] uppercase tracking-wide text-subtle">live preview</span>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Price (USD)</span>
          <NumberInput
            value={t.price}
            onChange={(v) => patch({ price: v ?? 0 })}
            min={0}
            className="mt-0.5"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Country</span>
          <TextInput
            value={t.country ?? ""}
            onChange={(v) => patch({ country: v.toUpperCase().slice(0, 2) || undefined })}
            placeholder="IN"
            className="mt-0.5"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Category</span>
          <TextInput
            value={t.category ?? ""}
            onChange={(v) => patch({ category: v || undefined })}
            placeholder="Credit"
            className="mt-0.5"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Segment</span>
          <TextInput
            value={t.segment ?? ""}
            onChange={(v) => patch({ segment: v || undefined })}
            placeholder="new_user"
            className="mt-0.5"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">App</span>
          <select
            value={t.app ?? ""}
            onChange={(e) => patch({ app: e.target.value || undefined })}
            className="mt-0.5 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {APPS.map((a) => (
              <option key={a} value={a}>
                {a || "(any)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-subtle">Product key</span>
          <TextInput
            value={t.productKey ?? ""}
            onChange={(v) => patch({ productKey: v || undefined })}
            placeholder="2|4|8"
            className="mt-0.5"
          />
        </label>
      </div>

      <div className="mt-2">
        <Toggle
          checked={!!t.isNewUser}
          onChange={(v) => patch({ isNewUser: v })}
          label="New user"
        />
      </div>

      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-ink">
            {result.fee.toFixed(2)}
          </span>
          <span className="text-xs text-subtle">{result.currency}</span>
          <span className={clsx("ml-auto text-[10px] uppercase tracking-wide", sourceColor)}>
            {result.source}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-subtle">{result.explanation}</p>
        {result.matchedRules.length > 0 && (
          <p className="mt-1 text-[11px] text-subtle">
            Matched rules: {result.matchedRules.map((i) => `#${i + 1}`).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
