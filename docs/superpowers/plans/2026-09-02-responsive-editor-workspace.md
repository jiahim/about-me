# Responsive Editorial Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact editor/preview switch and a narrow-screen article-list drawer so the complete article workflow remains usable at and below 980px.

**Architecture:** `AdminApp` owns transient responsive UI state and renders one focused `ResponsiveWorkspaceControls` component inside the existing workspace. The existing `ArticleSidebar`, `EditorPane`, and `PreviewPane` stay mounted and singular; media-query-scoped classes select the visible pane and transform the sidebar into a drawer below 760px.

**Tech Stack:** TypeScript, React 19, Next.js 15, CSS, Vitest, Testing Library, user-event, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-02-responsive-editor-workspace-design.md`

## Global Constraints

- Do not add Tailwind or any dependency; use the existing React and CSS architecture.
- Preserve the current desktop three-column layout and sidebar collapse preference above 980px.
- Render only one article sidebar, one editor, and one preview; responsive behavior must not duplicate content state.
- At 980px and below expose editor/preview switching; at 760px and below expose the article drawer.
- Close the drawer through Escape, backdrop, new article, and article selection.
- Respect `prefers-reduced-motion` and avoid horizontal page overflow.
- Do not commit, push, or create a PR without explicit user authorization.
- Preserve unrelated changes in the dirty `codex/editorial-cms` worktree.

---

### Task 1: Responsive workspace controls and state

**Files:**
- Create: `apps/admin/src/components/ResponsiveWorkspaceControls.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Modify: `apps/admin/src/components/AdminApp.test.tsx`

**Interfaces:**
- Consumes: `pane: 'source' | 'preview'`, `drawerOpen: boolean`, `onPaneChange`, and `onDrawerOpenChange`.
- Produces: `.responsive-workspace-controls`, workspace modifier classes `workspace--compact-source`, `workspace--compact-preview`, and `workspace--drawer-open`.

- [ ] **Step 1: Write failing tests for the control contract and AdminApp state**

In `AdminApp.test.tsx`, test the real controls through the real app with user-event: “编辑” starts pressed, selecting “预览” changes the pressed state, “文章” exposes `aria-controls="article-sidebar"`, and Escape closes the drawer. Open the drawer, select preview, and assert the workspace modifier classes change.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx`

Expected: FAIL because the component, controls, and workspace state do not exist.

- [ ] **Step 3: Implement the minimal controls and state**

Create:

```ts
export type CompactPane = 'source' | 'preview'

interface ResponsiveWorkspaceControlsProps {
  drawerOpen: boolean
  pane: CompactPane
  onDrawerOpenChange: (open: boolean) => void
  onPaneChange: (pane: CompactPane) => void
}
```

Render a labelled toolbar with a drawer button and two `aria-pressed` pane buttons. In `AdminApp`, add `compactPane` and `sidebarDrawerOpen`, close the drawer on Escape, and append the three modifier classes to `#articles-workspace`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx`

Expected: PASS with no React warnings.

---

### Task 2: Drawer dismissal and navigation behavior

**Files:**
- Modify: `apps/admin/src/components/AdminApp.test.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Modify: `apps/admin/src/components/ArticleSidebar.tsx`

**Interfaces:**
- Consumes: the responsive state from Task 1 and existing `onNew`/`onOpen` sidebar callbacks.
- Produces: `id="article-sidebar"`, `.article-drawer-backdrop`, and drawer close behavior after navigation intent.

- [ ] **Step 1: Write failing integration tests**

Use the real `AdminApp` and API fixtures to verify that clicking “关闭文章列表”, clicking “新建”, and successfully opening an article each remove `workspace--drawer-open`; article navigation also selects `workspace--compact-source`.

- [ ] **Step 2: Run the AdminApp test and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx`

Expected: FAIL because the backdrop and wrapped close behavior are missing.

- [ ] **Step 3: Implement minimal dismissal behavior**

Give the real sidebar `id="article-sidebar"`. Render the labelled backdrop next to it. Wrap `beginNewArticle` and `openArticle` so an accepted navigation closes the drawer and selects the source pane; preserve the dirty-change confirmation path.

- [ ] **Step 4: Run the AdminApp and sidebar tests and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx src/components/ArticleSidebar.test.tsx`

Expected: PASS with the existing sidebar behavior unchanged.

---

### Task 3: Responsive layout, drawer, and motion

**Files:**
- Modify: `apps/admin/src/components/AdminApp.test.tsx`
- Modify: `apps/admin/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 workspace modifier classes and Task 2 backdrop/sidebar identifiers.
- Produces: docked compact layout at 761–980px and animated drawer layout at 760px and below.

- [ ] **Step 1: Write failing stylesheet behavior tests**

Parse the real stylesheet and assert breakpoint-scoped behavior: the toolbar spans the compact grid; source and preview visibility is controlled by workspace modifiers at 980px; the sidebar becomes a fixed off-canvas drawer at 760px; `workspace--drawer-open` reveals the drawer and backdrop; reduced motion removes their transitions.

- [ ] **Step 2: Run the focused stylesheet tests and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx`

Expected: FAIL because the new selectors and drawer rules do not exist.

- [ ] **Step 3: Implement media-query-scoped CSS**

At `max-width: 980px`, add a toolbar row and assign the sidebar and selected pane to the second row. At `max-width: 760px`, switch to one column, position `.article-sidebar` fixed from below the topbar to the viewport bottom, size it with `min(20rem, calc(100vw - 2.5rem))`, translate it off-screen by default, and reveal it plus the backdrop only for `workspace--drawer-open`. Add 160–200ms transitions and reduced-motion overrides.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/AdminApp.test.tsx src/components/ArticleSidebar.test.tsx`

Expected: PASS.

---

### Task 4: Documentation and verification

**Files:**
- Modify: `DESIGN.md`
- Verify all implementation files from Tasks 1–3.

**Interfaces:**
- Consumes: completed responsive behavior.
- Produces: current design contract and automated/browser evidence.

- [ ] **Step 1: Update the design system**

Replace the temporary narrow-screen fallback language and known-gap entries with the implemented editor/preview switch and article drawer contract. Add the responsive decision to the decision log.

- [ ] **Step 2: Run automated verification**

Run: `pnpm --filter @jiahim/admin typecheck`

Run: `pnpm --filter @jiahim/admin test`

Run: `pnpm test`

Expected: all commands exit 0 with no warnings.

- [ ] **Step 3: Run real-browser UAT**

At 1098×801 verify the desktop toolbar is hidden and all three panes remain visible. At 980×801 verify the docked sidebar and editor/preview switch. At 760×801 and 560×801 verify the article drawer, backdrop, Escape, article selection, touch targets, transitions, focus indication, and no horizontal overflow.

- [ ] **Step 4: Inspect console and restore the original viewport**

Reload after UAT, confirm there are no application errors or hydration warnings, and return the browser to the user’s original viewport.
