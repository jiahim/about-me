# Admin shadcn/ui and Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's ad-hoc UI layer with branded shadcn/ui components and deliver a secure, readable, real-VitePress settings preview workbench.

**Architecture:** The React admin owns forms and preview controls; `@jiahim/site-schema` owns a render-only preview envelope; the VitePress theme owns a development-only bridge that applies validated preview state to real public components. Business hooks and API contracts remain stable while presentation components migrate behind focused files.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.9, Tailwind CSS v4, shadcn/ui, Radix UI, Lucide, next-themes, react-resizable-panels, VitePress 1.6, Vue 3, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-05-admin-shadcn-refactor-design.md`

## Global Constraints

- Start only after `2026-09-05-settings-contract-v2.md` is green.
- Preserve the Jia him warm-paper and forest-green visual language in light and dark themes.
- Support `system | light | dark` with persisted selection and no visible hydration mismatch.
- Keep CodeMirror and Markdown storage unchanged.
- Keep the article editor's three-pane information architecture and the settings page's sidebar/form/inspector architecture.
- Preview a complete real VitePress page; default to focused-module mode and provide full-page mode.
- The preview bridge is development-only, uses exact origins and sources, and never starts analytics or comments.
- Do not commit, push, create or update a PR, merge, rebase, or clean worktrees without separate user authorization.
- Use RED → GREEN → REFACTOR for every behavior change.

## File Structure

- `apps/admin/components.json`, `postcss.config.mjs`, `src/app/globals.css`: shadcn and Tailwind v4 foundation.
- `apps/admin/src/components/ui/*`: repository-owned shadcn primitives and variants.
- `apps/admin/src/components/theme-provider.tsx`: next-themes boundary.
- `apps/admin/src/components/shell/*`: admin header, mode navigation, theme control, and global actions.
- `apps/admin/src/components/settings/forms/*`: one component per settings group.
- `apps/admin/src/components/settings/NavigationManager.tsx`: navigation CRUD presentation.
- `apps/admin/src/lib/settings/navigation.ts`: pure navigation mutations and stable ID allocation.
- `apps/admin/src/components/settings-preview/*`: toolbar, iframe canvas, artifacts, and full-screen preview.
- `apps/admin/src/lib/settings-preview/*`: preferences, URL/origin policy, and parent message bridge.
- `packages/site-schema/src/preview.ts`: preview envelope schema and render-model projection.
- `docs/.vitepress/theme/preview/*`: development-only Vue bridge, focus map, and runtime style projection.
- `apps/admin/src/components/articles/*`: migrated article presentation components; existing business modules remain in place until imports are moved.
- `docs/architecture/admin-ui.md`: component ownership and token rules.

---

### Task 1: Install and verify the shadcn/Tailwind foundation

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/admin/components.json`
- Create: `apps/admin/postcss.config.mjs`
- Modify: `apps/admin/src/app/globals.css`
- Modify: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/src/lib/utils.ts`
- Create: `apps/admin/src/components/theme-provider.tsx`
- Test: `apps/admin/src/app/typography.test.tsx`
- Create: `apps/admin/src/components/theme-provider.test.tsx`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`.
- Produces: `<AdminThemeProvider>` and theme values `system | light | dark`.
- Produces: semantic tokens consumed by every later task.

- [x] **Step 1: Add failing foundation tests**

Assert that the root layout adds hydration suppression, wraps children in `AdminThemeProvider`, exposes a named theme control context, and that a representative button uses semantic classes rather than legacy `primary-button`.

- [x] **Step 2: Run the focused tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/app/typography.test.tsx src/components/theme-provider.test.tsx`

Expected: FAIL because the provider and shadcn token layer do not exist.

- [x] **Step 3: Add the exact UI dependencies**

Run:

```bash
pnpm --filter @jiahim/admin add next-themes lucide-react class-variance-authority clsx tailwind-merge tw-animate-css sonner react-resizable-panels @radix-ui/react-alert-dialog @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip
pnpm --filter @jiahim/admin add -D tailwindcss @tailwindcss/postcss
```

Record resolved versions from `apps/admin/package.json` and `pnpm-lock.yaml`; do not accept a second React version.

- [x] **Step 4: Create the Tailwind v4 and theme boundary**

Use `@tailwindcss/postcss` in `postcss.config.mjs`, `@import "tailwindcss"` in `globals.css`, and configure `components.json` with `rsc: true`, `tsx: true`, the `@/components` and `@/lib/utils` aliases, and CSS variables enabled. Define light and `.dark` values for `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `warning`, and chart/sidebar tokens.

Implement the provider:

```tsx
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}
```

Set `<html lang="zh-CN" suppressHydrationWarning>` and render `<Toaster />` once inside the body.

- [x] **Step 5: Run focused tests, typecheck, and a build**

Run: `pnpm --filter @jiahim/admin exec vitest run src/app/typography.test.tsx src/components/theme-provider.test.tsx`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: PASS.

Run: `pnpm build:admin`

Expected: PASS with one React copy and no CSS parser warnings.

### Task 2: Add repository-owned shadcn primitives and the AdminShell

**Files:**
- Create: `apps/admin/src/components/ui/button.tsx`
- Create: `apps/admin/src/components/ui/input.tsx`
- Create: `apps/admin/src/components/ui/textarea.tsx`
- Create: `apps/admin/src/components/ui/label.tsx`
- Create: `apps/admin/src/components/ui/card.tsx`
- Create: `apps/admin/src/components/ui/checkbox.tsx`
- Create: `apps/admin/src/components/ui/switch.tsx`
- Create: `apps/admin/src/components/ui/select.tsx`
- Create: `apps/admin/src/components/ui/badge.tsx`
- Create: `apps/admin/src/components/ui/tabs.tsx`
- Create: `apps/admin/src/components/ui/dialog.tsx`
- Create: `apps/admin/src/components/ui/alert-dialog.tsx`
- Create: `apps/admin/src/components/ui/sheet.tsx`
- Create: `apps/admin/src/components/ui/tooltip.tsx`
- Create: `apps/admin/src/components/ui/separator.tsx`
- Create: `apps/admin/src/components/ui/scroll-area.tsx`
- Create: `apps/admin/src/components/ui/dropdown-menu.tsx`
- Create: `apps/admin/src/components/ui/skeleton.tsx`
- Create: `apps/admin/src/components/ui/resizable.tsx`
- Create: `apps/admin/src/components/ui/field.tsx`
- Create: `apps/admin/src/components/shell/AdminShellHeader.tsx`
- Create: `apps/admin/src/components/shell/ThemeMenu.tsx`
- Modify: `apps/admin/src/components/WorkspaceHeader.tsx`
- Test: `apps/admin/src/components/WorkspaceHeader.test.tsx`

**Interfaces:**
- Consumes: Task 1 tokens and `cn`.
- Produces: only approved primitive import surface under `@/components/ui/*`.
- Produces: `AdminShellHeaderProps`, preserving the current workspace callbacks and adding settings publish state later.

- [x] **Step 1: Add failing shell behavior tests**

Test mode Tabs, direct save action, compact overflow menu, tooltip text for a disabled action, three theme choices, and keyboard activation. Assert no rendered element uses `primary-button`, `quiet-button`, or `workspace-mode-tab`.

- [x] **Step 2: Run shell tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/components/WorkspaceHeader.test.tsx`

Expected: FAIL against the legacy buttons and missing theme menu.

- [x] **Step 3: Add primitives using the checked-in shadcn source pattern**

Generate or copy the shadcn implementations for the listed components, then keep project variants only in those files. The Button variants are exactly `default`, `secondary`, `outline`, `ghost`, `destructive`, and `link`; sizes are `default`, `sm`, `lg`, and `icon`. `field.tsx` composes Label, description, and error slots without owning business validation.

- [x] **Step 4: Replace the header presentation**

Keep the existing `WorkspaceHeaderProps` callback contract. Use Tabs for article/settings mode, Badges for workspace and branch state, Tooltip for block reasons, a DropdownMenu for secondary narrow-screen actions, and `ThemeMenu` for `system/light/dark`. Save and the current next action remain visible at every supported width.

- [x] **Step 5: Run shell tests and accessibility checks**

Run: `pnpm --filter @jiahim/admin exec vitest run src/components/WorkspaceHeader.test.tsx`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: PASS.

### Task 3: Split and migrate settings forms, including navigation CRUD

**Files:**
- Modify: `apps/admin/src/components/SettingsFormHost.tsx`
- Modify: `apps/admin/src/components/SettingsSidebar.tsx`
- Modify: `apps/admin/src/components/settings/SectionManager.tsx`
- Modify: `apps/admin/src/components/settings/SettingsLinkList.tsx`
- Create: `apps/admin/src/components/settings/forms/BasicSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/BrandSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/AuthorSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/HomepageSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/AppearanceSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/SeoGeoSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/FooterSocialSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/IntegrationsSettingsForm.tsx`
- Create: `apps/admin/src/components/settings/forms/AdvancedSettingsForm.tsx`
- Create: `apps/admin/src/lib/settings/navigation.ts`
- Create: `apps/admin/src/lib/settings/navigation.test.ts`
- Create: `apps/admin/src/components/settings/NavigationManager.tsx`
- Create: `apps/admin/src/components/settings/NavigationManager.test.tsx`
- Modify: `apps/admin/src/components/SettingsFormHost.test.tsx`
- Modify: `apps/admin/src/components/settings/SectionManager.test.tsx`

**Interfaces:**
- Produces: `SettingsFieldChange = (path: readonly (string | number)[], value: unknown) => void`.
- Produces: `addSectionNavigation`, `addLinkNavigation`, `updateNavigation`, `moveNavigation`, and `removeNavigation`, each returning a new v2 `SiteConfiguration`.

- [x] **Step 1: Add failing pure navigation tests**

Cover stable IDs, collision suffixes, unused active top-level section choices, section/header synchronization, link editing, visible state, movement, continuous per-locale order, removal semantics, and archiving that hides every anomalous navigation reference rather than only the first:

```ts
const next = addSectionNavigation(config, { locale: 'zh-CN', sectionId: 'notes', label: '笔记' })
expect(next.navigation.at(-1)).toMatchObject({ id: 'nav-notes', order: 4, visible: true })
expect(next.sections.find((item) => item.id === 'notes')?.navigation.header).toBe(true)

const removed = removeNavigation(next, 'nav-notes')
expect(removed.sections.find((item) => item.id === 'notes')?.navigation.header).toBe(false)
```

- [x] **Step 2: Run navigation and settings tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/navigation.test.ts src/components/settings/NavigationManager.test.tsx src/components/SettingsFormHost.test.tsx src/components/settings/SectionManager.test.tsx`

Expected: FAIL because the navigation domain and shadcn forms do not exist.

- [x] **Step 3: Implement pure navigation operations**

Allocate `nav-<slug>` with `-2`, `-3` collision suffixes; accept only section IDs returned by a pure `listAvailableHeaderSections`; normalize order independently per locale after add, move, or remove; update `section.navigation.header` in the same immutable return value.

- [x] **Step 4: Build typed per-group forms and list editors**

Route groups from the small `SettingsFormHost`; use Field, Card, Input, Select, Checkbox/Switch, and Button. The author form edits identity URLs only and explains JSON-LD. The footer form uses provider selection for social items. `NavigationManager` provides add section/add link Dialogs, edit, show/hide, up/down, and AlertDialog removal. `SectionManager` uses Button and AlertDialog and places the archive action inside a `gap-3` section item.

- [x] **Step 5: Run settings tests and verify the reported browser issues**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/navigation.test.ts src/components/settings/NavigationManager.test.tsx src/components/SettingsFormHost.test.tsx src/components/settings/SectionManager.test.tsx src/components/settings/SettingsLinkList.test.tsx`

Expected: PASS. The rendered “新增栏目” is a shadcn Button, archive confirmation is an AlertDialog, and navigation CRUD is keyboard operable.

### Task 4: Define the render-only preview protocol

**Files:**
- Create: `packages/site-schema/src/preview.ts`
- Create: `packages/site-schema/src/preview.test.ts`
- Modify: `packages/site-schema/src/index.ts`
- Create: `apps/admin/src/lib/settings-preview/preferences.ts`
- Create: `apps/admin/src/lib/settings-preview/preferences.test.ts`
- Create: `apps/admin/src/lib/settings-preview/origin.ts`
- Create: `apps/admin/src/lib/settings-preview/origin.test.ts`

**Interfaces:**
- Produces: `SETTINGS_PREVIEW_PROTOCOL_VERSION = 1`.
- Produces: `SettingsPreviewGroup`, `SettingsPreviewModel`, `SettingsPreviewMessage`, `SettingsPreviewReadyMessage`, and Zod parsers.
- Produces: `createSettingsPreviewModel(config, group, readiness)`.
- Produces: `SettingsPreviewPreferences` and storage key `jiahim:settings-preview-preferences:v1`.

- [x] **Step 1: Add failing projection and parser tests**

Assert that the model contains only public render data, excludes `requiredEnvironmentVariables` values and repository paths, rejects unknown message versions/kinds, and produces explicit artifact data for SEO/GEO and integrations.

```ts
const model = createSettingsPreviewModel(config, 'footer-social', readiness)
expect(model).toMatchObject({ version: 1, group: 'footer-social' })
expect(JSON.stringify(model)).not.toContain('contentRoot')
expect(JSON.stringify(model)).not.toContain('websiteIdValue')
expect(() => parseSettingsPreviewMessage({ kind: 'settings-preview:update', version: 2 })).toThrow()
```

- [x] **Step 2: Run protocol tests and confirm RED**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/preview.test.ts`

Expected: FAIL because `preview.ts` does not exist.

- [x] **Step 3: Implement the white-listed model and messages**

The update message has `{ kind: 'settings-preview:update', version: 1, sessionId, model }`; ready has `{ kind: 'settings-preview:ready', version: 1, sessionId }`; navigation has `{ kind: 'settings-preview:navigate', version: 1, sessionId, href }`. `createSettingsPreviewModel` explicitly projects site, brand public assets, author public identity, visible navigation, homepage, appearance, footer, comments/analytics enabled state, generated artifact strings, and readiness booleans. It never spreads the source config.

- [x] **Step 4: Implement safe preferences and exact origin parsing**

Preferences support `mode: 'focus' | 'page'`, `viewport: 'responsive' | 'desktop' | 'tablet' | 'mobile'`, `zoom: 'fit' | 75 | 100 | 125`, and `fullscreen: boolean`. Invalid storage values return defaults. `siteOriginFromUrl` accepts loopback or RFC 1918 private-network HTTP in development, requires HTTPS otherwise, and returns `new URL(value).origin`. Private-network HTTP is intentionally supported because LAN-based UAT is a documented product requirement.

- [x] **Step 5: Run protocol, preferences, and origin tests**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/preview.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings-preview/preferences.test.ts src/lib/settings-preview/origin.test.ts`

Expected: PASS.

### Task 5: Add the development-only VitePress preview bridge

**Files:**
- Create: `docs/.vitepress/theme/preview/focus-targets.ts`
- Create: `docs/.vitepress/theme/preview/runtime-projection.ts`
- Create: `docs/.vitepress/theme/preview/bridge.ts`
- Create: `docs/.vitepress/theme/preview/bridge.test.ts`
- Create: `docs/.vitepress/config/site-config-watcher.ts`
- Create: `docs/.vitepress/config/site-config-watcher.test.ts`
- Modify: `docs/.vitepress/theme/index.ts`
- Modify: `docs/.vitepress/theme/components/ArticleMeta.vue`
- Modify: `docs/.vitepress/theme/components/GiscusComment.vue`
- Modify: `docs/.vitepress/theme/css/custom.css`
- Modify: `docs/.vitepress/config/index.ts`
- Modify: `docs/.vitepress/config/adapter.ts`
- Create: `docs/.vitepress/build/assert-no-preview-bridge.ts`
- Create: `docs/.vitepress/build/assert-no-preview-bridge.test.ts`

**Interfaces:**
- Consumes: Task 4 preview messages.
- Produces: `installSettingsPreviewBridge(options): () => void`.
- Produces: stable `data-settings-preview-target` values for `branding`, `author`, `sections`, `navigation`, `homepage`, `appearance`, and `footer-social`.

- [x] **Step 1: Add failing security and lifecycle tests**

Use fake window/document adapters to prove wrong `origin`, wrong `source`, wrong `sessionId`, wrong protocol version, and invalid payloads are ignored; valid messages apply exactly once; cleanup removes listeners and runtime styles; preview mode never mounts Giscus or analytics. Add watcher tests proving only `config/site.config.json` changes schedule one debounced dev-server restart.

- [x] **Step 2: Run bridge tests and confirm RED**

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/theme/preview/bridge.test.ts docs/.vitepress/config/site-config-watcher.test.ts docs/.vitepress/build/assert-no-preview-bridge.test.ts`

Expected: FAIL because the bridge and production assertion do not exist.

- [x] **Step 3: Implement explicit dev activation and message checks**

Activate only when `import.meta.env.DEV`, `site-preview=1`, a non-empty `previewSession`, and `document.referrer` origin is included in `VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS`. Require `event.source === window.parent`, exact `event.origin`, parsed message, and matching session ID before applying. Reply only to the validated parent origin. Extend `createVitePressAdapter` with `{ command: 'serve' | 'build' }`; omit analytics script injection for every serve build so a preview query cannot trigger it before Vue mounts.

- [x] **Step 4: Apply real component state and focus targets**

Add stable target attributes through theme slots/wrappers. Project brand variables, layout, footer text, navigation labels, homepage content, author metadata, and disabled integration placeholders from the white-listed model. Scroll with `element.scrollIntoView({ block: 'center' })` and apply a removable focus class. Intercept only same-origin anchor navigation and send the sanitized URL to the parent. Register a Vite dev-server plugin that watches the external `config/site.config.json` path and schedules one debounced full restart for reload-required settings; do not assume Vite tracks the synchronous JSON read.

- [x] **Step 5: Add the production leakage gate**

After site build, scan emitted JS/HTML for `settings-preview:update`, `site-preview=1`, and configured admin origins. Production passes only when none are present. Keep the bridge behind a statically eliminable `import.meta.env.DEV` dynamic import.

- [x] **Step 6: Run bridge tests and site build**

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/theme/preview/bridge.test.ts docs/.vitepress/config/site-config-watcher.test.ts docs/.vitepress/build/assert-no-preview-bridge.test.ts`

Expected: PASS.

Run: `pnpm build:site`

Expected: PASS and the post-build leakage assertion reports zero matches.

### Task 6: Build the settings preview workbench

**Files:**
- Modify: `apps/admin/next.config.ts`
- Create: `apps/admin/src/lib/settings-preview/use-preview-bridge.ts`
- Create: `apps/admin/src/lib/settings-preview/use-preview-bridge.test.tsx`
- Create: `apps/admin/src/components/settings-preview/PreviewToolbar.tsx`
- Create: `apps/admin/src/components/settings-preview/PreviewCanvas.tsx`
- Create: `apps/admin/src/components/settings-preview/ArtifactPreview.tsx`
- Create: `apps/admin/src/components/settings-preview/SettingsPreviewWorkbench.tsx`
- Create: `apps/admin/src/components/settings-preview/SettingsPreviewWorkbench.test.tsx`
- Modify: `apps/admin/src/components/SettingsInspector.tsx`
- Modify: `apps/admin/src/components/SettingsWorkspace.tsx`
- Modify: `apps/admin/src/components/SettingsSidebar.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Modify: `apps/admin/src/components/SettingsWorkspace.test.tsx`

**Interfaces:**
- Consumes: protocol from Task 4 and site bridge from Task 5.
- Produces: `<SettingsPreviewWorkbench config group issues readiness siteUrl>`.
- Produces: last-valid-model behavior and `ready | loading | stale | disconnected` preview status.

- [x] **Step 1: Add failing workbench tests**

Test initial iframe URL with query/session, exact-origin postMessage after ready, 150ms debounce, stale banner on invalid draft, group focus messages, full-page toggle, device widths, zoom values, fit floor 75%, persisted preferences, navigation interception, resizable pane, and full-screen Sheet.

- [x] **Step 2: Run workbench tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings-preview/use-preview-bridge.test.tsx src/components/settings-preview/SettingsPreviewWorkbench.test.tsx src/components/SettingsWorkspace.test.tsx`

Expected: FAIL because the real preview workbench is absent.

- [x] **Step 3: Add exact CSP and iframe sandbox policy**

Append `frame-src ${siteOrigin}` to the existing CSP. The iframe uses `sandbox="allow-scripts allow-same-origin"`, `referrerPolicy="strict-origin"`, a title naming the current module, and no clipboard, forms, popups, or top-navigation permissions.

- [x] **Step 4: Implement the bridge hook and last-valid state**

Create a random `sessionId` per iframe mount with `crypto.randomUUID()`. Accept ready/navigation only when origin, source, version, and session match. Recompute a preview model after 150ms; if v2 validation fails, retain the prior model and return `stale`. Never use `'*'` as `targetOrigin`.

- [x] **Step 5: Implement readable viewport and zoom behavior**

Use canvas widths `1280`, `768`, and `390` for desktop/tablet/mobile. Apply scale around the top-left; `fit` uses `Math.max(0.75, Math.min(1, availableWidth / deviceWidth))`. When scaled content exceeds the canvas, ScrollArea exposes both axes. Use Resizable for the desktop inspector and a full-screen Sheet below 761px.

- [x] **Step 6: Replace the fake SettingsInspector preview**

Keep Preview/Issues/Diff Tabs. Reuse shared `SettingsPreviewGroup` in the sidebar, pass `siteUrl` and the already loaded article summaries from `AdminApp`, and choose the first non-draft article as the representative article route. Visual groups show the iframe workbench; SEO/GEO, integration, and advanced groups start on `ArtifactPreview` with a switch to the real page where meaningful. Display “预览仍为上次有效版本” whenever the current draft is invalid. Render Schema migration warnings as persistent Alerts until the normalized v2 configuration is saved; a validation error switches to Issues and focuses the first field whose path can be located.

- [x] **Step 7: Run workbench tests, typecheck, and both builds**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings-preview/use-preview-bridge.test.tsx src/components/settings-preview/SettingsPreviewWorkbench.test.tsx src/components/SettingsWorkspace.test.tsx`

Expected: PASS.

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

### Task 7: Migrate article surfaces and delete the legacy UI system

**Files:**
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Modify: `apps/admin/src/components/ArticleSidebar.tsx`
- Modify: `apps/admin/src/components/EditorPane.tsx`
- Modify: `apps/admin/src/components/PreviewPane.tsx`
- Modify: `apps/admin/src/components/ResponsiveWorkspaceControls.tsx`
- Modify: `apps/admin/src/components/GitPanel.tsx`
- Modify: `apps/admin/src/components/PublishDialog.tsx`
- Modify: `apps/admin/src/components/ArticleQualityPanel.tsx`
- Modify: `apps/admin/src/components/ArticleTitleField.tsx`
- Modify: `apps/admin/src/app/globals.css`
- Modify: corresponding `apps/admin/src/components/*.test.tsx`
- Create: `docs/architecture/admin-ui.md`

**Interfaces:**
- Consumes: Tasks 1–3 UI primitives.
- Produces: one component language across article and settings modes with existing business callback contracts intact.

- [x] **Step 1: Add or update regression tests before presentation changes**

Cover article load/filter/open/create/edit/save, draft recovery, upload, Diff Sheet, publish Dialog, responsive source/preview switch, keyboard resize, and focus return. Add class assertions that forbid legacy generic button/card/dialog classes in rendered output.

- [x] **Step 2: Run the component suite and capture baseline**

Run: `pnpm --filter @jiahim/admin test`

Expected: existing tests PASS; new legacy-class assertions FAIL.

- [x] **Step 3: Migrate presentation without moving business state**

Use ScrollArea/Card/Badge/Button/Skeleton for the article list, Resizable for desktop panes while preserving the existing storage format, Tabs for compact source/preview, Sheet for Git and mobile article navigation, Dialog for publish, AlertDialog for merge, and semantic Alert/Toast feedback. Keep CodeMirror integration and article APIs unchanged.

- [x] **Step 4: Remove legacy generic styles only after reference scans are empty**

Run: `rg -n "primary-button|quiet-button|dialog-backdrop|git-panel-backdrop|workspace-mode-tab|settings-card-list" apps/admin/src --glob '!app/globals.css'`

Expected: no business component references. Then remove the corresponding generic rules from `globals.css`; retain only tokens, shell grids, CodeMirror, Markdown, third-party adapters, and responsive layout rules.

- [x] **Step 5: Document ownership and run the full UI gate**

Document each primitive, allowed variant, token, shell breakpoint, and the rule that business components cannot recreate Radix focus traps. Then run:

Run: `pnpm --filter @jiahim/admin test`

Expected: PASS.

Run: `pnpm --filter @jiahim/admin typecheck`

Expected: PASS.

Run: `pnpm build:admin`

Expected: PASS.

- [ ] **Step 6: Record a no-commit checkpoint**

Run: `git diff --check`

Expected: no output. Record changed files and verification results; do not commit without user authorization.
