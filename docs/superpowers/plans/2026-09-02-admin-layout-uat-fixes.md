# Admin Layout UAT Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the admin header, article directory, and sidebar toggle so the workbench remains usable at the reported 820×801 viewport.

**Architecture:** Keep `WorkspaceHeader` and `ArticleSidebar` as the existing ownership boundaries. Remove the broad CSS selectors that leak across those boundaries, separate horizontal category filters from the vertically scrolling article tree, and use one absolutely positioned sidebar toggle in both expanded and collapsed states.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vitest, Testing Library, jsdom, CSS, pnpm.

**Spec:** `specs/editorial-cms/PRD.md` sections 5.1–5.4 and `specs/editorial-cms/DESIGN.md` section 4.

## Global Constraints

- Use TypeScript and the existing pnpm workspace; Node.js must remain 22+.
- The admin remains local-only and bound to `127.0.0.1`; add no deployment configuration or dependency.
- Preserve the 300px/260px expanded and 52px collapsed workbench grid behavior.
- Preserve search, loading, empty-category, category filtering, draft badges, and article opening behavior.
- Do not commit, push, or create a PR without explicit user authorization.
- Treat the existing uncommitted files in `codex/editorial-cms` as user-owned and avoid unrelated edits.

---

### Task 1: Keep workspace mode tabs horizontal

**Files:**
- Modify: `apps/admin/src/components/WorkspaceHeader.test.tsx`
- Modify: `apps/admin/src/app/globals.css`

**Interfaces:**
- Consumes: `WorkspaceHeader` and `.workspace-mode-tabs`.
- Produces: a horizontal tablist that remains inside the fixed-height topbar at 820px.

- [ ] **Step 1: Add the failing computed-style regression test**

Render the real stylesheet with the component and assert the user-visible tablist layout:

```tsx
const css = readFileSync(
  fileURLToPath(new URL('../app/globals.css', import.meta.url)),
  'utf8'
)

render(
  <>
    <style>{css}</style>
    <WorkspaceHeader {...props} />
  </>
)

expect(getComputedStyle(screen.getByRole('tablist', { name: '工作区模式' })).display)
  .toBe('flex')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/WorkspaceHeader.test.tsx`

Expected: FAIL because the broad `.brand-lockup div` selector currently wins the cascade and computes `display: grid`.

- [ ] **Step 3: Remove the selector collision**

Delete the obsolete `.brand-lockup div` and `.brand-lockup div span` rules, replace the `max-width: 560px` descendant rule with an explicit intended target, and keep the tab styles horizontal:

```css
.workspace-mode-tabs {
  display: flex;
  flex: 0 0 auto;
}

.workspace-mode-tab {
  white-space: nowrap;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/WorkspaceHeader.test.tsx`

Expected: PASS with no warnings.

---

### Task 2: Separate category filters from the article tree

**Files:**
- Modify: `apps/admin/src/components/ArticleSidebar.test.tsx`
- Modify: `apps/admin/src/components/ArticleSidebar.tsx`
- Modify: `apps/admin/src/app/globals.css`

**Interfaces:**
- Consumes: `filterArticles`, `ArticleSummary`, `CategoryDefinition`, and the existing `onFilterChange`/`onOpen` callbacks.
- Produces: `.category-tabs` containing filters only and `.article-list` containing either `.article-tree` or filtered article rows.

- [ ] **Step 1: Add failing structure and content tests**

Assert that the tree is no longer owned by the horizontal navigation and that grouped article rows do not repeat their category label:

```tsx
const navigation = screen.getByRole('navigation', { name: '文章分类' })
const tree = screen.getByRole('tree', { name: '文章目录树' })
const article = within(tree).getByRole('treeitem', { name: /一篇文章/ })

expect(navigation).not.toContainElement(tree)
expect(within(article).queryByText('随笔')).not.toBeInTheDocument()
expect(getComputedStyle(article).display).toBe('grid')
```

Add a draft fixture and assert its `草稿` badge remains visible after category text is removed.

- [ ] **Step 2: Run the sidebar test and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/ArticleSidebar.test.tsx`

Expected: FAIL because the tree is currently a `.category-tabs` child, the article row repeats `随笔`, and the leaked button rule computes `display: flex`.

- [ ] **Step 3: Move tree rendering into the scrolling list**

Keep the category navigation limited to direct filter buttons, then always render the list container:

```tsx
<nav className="category-tabs" aria-label="文章分类">
  <button className={filter === 'all' ? 'is-active' : ''}>全部 <span>{articles.length}</span></button>
  {!treeMode && categories.map(renderCategoryFilter)}
</nav>

<div className="article-list" aria-busy={loading}>
  {treeMode ? (
    <div className="article-tree" role="tree" aria-label="文章目录树">
      {renderCategoryTree()}
    </div>
  ) : visibleArticles.map((article) => renderArticle(article))}
</div>
```

Give category buttons a dedicated class and make `renderArticle(article, true)` omit category text while retaining the draft badge.

- [ ] **Step 4: Scope styles to their real owners**

Change `.category-tabs button` and `.category-tabs button span` to direct-child selectors. Add `.article-tree`, `.article-tree__category`, and `.article-tree__category-button` rules with `min-width: 0`, `width: 100%`, vertical flow, and no horizontal overflow. Preserve `.article-row { display: grid; }`.

- [ ] **Step 5: Run the focused sidebar test and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/ArticleSidebar.test.tsx`

Expected: PASS; loading, nested/hidden categories, draft badge, and opening callbacks remain covered.

---

### Task 3: Put one directional toggle on the sidebar midpoint

**Files:**
- Modify: `apps/admin/src/components/ArticleSidebar.test.tsx`
- Modify: `apps/admin/src/components/ArticleSidebar.tsx`
- Modify: `apps/admin/src/app/globals.css`

**Interfaces:**
- Consumes: `collapsed` and `onCollapsedChange`.
- Produces: `.sidebar-toggle-button` in both states with synchronized arrow, label, and `aria-expanded`.

- [ ] **Step 1: Add failing toggle-contract tests**

```tsx
const collapse = screen.getByRole('button', { name: '收起文章列表' })
expect(collapse).toHaveClass('sidebar-toggle-button')
expect(collapse).toHaveTextContent('‹')
expect(collapse).toHaveAttribute('aria-expanded', 'true')
expect(getComputedStyle(collapse).position).toBe('absolute')

const expand = screen.getByRole('button', { name: '展开文章列表' })
expect(expand).toHaveClass('sidebar-toggle-button')
expect(expand).toHaveTextContent('›')
expect(expand).toHaveAttribute('aria-expanded', 'false')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @jiahim/admin test -- src/components/ArticleSidebar.test.tsx`

Expected: FAIL because expanded mode uses text `收起`, the two states use different classes, and both controls are in normal flow.

- [ ] **Step 3: Implement the shared midpoint toggle**

Render the same class in both states, keep the button inside the sidebar clipping boundary, and synchronize the contract:

```tsx
<button
  className="sidebar-toggle-button"
  type="button"
  aria-label={collapsed ? '展开文章列表' : '收起文章列表'}
  aria-expanded={!collapsed}
  onClick={() => onCollapsedChange(!collapsed)}
>
  <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
</button>
```

```css
.article-sidebar { position: relative; }
.sidebar-toggle-button {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm --filter @jiahim/admin test -- src/components/ArticleSidebar.test.tsx`

Expected: PASS in expanded and collapsed states.

---

### Task 4: Verification and real-browser UAT

**Files:**
- Verify only; no additional production files unless a failing check exposes an in-scope regression.

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: automated and visual evidence that the reported viewport is usable.

- [ ] **Step 1: Run focused tests together**

Run: `pnpm --filter @jiahim/admin test -- src/components/WorkspaceHeader.test.tsx src/components/ArticleSidebar.test.tsx`

Expected: all focused tests PASS with no warnings.

- [ ] **Step 2: Run admin typecheck and full repository tests**

Run: `pnpm --filter @jiahim/admin typecheck`

Run: `pnpm test`

Expected: both commands exit 0.

- [ ] **Step 3: UAT at the reported 820×801 viewport**

Reload `http://127.0.0.1:3000/` and verify:

- both workspace tabs share the same y-coordinate and remain inside the header;
- the “全部 21” filter is a normal-height row;
- the tree and article rows have no horizontal overflow or clipping;
- the toggle center is within 2px of the sidebar vertical center and its right edge touches the sidebar boundary;
- clicking `‹` collapses the sidebar to about 52px and changes the control to `›`; clicking `›` restores it to about 260px;
- category filtering, search, article opening, and the settings tab still work.

- [ ] **Step 4: Run a wider desktop smoke check and restore the user viewport**

Verify the three-column layout at a wider viewport, then reset the temporary viewport override so the user’s browser remains at its original size.

- [ ] **Step 5: Request a read-only code review**

Ask a fresh reviewer to inspect only the task diff for correctness, accessibility, selector leakage, and regression risk. Address Critical/Important findings, then rerun the affected verification.
