"use client";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Card, NumberInput, Toggle } from "./ui";
import { BandsTable } from "./BandsTable";

export function RelativeDefaultsCard({
  config,
  onChange,
}: {
  config: ServiceFeeConfig;
  onChange: (next: ServiceFeeConfig) => void;
}) {
  const d = config.serviceFee.relative.defaults;
  function patch(p: Partial<typeof d>) {
    onChange({
      ...config,
      serviceFee: {
        ...config.serviceFee,
        relative: { defaults: { ...d, ...p } },
      },
    });
  }
  return (
    <Card
      tone="info"
      title="Relative fees — defaults"
      description="Percentage of price, by price band. Used when no rule matches."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Min fee (USD)</span>
          <div className="mt-1">
            <NumberInput
              value={d.minFee}
              onChange={(v) => patch({ minFee: v ?? 0 })}
              min={0}
            />
          </div>
        </label>
        <div className="flex items-end">
          <Toggle
            checked={d.newUserFeeEnabled}
            onChange={(v) => patch({ newUserFeeEnabled: v })}
            label="Charge new users a service fee"
          />
        </div>
      </div>
      <div className="mt-4">
        <span className="mb-2 block text-sm font-medium text-ink">Bands</span>
        <BandsTable
          bands={d.bands}
          onChange={(bands) => patch({ bands })}
          pathPrefix="serviceFee.relative.defaults.bands"
        />
      </div>
    </Card>
  );
}
