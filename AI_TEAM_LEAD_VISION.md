# AI Software Engineering Team Lead: Vision and Implementation Plan

**Prepared for:** Brian Bell, Founder
**Date:** February 14, 2026
**Version:** 1.0
**Status:** Strategic Plan -- Ready for Decision

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Concept: What an AI Team Lead Actually Is](#3-concept-what-an-ai-team-lead-actually-is)
4. [Architecture Decision: Build Surface Analysis](#4-architecture-decision-build-surface-analysis)
5. [Implementation Plan: Three Phases](#5-implementation-plan-three-phases)
6. [Detailed Phase 1: The Reviewer](#6-detailed-phase-1-the-reviewer)
7. [Detailed Phase 2: The Gatekeeper](#7-detailed-phase-2-the-gatekeeper)
8. [Detailed Phase 3: The Operator](#8-detailed-phase-3-the-operator)
9. [Autonomy Model and Escalation Framework](#9-autonomy-model-and-escalation-framework)
10. [Cost Analysis](#10-cost-analysis)
11. [Risks and Guardrails](#11-risks-and-guardrails)
12. [Decisions Required](#12-decisions-required)
13. [Appendix: Technical Reference](#appendix-technical-reference)

---

## 1. EXECUTIVE SUMMARY

### The Problem

You are a solo founder building Fanflet. You wear every hat -- product, engineering, design, QA, ops. This works at early stage, but it has a specific structural weakness: **nobody reviews your code before it ships.** There is no second pair of eyes catching pattern violations, security oversights, or regressions. There is no gate between "I pushed to develop" and "it is live in production." Your CI pipeline today catches lint errors, type errors, and build failures -- but it does not catch architectural drift, security concerns, or whether a change actually meets your own engineering guidelines.

### The Proposal

Build an AI-powered Software Engineering Team Lead that operates as an automated quality layer in your GitHub workflow. This is not a vague "AI assistant" -- it is a concrete system composed of two existing, well-supported Anthropic tools (Claude Code GitHub Action and Claude Code Security Review) configured with your project's specific standards, deployed in phases that match your maturity.

### Why This Works for Fanflet Specifically

Three factors make this particularly high-value for your situation:

1. **You have already written the playbook.** Your `ENGINEERING_GUIDELINES_MEMO_v2.md` is a 745-line engineering standards document covering security, architecture, testing, deployment, and code quality. Most teams do not have this. You do. An AI reviewer can enforce these standards on every PR because they are already codified.

2. **Your CI foundation exists.** You have a working GitHub Actions pipeline (lint, type-check, build), a two-branch workflow (develop/main), and Vercel deployment integration. The AI layer plugs into this -- it does not replace it.

3. **The ROI is asymmetric.** The cost is approximately $5-15/month in API usage. The value is catching a single security oversight, a single RLS policy gap, or a single production regression before it ships. Given that your engineering guidelines document exists precisely because of "22+ resolved issues" from a previous project, this is insurance against repeating that pattern.

### What It Is Not

This is not autonomous coding. It does not write features, refactor on its own, or make deployment decisions without you. At its most advanced (Phase 3), it can be configured to auto-approve PRs that pass all checks -- but only with your explicit opt-in, and only for PRs you designate as low-risk.

---

## 2. CURRENT STATE ASSESSMENT

### What You Have Today

| Component | Status | Details |
|-----------|--------|---------|
| **Git workflow** | Established | `main` (production) + `develop` (staging) + feature branches |
| **CI pipeline** | Active | GitHub Actions: lint, type-check, build on PRs and develop pushes |
| **Deployment** | Automated | Vercel auto-deploys from GitHub (preview on PR, staging on develop, production on main) |
| **Branch protection on `main`** | **Not configured** | No required reviewers, no required status checks |
| **Branch protection on `develop`** | **Not configured** | Same |
| **Engineering standards** | Documented | `ENGINEERING_GUIDELINES_MEMO_v2.md` -- comprehensive, project-specific |
| **PR template** | **Missing** | No `.github/PULL_REQUEST_TEMPLATE.md` |
| **Security scanning** | **Missing** | No gitleaks, no npm audit in CI |
| **Testing** | **Missing** | No test framework configured, no test files |
| **CLAUDE.md** | **Missing** | No project-level context file for Claude tools |

### Key Observation

Your documented standards in `ENGINEERING_GUIDELINES_MEMO_v2.md` are significantly ahead of your actual enforcement infrastructure. The memo describes a full CI pipeline with security scanning, testing, and migration checks -- but the implemented pipeline only covers lint, type-check, and build. **This gap is exactly what the AI Team Lead fills in the near term**, while you build out the full pipeline described in your guidelines.

### GitHub Account Context

- **Repository:** `bbellwfu/fanflet` (public, GitHub Free plan)
- **GitHub Free limitations:** Branch protection rules are available but limited. Required reviewers and required status checks are available. Code owners (CODEOWNERS) require GitHub Team or Enterprise for enforcement.
- **GitHub Actions:** Available with standard Free tier minutes (2,000 minutes/month for private repos; unlimited for public).

---

## 3. CONCEPT: WHAT AN AI TEAM LEAD ACTUALLY IS

### Capabilities Breakdown

An AI Team Lead is not a single tool. It is a **configuration layer** on top of existing infrastructure. Here is the precise decomposition:

#### Capability 1: PR Code Review (Advisory)

**What it does:** When a PR is opened or updated, an AI agent reads the diff, reads your project context (CLAUDE.md, engineering guidelines), and posts a review comment analyzing code quality, pattern adherence, potential bugs, and suggestions.

**How it works technically:** The `anthropics/claude-code-action` GitHub Action triggers on `pull_request` events, reads the diff, and posts comments to the PR.

**Autonomy level:** Advisory only. It comments -- it does not approve or block.

#### Capability 2: Security Review (Advisory)

**What it does:** Analyzes the PR diff specifically for security vulnerabilities -- injection risks, credential exposure, authentication gaps, RLS policy issues, insecure defaults.

**How it works technically:** The `anthropics/claude-code-security-review` GitHub Action triggers on `pull_request` events, performs semantic security analysis, and posts inline comments on specific lines.

**Autonomy level:** Advisory by default. Can be made a **required status check** to block merges on findings.

#### Capability 3: Merge Gatekeeping (Enforcement)

**What it does:** Enforces that PRs cannot merge to `main` or `develop` without passing all checks -- CI quality checks, AI review, security review.

**How it works technically:** GitHub branch protection rules requiring specific status checks to pass. The AI review and security review actions become required checks alongside your existing lint/type-check/build.

**Autonomy level:** Enforcement. The merge button is literally disabled until checks pass.

#### Capability 4: Production Promotion (Orchestration)

**What it does:** Manages the develop-to-main promotion workflow. Can create the promotion PR automatically, run additional production-readiness checks, and (optionally) auto-approve low-risk promotions.

**How it works technically:** A scheduled or manually triggered GitHub Action that creates a PR from develop to main, triggers all checks, and optionally auto-approves based on configurable criteria.

**Autonomy level:** Configurable -- from "creates the PR and waits for you" to "auto-merges if all checks pass."

---

## 4. ARCHITECTURE DECISION: BUILD SURFACE ANALYSIS

### Option Analysis

I evaluated four approaches to building this system:

#### Option A: Claude Code GitHub Action (Recommended)

**What:** Anthropic's official GitHub Action (`anthropics/claude-code-action@v1`) + Security Review Action (`anthropics/claude-code-security-review@main`).

| Dimension | Assessment |
|-----------|------------|
| Maturity | GA (v1.0), actively maintained by Anthropic |
| Setup complexity | Low -- 2 workflow files + 1 API key secret |
| Integration depth | Native GitHub PR/issue integration, reads CLAUDE.md, posts inline comments |
| Customization | High -- CLAUDE.md for project context, custom prompts, skills (/review), CLI args |
| Maintenance burden | Near zero -- Anthropic maintains the action |
| Cost | API usage only (~$0.10-0.50 per review depending on diff size and model) |

**Verdict:** This is the right choice. It is purpose-built for exactly this use case, officially supported, and requires no custom infrastructure.

#### Option B: Claude Agent SDK (Custom Agent)

**What:** Build a custom Python/TypeScript agent using the Claude Agent SDK that runs as a GitHub Action or standalone service.

| Dimension | Assessment |
|-----------|------------|
| Maturity | SDK is at v0.1.36 -- functional but still pre-1.0 |
| Setup complexity | High -- custom code, deployment, maintenance |
| Integration depth | You build it -- so it can do anything, but you maintain everything |
| Customization | Unlimited |
| Maintenance burden | High -- you own the code, the deployment, the upgrades |
| Cost | API usage + compute costs |

**Verdict:** Overkill for this use case. The Agent SDK is for building products powered by Claude, not for configuring a CI review step. Revisit only if you need capabilities the Action cannot provide (e.g., multi-step orchestration across multiple repos, stateful analysis across PR history).

#### Option C: Claude Code Hooks (Local Development)

**What:** Configure hooks in `.claude/settings.json` that run during local Claude Code sessions (PreToolUse, PostToolUse events).

| Dimension | Assessment |
|-----------|------------|
| Maturity | Stable, well-documented |
| Setup complexity | Low for local use |
| Integration depth | Local only -- does not run in CI/CD |
| Customization | High for local workflows |
| Maintenance burden | Low |
| Cost | Included in Claude Code subscription |

**Verdict:** Complementary, not primary. Hooks enforce standards during your local development sessions (e.g., auto-format on file write, validate file paths). They do not provide CI-level review. Use them alongside Option A for defense-in-depth.

#### Option D: Third-Party AI Review Tools (CodeRabbit, Sourcery, etc.)

**What:** Commercial AI code review SaaS products.

| Dimension | Assessment |
|-----------|------------|
| Maturity | Mature commercial products |
| Setup complexity | Low |
| Integration depth | Good GitHub integration |
| Customization | Limited -- generic rules, not project-specific |
| Maintenance burden | None |
| Cost | $12-29/user/month for paid tiers |

**Verdict:** Inferior for your case. These tools apply generic patterns. Your value is in enforcing your specific engineering guidelines, your specific architectural decisions, your specific Supabase+Next.js patterns. Claude reading your CLAUDE.md with your standards gives you project-specific intelligence that generic tools cannot match.

### Decision

**Primary system:** Claude Code GitHub Action (Option A) + Security Review Action
**Supplementary:** Claude Code Hooks (Option C) for local development guardrails
**Future consideration:** Agent SDK (Option B) only if multi-repo or stateful analysis becomes necessary

---

## 5. IMPLEMENTATION PLAN: THREE PHASES

### Phase Overview

```
Phase 1: THE REVIEWER          Phase 2: THE GATEKEEPER        Phase 3: THE OPERATOR
(Weeks 1-2)                    (Weeks 3-4)                    (Weeks 5-8)

AI reviews every PR            AI blocks merges on             AI manages production
with advisory comments.        quality + security findings.    promotion workflow.

You read and decide.           You must address issues         Low-risk auto-approval.
                               before merge is possible.       Production deploy orchestration.

COST: ~$5/mo                   COST: ~$10/mo                  COST: ~$15/mo
RISK: Zero                     RISK: Low                      RISK: Medium
VALUE: Immediate               VALUE: High                    VALUE: Very High
```

### Phase Dependencies

```
Phase 1 ──────────> Phase 2 ──────────> Phase 3
                        |                   |
                        v                   v
              Requires:               Requires:
              - Trust in AI reviews   - Stable branch protection
              - CLAUDE.md tuned       - Promotion workflow tested
              - False positive rate   - Clear auto-approval criteria
                below 20%              defined
```

### Go/No-Go Gates

| Gate | Criteria | Who Decides |
|------|----------|-------------|
| Phase 1 -> Phase 2 | AI reviews have been useful on 5+ PRs; false positive rate is manageable; CLAUDE.md is tuned | You |
| Phase 2 -> Phase 3 | Branch protection has been active for 2+ weeks without blocking legitimate work; promotion workflow is reliable | You |

---

## 6. DETAILED PHASE 1: THE REVIEWER

### Objective

Get AI-powered code review running on every PR. Advisory only -- it comments, you decide.

### Prerequisites (Do These First)

#### 1. Create CLAUDE.md

This is the most important file you will create for this system. It gives Claude project-specific context that transforms generic AI review into Fanflet-specific review.

**Location:** `/Users/brianbell/Documents/SOSL/Fanflet/CLAUDE.md`

**Content should include:**
- Project overview (Next.js 16, App Router, Supabase, Vercel)
- Repository structure (monorepo with `application/` directory)
- Key architectural decisions (server components vs. client components, Supabase SSR patterns)
- Coding conventions (TypeScript strict, Zod validation, naming patterns)
- Security requirements (RLS policies, service role key isolation, auth patterns)
- Reference to your engineering guidelines: "Follow standards defined in ENGINEERING_GUIDELINES_MEMO_v2.md"
- Common patterns and anti-patterns specific to your codebase
- Commit convention: `type(scope): description`

#### 2. Create PR Template

**Location:** `/Users/brianbell/Documents/SOSL/Fanflet/.github/PULL_REQUEST_TEMPLATE.md`

Based on the ship checklists in your engineering guidelines. This gives the AI reviewer a structured checklist to validate against.

#### 3. Get Anthropic API Key

- Go to console.anthropic.com
- Create an API key specifically for GitHub Actions (label it "fanflet-github-actions")
- Add it as a repository secret named `ANTHROPIC_API_KEY` in GitHub repo settings

### Implementation: Two Workflow Files

#### Workflow 1: AI Code Review

**File:** `.github/workflows/claude-review.yml`

**Trigger:** PR opened, updated, or when someone comments `@claude`

**Behavior:** Reads the PR diff, reads CLAUDE.md and engineering guidelines, posts a review comment covering:
- Code quality and patterns
- Adherence to your engineering guidelines
- Potential bugs or edge cases
- Suggestions for improvement
- Whether the PR checklist items appear to be addressed

**Key configuration decisions:**
- **Model:** Start with `claude-sonnet-4-5-20250929` for cost efficiency. Upgrade to `claude-opus-4-6` if review quality is insufficient.
- **Max turns:** 5 (limits cost per review; increase if reviews feel cut short)
- **Trigger:** Automatic on PR open + manual via `@claude` comments

#### Workflow 2: Security Review

**File:** `.github/workflows/security-review.yml`

**Trigger:** PR opened or updated

**Behavior:** Analyzes changed files for security vulnerabilities, posts inline comments on specific lines with findings.

**Key configuration decisions:**
- **Model:** Default (Claude Opus) -- security is worth the higher model cost
- **Timeout:** 20 minutes
- **Custom instructions:** Point to your security guidelines (Section 4 of your engineering memo)

### Phase 1 Success Criteria

After running for 2 weeks / 5+ PRs:

| Metric | Target |
|--------|--------|
| Reviews that catch something useful you missed | At least 2 |
| False positives (irrelevant or incorrect suggestions) | Below 30% of comments |
| Review latency | Under 3 minutes for typical PR |
| Cost per review | Under $0.50 average |
| CLAUDE.md refinements made based on review quality | At least 3 |

### Phase 1 Estimated Timeline

| Task | Effort | Notes |
|------|--------|-------|
| Create CLAUDE.md | 1-2 hours | Extract from engineering guidelines + project knowledge |
| Create PR template | 30 minutes | Adapt from engineering guidelines ship checklists |
| Get Anthropic API key + add secret | 15 minutes | |
| Create claude-review.yml workflow | 30 minutes | Adapt from official examples |
| Create security-review.yml workflow | 15 minutes | Near-direct copy from Anthropic's example |
| Run `/install-github-app` or manual Claude GitHub App install | 15 minutes | |
| Test on first PR | 30 minutes | Create a test PR, verify review appears |
| **Total** | **3-4 hours** | |

---

## 7. DETAILED PHASE 2: THE GATEKEEPER

### Objective

Convert AI review from advisory to enforcement. PRs cannot merge to protected branches unless they pass AI quality and security checks.

### Prerequisites

- Phase 1 running successfully for 2+ weeks
- CLAUDE.md tuned based on Phase 1 review quality
- Confidence that the AI review is not producing excessive false positives

### Implementation Steps

#### 1. Configure Branch Protection on `main`

Via GitHub repo settings (Settings > Branches > Branch protection rules > Add rule for `main`):

- **Require a pull request before merging:** Enabled
- **Required approving reviews:** 0 (you are solo; the AI reviews but does not "approve" in the GitHub sense)
- **Require status checks to pass before merging:** Enabled
- **Required status checks:** Add all of:
  - `quality` (your existing CI job -- lint, type-check, build)
  - `security` (the security review action job name)
  - The code review action job name (if you configure it to report a status check)
- **Require branches to be up to date before merging:** Enabled
- **Do not allow bypassing the above settings:** Your call -- as repo owner, you can bypass. Recommend leaving bypass enabled for emergencies but tracking when you use it.

#### 2. Configure Branch Protection on `develop`

Same as `main`, but potentially with a relaxed subset (e.g., only CI quality checks required, not full security review).

#### 3. Add npm audit to CI Pipeline

Extend your existing `ci.yml` to include:
- `npm audit --audit-level=high` as a step after install
- This catches known vulnerabilities in dependencies -- your engineering guidelines call for this

#### 4. Add gitleaks to CI Pipeline

Add a secrets scanning step using `gitleaks/gitleaks-action@v2` to catch committed credentials. Your engineering guidelines specifically recommend this.

### Phase 2 Success Criteria

| Metric | Target |
|--------|--------|
| PRs blocked by legitimate quality/security issues | At least 1 (proving the gate works) |
| PRs blocked by false positives | Zero over 2-week period |
| Time to resolve AI-raised blocking issues | Under 30 minutes average |
| Emergency bypasses used | Under 2 per month |

### Phase 2 Risk: False Positive Blocking

The primary risk in Phase 2 is a false positive in the security review blocking a merge unnecessarily. Mitigations:

1. **Tune before enforcing.** Phase 1 gives you data on false positive rates before you make checks required.
2. **Keep bypass available.** As repo owner, you can bypass branch protection in emergencies.
3. **Use `custom-security-scan-instructions`** to reduce false positives by providing project-specific context.
4. **Set a clear policy:** If a finding is a false positive, document it in CLAUDE.md as an exception pattern so future reviews skip it.

---

## 8. DETAILED PHASE 3: THE OPERATOR

### Objective

Automate the production promotion workflow (develop -> main) and enable selective auto-approval for low-risk changes.

### Capability 1: Production Promotion PR

**A new GitHub Action workflow** that:

1. **Trigger:** Manual dispatch (you click "Run workflow") or on a schedule (e.g., weekly)
2. **Action:** Creates a PR from `develop` to `main` titled "Release: [date]"
3. **Content:** The PR description auto-populates with all commits included since the last merge to main
4. **Review:** All Phase 2 checks run (CI + AI review + security review)
5. **Your action:** You review the PR, confirm it looks right, and merge

This is a workflow automation -- it does not merge automatically. It just removes the friction of creating the promotion PR and ensures all checks run on the aggregate diff.

### Capability 2: Interactive Claude on PRs

Beyond automated review, you can `@claude` in any PR comment to:
- Ask questions about the codebase: "@claude what files would be affected if I change the QR code generation logic?"
- Request specific analysis: "@claude check if this change maintains RLS policy coverage"
- Ask for implementation suggestions: "@claude how should I handle the error case here?"

This turns Claude into an on-demand engineering consultant embedded in your PR workflow.

### Capability 3: Auto-Approval (Optional, Proceed with Caution)

For PRs that meet all of the following criteria, the AI Team Lead could auto-approve:
- Only documentation changes (*.md files)
- Only dependency updates with no breaking changes
- Only style/formatting changes

**My recommendation:** Do not implement auto-approval until you have been through at least 20 PRs with the gatekeeper model and have high confidence in the check suite. For a solo founder, the review step is fast and the cost of a bad auto-approval is high.

### Capability 4: Local Development Hooks (Complementary)

Configure Claude Code hooks in `.claude/settings.json` for your local development sessions:

- **PostToolUse (Write/Edit):** Auto-run Prettier on modified files
- **PostToolUse (Write/Edit):** Auto-run ESLint on modified files
- **PreToolUse (Write):** Validate that new files follow your naming conventions
- **SessionStart:** Load project context from CLAUDE.md

These hooks are defense-in-depth -- they catch issues before you even commit, so the CI/PR review has less to catch.

---

## 9. AUTONOMY MODEL AND ESCALATION FRAMEWORK

### Autonomy Levels

| Level | Description | AI Behavior | Your Required Action |
|-------|-------------|-------------|---------------------|
| **L0: Silent Observer** | AI monitors but does not act | Logs analysis results | None |
| **L1: Advisor** | AI provides recommendations | Posts PR comments with suggestions | Read and decide |
| **L2: Challenger** | AI raises mandatory concerns | Posts PR review requesting changes | Address or dismiss with reason |
| **L3: Gatekeeper** | AI blocks on findings | Required status check blocks merge | Fix issues to proceed |
| **L4: Auto-Approver** | AI approves qualifying PRs | Auto-approves PRs matching criteria | Override if needed |
| **L5: Autonomous Operator** | AI initiates and completes actions | Creates PRs, runs workflows | Audit and supervise |

### Recommended Autonomy by Phase

| Phase | Code Review | Security Review | Merge Control | Production Promotion |
|-------|-------------|----------------|---------------|---------------------|
| **Phase 1** | L1 (Advisor) | L1 (Advisor) | None | Manual |
| **Phase 2** | L2 (Challenger) | L3 (Gatekeeper) | L3 (Gatekeeper) | Manual |
| **Phase 3** | L2 (Challenger) | L3 (Gatekeeper) | L3 (Gatekeeper) | L5 (creates PR, you merge) |

### Escalation Rules

The AI Team Lead should escalate to you (post a comment tagging you or send a notification) when:

1. **Security finding with severity "high" or "critical"** -- do not just comment, make sure it is seen
2. **Architectural concern** -- a change that appears to conflict with patterns established in CLAUDE.md
3. **Confidence is low** -- the AI is uncertain about a finding (Claude can express uncertainty when prompted to)
4. **Pattern is new** -- first time seeing a particular pattern, unclear if it is intentional

---

## 10. COST ANALYSIS

### API Costs (Anthropic)

| Component | Model | Est. Cost per Run | Frequency | Monthly Est. |
|-----------|-------|-------------------|-----------|-------------|
| Code review | Sonnet | $0.10-0.30 | ~20 PRs/month | $2-6 |
| Security review | Opus | $0.30-0.80 | ~20 PRs/month | $6-16 |
| @claude interactions | Sonnet | $0.05-0.20 | ~10/month | $0.50-2 |
| **Total API** | | | | **$8.50-24** |

### GitHub Actions Minutes

| Workflow | Runtime | Frequency | Monthly Minutes |
|----------|---------|-----------|----------------|
| Existing CI (lint/type/build) | ~3 min | ~20 PRs | 60 min |
| Claude code review | ~2 min | ~20 PRs | 40 min |
| Security review | ~5 min | ~20 PRs | 100 min |
| **Total** | | | **200 min** |

Your repo is public, so GitHub Actions minutes are **unlimited** for public repos. No cost concern here.

### Total Monthly Cost

| Phase | API Cost | GitHub Actions | Total |
|-------|----------|---------------|-------|
| Phase 1 | $5-15 | $0 | $5-15 |
| Phase 2 | $10-20 | $0 | $10-20 |
| Phase 3 | $10-25 | $0 | $10-25 |

**Context:** This is roughly the cost of one Starbucks latte per week in exchange for an automated engineering review layer. The ROI is positive if it catches a single production issue that would cost you hours to debug and fix.

---

## 11. RISKS AND GUARDRAILS

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **False positives block legitimate PRs** | Medium (Phase 2) | Medium -- delays you | Tune CLAUDE.md iteratively; keep bypass available; start with advisory before enforcement |
| **AI misses a real security issue** | Low | High | Layer defense: AI review + gitleaks + npm audit + manual review. AI is additive, not replacing your judgment |
| **API costs spike on large diffs** | Low | Low | Set `--max-turns` limits; monitor usage on console.anthropic.com |
| **Prompt injection via PR content** | Low (you are solo) | Medium | Only trust PRs from collaborators; Anthropic notes their security review is "not hardened against prompt injection" |
| **Over-reliance on AI review** | Medium | Medium | Treat AI as a second opinion, not the authority. You still read every diff before merging |
| **Action version breaks on update** | Low | Low | Pin to `@v1` not `@main`; test after Anthropic releases new versions |
| **GitHub Actions outage blocks workflow** | Low | Medium | Keep bypass available on branch protection; do not make AI the single point of failure |

### Guardrails

#### Technical Guardrails
- Pin action versions to `@v1` (not `@main` or `@latest`)
- Set `--max-turns` on all Claude invocations to cap runaway costs
- Set workflow `timeout-minutes` on all jobs
- Never store the API key anywhere except GitHub Secrets

#### Process Guardrails
- Review every AI comment for the first 2 weeks (Phase 1) before trusting
- Maintain a "false positives" section in CLAUDE.md to tune review accuracy
- Track bypass usage -- if you are bypassing frequently, the checks are misconfigured
- Monthly review of API spend on console.anthropic.com

#### Ethical Guardrails
- The AI reviews code -- it does not make product decisions
- The AI does not have access to production data, user data, or deployment credentials
- All AI-generated comments are visibly marked as coming from the Claude GitHub App (transparent to anyone viewing the PR)
- You remain the sole decision-maker on what ships

---

## 12. DECISIONS REQUIRED

Before implementation, you need to make the following decisions:

### Decision 1: Model Selection for Code Review

| Option | Trade-off |
|--------|-----------|
| **Sonnet** (recommended) | Faster, cheaper (~$0.15/review). Good for pattern matching, style review. May miss subtle architectural issues. |
| **Opus 4.6** | Slower, more expensive (~$0.50/review). Better at nuanced analysis, architectural reasoning, complex security patterns. |

**Recommendation:** Start with Sonnet. If review quality feels shallow after 5 PRs, upgrade to Opus.

### Decision 2: Security Review as Required Check (Phase 2)

| Option | Trade-off |
|--------|-----------|
| **Required status check** (recommended) | Blocks merge on security findings. May occasionally produce false positives that slow you down. |
| **Advisory only** | Posts comments but does not block. Risk of ignoring findings under time pressure. |

**Recommendation:** Make it required. You can always dismiss a false positive quickly; you cannot un-ship a security vulnerability.

### Decision 3: Branch Protection Bypass

| Option | Trade-off |
|--------|-----------|
| **Allow bypass for admins** (recommended) | You can merge in emergencies. Risk of normalizing bypass. |
| **No bypass** | Absolute enforcement. If a check flakes, you are stuck until it is fixed. |

**Recommendation:** Allow bypass. Track usage. If you are bypassing more than once per month, revisit the check configuration.

### Decision 4: Auto-Approval Scope (Phase 3)

| Option | Trade-off |
|--------|-----------|
| **No auto-approval** (recommended for now) | You review everything. Safest but adds 5 minutes per PR. |
| **Auto-approve docs-only PRs** | Saves time on README/docs changes. Low risk. |
| **Auto-approve all-pass PRs** | Maximum automation. Risk of shipping regressions the checks miss. |

**Recommendation:** No auto-approval until you have 30+ PRs through the system and high confidence in your check suite.

### Decision 5: Notification Preference

How do you want to be notified of AI review results?

- GitHub email notifications (default)
- Slack integration (requires additional setup)
- Claude Code hooks that notify on your machine (local only)

---

## APPENDIX: TECHNICAL REFERENCE

### Files to Create (Phase 1)

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context for all Claude tools |
| `.github/PULL_REQUEST_TEMPLATE.md` | Structured PR checklist |
| `.github/workflows/claude-review.yml` | AI code review on PRs |
| `.github/workflows/security-review.yml` | Security vulnerability scanning on PRs |

### Files to Modify (Phase 2)

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Add npm audit and gitleaks steps |
| GitHub repo settings | Configure branch protection rules |

### Files to Create (Phase 3)

| File | Purpose |
|------|---------|
| `.github/workflows/promote-to-production.yml` | Automated develop-to-main PR creation |
| `.claude/settings.json` | Local development hooks |

### Key External Resources

| Resource | URL |
|----------|-----|
| Claude Code Action (official) | https://github.com/anthropics/claude-code-action |
| Claude Code Security Review | https://github.com/anthropics/claude-code-security-review |
| Claude Code GitHub Actions Docs | https://code.claude.com/docs/en/github-actions |
| Claude Code Hooks Reference | https://code.claude.com/docs/en/hooks |
| GitHub Branch Protection Docs | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches |
| Anthropic API Console (billing) | https://console.anthropic.com |

### Example Workflow Skeleton (Phase 1 Reference)

The following is a structural reference for the two workflow files. Actual implementation should follow the latest documentation from the links above.

**claude-review.yml structure:**
```
Trigger: pull_request (opened, synchronize) + issue_comment (created)
Permissions: contents write, pull-requests write, issues write
Job: runs-on ubuntu-latest
Steps:
  1. Checkout code
  2. Run anthropics/claude-code-action@v1
     - prompt: "/review" or custom review prompt referencing CLAUDE.md
     - claude_args: "--max-turns 5 --model claude-sonnet-4-5-20250929"
     - anthropic_api_key from secrets
```

**security-review.yml structure:**
```
Trigger: pull_request
Permissions: pull-requests write, contents read
Job: runs-on ubuntu-latest
Steps:
  1. Checkout code (with fetch-depth: 2)
  2. Run anthropics/claude-code-security-review@main
     - comment-pr: true
     - claude-api-key from secrets
     - custom-security-scan-instructions: path to security guidelines
```

---

*This document is a plan, not a commitment. Each phase has explicit go/no-go criteria. Start with Phase 1, evaluate results, and proceed only when the criteria are met. The total investment to reach Phase 1 is approximately 3-4 hours of setup time and $5-15/month in API costs.*
