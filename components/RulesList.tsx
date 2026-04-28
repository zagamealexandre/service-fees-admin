"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Rule, ServiceFeeConfig } from "@/lib/schema";
import { Button, Card, TextInput } from "./ui";
import { RuleCard } from "./RuleCard";

const NEW_RULE: Rule = { scope: { country: "" }, override: { relative: { minFee: 0 } } };
const NEW_FALLBACK_RULE: Rule = { scope: {}, override: { relative: { minFee: 0 } } };

function ruleMatchesQuery(rule: Rule, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    rule.scope.country,
    rule.scope.category,
    rule.scope.segment,
    rule.scope.app,
    rule.note,
    rule.enabled === false ? "off disabled" : "on",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function RulesList({
  config,
  onChange,
}: {
  config: ServiceFeeConfig;
  onChange: (next: ServiceFeeConfig) => void;
}) {
  const rules = config.serviceFee.rules;
  const [openOnMountIndex, setOpenOnMountIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const newRuleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openOnMountIndex !== null && newRuleRef.current) {
      newRuleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openOnMountIndex]);

  const visibleIndices = useMemo(
    () => rules.map((r, i) => ({ r, i })).filter(({ r }) => ruleMatchesQuery(r, query)).map((x) => x.i),
    [rules, query]
  );

  function update(rules: Rule[]) {
    onChange({ ...config, serviceFee: { ...config.serviceFee, rules } });
  }
  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= rules.length) return;
    const next = rules.slice();
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  }
  function addRule(template: Rule = NEW_RULE) {
    const next = [...rules, JSON.parse(JSON.stringify(template))];
    update(next);
    setOpenOnMountIndex(next.length - 1);
    setQuery(""); // make sure the new rule is visible
  }

  return (
    <Card
      title="Override rules"
      description="Each rule matches a scope; later rules override earlier ones for fields they specify."
    >
      <div className="mb-3">
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder={`Filter ${rules.length} rules… (country, category, note, on/off)`}
        />
        {query && (
          <p className="mt-1 text-xs text-subtle">
            Showing {visibleIndices.length} of {rules.length}.{" "}
            <button type="button" className="underline hover:text-ink" onClick={() => setQuery("")}>
              Clear
            </button>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-subtle">No rules yet.</p>
        ) : visibleIndices.length === 0 ? (
          <p className="text-sm text-subtle">No rules match &ldquo;{query}&rdquo;.</p>
        ) : (
          visibleIndices.map((i) => (
            <div key={i} ref={i === openOnMountIndex ? newRuleRef : undefined}>
              <RuleCard
                rule={rules[i]}
                index={i}
                total={rules.length}
                onChange={(next) => update(rules.map((x, idx) => (idx === i ? next : x)))}
                onRemove={() => update(rules.filter((_, idx) => idx !== i))}
                onMove={(delta) => move(i, delta)}
                defaultOpen={i === openOnMountIndex}
              />
            </div>
          ))
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => addRule(NEW_RULE)}>+ Add rule</Button>
          <Button
            onClick={() => addRule(NEW_FALLBACK_RULE)}
            title="A rule with no scope — applied to everything before scoped rules layer on top."
          >
            + Add fallback (no scope)
          </Button>
        </div>
      </div>
    </Card>
  );
}
