"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { ServiceFeeConfig } from "@/lib/schema";
import { TestFileSchema, runCases, type TestFile } from "@/lib/test-runner";

export function TestCasesPanel({ config }: { config: ServiceFeeConfig }) {
  const [file, setFile] = useState<TestFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!opened || loaded) return;
    let abort = false;
    fetch("/api/config/tests")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { tests: unknown }) => {
        if (abort) return;
        if (d.tests === null) {
          setFile(null);
          setLoaded(true);
          return;
        }
        const parsed = TestFileSchema.safeParse(d.tests);
        if (!parsed.success) {
          setError("Test file shape is invalid: " + parsed.error.issues[0]?.message);
        } else {
          setFile(parsed.data);
        }
        setLoaded(true);
      })
      .catch((e) => {
        if (!abort) {
          setError(e instanceof Error ? e.message : "Failed to load tests");
          setLoaded(true);
        }
      });
    return () => {
      abort = true;
    };
  }, [opened, loaded]);

  const results = useMemo(() => (file ? runCases(config, file) : []), [config, file]);
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPass = total > 0 && passed === total;

  return (
    <details
      className="rounded-lg border border-line bg-white"
      onToggle={(e) => setOpened((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-3 text-sm font-semibold text-ink">
        <span>Golden tests</span>
        {loaded && total > 0 && (
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              allPass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}
          >
            {passed} / {total} passing
          </span>
        )}
      </summary>
      <div className="border-t border-line px-5 py-3">
        {!loaded && <p className="text-sm text-subtle">Loading…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {loaded && !error && file === null && (
          <p className="text-sm text-subtle">
            No <code>config/service-fees.test.json</code> on the base branch yet. Add one to track
            expected fees per scenario — this panel and CI will pick it up automatically.
          </p>
        )}
        {loaded && file && results.length === 0 && (
          <p className="text-sm text-subtle">Test file is empty.</p>
        )}
        {results.length > 0 && (
          <ul className="divide-y divide-line">
            {results.map((r, i) => (
              <li key={i} className="flex items-start gap-3 py-2">
                <span
                  className={clsx(
                    "mt-0.5 inline-flex h-5 w-12 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium uppercase",
                    r.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}
                >
                  {r.passed ? "PASS" : "FAIL"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{r.name}</p>
                  {!r.passed && (
                    <p className="text-xs text-subtle">
                      expected{" "}
                      <span className="font-mono text-emerald-700">{r.expected.toFixed(2)}</span>,
                      got <span className="font-mono text-red-700">{r.actual.toFixed(2)}</span>{" "}
                      <span className="text-[11px]">({r.source})</span> — {r.explanation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-subtle">
          Tests are evaluated against your <em>in-memory</em> edits, not just main. Failing tests
          here will fail CI on the PR you open.
        </p>
      </div>
    </details>
  );
}
