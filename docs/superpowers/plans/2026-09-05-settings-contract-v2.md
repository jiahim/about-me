# Settings Contract v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the site configuration to Schema v2, migrate v1 data without silent loss, and ensure every editable setting has a real public-site consumer, generated artifact, or removal decision.

**Architecture:** `@jiahim/site-schema` remains the single contract owner and exposes a report-producing v1→v2 migration plus the existing parse convenience API. VitePress adapters, generators, article quality checks, and build readiness consume the normalized v2 shape; the admin does not carry compatibility branches beyond reading old browser drafts.

**Tech Stack:** TypeScript 5.9, Zod 4, Vitest 3, VitePress 1.6, Vue 3, Next.js 15.

**Spec:** `docs/superpowers/specs/2026-09-05-admin-shadcn-refactor-design.md`

## Global Constraints

- Keep `config/site.config.json` as the only persisted site configuration source.
- Set the persisted contract to `schemaVersion: 2` and migrate both disk configuration and `jiahim:site-settings-draft:v1` deterministically.
- An editable field must have a runtime consumer, an artifact/readiness consumer, or be removed.
- Preserve unknown v1 social links with a safe generic provider and preserve every `author.sameAs[].href`.
- Do not change the public site's established visual language.
- Do not commit, push, create or update a PR, merge, rebase, or clean worktrees without separate user authorization.
- Use RED → GREEN → REFACTOR for every behavior change and record the exact failing and passing commands.

## File Structure

- `packages/site-schema/src/schema.ts`: v2 schemas and exported configuration types.
- `packages/site-schema/src/migrations.ts`: v1 input recognition, deterministic transformation, and warnings.
- `packages/site-schema/src/defaults.ts`: canonical v2 defaults.
- `packages/site-schema/src/validation.ts`: cross-field v2 invariants.
- `packages/site-schema/src/index.ts`: parse APIs and migration report exports.
- `packages/site-schema/src/field-consumers.ts`: machine-readable leaf-field ownership inventory.
- `packages/site-schema/src/public-artifacts.ts`: pure robots, Feed, sitemap, llms, and JSON-LD generators shared by build and preview.
- `packages/site-schema/src/content-signals.ts`: shared deterministic article policy findings.
- `packages/site-schema/src/readiness.ts`: environment-name readiness without secret values.
- `packages/site-schema/src/*.test.ts`: schema, migration, and package-consumer regression evidence.
- `config/site.config.json`: migrated v2 production configuration.
- `docs/.vitepress/config/adapter.ts`: VitePress visual and metadata consumers.
- `docs/.vitepress/build/content-audit.ts`: build-time content-signal evaluation.
- `docs/.vitepress/build/generate-public-files.ts`: public artifact generation and audit gate.
- `docs/.vitepress/theme/index.ts`: runtime default-theme and content-layout application.
- `docs/.vitepress/theme/css/custom.css`: configurable brand/layout variables only.
- `apps/admin/src/lib/seo/article-checks.ts`: editor-facing content-signal evaluation.
- `apps/admin/src/app/page.tsx` and `apps/admin/src/components/AdminApp.tsx`: pass normalized policy into the editor.
- `apps/admin/src/lib/settings/drafts.ts`: browser draft v1→v2 migration.
- `docs/architecture/settings-contract.md`: authoritative per-field consumer matrix.

---

### Task 1: Define the v2 contract and migration report

**Files:**
- Modify: `packages/site-schema/src/schema.ts`
- Modify: `packages/site-schema/src/migrations.ts`
- Modify: `packages/site-schema/src/index.ts`
- Create: `packages/site-schema/src/fixtures/v1-default.json`
- Test: `packages/site-schema/src/migrations.test.ts`
- Test: `packages/site-schema/src/schema.test.ts`

**Interfaces:**
- Produces: `MigrationWarning`, `SiteConfigurationMigrationResult`, `migrateSiteConfiguration(input)`, `parseSiteConfigurationWithReport(input)`.
- Produces: v2 `SiteConfiguration` with `author.sameAs: string[]` and provider-based `footer.social`.

- [x] **Step 1: Add failing golden migration tests**

Store the current checked-in v1 shape in `src/fixtures/v1-default.json`, load it in the test with `JSON.parse(readFileSync(new URL('./fixtures/v1-default.json', import.meta.url), 'utf8'))`, clone it per test, and assert the exact decisions:

```ts
const v1 = JSON.parse(
  readFileSync(new URL('./fixtures/v1-default.json', import.meta.url), 'utf8')
) as {
  branding: { shareImage: { src: string; alt: string } }
  seo: { openGraph: { image: { src: string; alt: string } } }
  author: { sameAs: Array<{ label: string; href: string; newTab: boolean }> }
  footer: { social: Array<{ label: string; href: string; newTab: boolean }> }
}
v1.branding.shareImage = { src: '/old.png', alt: 'old' }
v1.seo.openGraph.image = { src: '/effective.png', alt: 'effective' }
v1.author.sameAs = [{ label: 'GitHub', href: 'https://github.com/example', newTab: true }]
v1.footer.social = [{ label: 'Mastodon', href: 'https://example.social/@me', newTab: true }]

const result = migrateSiteConfiguration(v1)
expect(result.config.schemaVersion).toBe(2)
expect(result.config.branding.shareImage).toEqual({ src: '/effective.png', alt: 'effective' })
expect(result.config.author.sameAs).toEqual(['https://github.com/example'])
expect(result.config.footer.social).toEqual([
  { provider: 'generic', label: 'Mastodon', href: 'https://example.social/@me' }
])
expect(result.warnings.map((warning) => warning.code)).toContain('share-image-conflict')
```

- [x] **Step 2: Run the focused tests and capture the expected RED result**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/migrations.test.ts src/schema.test.ts`

Expected: FAIL because the current migration rejects version 1 after the current version becomes 2 and the v2 properties do not exist.

- [x] **Step 3: Implement exact v2 shapes and the migration API**

Define these public shapes in `schema.ts`:

```ts
export const authorIdentityUrlSchema = z.string().url()
export const socialProviderSchema = z.enum([
  'github', 'x', 'linkedin', 'youtube', 'rss', 'generic'
])
export const socialLinkSchema = z.strictObject({
  provider: socialProviderSchema,
  label: z.string().min(1),
  href: z.string().min(1)
})
```

Use `schemaVersion: z.literal(2)`, remove favicon/apple-touch/avatar alt, `featuredArticles`, crawler `purpose`, `seo.openGraph.type`, and `seo.openGraph.image`; keep the single `branding.shareImage`. Restrict code themes to these initial supported values:

```ts
light: z.enum(['github-light', 'vitesse-light', 'min-light']),
dark: z.enum(['github-dark', 'vitesse-dark', 'min-dark', 'nord', 'one-dark-pro'])
```

Implement the report contract:

```ts
export interface MigrationWarning {
  code: 'share-image-conflict' | 'unknown-social-provider' | 'featured-articles-removed'
  path: string
  message: string
}

export interface SiteConfigurationMigrationResult {
  config: SiteConfiguration
  sourceVersion: 1 | 2
  warnings: MigrationWarning[]
}
```

`migrateSiteConfiguration` clones v2 inputs and transforms v1 inputs; it rejects missing, non-integer, version `< 1`, and version `> 2`.

- [x] **Step 4: Export a report parser while preserving the simple parser**

Implement in `index.ts`:

```ts
export function parseSiteConfigurationWithReport(input: unknown) {
  const migration = migrateSiteConfiguration(input)
  assertNoSecretFields(migration.config)
  const parsed = siteConfigurationSchema.parse(migration.config)
  validateSiteConfiguration(parsed)
  return {
    config: deepFreeze(parsed),
    sourceVersion: migration.sourceVersion,
    warnings: Object.freeze(migration.warnings.slice())
  }
}

export function parseSiteConfiguration(input: unknown): NormalizedSiteConfiguration {
  return parseSiteConfigurationWithReport(input).config
}
```

- [x] **Step 5: Run the focused tests and package typecheck**

Run: `pnpm --filter @jiahim/site-schema test`

Expected: PASS, including golden conflict, unknown social, href preservation, v2 cloning, and future-version rejection.

Run: `pnpm --filter @jiahim/site-schema typecheck`

Expected: PASS.

- [x] **Step 6: Record a no-commit checkpoint**

Run: `git diff --check -- packages/site-schema/src`

Expected: no output. Record the RED and GREEN commands in the implementation log; do not create a commit without user authorization.

### Task 2: Add cross-field v2 invariants and canonical defaults

**Files:**
- Modify: `packages/site-schema/src/defaults.ts`
- Modify: `packages/site-schema/src/validation.ts`
- Test: `packages/site-schema/src/schema.test.ts`
- Test: `packages/site-schema/src/sections.test.ts`

**Interfaces:**
- Consumes: v2 `SiteConfiguration` from Task 1.
- Produces: a default configuration that parses without migration warnings.

- [x] **Step 1: Add failing invariant tests**

Add tests using explicit clones of `createDefaultSiteConfiguration()`:

```ts
const defaultNotRoot = createDefaultSiteConfiguration()
defaultNotRoot.locales['zh-CN'].vitepressKey = 'zh'
expect(() => parseSiteConfiguration(defaultNotRoot)).toThrow(/默认语言.*root/)

const duplicateNavigation = createDefaultSiteConfiguration()
duplicateNavigation.navigation.push({ ...duplicateNavigation.navigation[0], id: 'nav-book-2' })
expect(() => parseSiteConfiguration(duplicateNavigation)).toThrow(/栏目.*导航.*唯一/)

const orderGap = createDefaultSiteConfiguration()
orderGap.navigation[1].order = 8
expect(() => parseSiteConfiguration(orderGap)).toThrow(/导航顺序.*连续/)

const headerMismatch = createDefaultSiteConfiguration()
headerMismatch.sections[0].navigation.header = false
expect(() => parseSiteConfiguration(headerMismatch)).toThrow(/顶部导航.*一致/)
```

- [x] **Step 2: Run the invariant tests and confirm RED**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/schema.test.ts src/sections.test.ts`

Expected: FAIL because the v1 validator does not enforce root-locale, unique section navigation, continuous order, or atomic header state.

- [x] **Step 3: Implement deterministic invariants**

In `validateSiteConfiguration`, require exactly one enabled `vitepressKey === 'root'`, require it to match `site.defaultLocale`, require at most one section navigation item per section, require order `0..n-1` within each locale, and require an active top-level section's `navigation.header` to equal whether it has a visible section navigation item.

- [x] **Step 4: Convert defaults to v2**

Set `CURRENT_SCHEMA_VERSION = 2`, remove retired fields, convert `author.sameAs` to URL strings, and set the existing GitHub social item to:

```ts
{ provider: 'github', label: 'GitHub', href: 'https://github.com/xiexin12138' }
```

- [x] **Step 5: Run schema tests and package build**

Run: `pnpm --filter @jiahim/site-schema test`

Expected: PASS.

Run: `pnpm --filter @jiahim/site-schema build`

Expected: PASS and `dist/index.d.ts` exposes Schema v2 types.

#### Implementation log — Tasks 1–2 (2026-09-05)

- RED: `pnpm --filter @jiahim/site-schema exec vitest run src/migrations.test.ts src/schema.test.ts` — 7 expected failures for the missing v2 API, retired fields, and cross-field invariants.
- GREEN: the same focused command — 43 tests passed.
- Consumer RED: `pnpm --filter @jiahim/site-schema test` — 2 expected failures: ESM version output was still asserted as `1`, and Admin retained v1 field consumers.
- Admin RED: `pnpm --filter @jiahim/admin exec vitest run src/components/SettingsFormHost.test.tsx` — 4 expected failures covering removed v1 controls and the v2 social-link shape.
- Admin GREEN: the same focused command — 9 tests passed; `pnpm --filter @jiahim/admin typecheck` exited 0.
- Site RED: `pnpm --filter @jiahim/site test` — 6 expected failures covering old `sameAs`, OG image, social-label inference, and the new continuous-order invariant.
- Site GREEN: the same command — 15 tests passed.
- Package GREEN: `pnpm --filter @jiahim/site-schema test` — 49 tests passed, including both clean consumer checks; `pnpm --filter @jiahim/site-schema typecheck` exited 0.
- Checkpoint: `git diff --check -- packages/site-schema/src` and the broader `git diff --check` produced no whitespace errors. No commit or remote Git action was performed.
- Necessary consumer adjustment: Admin and VitePress v1 references were removed during the contract checkpoint because the package consumer test intentionally typechecks Admin against the built declarations. Full visual adapter wiring remains in Task 4.

### Task 3: Migrate persisted configuration and browser drafts

**Files:**
- Modify: `config/site.config.json`
- Modify: `apps/admin/src/lib/settings/drafts.ts`
- Test: `apps/admin/src/lib/settings/drafts.test.ts`
- Modify: `apps/admin/src/lib/settings/repository.ts`
- Test: `apps/admin/src/lib/settings/repository.test.ts`

**Interfaces:**
- Consumes: `parseSiteConfigurationWithReport` from Task 1.
- Produces: `SettingsSnapshot.migrationWarnings` and browser draft key `jiahim:site-settings-draft:v2`.

- [x] **Step 1: Add failing repository and draft migration tests**

Assert that reading a v1 file returns normalized v2 plus warnings without writing, saving persists v2, a v1 browser draft is restored when its base hash matches, and the v1 key is removed only after successful conversion.

```ts
expect(snapshot.config.schemaVersion).toBe(2)
expect(snapshot.migrationWarnings).toContainEqual(
  expect.objectContaining({ code: 'share-image-conflict' })
)
expect(storage.getItem('jiahim:site-settings-draft:v2')).not.toBeNull()
expect(storage.getItem('jiahim:site-settings-draft:v1')).toBeNull()
```

- [x] **Step 2: Run focused admin tests and confirm RED**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/drafts.test.ts src/lib/settings/repository.test.ts`

Expected: FAIL because snapshots do not report migration warnings and only draft version 1 exists.

- [x] **Step 3: Implement safe disk and draft compatibility**

Extend `SettingsSnapshot` with `migrationWarnings: readonly MigrationWarning[]`. `read()` reports warnings but remains read-only; `save()` emits normalized v2 JSON through the existing atomic write and base-hash protection. Draft conversion parses the old value through `parseSiteConfigurationWithReport`, writes version 2, then removes the old key.

- [x] **Step 4: Apply the same deterministic migration to the checked-in configuration**

Update `config/site.config.json` to the exact v2 result: the currently effective SEO image becomes `branding.shareImage`, author identities become URL strings, GitHub becomes provider-based social, and retired fields disappear. Do not alter unrelated content values.

- [x] **Step 5: Run focused and full contract tests**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/drafts.test.ts src/lib/settings/repository.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/site-schema test`

Expected: PASS with the checked-in v2 config accepted by consumer tests.

#### Implementation log — Task 3 (2026-09-05)

- RED: `pnpm --filter @jiahim/admin exec vitest run src/lib/settings/drafts.test.ts src/lib/settings/repository.test.ts` — 5 expected failures for the old draft envelope/key and missing migration warning surface.
- GREEN: the same command — 19 tests passed.
- Persistence: repository reads v1 without mutation, reports deterministic warnings, and writes normalized v2 only after the existing hash/lock/atomic-write checks; invalid v1 browser drafts are retained.
- Checked-in config: `config/site.config.json` was replaced with the exact output of `parseSiteConfiguration(v1)`; the golden v1 bytes remain in `packages/site-schema/src/fixtures/v1-default.json`.
- Verification: `pnpm --filter @jiahim/admin typecheck` exited 0; `pnpm --filter @jiahim/site-schema test` passed 49 tests.

### Task 4: Wire visual and metadata consumers

**Files:**
- Modify: `docs/.vitepress/config/adapter.ts`
- Modify: `docs/.vitepress/config/adapter.test.ts`
- Modify: `docs/.vitepress/config/shared.ts`
- Modify: `docs/.vitepress/config/index.ts`
- Modify: `docs/.vitepress/theme/index.ts`
- Modify: `docs/.vitepress/theme/css/custom.css`

**Interfaces:**
- Consumes: v2 brand, SEO, appearance, and social types plus adapter option `{ command: 'serve' | 'build' }`.
- Produces: `resolveVitePressAppearance`, provider-safe social links, logo alt, title template, OG alt, CSS brand/layout variables, and configured Shiki themes.

- [x] **Step 1: Add failing adapter tests for every newly wired field**

Assert the adapter output contains:

```ts
expect(adapter.shared.titleTemplate).toBe(':title | Jia him')
expect(adapter.shared.themeConfig).toMatchObject({
  logo: { src: '/images/me-gray.jpg', alt: 'Jia him' },
  socialLinks: [{ icon: 'github', link: 'https://github.com/xiexin12138' }]
})
expect(pageData.frontmatter.head).toContainEqual([
  'meta',
  expect.objectContaining({ property: 'og:image:alt', content: 'Jia him' })
])
expect(adapter.shared.markdown).toMatchObject({
  theme: { light: 'github-light', dark: 'github-dark' }
})
```

Also test that generic social uses a repository-owned constant SVG and never renders label or URL as SVG markup.

- [x] **Step 2: Run adapter tests and confirm RED**

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/config/adapter.test.ts`

Expected: FAIL because those v2 consumers are absent.

- [x] **Step 3: Implement the adapter mappings**

Map `branding.logo` to the VitePress logo object, set `titleTemplate`, emit `og:image` and `og:image:alt` from `branding.shareImage`, map every social provider through a constant icon table, and set `markdown.theme`. Inject only validated hex into brand variables and expose `contentLayout` plus `defaultTheme` through typed theme config fields. Pass VitePress command into the adapter so `serve` omits the analytics script while `build` retains it after readiness validation.

- [x] **Step 4: Apply runtime appearance without overwriting user choice**

In the theme entry, use VitePress `useData()` and a small client hook. Apply the configured default only when VitePress has no persisted `vitepress-theme-appearance`; always respect an existing visitor choice. Toggle `data-content-layout="doc|wide"` and the validated brand variables on `document.documentElement`, cleaning them up on unmount.

- [x] **Step 5: Run adapter, generator, and site build checks**

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/config/adapter.test.ts docs/.vitepress/generators/generators.test.ts`

Expected: PASS.

Run: `pnpm build:site`

Expected: PASS with configured Shiki themes and metadata.

#### Implementation log — Task 4 (2026-09-05)

- RED: focused adapter/shared/theme command — 5 expected failures for missing OG alt, provider icons, visual mappings, Vite option preservation, and the runtime appearance module.
- GREEN: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/config/adapter.test.ts docs/.vitepress/config/shared.test.ts docs/.vitepress/theme/appearance.test.ts` — 13 tests passed.
- Build: `pnpm build:site` exited 0; VitePress completed client/server bundles, page rendering, and sitemap generation.
- Runtime boundary: analytics is excluded from `serve` configuration; default theme initializes only when the VitePress preference key is absent; layout and accent are reversible document-root settings.

### Task 5: Share real public-artifact generators

**Files:**
- Create: `packages/site-schema/src/public-artifacts.ts`
- Create: `packages/site-schema/src/public-artifacts.test.ts`
- Modify: `packages/site-schema/src/index.ts`
- Modify: `docs/.vitepress/generators/robots.ts`
- Modify: `docs/.vitepress/generators/sitemap.ts`
- Modify: `docs/.vitepress/generators/feed.ts`
- Modify: `docs/.vitepress/generators/llms.ts`
- Modify: `docs/.vitepress/generators/structured-data.ts`
- Modify: `docs/.vitepress/generators/generators.test.ts`

**Interfaces:**
- Produces: the existing generator function names from `@jiahim/site-schema` with deterministic string/object return values.
- Produces: `PublicArticleRecord` as a shared render/build input type; Markdown filesystem discovery remains in `docs/.vitepress/generators/articles.ts`.

- [x] **Step 1: Add characterization tests around current generator output**

Copy the current expected robots, Feed, sitemap, llms, Website, Person, BlogPosting, and Breadcrumb outputs into shared-package tests before moving code. Include XML escaping, disabled output, canonical joining, author sameAs URLs, and crawler allow/deny cases.

- [x] **Step 2: Run the characterization tests and confirm RED**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/public-artifacts.test.ts`

Expected: FAIL because the shared artifact module does not exist.

- [x] **Step 3: Move pure generators without changing output**

Move only pure serialization and structured-data logic into `public-artifacts.ts`. Keep filesystem walking and Markdown parsing in the VitePress package. Replace site generator modules with thin named re-exports during this release so existing imports and tests remain stable.

- [x] **Step 4: Run shared and site generator suites**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/public-artifacts.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/generators/generators.test.ts`

Expected: PASS with output byte-for-byte equal to the characterization baseline.

#### Implementation log — Task 5 (2026-09-05)

- RED: `pnpm --filter @jiahim/site-schema exec vitest run src/public-artifacts.test.ts` failed at collection because `public-artifacts.ts` did not exist.
- GREEN: the same command — 3 characterization tests passed.
- Compatibility: VitePress generator modules are thin named re-exports; Markdown discovery stays in `articles.ts`, which now consumes the shared `PublicArticleRecord` type.
- Site regression: `pnpm --filter @jiahim/site test` — 19 tests passed across 6 files.

### Task 6: Make content signals and environment requirements real gates

**Files:**
- Create: `packages/site-schema/src/content-signals.ts`
- Create: `packages/site-schema/src/content-signals.test.ts`
- Create: `packages/site-schema/src/readiness.ts`
- Create: `packages/site-schema/src/readiness.test.ts`
- Modify: `packages/site-schema/src/index.ts`
- Modify: `apps/admin/src/lib/seo/article-checks.ts`
- Modify: `apps/admin/src/lib/seo/article-checks.test.ts`
- Modify: `apps/admin/src/app/page.tsx`
- Modify: `apps/admin/src/components/AdminApp.tsx`
- Create: `docs/.vitepress/build/content-audit.ts`
- Create: `docs/.vitepress/build/content-audit.test.ts`
- Modify: `docs/.vitepress/build/generate-public-files.ts`
- Modify: `docs/.vitepress/build/generate-public-files.test.ts`

**Interfaces:**
- Produces: `auditArticleContentSignals(signals, article, context): readonly ContentSignalFinding[]` in `@jiahim/site-schema`; the admin checker remains a thin compatibility wrapper.
- Produces: `evaluateEnvironmentReadiness(config, environment): ReadinessIssue[]` with names and existence only.

- [x] **Step 1: Add failing policy tests**

Test that disabled signals produce no finding, generated canonical satisfies `requireCanonical`, missing external references produces a warning when `requireCitations` is true, malformed external links do not count, and missing required environment names block readiness without revealing values.

- [x] **Step 2: Run focused checks and confirm RED**

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/content-signals.test.ts src/readiness.test.ts`

Expected: FAIL because the shared policy and readiness modules do not exist.

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/seo/article-checks.test.ts`

Expected: FAIL because the current checker ignores `geo.contentSignals`.

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/build/content-audit.test.ts`

Expected: FAIL because the build audit module does not exist.

- [x] **Step 3: Implement deterministic signal evaluation**

Use configured booleans as gates in `auditArticleContentSignals`. Treat missing author/published date as errors; updated date, image alt, and citation absence as warnings. Treat canonical as satisfied when either a valid article canonical exists or site canonical generation is enabled. A citation is at least one parseable `http:` or `https:` Markdown link whose host differs from the canonical host; it is not a publish blocker. `evaluateEnvironmentReadiness(config, exists)` receives a predicate and returns names, booleans, and `requiredBy` owners; it never receives or returns secret values.

- [x] **Step 4: Add build and editor consumers**

Pass `config.geo.contentSignals` and canonical state from `app/page.tsx` through `AdminApp` to the checker. Run the same pure audit over public articles during `generatePublicFiles`; throw only for error findings and emit warnings through an injected reporter so tests do not depend on global console state. Evaluate required environment variable names before enabling an integration artifact.

- [x] **Step 5: Run policy tests and site build**

Run: `pnpm --filter @jiahim/admin exec vitest run src/lib/seo/article-checks.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/site-schema exec vitest run src/content-signals.test.ts src/readiness.test.ts`

Expected: PASS.

Run: `pnpm --filter @jiahim/site exec vitest run --root ../.. docs/.vitepress/build/content-audit.test.ts docs/.vitepress/build/generate-public-files.test.ts`

Expected: PASS.

Run: `pnpm build:site`

Expected: PASS or report only the explicitly documented warning-level debt already present in content; no hidden error is allowed.

#### Implementation log — Task 6 (2026-09-05)

- RED shared: focused content-signal/readiness tests failed at collection because both modules were absent.
- RED Admin: the corrected policy test failed on `author-missing`, proving disabled signals were still ignored.
- RED site: build-audit module was absent and `generatePublicFiles` resolved instead of blocking an error finding.
- GREEN shared: 4 focused tests passed; Admin checker 4 tests passed; site build-audit 3 tests passed.
- First full build gate: correctly failed on 8 public articles without a valid publication date.
- Repair basis: added each missing `date` from the file's earliest `git log --follow --format=%cs --reverse` date (2025-02-04 through 2025-05-23); no body copy was changed.
- Final site build: exited 0. It reported 36 explicit warning-level findings (`updated-at-missing` and `citation-missing`) and zero error findings. These warnings remain content debt; they do not block this product refactor.
- Environment boundary: only enabled integrations contribute required variable names; readiness returns names, booleans, and owners without reading or returning values.

### Task 7: Publish the consumer matrix and close contract verification

**Files:**
- Create: `docs/architecture/settings-contract.md`
- Create: `packages/site-schema/src/field-consumers.ts`
- Create: `packages/site-schema/src/field-consumers.test.ts`
- Modify: `packages/site-schema/src/consumer.test.ts`
- Modify: `apps/admin/README.md`

**Interfaces:**
- Consumes: all contract and consumer changes from Tasks 1–6.
- Produces: reviewable field-by-field evidence and the green baseline required by the UI/preview plan.

- [x] **Step 1: Write the field matrix from the actual v2 type**

For every leaf path, record one of `runtime`, `artifact`, `readiness`, or `removed`, its exact consumer file/function, preview surface, migration rule, and test file. Include explicit removed rows for v1 fields so future editors cannot reintroduce them accidentally.

- [x] **Step 2: Add a contract inventory test**

Export a literal `SITE_CONFIGURATION_FIELD_CONSUMERS` from `field-consumers.ts`. Each entry contains a normalized path pattern, `kind: 'runtime' | 'artifact' | 'gate'`, owner function/file, and `preview: 'live' | 'artifact' | 'reload'`. Compare its patterns with leaf paths generated from `createDefaultSiteConfiguration()`. The test must fail when a field has zero or multiple owners.

- [x] **Step 3: Run the contract gate**

Run: `pnpm --filter @jiahim/site-schema test`

Expected: PASS and package consumer output is `2`.

- [x] **Step 4: Run repository-wide verification for this plan**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm test`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [x] **Step 5: Record the plan checkpoint**

Run: `git diff --check`

Expected: no output. Update the implementation log with exact command results and any warning-level content debt; do not call the plan complete if an item is `not-tested`.

#### Implementation log — Task 7 / contract exit gate (2026-09-05)

- Inventory RED: focused test failed at collection because `field-consumers.ts` did not exist.
- Inventory GREEN: 3 tests passed; concrete array/locale/crawler paths normalize to one primary owner, removed v1 paths have no owner, and the representative v2 shape has no gaps or duplicates.
- Contract suite: 59 tests passed across 8 files, including the clean Admin consumer build.
- Full typecheck: `pnpm typecheck` exited 0 for Schema and Admin.
- First full test run: 217/220 Admin tests passed and exposed 3 real integration conflicts (archive/header atomicity and the readiness response shape).
- Repair: archive now disables the section header and every matching navigation item in one plan; readiness tests include enabled owners and assert `requiredBy` without values. Focused repair suite passed 18 tests.
- Final full test run: Schema 59 + Site 21 + Admin 220 = 300 tests passed.
- Full build: `pnpm build` exited 0 for Schema, VitePress, and Next.js; the 36 documented warning-level content findings remained non-blocking.
- Whitespace gate: `git diff --check` produced no output. No commit, staging, push, PR, merge, rebase, reset, or cleanup was performed.
