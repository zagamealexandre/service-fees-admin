import type { Band, Rule, ServiceFeeConfig } from "./schema";

export type ValidationIssue = {
  path: string;
  level: "error" | "warning";
  message: string;
};

const APP_VALUES = new Set(["web", "android", "ios"]);

export function validateBands(bands: Band[], path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (bands.length === 0) {
    issues.push({ path, level: "error", message: "At least one band is required." });
    return issues;
  }

  // Sort + range checks
  let prevMax: number | null = 0;
  bands.forEach((b, i) => {
    const here = `${path}[${i}]`;
    if (b.minPriceInclusive < 0) {
      issues.push({ path: here, level: "error", message: "Min price cannot be negative." });
    }
    if (b.maxPriceExclusive !== null && b.maxPriceExclusive <= b.minPriceInclusive) {
      issues.push({ path: here, level: "error", message: "Max price must be greater than min price." });
    }
    if (b.feePercent < 0 || b.feePercent > 100) {
      issues.push({ path: here, level: "error", message: "Fee % must be between 0 and 100." });
    }
    if (i > 0) {
      if (prevMax === null) {
        issues.push({
          path: here,
          level: "error",
          message: "Open-ended band (max = ∞) must be the last one.",
        });
      } else if (b.minPriceInclusive !== prevMax) {
        issues.push({
          path: here,
          level: "warning",
          message: `Gap or overlap with previous band (expected min = ${prevMax}).`,
        });
      }
    }
    prevMax = b.maxPriceExclusive;
  });

  return issues;
}

export function validateRule(rule: Rule, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const scopeKeys = (Object.keys(rule.scope) as (keyof typeof rule.scope)[]).filter(
    (k) => rule.scope[k] !== undefined && rule.scope[k] !== ""
  );
  if (scopeKeys.length === 0) {
    // No scope = intentional fallback rule. Allowed, but flagged so the user is aware
    // it applies to every transaction.
    issues.push({
      path: `${path}.scope`,
      level: "warning",
      message: "No scope — this rule applies to everything (fallback).",
    });
  }
  if (rule.scope.country && !/^[A-Z]{2}$/.test(rule.scope.country)) {
    issues.push({
      path: `${path}.scope.country`,
      level: "error",
      message: "Country must be a 2-letter ISO code (uppercase).",
    });
  }
  if (rule.scope.app) {
    const apps = rule.scope.app.split(",").map((s) => s.trim());
    for (const a of apps) {
      if (!APP_VALUES.has(a)) {
        issues.push({
          path: `${path}.scope.app`,
          level: "error",
          message: `Unknown app "${a}". Allowed: web, android, ios.`,
        });
      }
    }
  }

  const hasRel = !!rule.override.relative && Object.keys(rule.override.relative).length > 0;
  const hasFixed = !!rule.override.fixed && Object.keys(rule.override.fixed).length > 0;
  if (!hasRel && !hasFixed) {
    issues.push({
      path: `${path}.override`,
      level: "warning",
      message: "Override is empty — this rule does nothing.",
    });
  }

  if (rule.override.relative?.bands) {
    issues.push(...validateBands(rule.override.relative.bands, `${path}.override.relative.bands`));
  }

  return issues;
}

export function validateConfig(cfg: ServiceFeeConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateBands(cfg.serviceFee.relative.defaults.bands, "serviceFee.relative.defaults.bands"));
  cfg.serviceFee.rules.forEach((r, i) => {
    issues.push(...validateRule(r, `serviceFee.rules[${i}]`));
  });

  // Duplicate scope warning
  const seen = new Map<string, number>();
  cfg.serviceFee.rules.forEach((r, i) => {
    const key = JSON.stringify(r.scope, Object.keys(r.scope).sort());
    if (seen.has(key)) {
      issues.push({
        path: `serviceFee.rules[${i}].scope`,
        level: "warning",
        message: `Same scope as rule #${(seen.get(key) ?? 0) + 1}. Later rules override earlier ones.`,
      });
    } else {
      seen.set(key, i);
    }
  });

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}
