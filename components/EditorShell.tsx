"use client";
import { useMemo, useState } from "react";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Button, Toggle } from "./ui";
import { RelativeDefaultsCard } from "./RelativeDefaultsCard";
import { FixedDefaultsCard } from "./FixedDefaultsCard";
import { RulesList } from "./RulesList";
import { RawJsonPanel } from "./RawJsonPanel";
import { SavePRDialog } from "./SavePRDialog";
import { PendingPRsBanner } from "./PendingPRsBanner";
import { hasBlockingErrors, validateConfig } from "@/lib/validate";

export function EditorShell({
  initialConfig,
  baseSha,
  configHtmlUrl,
  user,
}: {
  initialConfig: ServiceFeeConfig;
  baseSha: string;
  configHtmlUrl: string;
  user: { login: string; name: string | null; avatarUrl: string };
}) {
  const [config, setConfig] = useState<ServiceFeeConfig>(initialConfig);
  const [showDialog, setShowDialog] = useState(false);
  const [openedPr, setOpenedPr] = useState<string | null>(null);

  const issues = useMemo(() => validateConfig(config), [config]);
  const blocking = hasBlockingErrors(issues);
  const dirty = useMemo(
    () => JSON.stringify(initialConfig) !== JSON.stringify(config),
    [initialConfig, config]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-32">
      <header className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-ink">Service fees</h1>
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

      <div className="space-y-4">
        <PendingPRsBanner />

        {openedPr && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            PR opened —{" "}
            <a className="font-medium underline" href={openedPr} target="_blank" rel="noreferrer">
              view it on GitHub
            </a>
            .
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

        <RelativeDefaultsCard config={config} onChange={setConfig} />
        <FixedDefaultsCard config={config} onChange={setConfig} />
        <RulesList config={config} onChange={setConfig} />
        <RawJsonPanel config={config} />

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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 px-6 py-3">
          <span className="mr-auto text-xs text-subtle">
            {dirty ? "Unsaved changes" : "No changes"}
          </span>
          <Button onClick={() => setConfig(initialConfig)} disabled={!dirty}>
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
          before={initialConfig}
          after={config}
          baseSha={baseSha}
          onClose={(r) => {
            setShowDialog(false);
            if (r.prUrl) setOpenedPr(r.prUrl);
          }}
        />
      )}
    </div>
  );
}
