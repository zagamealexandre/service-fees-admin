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

- The user signs in with GitHub (OAuth web flow). Their access token is
  stored only in an HTTP-only encrypted cookie.
- The page fetches `config/service-fees.json` from the base branch and
  renders structured forms.
- "Save as PR…" creates a `sf/<timestamp>-<login>` branch, commits the
  updated file, and opens a PR against `main`.

## Local setup

1. Clone and install:

   ```
   npm install
   ```

2. Create a **GitHub OAuth App** (Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback`

3. Copy `.env.example` to `.env.local` and fill in:

   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   COOKIE_SECRET=$(openssl rand -base64 48)
   GITHUB_REPO=zagamealexandre/service-fees-admin
   ```

4. Make sure the repo named in `GITHUB_REPO` exists on GitHub and contains
   `config/service-fees.json` on the `main` branch (this repo already
   includes a starter file at that path — push it to your remote first).

5. Run the dev server:

   ```
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to `/login`.

## Deploy on Vercel

1. Push this repo to `github.com/<owner>/service-fees-admin`.
2. Import the repo in Vercel.
3. Create a **separate** GitHub OAuth App for the production URL
   (callback = `https://<your-domain>/api/auth/callback`).
4. Set the same env vars in Vercel: `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET`, `COOKIE_SECRET`, `GITHUB_REPO`.
5. Deploy.

## File layout

```
app/
  api/
    auth/{login,callback,logout}/route.ts
    config/route.ts          # GET reads main; POST creates a PR
    config/pulls/route.ts    # lists open PRs touching the file
  login/page.tsx
  page.tsx                   # the editor (server-rendered)
components/                  # form pieces (BandsTable, RuleCard, ...)
lib/
  auth.ts                    # iron-session cookie helpers
  github.ts                  # thin REST wrappers
  schema.ts                  # zod schema for the config
  validate.ts                # band overlap, country format, etc.
config/service-fees.json     # the file under management
middleware.ts                # gates everything except /login + /api/auth/*
```

## Editor model

The schema:

- `serviceFee.enabled` — global on/off.
- `serviceFee.relative.defaults` — `minFee`, `newUserFeeEnabled`, and
  ordered price `bands` with `feePercent`.
- `serviceFee.fixed.defaults.productFee` — flat amounts keyed by product
  bundle → country → segment → `{ Amount, Currency }`.
- `serviceFee.rules[]` — each has a `scope` (any of `country`, `category`,
  `segment`, comma-separated `app`) and an `override` block. **Later rules
  win** for the fields they specify.

Validation runs continuously: bands non-overlapping, country = 2-letter ISO,
apps ⊂ {web, android, ios}, etc. The "Save as PR…" button is disabled while
there are blocking errors.

## Out of scope (v1)

- Multi-environment configs (dev/staging/prod) — single file for now.
- Approving/merging PRs from inside the UI — go to GitHub for review.
- Audit log beyond `git log` — git history is the audit log.
