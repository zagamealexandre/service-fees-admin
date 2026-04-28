# Service Fees Admin

A small Next.js backoffice that lets non-technical teammates edit
`config/service-fees.json` through clean forms. Every save opens a GitHub
pull request, so changes get review, real per-person `git blame`, and free
rollback via PR revert.

## How it works

```
Browser → Next.js API routes → GitHub REST API
            (auth, read, branch, commit, PR)
```

- The user signs in with GitHub (a GitHub App, scoped to this repo only).
  Their access token is stored only in an HTTP-only encrypted cookie.
- The page fetches `config/service-fees.json` from the base branch and
  renders structured forms.
- "Save as PR…" creates a `sf/<timestamp>-<login>` branch, commits the
  updated file, and opens a PR against `main` (or the active branch when
  `GITHUB_BRANCHES` lists more than one).

## What's in the editor

- **Form-driven editor** for relative bands, fixed product fees, and a
  scoped override-rules list. Override rules can be reordered, toggled
  on/off, and annotated with a `note` (rationale that lives next to the
  rule).
- **Defaults are locked** behind a confirmation modal — they apply to
  every transaction, so editing them is intentional. The lock re-engages
  after each PR.
- **Live fee calculator** in the sidebar. Set a price + scope and watch
  the fee update against your in-memory edits, with an explanation
  ("20% of $4.00 = $0.80" / "min-floor applied" / "fixed product fee for
  IN…").
- **Live validation**: band overlap/gaps, ISO country, fee % range, app
  values, scope completeness. Save is blocked on errors.
- **Golden tests** panel at the bottom of the editor. Reads
  `config/service-fees.test.json` from the base branch and runs each
  scenario against your in-memory edits — fails turn red the moment your
  edit would break a known-good case. The same cases run in CI on every
  PR.
- **Save dialog** with **Semantic / Text diff / Full JSON** tabs and an
  inline validation summary. Semantic is the default — readable
  per-field changes, e.g. *defaults.bands[0] feePercent 20% → 22%*.
- **Autosaved drafts** in `localStorage`, scoped per user + per branch,
  so a tab close or laptop crash doesn't lose work.
- **Change history** panel — every commit to the file with author,
  date, and short SHA links.
- **Pending PRs banner** — open PRs touching the file, listed with
  author and link.
- **Side documentation** with copy-paste recipes (country override, new-
  user waiver, fallback rule, fixed product fee).
- **Multiple environments** when `GITHUB_BRANCHES` is set to a list. A
  branch picker appears in the header; reads/writes go to the selected
  branch.

## Local setup

1. Install:

   ```
   npm install
   ```

2. Create a **GitHub App** (Settings → Developer settings → GitHub Apps → New):
   - Permissions: **Contents** R/W, **Pull requests** R/W, **Email
     addresses** R, **Metadata** R (auto).
   - Check **Request user authorization (OAuth) during installation**.
   - Uncheck **Expire user authorization tokens** (no refresh-token
     plumbing needed).
   - Uncheck the **Webhook → Active** box.
   - Callback URL: `http://localhost:3000/api/auth/callback`.
   - Install the app on the repo (only this one).

3. Copy `.env.example` to `.env.local` and fill in:

   ```
   GITHUB_CLIENT_ID=<App Client ID>
   GITHUB_CLIENT_SECRET=<App Client Secret>
   COOKIE_SECRET=$(openssl rand -base64 48)
   GITHUB_REPO=<owner>/<repo>
   # Optional — comma list, first is the default. When >1, a branch picker shows.
   # GITHUB_BRANCHES=main,staging
   ```

4. Make sure the repo named in `GITHUB_REPO` exists on GitHub and contains
   `config/service-fees.json` on the base branch (this repo includes a
   starter file at that path).

5. Run the dev server:

   ```
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to `/login`.

## Running golden tests

```
npm run test:fees
```

Uses [`tsx`](https://tsx.is/) to run `scripts/test-fees.ts` against
`config/service-fees.json` + `config/service-fees.test.json`. Exits 1 on
any failure — same command CI runs.

The in-editor *Golden tests* card reads the test file from the base
branch (so the file must be on `main` for the panel to populate). The CLI
reads from disk, so it works against your unpushed edits immediately.

Adding a case:

```json
{
  "name": "IN $4 product",
  "transaction": { "price": 4, "country": "IN" },
  "expectedFee": 0.88
}
```

The `transaction` shape mirrors what the backend computes against:
`price` (number, required), `country`, `category`, `segment`, `app`,
`productKey`, `isNewUser` (all optional). Tolerance defaults to half a
cent; override per-case with `"tolerance": 0.01`.

## CI workflows

- `.github/workflows/test-fees.yml` — runs `npm run test:fees` on PRs
  that touch the engine, the config, the tests, or the workflow itself.
  Blocks merge on any failure.
- `.github/workflows/notify-slack.yml` — on push to `main` that touches
  `config/service-fees.json`, posts a one-line message via incoming
  webhook. Requires a `SLACK_WEBHOOK_URL` repo secret. Set the repo
  variable `SLACK_NOTIFICATIONS_ENABLED=false` to mute without removing
  the secret.

## Deploy on Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Create a **separate** GitHub App for the production URL (callback =
   `https://<your-domain>/api/auth/callback`). Different domain → must
   be a different App registration.
4. Set env vars in Vercel: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   `COOKIE_SECRET` (fresh, do not reuse the dev one), `GITHUB_REPO`, and
   optionally `GITHUB_BRANCHES`.
5. Install the prod App on the same repo.
6. Deploy.

## File layout

```
app/
  api/
    auth/{login,callback,logout}/route.ts
    branch/route.ts                  # POST sets sf_branch cookie
    config/route.ts                  # GET reads main; POST creates a PR
    config/pulls/route.ts            # lists open PRs touching the file
    config/history/route.ts          # commits touching the file
    config/tests/route.ts            # reads service-fees.test.json
  login/page.tsx
  page.tsx                           # the editor (server-rendered)
components/
  EditorShell.tsx                    # main shell, sticky save bar, autosave
  RelativeDefaultsCard.tsx
  FixedDefaultsCard.tsx
  RulesList.tsx                      # search + add rule + add fallback
  RuleCard.tsx                       # enabled toggle + note + scope/override
  ScopeEditor.tsx
  OverrideEditor.tsx
  BandsTable.tsx
  ProductFeeEditor.tsx
  CalculatorPanel.tsx                # live fee calc
  TestCasesPanel.tsx                 # golden tests
  HistoryPanel.tsx                   # commit history
  PendingPRsBanner.tsx
  RawJsonPanel.tsx
  SavePRDialog.tsx                   # PR title/body + diff + validation
  SemanticDiff.tsx                   # field-level diff
  DiffView.tsx                       # text diff
  DocsPanel.tsx                      # in-editor documentation
  BranchPicker.tsx                   # header dropdown when multi-env
  ui.tsx                             # Card / Toggle / NumberInput / TextInput / Button
lib/
  auth.ts                            # iron-session cookie helpers
  github.ts                          # REST helpers, cookie-aware base branch
  schema.ts                          # zod schema for the config + tests
  validate.ts                        # band overlap, country format, etc.
  rules.ts                           # pure fee resolution engine
  test-runner.ts                     # zod schema for tests + runner
config/
  service-fees.json                  # the file under management
  service-fees.test.json             # golden test cases
scripts/
  test-fees.ts                       # CLI runner used by `npm run test:fees`
.github/workflows/
  test-fees.yml                      # CI: runs golden tests on PRs
  notify-slack.yml                   # Slack message on merge to main
middleware.ts                        # gates everything except /login + /api/auth/*
```

## Out of scope

- Multi-file configs — single file per environment for now.
- Approving/merging PRs from inside the UI — go to GitHub for review.
- Per-field audit log beyond `git log` — git history is the audit log.
