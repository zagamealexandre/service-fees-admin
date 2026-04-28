"use client";

type DiffLine = { kind: "ctx" | "add" | "del"; text: string };

function diffLines(a: string, b: string): DiffLine[] {
  // Tiny LCS-based line diff. Good enough for small JSON files.
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const m = aLines.length;
  const n = bLines.length;
  // dp table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      out.push({ kind: "ctx", text: aLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: aLines[i] });
      i++;
    } else {
      out.push({ kind: "add", text: bLines[j] });
      j++;
    }
  }
  while (i < m) out.push({ kind: "del", text: aLines[i++] });
  while (j < n) out.push({ kind: "add", text: bLines[j++] });
  return out;
}

export function DiffView({ before, after }: { before: unknown; after: unknown }) {
  const a = JSON.stringify(before, null, 2);
  const b = JSON.stringify(after, null, 2);
  const lines = diffLines(a, b);
  const adds = lines.filter((l) => l.kind === "add").length;
  const dels = lines.filter((l) => l.kind === "del").length;
  if (adds === 0 && dels === 0) {
    return <p className="text-sm text-subtle">No changes.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line bg-slate-50 px-3 py-1.5 text-xs text-subtle">
        <span className="text-emerald-700">+{adds}</span> <span className="text-red-700">-{dels}</span>
      </div>
      <pre className="max-h-[40vh] overflow-auto bg-white text-xs leading-5">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === "add"
                ? "bg-emerald-50 px-3 text-emerald-800"
                : l.kind === "del"
                ? "bg-red-50 px-3 text-red-800"
                : "px-3 text-slate-600"
            }
          >
            <span className="select-none pr-2">{l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}</span>
            {l.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
