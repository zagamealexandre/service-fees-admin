// Pure fee-resolution engine. Used by:
//   - the live calculator (client-side)
//   - the golden-test runner (CI + UI)
//   - any future "what-if" or batch eval
//
// IMPORTANT: this mirrors the *intended* backend semantics. If the consuming service
// applies rules differently, the consumer should publish its own canonical implementation
// and the calculator should consume that.

import type {
  Band,
  ProductFee,
  Rule,
  ServiceFeeConfig,
} from "./schema";

export type Transaction = {
  price: number;
  country?: string;
  category?: string;
  segment?: string;
  /** Single app value: "web" | "android" | "ios". */
  app?: string;
  /** e.g. "2|4|8" — looked up against fixed product fees. */
  productKey?: string;
  /** Whether this is a new-user transaction (controls newUserFeeEnabled). */
  isNewUser?: boolean;
};

export type ResolvedRelative = {
  minFee: number;
  newUserFeeEnabled: boolean;
  bands: Band[];
};

export type ResolutionResult = {
  /** Final fee in transaction units. */
  fee: number;
  currency: string;
  /** What kind of pricing was applied. */
  source: "disabled" | "fixed" | "band" | "min-floor" | "new-user-waived" | "no-band";
  /** Human-readable explanation, e.g. "20% of $4.00 = $0.80". */
  explanation: string;
  /** Indices of rules whose scope matched this transaction. */
  matchedRules: number[];
  /** Resolved relative state after layering matching rules onto defaults. */
  resolvedRelative: ResolvedRelative;
  /** Resolved fixed state after layering matching rules onto defaults. */
  resolvedFixed: ProductFee;
  /** Which fixed entry was applied (if any). */
  appliedFixed?: { Amount: number; Currency: string; productKey: string; country: string; segment: string };
};

function ruleMatches(rule: Rule, t: Transaction): boolean {
  const s = rule.scope;
  if (s.country !== undefined && s.country !== "" && s.country !== t.country) return false;
  if (s.category !== undefined && s.category !== "" && s.category !== t.category) return false;
  if (s.segment !== undefined && s.segment !== "" && s.segment !== t.segment) return false;
  if (s.app !== undefined && s.app !== "") {
    const apps = s.app.split(",").map((v) => v.trim()).filter(Boolean);
    if (apps.length > 0) {
      if (!t.app) return false;
      if (!apps.includes(t.app)) return false;
    }
  }
  return true;
}

/** Deep-merge fixed product fees: rule entries replace at the (productKey, country, segment) level. */
function mergeFixed(base: ProductFee, override: ProductFee | undefined): ProductFee {
  if (!override) return base;
  const result: ProductFee = JSON.parse(JSON.stringify(base));
  for (const [pk, byCountry] of Object.entries(override)) {
    result[pk] = result[pk] ?? {};
    for (const [cc, bySegment] of Object.entries(byCountry)) {
      result[pk][cc] = result[pk][cc] ?? {};
      for (const [seg, amt] of Object.entries(bySegment)) {
        result[pk][cc][seg] = { ...amt };
      }
    }
  }
  return result;
}

function findBand(bands: Band[], price: number): Band | undefined {
  return bands.find(
    (b) => price >= b.minPriceInclusive && (b.maxPriceExclusive === null || price < b.maxPriceExclusive)
  );
}

export function resolveFee(config: ServiceFeeConfig, t: Transaction): ResolutionResult {
  if (!config.serviceFee.enabled) {
    return {
      fee: 0,
      currency: "USD",
      source: "disabled",
      explanation: "Service fees are globally disabled.",
      matchedRules: [],
      resolvedRelative: { ...config.serviceFee.relative.defaults },
      resolvedFixed: { ...config.serviceFee.fixed.defaults.productFee },
    };
  }

  // Layer matching rules on top of defaults, top-to-bottom.
  let resolvedRelative: ResolvedRelative = {
    minFee: config.serviceFee.relative.defaults.minFee,
    newUserFeeEnabled: config.serviceFee.relative.defaults.newUserFeeEnabled,
    bands: config.serviceFee.relative.defaults.bands.map((b) => ({ ...b })),
  };
  let resolvedFixed: ProductFee = JSON.parse(JSON.stringify(config.serviceFee.fixed.defaults.productFee));
  const matchedRules: number[] = [];

  config.serviceFee.rules.forEach((rule, i) => {
    if (rule.enabled === false) return;
    if (!ruleMatches(rule, t)) return;
    matchedRules.push(i);
    if (rule.override.relative) {
      const o = rule.override.relative;
      if (o.minFee !== undefined) resolvedRelative.minFee = o.minFee;
      if (o.newUserFeeEnabled !== undefined) resolvedRelative.newUserFeeEnabled = o.newUserFeeEnabled;
      if (o.bands !== undefined) resolvedRelative.bands = o.bands.map((b) => ({ ...b }));
    }
    if (rule.override.fixed?.productFee) {
      resolvedFixed = mergeFixed(resolvedFixed, rule.override.fixed.productFee);
    }
  });

  // Fixed product fee wins if there's a matching entry.
  if (t.productKey && t.country) {
    const seg = t.segment || "Default";
    const fixed =
      resolvedFixed[t.productKey]?.[t.country]?.[seg] ??
      resolvedFixed[t.productKey]?.[t.country]?.["Default"];
    if (fixed) {
      return {
        fee: fixed.Amount,
        currency: fixed.Currency,
        source: "fixed",
        explanation: `Fixed fee for product "${t.productKey}" in ${t.country}: ${fixed.Amount} ${fixed.Currency}.`,
        matchedRules,
        resolvedRelative,
        resolvedFixed,
        appliedFixed: {
          Amount: fixed.Amount,
          Currency: fixed.Currency,
          productKey: t.productKey,
          country: t.country,
          segment: seg in (resolvedFixed[t.productKey]?.[t.country] ?? {}) ? seg : "Default",
        },
      };
    }
  }

  // New-user fee waiver short-circuits everything else if disabled.
  if (t.isNewUser && !resolvedRelative.newUserFeeEnabled) {
    return {
      fee: 0,
      currency: "USD",
      source: "new-user-waived",
      explanation: "newUserFeeEnabled = false → no fee for new users in this scope.",
      matchedRules,
      resolvedRelative,
      resolvedFixed,
    };
  }

  // Relative bands.
  const band = findBand(resolvedRelative.bands, t.price);
  if (!band) {
    return {
      fee: resolvedRelative.minFee,
      currency: "USD",
      source: "no-band",
      explanation: `No band matches price ${t.price.toFixed(2)} — falling back to minFee.`,
      matchedRules,
      resolvedRelative,
      resolvedFixed,
    };
  }
  const raw = (t.price * band.feePercent) / 100;
  if (raw < resolvedRelative.minFee) {
    return {
      fee: resolvedRelative.minFee,
      currency: "USD",
      source: "min-floor",
      explanation: `${band.feePercent}% of ${t.price.toFixed(2)} = ${raw.toFixed(2)} < minFee ${resolvedRelative.minFee.toFixed(2)} → floor applied.`,
      matchedRules,
      resolvedRelative,
      resolvedFixed,
    };
  }
  return {
    fee: round2(raw),
    currency: "USD",
    source: "band",
    explanation: `${band.feePercent}% of ${t.price.toFixed(2)} = ${raw.toFixed(2)}.`,
    matchedRules,
    resolvedRelative,
    resolvedFixed,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
