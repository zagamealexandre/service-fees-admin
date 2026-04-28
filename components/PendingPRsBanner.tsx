"use client";
import { useEffect, useState } from "react";

type PR = { number: number; title: string; htmlUrl: string; user: string };

export function PendingPRsBanner() {
  const [pulls, setPulls] = useState<PR[] | null>(null);
  useEffect(() => {
    let abort = false;
    fetch("/api/config/pulls")
      .then((r) => (r.ok ? r.json() : { pulls: [] }))
      .then((d) => {
        if (!abort) setPulls(d.pulls ?? []);
      })
      .catch(() => !abort && setPulls([]));
    return () => {
      abort = true;
    };
  }, []);
  if (!pulls || pulls.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>{pulls.length} pending change{pulls.length === 1 ? "" : "s"}</strong>{" "}
      awaiting review:
      <ul className="mt-1 list-disc pl-5">
        {pulls.map((p) => (
          <li key={p.number}>
            <a className="underline" href={p.htmlUrl} target="_blank" rel="noreferrer">
              #{p.number} — {p.title}
            </a>{" "}
            <span className="text-xs text-amber-700">by {p.user}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
