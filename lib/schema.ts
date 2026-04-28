import { z } from "zod";

export const BandSchema = z.object({
  minPriceInclusive: z.number().min(0),
  maxPriceExclusive: z.number().min(0).nullable(),
  feePercent: z.number().min(0).max(100),
});

export const RelativeBlockSchema = z.object({
  minFee: z.number().min(0).optional(),
  newUserFeeEnabled: z.boolean().optional(),
  bands: z.array(BandSchema).optional(),
});

export const ProductFeeAmountSchema = z.object({
  Amount: z.number(),
  Currency: z.string().min(1),
});

// productFee shape: { [productKey]: { [country]: { [segment]: { Amount, Currency } } } }
export const ProductFeeSchema = z.record(
  z.record(z.record(ProductFeeAmountSchema))
);

export const FixedBlockSchema = z.object({
  productFee: ProductFeeSchema.optional(),
});

export const ScopeSchema = z.object({
  country: z.string().optional(),
  category: z.string().optional(),
  segment: z.string().optional(),
  app: z.string().optional(),
});

export const OverrideSchema = z.object({
  relative: RelativeBlockSchema.optional(),
  fixed: FixedBlockSchema.optional(),
});

export const RuleSchema = z.object({
  scope: ScopeSchema,
  override: OverrideSchema,
  /** When false, the rule is ignored by the engine. Default: enabled (true). */
  enabled: z.boolean().optional(),
  /** Free-form rationale shown in the editor; ignored by the engine. */
  note: z.string().optional(),
});

export const ServiceFeeConfigSchema = z.object({
  serviceFee: z.object({
    enabled: z.boolean(),
    relative: z.object({
      defaults: z.object({
        minFee: z.number().min(0),
        newUserFeeEnabled: z.boolean(),
        bands: z.array(BandSchema),
      }),
    }),
    fixed: z.object({
      defaults: z.object({
        productFee: ProductFeeSchema,
      }),
    }),
    rules: z.array(RuleSchema),
  }),
});

export type Band = z.infer<typeof BandSchema>;
export type RelativeBlock = z.infer<typeof RelativeBlockSchema>;
export type FixedBlock = z.infer<typeof FixedBlockSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type Override = z.infer<typeof OverrideSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type ServiceFeeConfig = z.infer<typeof ServiceFeeConfigSchema>;
export type ProductFee = z.infer<typeof ProductFeeSchema>;
