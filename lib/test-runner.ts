import { z } from "zod";
import type { ServiceFeeConfig } from "./schema";
import { resolveFee, type Transaction } from "./rules";

export const TestCaseSchema = z.object({
  name: z.string().min(1),
  transaction: z.object({
    price: z.number(),
    country: z.string().optional(),
    category: z.string().optional(),
    segment: z.string().optional(),
    app: z.string().optional(),
    productKey: z.string().optional(),
    isNewUser: z.boolean().optional(),
  }),
  expectedFee: z.number(),
  expectedCurrency: z.string().optional(),
  /** Tolerance for floating-point comparison. Defaults to 0.005 (half a cent). */
  tolerance: z.number().optional(),
});

export const TestFileSchema = z.object({
  version: z.literal(1),
  cases: z.array(TestCaseSchema),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestFile = z.infer<typeof TestFileSchema>;

export type TestResult = {
  name: string;
  passed: boolean;
  expected: number;
  actual: number;
  currency: string;
  delta: number;
  source: string;
  explanation: string;
};

export function runCases(config: ServiceFeeConfig, file: TestFile): TestResult[] {
  return file.cases.map((c) => {
    const tol = c.tolerance ?? 0.005;
    const r = resolveFee(config, c.transaction as Transaction);
    const delta = r.fee - c.expectedFee;
    const feeOk = Math.abs(delta) <= tol;
    const currencyOk = !c.expectedCurrency || c.expectedCurrency === r.currency;
    return {
      name: c.name,
      passed: feeOk && currencyOk,
      expected: c.expectedFee,
      actual: r.fee,
      currency: r.currency,
      delta,
      source: r.source,
      explanation: r.explanation,
    };
  });
}
