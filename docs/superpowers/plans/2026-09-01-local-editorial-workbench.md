# Local Editorial Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved local-only three-pane Markdown workbench with a collapsible article list, CodeMirror editing, draft recovery, and constrained Git/PR publishing.

**Architecture:** `apps/site` remains a VitePress static build; `apps/admin` binds only to `127.0.0.1` and reads the current worktree. Focused React panes consume local APIs; a Git service exposes only status, exact-path commit/push, PR creation, and confirmed merge workflows.

**Tech Stack:** TypeScript 5.9, Next.js 15, React 19, CodeMirror 6, react-markdown, Vitest, Testing Library, local Git, GitHub CLI.

**Spec:** `specs/editorial-cms/PRD.md`, `specs/editorial-cms/DESIGN.md`

## Global Constraints

- Admin is local-only and binds to `127.0.0.1`.
- Desktop defaults to three panes: article list, Markdown source, preview/outline.
- Save, commit/push, and merge/publish are separate actions.
- Staging is limited to the current article plus media uploaded in this editing session.
- Never expose force push, reset, rebase, stash, clean, checkout-overwrite, or whole-repository staging.
- Implement production behavior test-first and watch every new test fail for the intended reason.
- Do not commit, push, create a PR, or merge without explicit user authorization.

---

### Task 1: Test harness and local-only runtime

**Files:**
- Modify: `apps/admin/package.json`, `package.json`
- Modify: `apps/admin/src/lib/env.ts`, `apps/admin/src/lib/session.ts`, `apps/admin/src/lib/content-repository.ts`
- Modify: `apps/admin/src/app/page.tsx`
- Delete: `apps/admin/src/lib/github-repository.ts`, `apps/admin/src/components/LoginScreen.tsx`
- Delete: `apps/admin/src/app/api/auth/login/route.ts`, `callback/route.ts`, `logout/route.ts`
- Create: `apps/admin/vitest.config.ts`, `apps/admin/src/test/setup.ts`, `apps/admin/src/lib/env.test.ts`

**Interfaces:**
- Produces: `getAdminHost(): '127.0.0.1'`, `getSiteUrl(): string`.
- `getContentRepository()` always returns `LocalContentRepository`.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, it } from 'vitest'
import { getAdminHost } from './env'

it('binds the workbench to IPv4 loopback', () => {
  expect(getAdminHost()).toBe('127.0.0.1')
})
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/lib/env.test.ts`

Expected: FAIL because the test script or `getAdminHost` is missing.

- [ ] **Step 3: Add Vitest/jsdom and Testing Library**

Add `test: vitest run`, jsdom environment, `@/` alias, jest-dom setup, and automatic cleanup.

- [ ] **Step 4: Implement local-only mode**

```ts
export function getAdminHost(): '127.0.0.1' {
  return '127.0.0.1'
}
```

Remove GitHub/OAuth branches and routes. The page always receives `{ login: '本地工作区', local: true }`.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/lib/env.test.ts && pnpm typecheck`

Expected: PASS with no warnings.

- [ ] **Step 6: Checkpoint**

Do not commit. If later authorized: `[AI] refactor: make editorial workbench local only`.

---

### Task 2: Three-pane editor and draft recovery

**Files:**
- Create: `apps/admin/src/lib/editor/article-filter.ts`, `article-filter.test.ts`
- Create: `apps/admin/src/lib/editor/outline.ts`, `outline.test.ts`
- Create: `apps/admin/src/lib/editor/drafts.ts`, `drafts.test.ts`
- Create: `apps/admin/src/components/ArticleSidebar.tsx`, `ArticleSidebar.test.tsx`
- Create: `apps/admin/src/components/MarkdownEditor.tsx`, `EditorPane.tsx`, `PreviewPane.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`, `apps/admin/src/app/globals.css`

**Interfaces:**
- `filterArticles(articles, category, query): ArticleSummary[]`
- `extractOutline(markdown): Array<{ level: number; text: string; line: number; id: string }>`
- `readDraft(storage, key, sourceFingerprint): DraftSnapshot | null`

- [ ] **Step 1: Write failing pure tests**

```ts
expect(filterArticles(fixtures, 'skill', 'python')).toEqual([fixtures[1]])
expect(extractOutline('# Title\n\n## Install\n### Verify')).toEqual([
  { level: 2, text: 'Install', line: 3, id: 'install' },
  { level: 3, text: 'Verify', line: 4, id: 'verify' }
])
expect(readDraft(storage, 'key', 'changed-source')).toBeNull()
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/lib/editor`

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Implement filter, fenced-code-aware outline extraction, and versioned drafts**

Search title/description/path case-insensitively. Ignore headings inside fences and level-one article title. Reject malformed, old-version, or source-mismatched recovery snapshots.

- [ ] **Step 4: Verify pure tests GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/lib/editor`

Expected: PASS.

- [ ] **Step 5: Write the failing sidebar test**

```tsx
render(<ArticleSidebar {...props} collapsed={false} />)
await user.click(screen.getByRole('button', { name: '收起文章列表' }))
expect(props.onCollapsedChange).toHaveBeenCalledWith(true)
```

- [ ] **Step 6: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/ArticleSidebar.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 7: Implement components and CodeMirror**

Use `@uiw/react-codemirror` and `@codemirror/lang-markdown` with history, search, line numbers, bracket matching, and `Mod-s`. Persist sidebar state under `jiahim:sidebar-collapsed`; render source and safe ReactMarkdown preview simultaneously.

- [ ] **Step 8: Implement recovery UI**

Debounce writes to `jiahim:draft:<path-or-new-id>`; show explicit restore/discard actions when a valid newer snapshot exists; clear only after successful save.

- [ ] **Step 9: Verify**

Run: `pnpm --filter @jiahim/admin test && pnpm typecheck && pnpm build:admin`

Expected: all pass.

- [ ] **Step 10: Checkpoint**

Do not commit. If later authorized: `[AI] feat: add three-pane markdown workspace`.

---

### Task 3: Read-only Git status, diff, and history

**Files:**
- Create: `apps/admin/src/lib/git/types.ts`, `command.ts`
- Create: `apps/admin/src/lib/git/status.ts`, `status.test.ts`, `repository.ts`
- Create: `apps/admin/src/app/api/git/status/route.ts`, `diff/route.ts`, `history/route.ts`
- Create: `apps/admin/src/components/WorkspaceHeader.tsx`, `GitPanel.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`

**Interfaces:**
- `runCommand(file, args, options): Promise<{ stdout: string; stderr: string }>`
- `parsePorcelainV2(output): ParsedGitStatus`
- `getGitStatus()`, `getArticleDiff(path)`, `getArticleHistory(path)`

- [ ] **Step 1: Write failing parser tests**

Use literal NUL-delimited fixtures for ordinary modifications, rename records, detached HEAD, ahead/behind, and conflicts. Assert hand-derived objects rather than reusing parser helpers.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/status.test.ts`

Expected: FAIL because the parser is missing.

- [ ] **Step 3: Implement parser and command boundary**

Use Node `execFile` with fixed cwd, argument arrays, timeout, max buffer, and sanitized errors. Detect merge/rebase/cherry-pick using paths returned by `git rev-parse --git-path`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/status.test.ts`

Expected: PASS.

- [ ] **Step 5: Implement routes**

Diff: `git diff --no-ext-diff -- <validated-path>`.

History: `git log --follow --format=%H%x1f%h%x1f%aI%x1f%an%x1f%s -n 30 -- <validated-path>`.

- [ ] **Step 6: Implement UI**

Show branch and changed count in the header. “查看差异” opens diff/history tabs. Unsafe states show `blockReason` and disable Git writes.

- [ ] **Step 7: Verify**

Run: `pnpm --filter @jiahim/admin test && pnpm typecheck && pnpm build:admin`

Expected: all pass.

- [ ] **Step 8: Checkpoint**

Do not commit. If later authorized: `[AI] feat: show local git status and article history`.

---

### Task 4: Safe commit, push, PR, and merge

**Files:**
- Create: `apps/admin/src/lib/git/workflow.ts`, `workflow.test.ts`, `workflow.integration.test.ts`
- Create: `apps/admin/src/app/api/git/publish/route.ts`, `merge/route.ts`
- Modify: `apps/admin/src/components/GitPanel.tsx`, `WorkspaceHeader.tsx`, `AdminApp.tsx`
- Delete: `apps/admin/src/app/api/publish/route.ts`

**Interfaces:**
- `buildContentBranchName(date, path): string`
- `validatePublishPaths(articlePath, mediaPaths): string[]`
- `publishChanges(input): Promise<PublishWorkflowResult>`
- `mergePullRequest(input): Promise<MergeWorkflowResult>`

- [ ] **Step 1: Write failing workflow tests**

```ts
expect(buildContentBranchName('2026-09-01', 'docs/zh/essay/my-note.md'))
  .toBe('content/2026-09-01-my-note')
expect(() => validatePublishPaths('docs/zh/essay/a.md', ['package.json']))
  .toThrow('媒体路径不在允许目录')
```

Also assert commit normalization adds `[Human] ` exactly once.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/workflow.test.ts`

Expected: FAIL because workflow helpers are missing.

- [ ] **Step 3: Implement pure validation**

Sanitize branch slug to lowercase letters/numbers/dashes, cap length, validate exact article/media paths, and normalize the message.

- [ ] **Step 4: Verify pure tests GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/workflow.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing temporary-repository integration test**

Create a temp repository with a changed article and unrelated `package.json`. Run only local branch/add/commit logic, then assert the commit contains only the article and `package.json` remains modified.

- [ ] **Step 6: Run and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/workflow.integration.test.ts`

Expected: FAIL because orchestration is missing.

- [ ] **Step 7: Implement the constrained workflow**

Reject detached/conflict/ongoing-operation/missing-remote states and pre-existing staged paths outside the allowed set. Create a content branch only from the default branch, exact-stage paths, commit, push without force, and create/reuse a PR through `gh`. Failures preserve repository state; never reset.

- [ ] **Step 8: Verify integration GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/lib/git/workflow.integration.test.ts`

Expected: PASS without network.

- [ ] **Step 9: Add routes and confirmation UI**

Publish carries `articlePath`, session `mediaPaths`, and message. Merge carries explicit PR number and `confirm: true`. Show exact included files and target PR before action.

- [ ] **Step 10: Verify**

Run: `pnpm --filter @jiahim/admin test && pnpm typecheck && pnpm build:admin`

Expected: all pass.

- [ ] **Step 11: Checkpoint**

Do not commit. If later authorized: `[AI] feat: add safe git publishing workflow`.

---

### Task 5: Documentation and final acceptance

**Files:**
- Modify: `apps/admin/README.md`, `README.md`

**Interfaces:**
- Produces a documented, locally runnable workbench.

- [ ] **Step 1: Document operation**

Document `pnpm dev:admin`, `pnpm dev:site`, Git/SSH, `gh auth status`, safe publish semantics, draft recovery, and P0 limits.

- [ ] **Step 2: Run complete verification**

```bash
pnpm test
pnpm typecheck
pnpm build:admin
pnpm build:site
git diff --check
```

Expected: all pass and `apps/site/dist/admin` does not exist.

- [ ] **Step 3: Browser acceptance**

Verify expanded default, collapse/expand, search/filter, simultaneous source/preview, outline updates, `Mod-s`, draft recovery, diff/history, unsafe Git button disabling, responsive layout, and no console errors.

- [ ] **Step 4: Capture screenshots**

Capture expanded and collapsed states for review, then restore expanded default.

- [ ] **Step 5: Scope and safety review**

Confirm no credentials, caches, generated output, unrelated edits, or unauthorized Git operations are included.

- [ ] **Step 6: Git handoff**

Only after explicit authorization, create scoped `[AI]` commit(s), push `codex/editorial-cms`, and create a PR to `main`. Otherwise report the verified uncommitted status.
