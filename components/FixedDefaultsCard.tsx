"use client";
import type { ServiceFeeConfig } from "@/lib/schema";
import { Card } from "./ui";
import { ProductFeeEditor } from "./ProductFeeEditor";

export function FixedDefaultsCard({
  config,
  onChange,
}: {
  config: ServiceFeeConfig;
  onChange: (next: ServiceFeeConfig) => void;
}) {
  const productFee = config.serviceFee.fixed.defaults.productFee;
  return (
    <Card
      title="Fixed fees — defaults"
      description="Flat amounts per product/country/segment. Override per scope below."
    >
      <ProductFeeEditor
        value={productFee}
        onChange={(productFee) =>
          onChange({
            ...config,
            serviceFee: {
              ...config.serviceFee,
              fixed: { defaults: { productFee } },
            },
          })
        }
      />
    </Card>
  );
}
