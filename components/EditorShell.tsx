"use client";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Button, Toggle } from "./ui";
import { RelativeDefaultsCard } from "./RelativeDefaultsCard";
import { FixedDefaultsCard } from "./FixedDefaultsCard";
import { RulesList } from "./RulesList";
import { RawJsonPanel } from "./RawJsonPanel";
import { SavePRDialog } from "./SavePRDialog";
import { PendingPRsBanner } from "./PendingPRsBanner";
import { HistoryPanel } from "./HistoryPanel";
import { DocsPanel } from "./DocsPanel";
import { CalculatorPanel } from "./CalculatorPanel";
import { TestCasesPanel } from "./TestCasesPanel";
import { BranchPicker } from "./BranchPicker";
import { hasBlockingErrors, validateConfig } from "@/lib/validate";

type Draft = { config: ServiceFeeConfig; baseSha: string; savedAt: number };

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function EditorShell({
  initialConfig,
  baseSha,
  configHtmlUrl,
  user,
  branches,
  activeBranch,
}: {
  initialConfig: ServiceFeeConfig;
  baseSha: string;
  configHtmlUrl: string;
  user: { login: string; name: string | null; avatarUrl: string };
  branches: string[];
  activeBranch: string;
}) {
  const [config, setConfig] = useState<ServiceFeeConfig>(initialConfig);
  // The last "saved" baseline. Starts as what was loaded from main; after a PR is opened
  // we set this to the user's submitted config so dirty resets to false and they can keep editing.
  const [savedConfig, setSavedConfig] = useState<ServiceFeeConfig>(initialConfig);
  const [showDialog, setShowDialog] = useState(false);
  const [openedPr, setOpenedPr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Defaults edits are gated — they affect every transaction, so we make the user
  // explicitly acknowledge that risk before the fields become editable. Re-engages
  // after a PR is opened so each editing session re-confirms.
  const [defaultsLocked, setDefaultsLocked] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Autosave key includes the active branch so drafts on `staging` don't bleed into `main`.
  const storageKey = `sf_draft:${user.login}:${activeBranch}`;

  const issues = useMemo(() => validateConfig(config), [config]);
  const blocking = hasBlockingErrors(issues);
  const dirty = useMemo(
    () => JSON.stringify(savedConfig) !== JSON.stringify(config),
    [savedConfig, config]
  );

  // On mount: look for an existing localStorage draft. Show the restore banner only if it
  // actually differs from main (no point offering to restore an identical state).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (
        !parsed?.config ||
        typeof parsed.baseSha !== "string" ||
        typeof parsed.savedAt !== "number"
      ) {
        localStorage.removeItem(storageKey);
        return;
      }
      if (JSON.stringify(parsed.config) === JSON.stringify(savedConfig)) {
        localStorage.removeItem(storageKey);
        return;
      }
      setDraft(parsed);
    } catch {
      localStorage.removeItem(storageKey);
    }
    // Run once on mount; savedConfig only changes after PR open and we want a fresh check then anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: debounce-write the in-memory config whenever it diverges from saved.
  // Clean state → remove the draft so the restore banner doesn't appear next time.
  useEffect(() => {
    if (!dirty) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ config, baseSha, savedAt: Date.now() } satisfies Draft)
        );
      } catch {
        // quota or privacy mode — silently ignore
      }
    }, 500);
    return () => clearTimeout(t);
  }, [config, dirty, baseSha, storageKey]);

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setDraft(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-32">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-ink">Service fees</h1>
        <BranchPicker branches={branches} active={activeBranch} />
        <a
          href={configHtmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-subtle underline-offset-2 hover:underline"
        >
          View on GitHub
        </a>
        <div className="ml-auto flex items-center gap-2 text-sm text-subtle">
          <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
          <span>{user.name || user.login}</span>
          <a className="text-xs underline-offset-2 hover:underline" href="/api/auth/logout">
            Sign out
          </a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
        <PendingPRsBanner />

        {draft && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <div>
              <strong>You have an unsaved draft</strong> from {ago(draft.savedAt)}
              {draft.baseSha !== baseSha && (
                <span className="ml-1 text-xs text-amber-700">
                  (based on an older version of main — review carefully before saving)
                </span>
              )}
              .
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setConfig(draft.config);
                  setDraft(null);
                }}
              >
                Restore
              </Button>
              <Button variant="ghost" onClick={clearDraft}>
                Discard draft
              </Button>
            </div>
          </div>
        )}

        {openedPr && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span>
              PR opened —{" "}
              <a className="font-medium underline" href={openedPr} target="_blank" rel="noreferrer">
                view it on GitHub
              </a>{" "}
              to merge. Once merged, reload to refresh the editor.
            </span>
            <Button onClick={() => window.location.reload()}>Reload now</Button>
          </div>
        )}

        <section className="rounded-lg border border-line bg-white p-5">
          <Toggle
            checked={config.serviceFee.enabled}
            onChange={(v) =>
              setConfig({ ...config, serviceFee: { ...config.serviceFee, enabled: v } })
            }
            label="Service fees enabled"
          />
        </section>

        <div className="space-y-3">
          <div
            className={clsx(
              "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-2 text-sm",
              defaultsLocked
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-amber-400 bg-amber-100 text-amber-900"
            )}
          >
            <div>
              {defaultsLocked ? (
                <>
                  🔒 <strong>Defaults are locked.</strong> They apply to every transaction —
                  changing them affects all customers.
                </>
              ) : (
                <>
                  ✏️ <strong>Editing defaults.</strong> Changes here apply to every transaction
                  without an override rule.
                </>
              )}
            </div>
            {defaultsLocked ? (
              <Button variant="primary" onClick={() => setShowUnlockModal(true)}>
                Enable editing
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setDefaultsLocked(true)}>
                Lock
              </Button>
            )}
          </div>
          <fieldset
            disabled={defaultsLocked}
            className={clsx(
              "m-0 min-w-0 space-y-4 border-0 p-0",
              defaultsLocked && "pointer-events-none opacity-60"
            )}
          >
            <RelativeDefaultsCard config={config} onChange={setConfig} />
            <FixedDefaultsCard config={config} onChange={setConfig} />
          </fieldset>
        </div>
        <RulesList config={config} onChange={setConfig} />
        <TestCasesPanel config={config} />
        <RawJsonPanel config={config} />
        <HistoryPanel configHtmlUrl={configHtmlUrl} />

        {issues.length > 0 && (
          <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <h4 className="mb-1 font-medium text-amber-900">
              {issues.filter((i) => i.level === "error").length} error
              {issues.filter((i) => i.level === "error").length === 1 ? "" : "s"},{" "}
              {issues.filter((i) => i.level === "warning").length} warning
              {issues.filter((i) => i.level === "warning").length === 1 ? "" : "s"}
            </h4>
            <ul className="list-disc pl-5 text-amber-800">
              {issues.slice(0, 8).map((iss, i) => (
                <li key={i}>
                  <span className={iss.level === "error" ? "text-red-700" : ""}>
                    [{iss.level}]
                  </span>{" "}
                  <span className="font-mono text-xs">{iss.path}</span> — {iss.message}
                </li>
              ))}
              {issues.length > 8 && <li>…and {issues.length - 8} more.</li>}
            </ul>
          </section>
        )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <CalculatorPanel config={config} />
          <DocsPanel />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-6 py-3">
          <span className="mr-auto text-xs text-subtle">
            {dirty ? "Unsaved changes — autosaved locally" : "No changes"}
          </span>
          <Button onClick={() => setConfig(savedConfig)} disabled={!dirty}>
            Discard
          </Button>
          <Button
            variant="primary"
            disabled={!dirty || blocking}
            onClick={() => setShowDialog(true)}
            title={blocking ? "Fix validation errors first" : ""}
          >
            Save as PR…
          </Button>
        </div>
      </div>

      {showDialog && (
        <SavePRDialog
          before={savedConfig}
          after={config}
          baseSha={baseSha}
          onClose={(r) => {
            setShowDialog(false);
            if (r.prUrl) {
              setOpenedPr(r.prUrl);
              // The submitted config IS the user's saved state now (it lives on a PR branch).
              // Updating savedConfig clears the "dirty" flag without reloading or hiding their edits.
              // baseSha is still valid until the PR is merged into main.
              setSavedConfig(config);
              // The work is now in a PR — drop the local draft.
              clearDraft();
              // Re-engage the defaults lock for the next editing session.
              setDefaultsLocked(true);
            }
          }}
        />
      )}

      {showUnlockModal && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUnlockModal(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <header className="border-b border-line px-5 py-3">
              <h3 className="text-base font-semibold text-ink">Editing defaults</h3>
            </header>
            <div className="space-y-3 px-5 py-4 text-sm text-ink">
              <p>
                <strong>Defaults apply to every transaction</strong> that no override rule
                matches. Changing them affects all customers — Pricing/Ops should know first.
              </p>
              <p className="text-subtle">
                If your change is meant for a specific country, category, segment, or app, add an{" "}
                <strong>override rule</strong> instead. Defaults should rarely change.
              </p>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">
              <Button onClick={() => setShowUnlockModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDefaultsLocked(false);
                  setShowUnlockModal(false);
                }}
              >
                I understand — enable editing
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
