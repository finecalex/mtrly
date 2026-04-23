# Mtrly — Claude Agent Instructions

> Project: **Mtrly** (pronounced "meterly") — pay-per-second content for creator economy.
> Hackathon: Agentic Economy on Arc (Circle + lablab.ai), Apr 20–26, 2026.
> Repo: `git@github.com:finecalex/mtrly.git`

Read `PRD.md`, `HACKATHON_BRIEF.md`, and `TECH_REFERENCE.md` before non-trivial work.

---

## 🛑 MANDATORY PRE-PUSH SECRET CHECK

**Do NOT run `git push` (or `git commit` for a new staged file) until all steps below pass. If any check fails, STOP and fix before pushing — do not bypass with `--no-verify`.**

### Step 1 — List what is being pushed
```bash
git diff --cached --name-only                 # staged files
git log origin/main..HEAD --name-only         # unpushed commits
```

### Step 2 — Scan staged/unpushed content for secrets
Run these greps against staged diff AND any files about to be added:
```bash
git diff --cached | grep -iE 'BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY'
git diff --cached | grep -iE 'api[_-]?key|secret|password|token|bearer' | grep -vE '^\-'
git diff --cached | grep -iE 'ssh-(ed25519|rsa|dss) AAAA'                # public keys may be OK, private never
git diff --cached | grep -iE '0x[a-f0-9]{64}'                            # raw private key hex (64 hex chars)
git diff --cached | grep -iE 'sk-[a-zA-Z0-9]{20,}'                       # OpenAI/Anthropic style keys
git diff --cached | grep -iE 'AKIA[0-9A-Z]{16}'                          # AWS access key
git diff --cached | grep -iE 'CIRCLE_API_KEY|ENTITY_SECRET'              # Circle-specific
```

### Step 3 — Verify `.gitignore` still excludes sensitive paths
Confirm `.gitignore` lists at minimum: `.ssh-deploy/`, `.env*`, `*.pem`, `*_ed25519`, `*_rsa`, `entity-secret*`, `*private-key*`, `wallet.json`, `mnemonic*`.

### Step 4 — Confirm no ignored files are being forced into the commit
```bash
git ls-files --others --ignored --exclude-standard | head
git check-ignore -v $(git diff --cached --name-only)     # should return 0 hits
```

### Step 5 — If a secret is found
1. **Do NOT push.**
2. Remove the file/content from the index: `git restore --staged <file>`.
3. If already committed locally: `git reset --soft HEAD~1`, remove the secret, re-commit.
4. If already pushed: rotate the secret **immediately** (treat as compromised), then `git filter-repo` / BFG to scrub history and force-push **with explicit user approval**.

### Step 6 — Report to user before pushing
State: "Pre-push secret scan: clean. Files: <list>. About to push to <remote>/<branch>. OK?" — wait for confirmation unless user has pre-authorized this specific push.

---

## Secrets in this repo (context for scans)

- **SSH deploy key:** `/workspace/user_59513674/circlearc/.ssh-deploy/mtrly_deploy` (private — must never be committed; covered by `.ssh-deploy/` in `.gitignore`)
- **Circle API key / Entity Secret:** not yet present; when added, put in `.env` (gitignored) — never inline in code
- **Platform wallet private key:** same — env var only (`PLATFORM_WALLET_PRIVATE_KEY`)

When you generate new secrets (keys, tokens, entity secrets), place them ONLY in `.env` or outside the repo, and verify `.gitignore` covers them before the next commit.

---

## Git / push mechanics for this repo

```bash
export GIT_SSH_COMMAND="ssh -i /workspace/user_59513674/circlearc/.ssh-deploy/mtrly_deploy -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes"
git -C /workspace/user_59513674/circlearc remote -v   # expect: origin git@github.com:finecalex/mtrly.git
```

Always stage files explicitly (`git add PRD.md HACKATHON_BRIEF.md`) — never `git add -A` or `git add .` in this repo (risk of sweeping in secrets or `.ssh-deploy/`).

---

## Project rules of thumb

- MIT-licensed, original code only (hackathon requirement).
- Hackathon runs Apr 20–26, 2026. Code authored before Apr 20 is draft/design only; implementation commits should land during the window.
- Don't invent Circle API behavior — cross-check against `TECH_REFERENCE.md` and Circle docs.
- For UI/UX work, respect the "Mtrly" identity: meter metaphor, continuous consumption, minimal.

---

## 📝 CHANGELOG — MANDATORY WITH EVERY COMMIT

**Every commit MUST update `CHANGELOG.md`.** No exceptions. Stage the changelog update in the same commit as the code change — never in a separate "update changelog" commit.

### Format (Keep a Changelog, SemVer-ish)

```markdown
## [Unreleased]

### Added
- New feature X (PRD §Y)

### Changed
- Reworked Z to use new Circle SDK

### Fixed
- Billing tick off-by-one at video end

### Removed
- Deprecated mock-payment path
```

### Rules
- One entry per commit, written before `git commit`.
- Group by: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Docs`.
- One short line per change — link PRD section / issue / file when relevant.
- When cutting a release, rename `[Unreleased]` → `[vX.Y.Z] — YYYY-MM-DD` and start a fresh `[Unreleased]` block on top.
- If the commit is docs-only, still log it under `Docs`.
- If you ever run `git commit` without updating `CHANGELOG.md`, stop, amend (or add follow-up commit) with the changelog entry before pushing.

---

## 🔁 CIRCLE FEEDBACK — MANDATORY WITH EVERY COMMIT THAT TOUCHES CIRCLE STACK

**Every commit that touches a Circle integration (Arc, USDC, Gateway, x402, CCTP, Wallets, Bridge Kit, Circle SDKs, arcscan, Developer Console, docs, faucet) MUST also update `circlefeedback.md`.** Stage the update in the same commit.

### Why
The hackathon submission form asks for detailed Circle product feedback across five fixed sections:
  1. **Products Used** — which Circle products the team used
  2. **Use Case** — why the team chose these products
  3. **Successes** — what worked well during development
  4. **Challenges** — issues / limitations encountered
  5. **Recommendations** — how DX / scalability could be improved

Writing good feedback at submission time from memory is impossible. Writing it at the moment of friction is effortless. The Product Feedback Incentive is $500 USDC; more importantly, detailed feedback is judged as a proxy for how seriously the team engaged with the stack.

### Rules
- Any code change that imports `@circle-fin/*`, calls a Circle API, touches `arcExplorer*`, edits x402 flow, or reacts to a Circle outage → update `circlefeedback.md`.
- Pure refactors of Circle code still count — if behaviour changed, the SDK/DX experience likely did too.
- Prefer **concrete** entries with dates, UUIDs, tx hashes, error messages, file paths. Vague "Gateway is cool" entries are useless at submission time.
- Any time you hit a Circle bug / regression / confusing doc — log it under `Challenges` immediately, even if the work you're doing doesn't fix it.
- Any time a Circle product surprises positively (clean API, good error message, fast recovery) — log it under `Successes`. These are what we cite in the pitch.
- File layout is fixed: five top-level sections `Products Used`, `Use Case`, `Successes`, `Challenges`, `Recommendations`. Don't invent new sections — instead add numbered sub-items (e.g. `### 4.7 New friction X`).
- On submission day, copy the best 2-3 entries from each section into the lablab.ai form — `circlefeedback.md` is the superset.

### If you ever commit a Circle-related change without updating `circlefeedback.md`
Stop, amend (or add follow-up commit) with the feedback entry before pushing. Same discipline as `CHANGELOG.md`.

---

## 🚀 AUTO-DEPLOY TO PROD ON EVERY COMMIT TO `main`

**Every push to `main` automatically releases to production.** There is no staging gate between `main` and prod.

### Implications — treat as hard rules
- **No direct commits to `main` for experimental/WIP work.** Use a feature branch + PR (or at minimum a local branch that is reviewed before merge).
- **Every commit must be deploy-safe:** builds pass, tests pass, no half-finished features, no secrets, no local-only config, no `console.log`/`dbg!` spam.
- **Breaking changes / migrations** require a plan written to the commit body (what breaks, rollback path). Don't push a destructive migration without user sign-off.
- **Secrets must come from env / secret manager in prod** — never commit a `.env` "just to test deploy" (see pre-push scan above).
- **Rollback plan:** if a push breaks prod, the fastest path is usually `git revert <sha> && git push` — NOT force-pushing over `main`. Force-pushing `main` is forbidden unless the user explicitly approves it.
- **Before pushing to `main`:** confirm to the user "About to push to main — this will auto-deploy to prod. OK?" unless the change is trivially safe (docs/changelog only) and the user has pre-authorized this push.

### CI/CD (to be wired up)
- Deploy pipeline: TBD — document the actual trigger (GitHub Actions workflow / Vercel / etc.) here as soon as it's set up.
- Until CI is wired, "auto-deploy" is a convention: treat every `main` commit as if it WILL deploy, even if the pipeline isn't live yet.
