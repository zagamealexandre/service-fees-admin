"use client";
import { useEffect, useRef, useState } from "react";
import type { Rule, ServiceFeeConfig } from "@/lib/schema";
import { Button, Card } from "./ui";
import { RuleCard } from "./RuleCard";

const NEW_RULE: Rule = { scope: { country: "" }, override: { relative: { minFee: 0 } } };
const NEW_FALLBACK_RULE: Rule = { scope: {}, override: { relative: { minFee: 0 } } };

export function RulesList({
  config,
  onChange,
}: {
  config: ServiceFeeConfig;
  onChange: (next: ServiceFeeConfig) => void;
}) {
  const rules = config.serviceFee.rules;
  // Tracks the index of a rule that should mount with its editor open. Only affects first
  // mount (RuleCard reads it as the initial useState value), so existing cards aren't disturbed.
  const [openOnMountIndex, setOpenOnMountIndex] = useState<number | null>(null);
  const newRuleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openOnMountIndex !== null && newRuleRef.current) {
      newRuleRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openOnMountIndex]);

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
  }

  return (
    <Card
      title="Override rules"
      description="Each rule matches a scope; later rules override earlier ones for fields they specify."
    >
      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-subtle">No rules yet.</p>
        ) : (
          rules.map((r, i) => (
            <div key={i} ref={i === openOnMountIndex ? newRuleRef : undefined}>
              <RuleCard
                rule={r}
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
