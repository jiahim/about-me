# Admin shadcn/ui Refactor Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the confirmed admin refactor across configuration contracts, shadcn UI, real-site previews, safe settings publishing, and Deep UAT without overlapping state-model changes.

**Architecture:** Three independently testable plans execute serially in one isolated feature worktree. Contract v2 establishes types and public consumers first; the UI/preview plan then builds on those stable types; the publish/UAT plan integrates trusted Git scope and produces the acceptance environment.

**Tech Stack:** TypeScript, Zod, Next.js/React, Tailwind CSS v4, shadcn/ui/Radix, VitePress/Vue, Vitest, Git and GitHub CLI adapters.

**Spec:** `docs/superpowers/specs/2026-09-05-admin-shadcn-refactor-design.md`

## Global Constraints

- Worktree: `/Users/xiexin/project/about-me-editorial-cms`; branch: `codex/editorial-cms`.
- Before every write phase, verify repository root, branch, status, and `git worktree list`.
- Because `apps/admin`, `packages/site-schema`, `config`, the lockfile, and VitePress adapter are conflict hotspots, one primary writer integrates them serially.
- Read-only review and test analysis may run in parallel; a writing subagent requires its own verified worktree and unique branch.
- Existing dirty files are user work and must not be reset, cleaned, staged, or overwritten outside the plan scope.
- No commit, push, PR, merge, rebase, or worktree cleanup is authorized by document confirmation.
- Each task records RED evidence, GREEN evidence, touched files, and deviations in its plan checklist or handoff log.

---

### Task 1: Execute the configuration contract plan

**Files:**
- Read and execute: `docs/superpowers/plans/2026-09-05-settings-contract-v2.md`

**Interfaces:**
- Produces: stable Schema v2, migration report, real public consumers, content/readiness gates, and `docs/architecture/settings-contract.md`.

- [x] **Step 1: Complete every checkbox in the contract plan in order**

Use its focused RED/GREEN commands and do not start UI form migration while v1 types remain in consumers.

- [x] **Step 2: Pass the contract exit gate**

Run: `pnpm --filter @jiahim/site-schema test`

Run: `pnpm --filter @jiahim/site test`

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: all commands exit 0; `CURRENT_SCHEMA_VERSION` is 2 and the field inventory has no unassigned leaf.

### Task 2: Execute the UI and preview plan

**Files:**
- Read and execute: `docs/superpowers/plans/2026-09-05-admin-shadcn-and-preview.md`

**Interfaces:**
- Consumes: Task 1 v2 types and consumers.
- Produces: unified shadcn admin UI, navigation CRUD, real VitePress preview bridge, preview workbench, and `docs/architecture/admin-ui.md`.

- [ ] **Step 1: Complete every checkbox in the UI/preview plan in order**

Install dependencies only after the focused failing tests establish the expected gap. Preserve existing business hooks and storage compatibility while presentation changes.

- [ ] **Step 2: Pass the UI/preview exit gate**

Run: `pnpm --filter @jiahim/admin test`

Run: `pnpm typecheck`

Run: `pnpm build`

Expected: all commands exit 0; legacy generic UI class scans and production preview-leak scans have zero disallowed matches.

### Task 3: Execute settings publishing and Deep UAT

**Files:**
- Read and execute: `docs/superpowers/plans/2026-09-05-settings-publish-and-uat.md`

**Interfaces:**
- Consumes: Tasks 1–2 settings state, shadcn components, and preview workbench.
- Produces: trusted settings sessions, exact Diff/publish scope, settings publish UI, full automated evidence, LAN acceptance services, and final handoff.

- [ ] **Step 1: Complete every checkbox through automated verification**

Keep real remote Git mutations disabled. Exercise successful Git orchestration only in temporary repositories and fake GitHub CLI adapters.

- [ ] **Step 2: Apply the required completion skills**

Use `real-product-uat` for rendered desktop/narrow-screen workflows and `verification-before-completion` for the final fresh command and HTTP evidence.

- [ ] **Step 3: Pass the final readiness gate and launch**

Run: `pnpm test`

Run: `pnpm typecheck`

Run: `pnpm build`

Run: `git diff --check`

Expected: all commands exit 0. Then expose loopback Admin/Site through the LAN proxy, confirm both LAN URLs and the embedded preview return HTTP 200, and leave services running for user acceptance.

### Task 4: Report completion without unauthorized Git actions

**Files:**
- Finalize: `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`
- Finalize: `docs/superpowers/handoffs/2026-09-05-admin-shadcn-settings-handoff.md`

**Interfaces:**
- Produces: self-contained acceptance report with links and live endpoints.

- [ ] **Step 1: Report evidence and remaining constraints**

Lead with the live Admin and site LAN URLs. Include automated command counts, UAT pass/fail/not-tested rows, known limitations, restart instructions, changed-document links, and confirmation that no commit or remote Git operation occurred.
