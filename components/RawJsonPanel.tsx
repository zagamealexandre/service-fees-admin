"use client";
import { useState } from "react";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Button } from "./ui";

export function RawJsonPanel({ config }: { config: ServiceFeeConfig }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(config, null, 2);
  return (
    <details className="rounded-lg border border-line bg-white">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold text-ink">
        Raw JSON (read-only)
      </summary>
      <div className="border-t border-line">
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-xs text-subtle">{text.length.toLocaleString()} chars</span>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="max-h-[60vh] overflow-auto bg-slate-50 px-5 py-3 text-xs leading-5 text-ink">
          {text}
        </pre>
      </div>
    </details>
  );
}
