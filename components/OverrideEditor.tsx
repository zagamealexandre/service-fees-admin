"use client";
import { useState } from "react";
import type { Override } from "@/lib/schema";
import { Button, NumberInput, Toggle } from "./ui";
import { BandsTable } from "./BandsTable";
import { ProductFeeEditor } from "./ProductFeeEditor";
import clsx from "clsx";

export function OverrideEditor({
  override,
  onChange,
  pathPrefix,
}: {
  override: Override;
  onChange: (next: Override) => void;
  pathPrefix: string;
}) {
  const hasFixed =
    override.fixed && Object.keys(override.fixed.productFee || {}).length > 0;
  const [tab, setTab] = useState<"relative" | "fixed">(hasFixed && !override.relative ? "fixed" : "relative");

  return (
    <div>
      <div className="mb-3 inline-flex rounded-md border border-line bg-slate-50 p-0.5 text-sm">
        {(["relative", "fixed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "rounded px-3 py-1.5 capitalize transition-colors",
              tab === t ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "relative" ? (
        <RelativeOverride
          value={override.relative}
          onChange={(rel) => onChange({ ...override, relative: rel })}
          pathPrefix={`${pathPrefix}.relative`}
        />
      ) : (
        <FixedOverride
          value={override.fixed}
          onChange={(fix) => onChange({ ...override, fixed: fix })}
        />
      )}
    </div>
  );
}

function RelativeOverride({
  value,
  onChange,
  pathPrefix,
}: {
  value: Override["relative"];
  onChange: (v: Override["relative"]) => void;
  pathPrefix: string;
}) {
  const v = value ?? {};
  function patch(p: Partial<NonNullable<Override["relative"]>>) {
    const next = { ...v, ...p };
    // strip undefined keys
    for (const k of Object.keys(next) as (keyof typeof next)[]) {
      if (next[k] === undefined) delete next[k];
    }
    onChange(Object.keys(next).length === 0 ? undefined : next);
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldToggle
          enabled={v.minFee !== undefined}
          label="Override min fee"
          onEnable={() => patch({ minFee: 0 })}
          onDisable={() => patch({ minFee: undefined })}
        >
          <NumberInput value={v.minFee ?? 0} onChange={(n) => patch({ minFee: n ?? 0 })} min={0} />
        </FieldToggle>
        <FieldToggle
          enabled={v.newUserFeeEnabled !== undefined}
          label="Override new-user fee"
          onEnable={() => patch({ newUserFeeEnabled: true })}
          onDisable={() => patch({ newUserFeeEnabled: undefined })}
        >
          <Toggle
            checked={!!v.newUserFeeEnabled}
            onChange={(c) => patch({ newUserFeeEnabled: c })}
            label={v.newUserFeeEnabled ? "enabled" : "disabled"}
          />
        </FieldToggle>
      </div>
      <FieldToggle
        enabled={v.bands !== undefined}
        label="Override bands"
        onEnable={() => patch({ bands: [{ minPriceInclusive: 0, maxPriceExclusive: null, feePercent: 0 }] })}
        onDisable={() => patch({ bands: undefined })}
      >
        <BandsTable
          bands={v.bands ?? []}
          onChange={(bands) => patch({ bands })}
          pathPrefix={`${pathPrefix}.bands`}
        />
      </FieldToggle>
    </div>
  );
}

function FixedOverride({
  value,
  onChange,
}: {
  value: Override["fixed"];
  onChange: (v: Override["fixed"]) => void;
}) {
  const productFee = value?.productFee ?? {};
  return (
    <ProductFeeEditor
      value={productFee}
      onChange={(pf) => {
        const empty = Object.keys(pf).length === 0;
        onChange(empty ? undefined : { productFee: pf });
      }}
    />
  );
}

function FieldToggle(props: {
  enabled: boolean;
  label: string;
  children: React.ReactNode;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{props.label}</span>
        {props.enabled ? (
          <Button variant="ghost" onClick={props.onDisable}>
            Remove
          </Button>
        ) : (
          <Button onClick={props.onEnable}>+ Add</Button>
        )}
      </div>
      {props.enabled && props.children}
    </div>
  );
}
