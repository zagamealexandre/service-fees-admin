"use client";
import type { Rule, ServiceFeeConfig } from "@/lib/schema";
import { Button, Card } from "./ui";
import { RuleCard } from "./RuleCard";

const NEW_RULE: Rule = { scope: { country: "" }, override: { relative: { minFee: 0 } } };

export function RulesList({
  config,
  onChange,
}: {
  config: ServiceFeeConfig;
  onChange: (next: ServiceFeeConfig) => void;
}) {
  const rules = config.serviceFee.rules;
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
            <RuleCard
              key={i}
              rule={r}
              index={i}
              total={rules.length}
              onChange={(next) => update(rules.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => update(rules.filter((_, idx) => idx !== i))}
              onMove={(delta) => move(i, delta)}
            />
          ))
        )}
        <Button onClick={() => update([...rules, JSON.parse(JSON.stringify(NEW_RULE))])}>+ Add rule</Button>
      </div>
    </Card>
  );
}
