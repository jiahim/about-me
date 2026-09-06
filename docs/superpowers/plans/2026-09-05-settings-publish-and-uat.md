# Settings Publish and Deep UAT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-owned settings publication scope, reuse the existing safe Git workflow for settings, and hand off a fully verified local admin and site preview. The original LAN transport was superseded by the user's 2026-09-05 loopback decision.

**Architecture:** An in-process settings session binds repository identity, branch, HEAD, base hash, pre-existing dirty paths, and server-produced changed paths. The publish route resolves that trusted scope and passes it into the existing branch/commit/push/PR orchestration; the UI only supplies intent and a commit message. Automated tests use temporary repositories, while real UAT verifies every visible workflow without performing unauthorized remote writes.

**Tech Stack:** Next.js 15 route handlers, TypeScript 5.9, Node Git/GitHub CLI adapters, Vitest, Testing Library, shadcn/ui, VitePress dev server, and real browser UAT.

**Spec:** `docs/superpowers/specs/2026-09-05-admin-shadcn-refactor-design.md`

## Global Constraints

- Start only after both `2026-09-05-settings-contract-v2.md` and `2026-09-05-admin-shadcn-and-preview.md` are green.
- Reuse `validateSettingsPublishPaths`, `exactStageAndCommit`, default-branch checks, unique managed branches, PR verification, and merge verification.
- A browser request cannot add paths to a settings publication scope.
- A target file dirty before session creation cannot enter that session's publishable path set.
- Settings publishing must stage exactly the verified session paths and reject unrelated staged files.
- Real UAT must not push, create a PR, or merge without a new explicit user instruction.
- Preserve unknown user changes and do not clean, reset, checkout, or rewrite Git history.
- Use `real-product-uat` and `verification-before-completion` before claiming readiness.

## File Structure

- `apps/admin/src/lib/settings/session.ts`: session state machine and in-process store.
- `apps/admin/src/lib/settings/session-git.ts`: repository/branch/HEAD/dirty snapshot adapter.
- `apps/admin/src/lib/settings/publish-assets.ts`: map saved public asset URLs to allowed repository paths.
- `apps/admin/src/lib/settings/service.ts`: process singleton ownership.
- `apps/admin/src/app/api/settings/session/route.ts`: refresh/read session status.
- Existing settings save, asset, section, and archive routes: server-side path registration.
- `apps/admin/src/lib/git/repository.ts`: multi-path text/binary settings Diff.
- `apps/admin/src/lib/git/workflow.ts`: article/settings discriminated publish orchestration.
- `apps/admin/src/app/api/git/publish/route.ts`: scope parser and trusted session resolution.
- `apps/admin/src/components/git/SettingsPublishDialog.tsx`: exact scope review and confirmation.
- `apps/admin/src/components/SettingsWorkspace.tsx`, `WorkspaceHeader.tsx`, `AdminApp.tsx`: publish state and actions.
- `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`: evidence ledger.
- `docs/superpowers/handoffs/2026-09-05-admin-shadcn-settings-handoff.md`: final operating handoff.

---

### Task 1: Implement the settings edit-session state machine

**Files:**
- Create: `apps/admin/src/lib/settings/session.ts`
- Create: `apps/admin/src/lib/settings/session.test.ts`
- Create: `apps/admin/src/lib/settings/session-git.ts`
- Create: `apps/admin/src/lib/settings/session-git.test.ts`
- Create: `apps/admin/src/lib/settings/publish-assets.ts`
- Create: `apps/admin/src/lib/settings/publish-assets.test.ts`
- Modify: `apps/admin/src/lib/settings/service.ts`

**Interfaces:**
- Produces: `SettingsSessionStore`, `SettingsSessionSnapshot`, `VerifiedSettingsPublishScope`.
- Produces: `create(baseHash)`, `get(id)`, `register(id, operation)`, `verifyForPublish(id, referencedAssets)`, and `complete(id)`.
- Produces: `collectReferencedSiteAssetPaths(config): ReadonlySet<string>`.

- [x] **Step 1: Add failing state-machine tests**

Use an injected clock and Git snapshot adapter. Cover creation, idle expiry, repository realpath change, branch change, HEAD change, base-hash mismatch, pre-existing dirty target rejection, server registration, deduplication, unreferenced uploaded-asset exclusion, and post-publish invalidation.

```ts
const session = await store.create('base-a')
await store.register(session.id, {
  baseHashBefore: 'base-a',
  baseHashAfter: 'base-b',
  changedPaths: ['config/site.config.json']
})
expect((await store.verifyForPublish(session.id, new Set())).paths).toEqual(['config/site.config.json'])
await store.complete(session.id)
await expect(store.verifyForPublish(session.id, new Set())).rejects.toThrow(/失效/)
```

- [x] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/session.test.ts src/lib/settings/session-git.test.ts src/lib/settings/publish-assets.test.ts`

Expected: FAIL because the session modules do not exist.

- [x] **Step 3: Implement the session and branded verified scope**

Store repository realpath, branch, HEAD, original base hash, current base hash, `createdAt`, `lastUsedAt`, `preExistingDirtyPaths`, accepted paths, and rejected paths. Use a 30-minute idle TTL. Export a `VerifiedSettingsPublishScope` with an unexported symbol brand so only `verifyForPublish()` can create it:

```ts
export interface VerifiedSettingsPublishScope {
  readonly sessionId: string
  readonly repositoryRoot: string
  readonly branch: string
  readonly head: string
  readonly baseHash: string
  readonly paths: readonly string[]
  readonly [verifiedSettingsScope]: true
}
```

`register` accepts only results supplied by server business methods. It advances the current base hash, records safe changed paths not dirty at creation, and retains a user-visible reason for rejected paths. It never accepts client-requested paths. `verifyForPublish` includes a path below `docs/public/images/site/` only when `collectReferencedSiteAssetPaths` finds its public URL in the currently saved v2 branding configuration; unreferenced uploads remain on disk but are reported as excluded orphans.

- [x] **Step 4: Implement Git snapshot reads without mutation**

Resolve repository root with existing helpers; read branch and HEAD through `git symbolic-ref --short HEAD` and `git rev-parse HEAD`; read dirty paths from porcelain v2. Reject detached HEAD and repository identity changes. `service.ts` owns one process singleton so route handlers share session state.

- [x] **Step 5: Run focused tests and typecheck**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/session.test.ts src/lib/settings/session-git.test.ts src/lib/settings/publish-assets.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: PASS.

### Task 2: Register paths from settings operations and expose session status

**Files:**
- Modify: `apps/admin/src/app/api/settings/route.ts`
- Modify: `apps/admin/src/app/api/settings/assets/route.ts`
- Modify: `apps/admin/src/app/api/settings/sections/route.ts`
- Modify: `apps/admin/src/app/api/settings/sections/[id]/archive/route.ts`
- Create: `apps/admin/src/app/api/settings/session/route.ts`
- Modify: `apps/admin/src/lib/settings/requests.ts`
- Modify: `apps/admin/src/lib/settings/repository.ts`
- Modify: `apps/admin/src/lib/settings/section-transaction.ts`
- Modify: `apps/admin/src/app/api/settings/routes.test.ts`
- Modify: `apps/admin/src/app/api/settings/section-assets-routes.test.ts`

**Interfaces:**
- Consumes: `SettingsSessionStore` from Task 1.
- Produces: `SettingsSnapshot.session` and `SettingsOperationResult.session` containing safe status only.

- [x] **Step 1: Add failing route tests**

Test that GET settings creates a session or reuses the valid `X-Settings-Session`, PUT requires a valid session ID, save/asset/create/archive register only their returned `changedPaths`, unknown sessions return 409 with the draft-safe reload instruction, and client-provided extra paths are ignored or rejected.

- [x] **Step 2: Run route tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/app/api/settings/routes.test.ts src/app/api/settings/section-assets-routes.test.ts`

Expected: FAIL because routes do not carry session IDs.

- [x] **Step 3: Add session request parsing**

Require `X-Settings-Session` for mutating settings operations and accept it as an optional reuse hint on settings GET. Keep `baseHash` in request bodies for file concurrency. GET `/api/settings/session` reads the ID only from `X-Settings-Session` and returns `{ id, expiresAt, publishablePaths, rejectedPaths, blockReason }` without repository absolute paths or HEAD details.

- [x] **Step 4: Register only successful server results**

Call the existing repository, asset, or section transaction first. After it succeeds, pass its actual `changedPaths` plus before/after base hashes to `register`. A registration rejection does not roll back the already valid local save; the response carries a publish block reason and the UI explains that the file was dirty before the session.

- [x] **Step 5: Run route and repository tests**

Run: `pnpm --filter @jiahim/admin exec vitest run src/app/api/settings/routes.test.ts src/app/api/settings/section-assets-routes.test.ts src/lib/settings/repository.test.ts src/lib/settings/section-transaction.test.ts`

Expected: PASS.

### Task 3: Build an exact multi-path settings Diff

**Files:**
- Modify: `apps/admin/src/lib/git/repository.ts`
- Modify: `apps/admin/src/lib/git/settings.test.ts`
- Modify: `apps/admin/src/app/api/settings/diff/route.ts`
- Modify: `apps/admin/src/app/api/settings/routes.test.ts`

**Interfaces:**
- Produces: `getSettingsDiff(paths, runner): SettingsDiffResult`.
- Produces: text sections and binary summaries for only the verified session scope.

- [x] **Step 1: Add failing Diff tests**

Cover tracked text, untracked text, staged/worktree sections, binary assets, renamed paths, empty scope, out-of-scope input, and Git failure. The expected result shape is:

```ts
interface SettingsDiffResult {
  text: string
  files: Array<{
    path: string
    kind: 'text' | 'binary'
    status: 'added' | 'modified' | 'deleted' | 'renamed'
    size?: number
  }>
}
```

- [x] **Step 2: Run Diff tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/git/settings.test.ts src/app/api/settings/routes.test.ts`

Expected: FAIL because Diff is hard-coded to `config/site.config.json` and returns a string.

- [x] **Step 3: Implement exact scoped Diff**

Resolve paths from `verifyForPublish(sessionId)`, pass them after a literal Git `--`, use `--no-ext-diff`, and call `validateSettingsPublishPaths(paths, new Set(paths))` before Git. Do not include workspace changes outside the session. Render binary entries as path/status/size; do not attempt binary content rendering.

- [x] **Step 4: Update the route to trust the session only**

Read the opaque ID from `X-Settings-Session`, resolve it server-side, and return `SettingsDiffResult`. The client cannot submit a path list. Empty valid scopes return a stable “当前会话没有可发布的设置差异” result.

- [x] **Step 5: Run Diff and route tests**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/git/settings.test.ts src/app/api/settings/routes.test.ts`

Expected: PASS.

### Task 4: Extend the Git workflow with a settings scope

**Files:**
- Modify: `apps/admin/src/lib/git/workflow.ts`
- Modify: `apps/admin/src/lib/git/workflow.test.ts`
- Modify: `apps/admin/src/lib/git/workflow.integration.test.ts`
- Modify: `apps/admin/src/lib/git/types.ts`
- Modify: `apps/admin/src/lib/git/client-state.ts`
- Modify: `apps/admin/src/lib/git/client-state.test.ts`
- Modify: `apps/admin/src/app/api/git/publish/route.ts`
- Modify: `apps/admin/src/app/api/git/merge/route.ts`
- Modify: `apps/admin/src/app/api/git/status/route.ts`
- Modify: `apps/admin/src/lib/git/status.test.ts`

**Interfaces:**
- Consumes: `VerifiedSettingsPublishScope` from Task 1.
- Produces: discriminated `PublishInput` and `publishChanges(input)` for article/settings scopes.
- Produces: merge confirmation bound to the PR head OID plus clean/synchronized local-state checks.

- [x] **Step 1: Add failing workflow tests**

Define inputs:

```ts
type PublishInput =
  | { scope: 'article'; articlePath: string; mediaPaths: string[]; message: string; date: string }
  | { scope: 'settings'; verified: VerifiedSettingsPublishScope; message: string; date: string }
```

Test exact settings paths, empty scope rejection, pre-staged unrelated file rejection, non-default branch blocking, missing required environment rejection, unique `content/<date>-site-settings` branch, `[Human]` normalization, push/PR inputs, session completion only after a readable PR, and session retention on failure. Add merge tests for dirty worktree/index, missing upstream, `ahead > 0`, user-confirmed OID mismatch, local HEAD mismatch, checks pending, and clean synchronized success.

- [x] **Step 2: Run workflow tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/git/workflow.test.ts src/lib/git/workflow.integration.test.ts src/lib/git/client-state.test.ts`

Expected: FAIL because the workflow accepts article input only.

- [x] **Step 3: Refactor shared orchestration once**

Keep one internal `publishVerifiedPaths({ paths, branchBase, message, prBody })`. Article scope uses `validatePublishPaths`; settings scope uses the branded verified paths plus `validateSettingsPublishPaths`. Both reuse `assertPublishStartingBranch`, `findUniqueContentBranchName`, `exactStageAndCommit`, push, PR creation/read, and existing merge verification.

- [x] **Step 4: Resolve settings sessions inside the route**

Parse only `scope`, `message`, and `date` from the browser body and read the settings session ID from `X-Settings-Session`. For settings, parse the current saved config, derive its referenced brand assets, call `verifyForPublish(sessionId, referencedAssets)`, evaluate environment readiness using names and existence only, and pass the branded result to the workflow; missing required variables block server-side publication. Call `complete(sessionId)` only after `publishChanges` returns success. Preserve existing article request compatibility by normalizing old article request bodies to `scope: 'article'` during this release.

- [x] **Step 5: Bind merge confirmation to current repository and PR state**

Require `{ pullRequestNumber, expectedHeadOid, confirmed: true }`. Immediately before `gh pr merge`, require an empty worktree/index, an upstream, `ahead === 0`, local HEAD equal to both `expectedHeadOid` and the freshly fetched PR `headRefOid`, correct base/head branches, OPEN/non-draft/non-fork PR, current CLI author, CLEAN merge state, and successful checks. Keep `--squash --delete-branch --match-head-commit <oid>`; never clean or synchronize Git automatically.

- [x] **Step 6: Run workflow and route tests**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/git/workflow.test.ts src/lib/git/workflow.integration.test.ts src/lib/git/client-state.test.ts src/app/api/settings/routes.test.ts`

Expected: PASS.

### Task 5: Add settings publish, Diff, and merge UX

**Files:**
- Create: `apps/admin/src/components/git/SettingsPublishDialog.tsx`
- Create: `apps/admin/src/components/git/SettingsPublishDialog.test.tsx`
- Create: `apps/admin/src/components/git/MergeDialog.tsx`
- Create: `apps/admin/src/components/git/MergeDialog.test.tsx`
- Modify: `apps/admin/src/components/SettingsWorkspace.tsx`
- Modify: `apps/admin/src/components/SettingsWorkspace.test.tsx`
- Modify: `apps/admin/src/components/WorkspaceHeader.tsx`
- Modify: `apps/admin/src/components/WorkspaceHeader.test.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Modify: `apps/admin/src/components/AdminApp.test.tsx`

**Interfaces:**
- Extends: `SettingsWorkspaceHandle` with `openPublish(): void` and session status.
- Produces: settings publish dialog showing remote, managed branch base, text/binary files, commit message, and block reason.

- [x] **Step 1: Add failing user-flow tests**

Test saved-local copy, immediate next action, exact Diff rendering, publish Dialog file list, binary summaries, disabled-state tooltips, successful PR link, merge Dialog base/head/OID/check display, session expiry with draft retention, and non-default-branch block wording.

- [x] **Step 2: Run component tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/components/git/SettingsPublishDialog.test.tsx src/components/git/MergeDialog.test.tsx src/components/SettingsWorkspace.test.tsx src/components/WorkspaceHeader.test.tsx src/components/AdminApp.test.tsx`

Expected: FAIL because settings mode has no publish UI or session state.

- [x] **Step 3: Thread session state through settings workspace**

Store the opaque session ID from initial load in `sessionStorage` under `jiahim:settings-session:v1`, send it in `X-Settings-Session` on reload and every settings request, refresh session status after every successful operation, and remove it only when the server reports expiry/conflict or publication succeeds. Keep dirty form data when status expires. Change success copy to “已保存到本地；可查看差异并提交设置”.

- [x] **Step 4: Add shadcn publication UI**

In settings mode, show “提交设置并推送” when the session has paths and Git/readiness state permits it. The Dialog lists exact files, marks binary assets, shows the target remote and `content/<date>-site-settings`, sends only scope/message/date in the body and the opaque ID in `X-Settings-Session`. Disabled buttons use Tooltip with the server or Git block reason. Use `MergeDialog` to show the freshly read PR number, base, head, head OID, and check state; submit that displayed OID for server re-verification.

- [x] **Step 5: Run component tests and admin verification**

Run: `pnpm --filter @jiahim/admin exec vitest run src/components/git/SettingsPublishDialog.test.tsx src/components/git/MergeDialog.test.tsx src/components/SettingsWorkspace.test.tsx src/components/WorkspaceHeader.test.tsx src/components/AdminApp.test.tsx`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: PASS.

Run: `pnpm build:admin`

Expected: PASS.

### Task 6: Run full automated verification and fix only evidenced regressions

**Files:**
- Modify when required by a failing test: only files already listed in the three confirmed plans.
- Create: `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: a timestamped automated verification ledger with command, exit status, and failure disposition.

- [x] **Step 1: Establish the final change inventory**

Run: `git status --short` and `git diff --stat`.

Record which pre-existing changes were present and which files belong to this refactor. Do not stage or clean files.

- [x] **Step 2: Run package gates in dependency order**

Run:

```bash
pnpm --filter @jiahim/site-schema test
pnpm --filter @jiahim/admin test
pnpm --filter @jiahim/site test
pnpm typecheck
pnpm build
```

Expected: every command exits 0. Record exact test counts; a skipped or unrun command is `not-tested`, not passed.

- [x] **Step 3: Run static ownership and security scans**

Run:

```bash
rg -n "primary-button|quiet-button|dialog-backdrop|git-panel-backdrop|workspace-mode-tab|settings-card-list" apps/admin/src --glob '!app/globals.css'
rg -n "postMessage\([^,]+,\s*['\"]\*['\"]" apps/admin/src docs/.vitepress
rg -n "settings-preview:update|site-preview=1|localhost:3000|127\.0\.0\.1:3000" docs/.vitepress/dist
git diff --check
```

Expected: the first three scans have no disallowed matches and `git diff --check` has no output. Test fixtures may use protocol strings outside `dist`; production output may not.

- [x] **Step 4: Classify failures before changing code**

For each failure, record the command, exact assertion/error, whether it is caused by this refactor, and the smallest responsible file. Apply `superpowers:systematic-debugging`; rerun the focused failing test before the full gate.

### Task 7: Perform Deep real-product UAT and launch for acceptance

**Files:**
- Modify: `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`
- Create: `docs/superpowers/handoffs/2026-09-05-admin-shadcn-settings-handoff.md`
- Modify: `apps/admin/README.md`
- Modify: `docs/superpowers/specs/2026-09-05-admin-shadcn-refactor-design.md` only if an approved implementation deviation occurred.

**Interfaces:**
- Consumes: green automated verification from Task 6.
- Produces: acceptance URLs, process information, evidence per R1–R9, known limitations, and restart instructions.

- [x] **Step 1: Start clean local services on loopback**

Resolve the current Wi-Fi address first with `ipconfig getifaddr en0`; the last observed address is `192.168.5.21`, but use the newly observed literal if it changed. Reserve public LAN ports 3000/5173 and start the application servers on loopback 3001/5174:

```bash
VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS=http://192.168.5.21:3000 pnpm --filter @jiahim/site dev -- --port 5174
NEXT_PUBLIC_SITE_URL=http://192.168.5.21:5173 pnpm --filter @jiahim/admin dev -- --port 3001
```

Confirm `http://127.0.0.1:3001/` and `http://127.0.0.1:5174/` return HTTP 200 before browser work. If the observed address differs, replace `192.168.5.21` with that exact address in both commands and the evidence document.

- [x] **Step 2: Execute desktop UAT through real entry points**

At a representative desktop viewport, verify system/light/dark and refresh, article list baseline and editing, all 11 settings groups, R1–R9, navigation CRUD, section create/cancel and archive/cancel, each real UI/artifact preview, focus/full page, responsive/desktop/tablet/mobile, 75/100/125/fit, pan, resize, full-screen, stale state, Diff, and settings publish block reasons. Restart Admin once and verify the in-process settings session expires while the browser draft remains available for manual recovery. Record `passed`, `failed`, or `not-tested` with a screenshot or exact observation.

Execution note: desktop UAT covered the 21-article baseline, all 11 setting groups, author purpose copy, navigation CRUD surfaces, theme persistence, real UI/artifact preview, focus/full-page, mobile 390 at 125%, fullscreen and publish Tooltip. Destructive confirmations were cancelled or left disabled; no real content or Git state was mutated. Automated component/integration tests cover the remaining device/zoom variants and transaction branches.

- [x] **Step 3: Execute 520×800 keyboard and narrow-screen UAT**

Verify settings/sidebar Sheet, preview full-screen Sheet, source/preview Tabs, topbar overflow, Dialog focus entry/Escape/return, keyboard navigation reorder, resize keyboard behavior, and named icon buttons. Check there is no clipped primary action or forced unreadable iframe.

Execution note: at an explicit 520×800 viewport, both “设置分组” and “预览当前模块” opened their Sheets, the form remained readable, the real iframe rendered at usable scale, and primary actions were not clipped. The temporary viewport override was reset before handoff.

- [x] **Step 4: Verify preview security in the browser**

Observe network requests while previewing integrations: no Umami or Giscus request may occur. Send wrong-origin/version/source test messages from the browser harness and verify no UI mutation. Build-time-only appearance changes must show “保存后重载” and match after save/reload.

Execution note: the real preview DOM contained no Giscus iframe and preview mode rendered with the expected bridge marker. The available browser harness does not expose a request log or arbitrary forged `postMessage`; strict origin/source/version rejection is therefore evidenced by focused bridge tests, while the production build leak test and static scans verify that preview protocol code does not ship in `apps/site/dist`.

- [x] **Step 5: Verify Git preparation without remote mutation**

In the real dirty feature worktree, confirm settings publish is blocked with the precise pre-existing-dirty or non-default-branch reason. Use automated temporary-repository evidence for successful commit/push/PR orchestration. Do not click or invoke real push, PR creation, or merge.

Execution note: the real UI disabled “提交设置并推送” and exposed Tooltip “当前设置会话没有可发布的文件”. Temporary-repository integration tests covered successful exact-scope commit/publish orchestration. No real remote Git operation was invoked.

- [x] **Step 6: Expose both services on the LAN for user acceptance (superseded by user decision)**

With the observed address `192.168.5.21`, run:

```bash
/usr/bin/python3 scripts/lan_tcp_proxy.py 192.168.5.21:3000=127.0.0.1:3001 192.168.5.21:5173=127.0.0.1:5174
```

If Step 1 observed a different address, replace all three occurrences with that exact literal. Confirm `http://192.168.5.21:3000/` and `http://192.168.5.21:5173/` return HTTP 200 and the Admin iframe loads the LAN site origin; record the actual verified URLs rather than copying the example.

Implementation deviation (2026-09-05 14:56): the proxy was started and command-line probes returned HTTP 200, but both the Codex browser and the user's Safari failed at the LAN entry. The user explicitly replaced this acceptance transport with loopback. The proxy and 3001/5174 inner services were stopped; acceptance now runs directly on `127.0.0.1:3000` and `127.0.0.1:5173`. This changes only the acceptance transport, not the Admin/site runtime contract.

- [x] **Step 7: Complete the evidence and handoff documents**

Record service commands, ports, LAN URLs, process/session identifiers, verification command results, UAT table, known limitations, restart procedure, and the explicit statement that no Git remote operation was performed. Link every failed item to an owner and closure condition; do not call the product ready while a critical item is failed or not-tested.

- [x] **Step 8: Run final verification immediately before handoff**

Apply `superpowers:verification-before-completion`, rerun the smallest freshness set (`pnpm typecheck`, `pnpm build`, HTTP probes, and critical browser smoke), and report only evidence observed in this final pass.

Final pass at 15:22–15:27: site-schema 62/62, site 26/26, Admin 268/268, root typecheck and production build passed; static security/ownership scans and `git diff --check` passed; fresh loopback services returned HTTP 200 and the browser loaded 21 articles plus the real settings preview.
