# Settings Workspace UAT Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public image addresses, section cards, save feedback, advanced settings, and repeatable footer links understandable and fully operable without overlapping content.

**Architecture:** The shared schema accepts a safe public asset source contract used by all image fields. Focused settings components render human-readable cards and repeatable link collections, while `SettingsWorkspace` keeps status feedback in normal document flow. Group-specific layout modifiers prevent heterogeneous advanced-setting blocks from sharing stretched grid rows.

**Tech Stack:** React 19, TypeScript, Zod, CSS Grid, Vitest, Testing Library.

**Spec:** Approved bounded design in the 2026-09-03 task conversation; no standalone specification file.

## Global Constraints

- Public assets accept normalized root-relative paths or absolute HTTPS URLs; HTTP is accepted only for loopback preview hosts.
- Values are preserved exactly as entered and are never rewritten between relative and absolute forms.
- Link collection operations modify only the in-memory settings draft until “保存设置” succeeds.
- Delete is reversible by not saving/reloading the source configuration; no immediate file mutation.
- Existing schema safety checks, optimistic `baseHash`, atomic save, and validation issue reporting remain intact.
- No dependency additions.
- Do not commit, push, or create a PR; the user has not authorized Git writes.

---

### Task 1: Safe public asset sources

**Files:**
- Modify: `packages/site-schema/src/schema.ts`
- Modify: `packages/site-schema/src/schema.test.ts`
- Modify: `apps/admin/src/components/SettingsFormHost.tsx`
- Test: `apps/admin/src/components/SettingsFormHost.test.tsx`

**Interfaces:**
- Produces: `publicAssetSourceSchema`, used by logo, favicon, Apple Touch Icon, share image, avatar, homepage hero image, and Open Graph image.
- `TextField` remains the field primitive; image source fields become editable.

- [ ] **Step 1: Write failing schema tests**

```ts
input.branding.logo.src = 'https://cdn.example.com/logo.png'
expect(parseSiteConfiguration(input).branding.logo.src).toBe('https://cdn.example.com/logo.png')
```

Also assert rejection of `http://example.com/a.png`, `javascript:alert(1)`, credential-bearing URLs, protocol-relative URLs, and non-normalized relative paths.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @jiahim/site-schema test`
Expected: the absolute HTTPS acceptance test fails.

- [ ] **Step 3: Implement the schema contract**

Accept either the existing normalized `/...` path or an absolute URL with `https:` and no username/password. Permit `http:` only when hostname is `localhost`, `127.0.0.1`, or `[::1]`. Return the original string without normalization.

- [ ] **Step 4: Add failing form tests**

Render the branding group and assert Logo, share image, Favicon, and Apple Touch Icon source inputs are editable and report the exact entered `https://` value through `onChange` at the expected path.

- [ ] **Step 5: Implement editable image inputs and verify GREEN**

Run: `pnpm --filter @jiahim/site-schema test && pnpm exec vitest run src/components/SettingsFormHost.test.tsx`
Expected: all tests pass.

### Task 2: Human-readable section cards

**Files:**
- Create: `apps/admin/src/components/settings/SettingsSectionCard.tsx`
- Modify: `apps/admin/src/components/SettingsFormHost.tsx`
- Test: `apps/admin/src/components/settings/SettingsSectionCard.test.tsx`

**Interfaces:**
- Consumes: one `SiteConfiguration['sections'][number]`, its array index, and the existing `onChange(path, value)` callback.
- Produces: a card headed by the section name, localized status, `排序第 N 位`, hierarchy label, compact internal ID, and consistently named editable/read-only fields.

- [ ] **Step 1: Write the failing card test**

For section `{ id: 'book', status: 'active', order: 0 }`, assert visible copy includes `已启用`, `排序第 1 位`, and `顶级栏目`, and excludes the raw string `book · active · order 0`. Assert field labels are `栏目名称`, `栏目描述`, `内容目录（只读）`, and `公开路由（只读）`.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/components/settings/SettingsSectionCard.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement and integrate the card**

Keep `id`, directory, and route visible as secondary technical information; do not make protected paths editable. Preserve navigation toggles.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/components/settings/SettingsSectionCard.test.tsx src/components/SettingsWorkspace.test.tsx`
Expected: all tests pass.

### Task 3: Repeatable footer and social links

**Files:**
- Create: `apps/admin/src/components/settings/SettingsLinkList.tsx`
- Modify: `apps/admin/src/components/SettingsFormHost.tsx`
- Test: `apps/admin/src/components/settings/SettingsLinkList.test.tsx`

**Interfaces:**
- Consumes: `title`, `itemLabel`, `links: SiteConfiguration['footer']['links']`, and `onChange(nextLinks)`.
- Produces: `新增`, `删除`, `上移`, and `下移` controls with boundary buttons disabled.

- [ ] **Step 1: Write failing behavior tests**

Start with two literal links. Assert add appends `{ label: '', href: '', newTab: false }`, delete removes only the chosen index, moving the second item up swaps both complete objects, and unavailable moves are disabled.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/components/settings/SettingsLinkList.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the collection editor**

Use immutable array operations and stable temporary keys that do not depend solely on editable `href`. Integrate separate instances for `footer.links` and `footer.social`, each calling the existing path updater with the complete next array.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/components/settings/SettingsLinkList.test.tsx src/components/SettingsWorkspace.test.tsx`
Expected: all tests pass.

### Task 4: Status and advanced layout

**Files:**
- Modify: `apps/admin/src/components/SettingsWorkspace.tsx`
- Modify: `apps/admin/src/components/SettingsFormHost.tsx`
- Modify: `apps/admin/src/app/globals.css`
- Test: `apps/admin/src/components/SettingsWorkspace.test.tsx`
- Test: `apps/admin/src/components/SettingsFormHost.test.tsx`

**Interfaces:**
- Adds `settings-workspace--with-status` only if needed for an explicit CSS state; prefer normal grid flow without state duplication.
- Adds `settings-form-grid--advanced` and semantic advanced-section wrappers.

- [ ] **Step 1: Write failing layout tests**

Render a saved notice and assert the settings workspace computes two rows with the status before the layout, not `position: absolute`. Render the advanced group and assert every direct block spans `grid-column: 1 / -1`, has intrinsic height, and appears in this order: Schema, languages, environment state, normalized JSON.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/components/SettingsWorkspace.test.tsx src/components/SettingsFormHost.test.tsx`
Expected: status positioning or advanced block assertions fail.

- [ ] **Step 3: Implement normal-flow feedback and group layout**

Make `.settings-workspace` a `grid` with `auto minmax(0, 1fr)` rows, remove absolute positioning from its status, and let `.settings-layout` occupy the remaining row. Render advanced settings as named full-width blocks; keep the locale cards in a responsive one-column list at the current 549px form width.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/components/SettingsWorkspace.test.tsx src/components/SettingsFormHost.test.tsx`
Expected: all tests pass.

### Task 5: Integrated verification

**Files:**
- No production file changes.

- [ ] **Step 1: Run shared-schema and admin tests**

Run: `pnpm --filter @jiahim/site-schema test && pnpm --filter @jiahim/admin test && pnpm --filter @jiahim/admin typecheck`
Expected: zero failed tests and TypeScript exits `0`.

- [ ] **Step 2: Browser UAT at 1097×801**

Verify an absolute HTTPS branding URL remains exact in the form, section cards use localized labels, success/error feedback does not cover the toolbar, advanced blocks are single-column and non-stretched, and footer/social add-delete-reorder operations update the draft without writing until Save. Restore any temporary form edits before finishing and confirm no browser warnings or errors.
