"use client";
import type { Scope } from "@/lib/schema";
import { TextInput, Toggle } from "./ui";

const APPS: ("web" | "android" | "ios")[] = ["web", "android", "ios"];

export function ScopeEditor({ scope, onChange }: { scope: Scope; onChange: (next: Scope) => void }) {
  function set<K extends keyof Scope>(k: K, v: Scope[K] | undefined) {
    const next: Scope = { ...scope };
    if (v === undefined || v === "") delete next[k];
    else next[k] = v;
    onChange(next);
  }
  const apps = (scope.app || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  function toggleApp(name: string, on: boolean) {
    const set = new Set(apps);
    if (on) set.add(name);
    else set.delete(name);
    const list = APPS.filter((a) => set.has(a));
    onChange({ ...scope, app: list.length ? list.join(",") : undefined });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">Country (ISO2)</span>
        <TextInput
          value={scope.country ?? ""}
          onChange={(v) => set("country", v.toUpperCase().slice(0, 2) || undefined)}
          placeholder="e.g. IN"
          className="mt-1 !w-28"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">Category</span>
        <TextInput
          value={scope.category ?? ""}
          onChange={(v) => set("category", v || undefined)}
          placeholder="e.g. Credit"
          className="mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">Segment</span>
        <TextInput
          value={scope.segment ?? ""}
          onChange={(v) => set("segment", v || undefined)}
          placeholder="e.g. new_user"
          className="mt-1"
        />
      </label>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-subtle">Apps</span>
        <div className="mt-2 flex gap-3">
          {APPS.map((a) => (
            <Toggle key={a} checked={apps.includes(a)} onChange={(on) => toggleApp(a, on)} label={a} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScopeChips({ scope }: { scope: Scope }) {
  const entries = (Object.entries(scope) as [keyof Scope, string | undefined][]).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  if (entries.length === 0) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
        title="No scope — this rule applies to everything"
      >
        Fallback (no scope)
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
        >
          {k}: {v}
        </span>
      ))}
    </div>
  );
}
