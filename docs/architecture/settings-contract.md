# 站点设置契约与消费矩阵

更新时间：2026-09-05（Asia/Singapore）

## 权威边界

- 唯一持久化配置：`config/site.config.json`，当前为 `schemaVersion: 2`。
- 权威类型、迁移、跨字段校验：`packages/site-schema/src/`。
- 机器可验证的逐叶字段清单：`SITE_CONFIGURATION_FIELD_CONSUMERS`；新增字段没有且仅有一个主责任消费方时，测试才通过。
- 公开 UI 由 VitePress adapter/theme 消费；SEO/GEO 文本与 JSON-LD 由共享 public-artifacts 生成；内容信号与环境变量仅作为确定性门禁。
- 管理端读取 v1 时只归一化并显示迁移结果，保存始终写 v2；浏览器草稿只写 `jiahim:site-settings-draft:v2`。

## 预览语义

- `live`：可在真实站点 iframe 中即时或通过预览桥观察。
- `artifact`：在 robots、sitemap、Feed、llms 或 JSON-LD 产物视图观察。
- `reload`：结构、构建配置或门禁变化，需要重新加载/重建后确认。

## v2 逐叶字段矩阵

| 字段路径 | 主消费类型 | 主责任实现 | 预览 | v1 迁移 |
| --- | --- | --- | --- | --- |
| `appearance.accentColor` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.codeTheme.dark` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.codeTheme.light` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.contentLayout` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.defaultTheme` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.outline.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.outline.maxLevel` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `appearance.outline.minLevel` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.appleTouchIcon.sizes` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.appleTouchIcon.src` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.favicon.sizes` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.favicon.src` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.favicon.type` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.logo.alt` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `branding.logo.src` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.copyright.holder` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.copyright.startYear` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.links.*.href` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.links.*.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.links.*.newTab` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.notice` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `footer.social.*.href` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 按已知平台映射 provider；未知项转 generic 并告警 |
| `footer.social.*.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 按已知平台映射 provider；未知项转 generic 并告警 |
| `footer.social.*.provider` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 按已知平台映射 provider；未知项转 generic 并告警 |
| `homepage.modules.*.actions.*.href` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.actions.*.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.actions.*.newTab` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.id` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.image.alt` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.image.src` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.details` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.href` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.icon` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.id` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.sectionId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.items.*.title` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.name` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.order` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.tagline` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.text` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.type` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `homepage.modules.*.visible` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.analytics.enabled` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.analytics.provider` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.analytics.scriptSrc` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.analytics.websiteId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.category` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.categoryId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.enabled` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.mapping` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.provider` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.repository` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `integrations.comments.repositoryId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `locales.*.contentRoot` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `locales.*.enabled` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `locales.*.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `locales.*.routePrefix` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `locales.*.vitepressKey` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.href` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.id` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.label` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.locale` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.newTab` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.order` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.sectionId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.type` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `navigation.*.visible` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.description` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.directory` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.id` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.locale` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.name` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.navigation.collapsed` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.navigation.header` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.navigation.sidebar` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.order` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.parentId` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.route` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `sections.*.status` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `seo.titleTemplate` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `site.description` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `site.name` | runtime | `docs/.vitepress/config/adapter.ts#createVitePressAdapter` | live | 原值保留并按 v2 校验 |
| `author.avatar.src` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `author.bio` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `author.id` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `author.name` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `author.sameAs.*` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 保留 v1 每项 href |
| `branding.shareImage.alt` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | v1 冲突时采用原 seo.openGraph.image 并告警 |
| `branding.shareImage.src` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | v1 冲突时采用原 seo.openGraph.image 并告警 |
| `geo.crawlers.*.allow` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `geo.llmsTxt.enabled` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.canonical.enabled` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.defaultDescription` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.feed.description` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.feed.enabled` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.feed.title` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.indexing.follow` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.indexing.index` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.openGraph.enabled` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.openGraph.siteName` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.sitemap.enabled` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.structuredData.blogPosting` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.structuredData.breadcrumbs` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.structuredData.person` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `seo.structuredData.website` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `site.canonicalUrl` | artifact | `packages/site-schema/src/public-artifacts.ts` | artifact | 原值保留并按 v2 校验 |
| `geo.contentSignals.requireAuthor` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `geo.contentSignals.requireCanonical` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `geo.contentSignals.requireCitations` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `geo.contentSignals.requireImageAlt` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `geo.contentSignals.requirePublishedAt` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `geo.contentSignals.requireUpdatedAt` | gate | `packages/site-schema/src/content-signals.ts#auditArticleContentSignals` | reload | 原值保留并按 v2 校验 |
| `integrations.analytics.requiredEnvironmentVariables.*` | gate | `packages/site-schema/src/readiness.ts#evaluateEnvironmentReadiness` | reload | 原值保留并按 v2 校验 |
| `integrations.comments.requiredEnvironmentVariables.*` | gate | `packages/site-schema/src/readiness.ts#evaluateEnvironmentReadiness` | reload | 原值保留并按 v2 校验 |
| `schemaVersion` | gate | `packages/site-schema/src/validation.ts#validateSiteConfiguration` | reload | 原值保留并按 v2 校验 |
| `site.defaultLocale` | gate | `packages/site-schema/src/validation.ts#validateSiteConfiguration` | reload | 原值保留并按 v2 校验 |

## v1 已移除字段

| 字段 | 决策与依据 |
| --- | --- |
| `branding.favicon.alt`、`branding.appleTouchIcon.alt` | HTML icon link 不消费替代文本，删除。 |
| `author.avatar.alt` | Person JSON-LD 只消费头像 URL，删除。 |
| `author.sameAs.*.{label,newTab}` | 作者身份只用于 Person JSON-LD，保留 href 为 URL 列表。 |
| `homepage.modules[type=featuredArticles]` | 公开主题无法渲染，迁移删除并告警。 |
| `seo.openGraph.type` | 页面类型由 VitePress 按首页/文章推导，删除重复全局值。 |
| `seo.openGraph.image.*` | 合并到唯一 `branding.shareImage`；冲突时采用旧站点实际生效值并告警。 |
| `geo.crawlers.*.purpose` | crawler 用途由 ID 固定推导，删除重复值。 |
| `footer.social.*.newTab` | VitePress 社交入口拥有固定安全打开行为，删除。 |

## 门禁与证据

- `packages/site-schema/src/field-consumers.test.ts`：完整性、唯一性、具体路径归一化和移除字段回归。
- `packages/site-schema/src/migrations.test.ts`：v1 golden、冲突与未知 provider 告警。
- `docs/.vitepress/config/adapter.test.ts`：公开 UI、视觉设置和 Open Graph 映射。
- `packages/site-schema/src/public-artifacts.test.ts`：robots、sitemap、Feed、llms 和 JSON-LD。
- `packages/site-schema/src/content-signals.test.ts` 与 `readiness.test.ts`：内容与环境门禁。
