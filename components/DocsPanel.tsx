"use client";
import { useState, type ReactNode } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="text-xs text-subtle hover:text-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Code({ code }: { code: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50">
      <div className="flex items-center justify-end border-b border-line px-2 py-1">
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[11px] leading-5 text-ink">{code}</pre>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-md border border-line bg-white">
      <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-sm font-semibold text-ink">
        <span>{title}</span>
        <span className="text-xs text-subtle transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-2.5 border-t border-line px-3 py-3 text-sm leading-6 text-ink">
        {children}
      </div>
    </details>
  );
}

const RECIPE_INDIA: string = `{
  "scope": { "country": "IN" },
  "override": {
    "relative": {
      "minFee": 0.75,
      "bands": [
        { "minPriceInclusive": 0, "maxPriceExclusive": 5, "feePercent": 22 },
        { "minPriceInclusive": 5, "maxPriceExclusive": null, "feePercent": 19 }
      ]
    }
  }
}`;

const RECIPE_NEW_USER: string = `{
  "scope": {
    "country": "IN",
    "category": "bundle",
    "segment": "new_user",
    "app": "web,android"
  },
  "override": {
    "relative": { "newUserFeeEnabled": false }
  }
}`;

const RECIPE_FALLBACK: string = `{
  "scope": {},
  "override": {
    "relative": { "minFee": 1.0 }
  }
}`;

const RECIPE_FIXED_PRODUCT: string = `{
  "scope": { "country": "IN", "category": "Credit" },
  "override": {
    "fixed": {
      "productFee": {
        "2|4|8": {
          "MX": { "Default": { "Amount": 2, "Currency": "USD" } }
        }
      }
    }
  }
}`;

const RELATIVE_DEFAULTS: string = `{
  "minFee": 0.5,
  "newUserFeeEnabled": true,
  "bands": [
    { "minPriceInclusive": 0, "maxPriceExclusive": 5, "feePercent": 20 },
    { "minPriceInclusive": 5, "maxPriceExclusive": null, "feePercent": 12 }
  ]
}`;

export function DocsPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="text-sm font-semibold text-ink">How to use this</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-subtle">
          <li>Edit the form fields on the left.</li>
          <li>Click <strong className="text-ink">Save as PR…</strong>.</li>
          <li>Review the diff and validation, then open the PR.</li>
          <li>Merge it on GitHub. Reload to see your change live.</li>
        </ol>
        <p className="mt-2 text-xs text-subtle">
          Every change is a tracked Git commit — you can always view, revert, or blame.
        </p>
      </div>

      <Section title="At a glance" defaultOpen>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>
            <strong>Calculator</strong> in the sidebar shows the fee for any transaction in real
            time as you edit.
          </li>
          <li>
            <strong>Defaults are locked</strong> behind a confirmation modal — they affect every
            transaction, so editing them is intentional.
          </li>
          <li>
            <strong>Override rules</strong> can be toggled on/off, annotated with a note, filtered
            via the search box, and reordered with ↑↓.
          </li>
          <li>
            <strong>Golden tests</strong> at the bottom flip to red the moment your edits would
            break a known-good scenario; CI runs the same cases on every PR.
          </li>
          <li>
            <strong>Save as PR…</strong> shows a Semantic / Text diff / Full JSON preview before
            you commit.
          </li>
        </ul>
      </Section>

      <Section title="What is this file?">
        <p>
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">config/service-fees.json</code> controls
          how Rebtel calculates the <strong>service fee</strong> added on top of every product price.
        </p>
        <p>
          The file has two parts: <strong>defaults</strong> (the baseline applied to every
          transaction) and <strong>rules</strong> (scoped overrides for specific countries,
          categories, segments, or apps).
        </p>
      </Section>

      <Section title="Defaults vs rules">
        <p>
          <strong>Defaults</strong> = the starting fee applied to every transaction.
        </p>
        <p>
          <strong>Rules</strong> = a list of scoped exceptions. The backend applies rules{" "}
          <em>top to bottom</em>, each one overriding only the fields it specifies. So a country
          rule can change the bands while inheriting the default <code>minFee</code>.
        </p>
        <p>
          <strong>Bands fall through.</strong> If a rule&apos;s <code>bands</code> only covers
          part of the price range (say 0–$5), prices outside that range use the matching{" "}
          <em>default</em> band. To wholesale replace bands for a country, list every range you
          want to cover.
        </p>
        <p className="text-xs text-subtle">
          Use the ↑ ↓ arrows on each rule card to reorder when overlap matters.
        </p>
      </Section>

      <Section title="Relative bands">
        <p>Percentage of the price, by price band.</p>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>
            <code>minPriceInclusive</code> — lower bound (≥)
          </li>
          <li>
            <code>maxPriceExclusive</code> — upper bound (&lt;); leave blank for the last band
            (∞)
          </li>
          <li>
            <code>feePercent</code> — % of the price taken as fee
          </li>
          <li>
            <code>minFee</code> — floor; if price × feePercent &lt; minFee, the user pays minFee
          </li>
        </ul>
        <Code code={RELATIVE_DEFAULTS} />
        <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-subtle">
          <p className="mb-1 font-medium text-ink">Worked examples</p>
          <p>$4 product → 20% × $4 = <strong>$0.80</strong> fee.</p>
          <p>$2 product → 20% × $2 = $0.40, below $0.50 floor → <strong>$0.50</strong>.</p>
        </div>
      </Section>

      <Section title="Fixed product fees">
        <p>
          Flat per-product amounts. Map structure:{" "}
          <code>productKey → country → segment → {`{ Amount, Currency }`}</code>.
        </p>
        <Code
          code={`{
  "2|4|8": {
    "MX": { "Default": { "Amount": 2, "Currency": "USD" } },
    "NG": { "Default": { "Amount": 2, "Currency": "USD" } }
  }
}`}
        />
        <p className="text-xs text-subtle">
          Product keys like <code>2|4|8</code> are pipe-joined SKU bundles defined by the catalog.
        </p>
      </Section>

      <Section title="Rule scope">
        <p>A rule matches a transaction only if <em>every</em> scope field matches:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          <li>
            <code>country</code> — ISO2 uppercase, e.g. <code>IN</code>, <code>IT</code>
          </li>
          <li>
            <code>category</code> — free text, e.g. <code>Credit</code>, <code>bundle</code>
          </li>
          <li>
            <code>segment</code> — e.g. <code>new_user</code>
          </li>
          <li>
            <code>app</code> — comma-separated; allowed: <code>web</code>, <code>android</code>,{" "}
            <code>ios</code>
          </li>
        </ul>
        <p className="text-xs text-subtle">
          Leaving every field empty makes the rule a <strong>fallback</strong> — it matches
          everything. Use <em>+ Add fallback (no scope)</em> for that.
        </p>
      </Section>

      <Section title="Order of application">
        <p>The backend reads the file like this:</p>
        <ol className="list-decimal space-y-1 pl-5 text-xs">
          <li>Start with <code>defaults</code>.</li>
          <li>For each rule (top to bottom), if its scope matches the transaction, replace only the fields its <code>override</code> specifies.</li>
          <li>Compute the fee from the resulting state.</li>
        </ol>
        <p className="text-xs text-subtle">
          Two rules with overlapping scope? The later one wins for the fields they share.
        </p>
      </Section>

      <Section title="Recipe: country override">
        <p>Charge 22% under $5, 19% above, with a $0.75 floor in India.</p>
        <Code code={RECIPE_INDIA} />
      </Section>

      <Section title="Recipe: turn off new-user fee for a segment">
        <p>Disable the new-user fee for new bundle buyers in IN on web/android.</p>
        <Code code={RECIPE_NEW_USER} />
      </Section>

      <Section title="Recipe: global fallback (no scope)">
        <p>Bump every transaction&apos;s minimum fee to $1.00.</p>
        <Code code={RECIPE_FALLBACK} />
        <p className="text-xs text-subtle">
          Place it near the top of the rules list so scoped rules can still override the floor if
          needed.
        </p>
      </Section>

      <Section title="Recipe: fixed product fee">
        <p>Charge a flat $2 USD on the 2|4|8 bundle in MX, only for IN+Credit.</p>
        <Code code={RECIPE_FIXED_PRODUCT} />
      </Section>

      <Section title="Validation rules">
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>Bands must be ascending, no gaps or overlaps; only the last band can have <code>maxPriceExclusive: null</code>.</li>
          <li><code>feePercent</code> must be between 0 and 100; <code>minFee</code> ≥ 0.</li>
          <li>Country must be 2 uppercase letters; apps must be from {`{web, android, ios}`}.</li>
          <li>Empty override on a rule is a warning — the rule does nothing.</li>
          <li>Two rules with the exact same scope is a warning — the later one wins.</li>
        </ul>
      </Section>

      <Section title="Live calculator (sidebar)">
        <p>
          The card above the docs runs the same matching logic the backend uses, against your
          <em> in-memory edits</em>. Set price + scope + new-user, see the fee and the
          explanation update live. Use it to sanity-check a band tweak before saving.
        </p>
        <p className="text-xs text-subtle">
          Source chip: <code>band</code> = priced from a band, <code>min-floor</code> = minFee
          floor kicked in, <code>fixed</code> = a productFee entry won, <code>new-user-waived</code>{" "}
          = newUserFeeEnabled false short-circuited the calc.
        </p>
      </Section>

      <Section title="Toggling rules on/off">
        <p>
          Each rule has an On/Off switch in its header. Off rules are kept in the file with{" "}
          <code>enabled: false</code> and visually struck through, but ignored by the engine and
          calculator. Useful for temporary kill-switches or A/B experiments without losing the
          configuration.
        </p>
      </Section>

      <Section title="Notes on rules">
        <p>
          Each rule has an optional <code>note</code> field (visible when you Edit the rule). The
          backend ignores it; it&apos;s there so the next person editing knows <em>why</em> the
          rule exists.
        </p>
        <p className="text-xs text-subtle">
          Good notes: &ldquo;Approved by Legal 2026-Q2 for compliance with X.&rdquo; · &ldquo;A/B
          experiment until 2026-09; remove after.&rdquo;
        </p>
      </Section>

      <Section title="Searching rules">
        <p>
          The filter box above the rules list matches against country, category, segment, app,
          notes, and on/off state. Useful once you have more than ~15 rules.
        </p>
      </Section>

      <Section title="Golden tests">
        <p>
          The <strong>Golden tests</strong> card at the bottom evaluates your in-memory edits
          against a list of expected fees in <code>config/service-fees.test.json</code>. Any
          failure here will also fail CI on the PR you open.
        </p>
        <p>
          A test case looks like:
        </p>
        <Code
          code={`{
  "name": "IN $4 product",
  "transaction": { "price": 4, "country": "IN" },
  "expectedFee": 0.88
}`}
        />
        <p className="text-xs text-subtle">
          Run them anywhere with <code>npm run test:fees</code>. If a fee should change as part of
          your PR, update the corresponding test case in the same PR — the failing test is the
          confirmation that the change is intentional.
        </p>
      </Section>

      <Section title="Diff preview before saving">
        <p>The Save dialog has three tabs:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          <li>
            <strong>Semantic</strong> (default) — human-readable per-field changes:{" "}
            <code>defaults.bands[0] feePercent 20% → 22%</code>.
          </li>
          <li>
            <strong>Text diff</strong> — line-by-line +/− on the JSON. Familiar to engineers.
          </li>
          <li>
            <strong>Full JSON</strong> — the entire resulting file as it will be committed.
          </li>
        </ul>
      </Section>

      <Section title="Multiple environments">
        <p>
          When <code>GITHUB_BRANCHES</code> is set to a list (e.g. <code>main,staging</code>), the
          header shows a branch picker. Switching branches reloads the editor reading from that
          branch — saves create PRs against the same one. Drafts are scoped per branch.
        </p>
      </Section>

      <Section title="Why PRs?">
        <p>Every save creates a branch + PR rather than committing straight to main. That gives you:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-xs">
          <li><strong>Review</strong> — eyes on a change before it ships.</li>
          <li><strong>Per-person blame</strong> — <code>git blame</code> shows who set each line.</li>
          <li><strong>One-click revert</strong> — bad fee? Revert the merge commit.</li>
          <li><strong>History</strong> — visible in the <em>Change history</em> panel below.</li>
        </ul>
      </Section>
    </div>
  );
}
