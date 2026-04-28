"use client";

export function BranchPicker({
  branches,
  active,
}: {
  branches: string[];
  active: string;
}) {
  if (branches.length <= 1) {
    // Single env — show plain text instead of a useless dropdown.
    return (
      <span className="rounded-md border border-line bg-white px-2 py-1 font-mono text-xs text-subtle">
        {active}
      </span>
    );
  }
  async function pick(branch: string) {
    if (branch === active) return;
    const res = await fetch("/api/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch }),
    });
    if (res.ok) window.location.reload();
  }
  return (
    <select
      value={active}
      onChange={(e) => pick(e.target.value)}
      className="rounded-md border border-line bg-white px-2 py-1 font-mono text-xs text-ink focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      title="Switch base branch"
    >
      {branches.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
    </select>
  );
}
