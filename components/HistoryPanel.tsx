"use client";
import { useEffect, useState } from "react";

type HistoryEntry = {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  date: string;
  htmlUrl: string;
};

function ago(iso: string): string {
  const ts = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function HistoryPanel({ configHtmlUrl }: { configHtmlUrl: string }) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!opened || history !== null) return;
    let abort = false;
    fetch("/api/config/history?limit=30")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { history: HistoryEntry[] }) => {
        if (!abort) setHistory(d.history);
      })
      .catch((e) => !abort && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      abort = true;
    };
  }, [opened, history]);

  // Derive the "commits on file" link from the configHtmlUrl. configHtmlUrl looks like
  // https://github.com/<owner>/<repo>/blob/<branch>/config/service-fees.json
  // → https://github.com/<owner>/<repo>/commits/<branch>/config/service-fees.json
  const commitsUrl = configHtmlUrl.replace("/blob/", "/commits/");

  return (
    <details
      className="rounded-lg border border-line bg-white"
      onToggle={(e) => setOpened((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold text-ink">
        Change history
      </summary>
      <div className="border-t border-line px-5 py-3">
        {error && <p className="text-sm text-red-700">Couldn&apos;t load history: {error}</p>}
        {!error && history === null && <p className="text-sm text-subtle">Loading…</p>}
        {!error && history?.length === 0 && (
          <p className="text-sm text-subtle">No history yet.</p>
        )}
        {history && history.length > 0 && (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.sha} className="flex items-start gap-3 py-2.5">
                {h.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.authorAvatarUrl} alt="" className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full" />
                ) : (
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs text-subtle">
                    {h.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink" title={h.message}>
                    {h.message}
                  </p>
                  <p className="text-xs text-subtle">
                    {h.authorLogin ? (
                      <a
                        href={`https://github.com/${h.authorLogin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {h.authorName}
                      </a>
                    ) : (
                      h.authorName
                    )}{" "}
                    · {ago(h.date)} ·{" "}
                    <a href={h.htmlUrl} target="_blank" rel="noreferrer" className="font-mono hover:underline">
                      {h.sha.slice(0, 7)}
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-line pt-2 text-right">
          <a
            href={commitsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-subtle underline-offset-2 hover:text-ink hover:underline"
          >
            View full history on GitHub →
          </a>
        </div>
      </div>
    </details>
  );
}
