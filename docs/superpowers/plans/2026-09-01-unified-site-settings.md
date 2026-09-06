# 统一站点设置中心实施计划

> **供执行代理使用：** 实施本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项执行。所有步骤使用复选框跟踪。

**目标：** 在现有本地文章工作台中建立统一站点设置中心，以单一 JSON 配置和共享 TypeScript Schema 驱动 VitePress 与管理端，并提供一致的栏目树、安全设置保存、SEO/GEO 输出和文章完整性检查。

**架构：** `config/site.config.json` 是公开站点设置的唯一数据源。`packages/site-schema` 统一负责迁移、严格校验、标准化、类型和栏目树；VitePress 适配层与 Next.js 管理端只消费解析后的配置。管理端草稿与磁盘状态分离，通过内容哈希进行乐观并发保护，并且只允许服务端推导的白名单路径进入保存、Diff 和 Git 工作流。

**技术栈：** TypeScript 5.9、Node.js 22+、pnpm 10 workspace、Zod 4、Next.js 15、React 19、VitePress 1.6、Vitest 3、Testing Library、本地文件系统与 Git。

**对应规格：** `specs/editorial-cms/PRD.md` v1.1、`specs/editorial-cms/DESIGN.md` v1.1、`docs/superpowers/specs/2026-09-01-unified-site-settings-design.md`

## 全局约束

- VitePress 继续作为公开网站渲染与构建核心；`apps/site/dist` 中不得出现管理端路由。
- 管理端只绑定 `127.0.0.1`，不部署、不登录、不引入数据库、不调用 Vercel API、不保存秘密。
- `config/site.config.json` 是唯一公开设置源；任何消费者都必须调用 `parseSiteConfiguration`，不得直接信任原始 JSON。
- 配置读取顺序固定为：加载 JSON、检查 `schemaVersion`、迁移、严格 Schema 解析、业务一致性校验、输出只读标准化对象。
- 第一版只编辑 `zh-CN`，但栏目和文章引用必须使用稳定 ID，为未来多语言与翻译预留结构。
- 栏目删除只能隐藏或归档；不得删除文章、移动目录或批量修改公开 URL。
- 已有文章的栏目不能通过普通设置修改 `directory` 或 `route`。
- AI 搜索发现和模型训练权限必须分开；默认允许发现、禁止训练。
- 不提供 GEO 排名承诺、黑盒综合分数、关键词堆砌、任意文件路径、任意命令或可执行配置。
- 配置保存必须使用 SHA-256 内容哈希、同目录临时文件和原子 `rename`。
- 所有生产行为先写失败测试，确认按预期失败后再写最小实现。
- 保留当前全部未提交改动。未经单独授权，不执行 reset、checkout、clean、stash、stage、commit、push、PR、merge、rebase、分支或 worktree 清理。
- 每个实施阶段开始前重新检查仓库根目录、当前分支、worktree、工作区状态、远端和目标集成 base；不得假定当前分支基于最新 `main`。

---

## 文件职责图

- `config/site.config.json`：带版本号的公开站点配置，初始值必须复现当前中文站点行为。
- `packages/site-schema/src/schema.ts`：严格字段 Schema 与公开类型。
- `packages/site-schema/src/defaults.ts`：v1 默认值，包括爬虫权限。
- `packages/site-schema/src/migrations.ts`：显式、连续的版本迁移入口。
- `packages/site-schema/src/validation.ts`：唯一性、路径、栏目图、URL 和秘密字段检查。
- `packages/site-schema/src/sections.ts`：共享栏目树、排序、可见性和文章归属逻辑。
- `packages/site-schema/src/index.ts`：共享包唯一公开出口。
- `docs/.vitepress/config/adapter.ts`：将标准化配置映射为 VitePress 配置。
- `docs/.vitepress/generators/*`：robots、sitemap、feed、JSON-LD 和可选 `llms.txt` 生成器。
- `apps/admin/src/lib/settings/*`：哈希、原子保存、事务、草稿和表单投影。
- `apps/admin/src/app/api/settings/**`：只允许回环来源访问的设置 API。
- `apps/admin/src/components/settings/*`：设置分组、表单、栏目管理和检查器。
- `apps/admin/src/lib/seo/article-checks.ts`：文章级确定性 SEO/GEO 检查。

---

### 任务 0：先加固本地 API 与 Git 发布边界

**文件：**
- 修改：`apps/admin/src/lib/security.ts`、`route-utils.ts`、全部 `app/api/**/route.ts`
- 新建：`apps/admin/src/lib/security.test.ts`、`route-utils.test.ts`
- 修改：`apps/admin/src/lib/git/workflow.ts`、`workflow.test.ts`

**接口：**
- `assertLoopbackRequest(request: Request): void` 同时校验请求 URL hostname 与 Host header。
- `requireAdmin(request: Request)` 在访问文件或 Git 前统一执行 loopback 校验。
- `assertPublishStartingBranch(status)` 只允许从默认分支创建新的受管内容分支。
- 合并前重新读取并验证 PR 的仓库、base、head、作者与状态。

- [x] **步骤 1：先写 loopback、Host 不一致和非本机请求失败测试，确认 RED**
- [x] **步骤 2：实现统一请求边界并让全部 API handler 传入 request，确认 GREEN**
- [x] **步骤 3：先写任意功能分支发布和不受管 PR 合并失败测试，确认 RED**
- [x] **步骤 4：实现受管分支与 PR 身份约束，确认 GREEN**
- [x] **步骤 5：运行管理端全量测试、类型检查和构建，并进行独立只读审查**

本任务不新增登录、不在浏览器保存秘密，也不修改 GitHub/Vercel 远端设置。远端 `main` 保护规则和安全功能需用户单独明确授权。

---

### 任务 1：固定共享配置契约、默认值和迁移框架

**文件：**
- 修改：`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`package.json`、两个 app 的 `package.json`
- 新建：`packages/site-schema/package.json`、`tsconfig.json`
- 新建：`packages/site-schema/src/schema.ts`、`defaults.ts`、`migrations.ts`、`validation.ts`、`index.ts`
- 测试：`packages/site-schema/src/schema.test.ts`、`migrations.test.ts`
- 新建：`config/site.config.json`

**接口：**
- `CURRENT_SCHEMA_VERSION = 1`
- `createDefaultSiteConfiguration(): SiteConfiguration`
- `migrateSiteConfiguration(input: unknown): unknown`
- `parseSiteConfiguration(input: unknown): NormalizedSiteConfiguration`
- 所有消费者只从 `@jiahim/site-schema` 导入。

- [x] **步骤 1：接入 workspace 和测试脚本**

在 `pnpm-workspace.yaml` 增加 `packages/*`；两个 app 使用 `@jiahim/site-schema: workspace:*`；共享包增加 Zod、Vitest、TypeScript，并提供 ESM 导出、`test` 和 `typecheck` 脚本。

- [x] **步骤 2：先写配置契约失败测试**

```ts
it('保留独立的 AI 搜索发现与训练默认策略', () => {
  const config = parseSiteConfiguration(createDefaultSiteConfiguration())
  expect(config.schemaVersion).toBe(1)
  expect(config.geo.crawlers.OAI_SearchBot).toEqual({ purpose: 'discovery', allow: true })
  expect(config.geo.crawlers.GPTBot).toEqual({ purpose: 'training', allow: false })
  expect(config.geo.llmsTxt.enabled).toBe(false)
})

it('拒绝任何层级的未知字段', () => {
  const input = { ...createDefaultSiteConfiguration(), token: 'secret' }
  expect(() => parseSiteConfiguration(input)).toThrow()
})
```

- [x] **步骤 3：运行 RED**

命令：`pnpm --filter @jiahim/site-schema test -- src/schema.test.ts`

预期：共享包或解析器尚不存在，测试失败。

- [x] **步骤 4：实现完整 v1 数据模型**

顶层固定包含：`schemaVersion`、`site`、`branding`、`author`、`locales`、`sections`、`navigation`、`homepage`、`appearance`、`seo`、`geo`、`footer`、`integrations`。

关键类型固定为：

```ts
interface SectionConfiguration {
  id: string
  locale: string
  name: string
  description?: string
  directory: string
  route: string
  parentId?: string
  order: number
  navigation: { header: boolean; sidebar: boolean; collapsed: boolean }
  status: 'active' | 'hidden' | 'archived'
}

interface PublicImage { src: string; alt: string }
interface PublicLink { label: string; href: string; newTab: boolean }
```

`site` 包含名称、描述、canonical 域名和默认语言；`branding` 包含 logo、favicon、分享图及 alt；`author` 包含稳定 ID、姓名、简介、头像与 `sameAs`；`locales` 包含内容根、路由前缀与启用状态；其余字段完整覆盖已确认的导航、首页、外观、SEO/GEO、页脚、社交和公开集成设置。

- [x] **步骤 5：实现严格解析与业务校验**

检查 HTTPS 公开 URL（测试允许 loopback）、以 `/` 开头的公开资源、稳定 ID 格式、locale 内容根位于 `docs/`、栏目目录不得绝对路径/`..`/反斜杠/NUL/符号链接越界、栏目 ID 与同 locale 路由唯一、父栏目同语言且无环、导航和首页引用存在、环境变量名符合大写规范。递归拒绝名称匹配 `token|secret|password|private.?key|webhook` 的字段。

- [x] **步骤 6：测试迁移边界**

```ts
expect(migrateSiteConfiguration(createDefaultSiteConfiguration()))
  .toEqual(createDefaultSiteConfiguration())
expect(() => migrateSiteConfiguration({ schemaVersion: 2 })).toThrow()
expect(() => migrateSiteConfiguration({})).toThrow(/schemaVersion/)
```

覆盖路径穿越、重复路由、跨语言父级、栏目环、失效引用、秘密字段和未知字段。

- [x] **步骤 7：写入初始单一配置**

把当前标题、描述、域名、favicon、logo、GitHub、公开 analytics ID、页脚和 `book → skill → essay → work` 栏目顺序迁入 JSON，保持当前路由、目录与中文文案不变，并在测试中直接读取真实配置验证。

- [x] **步骤 8：检查点 1 验证**

命令：`pnpm install --lockfile-only && pnpm --filter @jiahim/site-schema test && pnpm typecheck && pnpm build:site`

预期：Schema、迁移、类型和原有站点构建通过。不得提交；如之后获授权，提交信息建议为 `[AI] feat: add shared site configuration schema`。

---

### 任务 2：建立共享栏目树并移除编辑器分类常量

**文件：**
- 新建：`packages/site-schema/src/sections.ts`、`sections.test.ts`
- 修改：共享包 `index.ts`
- 修改：管理端 `types.ts`、`content-config.ts`、`local-repository.ts`、`validation.ts`
- 修改：`article-filter.ts`、`ArticleSidebar.tsx`、`EditorPane.tsx`、`AdminApp.tsx`、`page.tsx` 及对应测试

**接口：**
- `buildSectionForest(config, options): readonly SectionNode[]`
- `listCreatableSections(config, locale): readonly SectionConfiguration[]`
- `findSectionForArticlePath(config, path): SectionConfiguration | undefined`
- `CategoryId` 改为开放的稳定 `SectionId = string`；现有 API 的 `category` 字段暂时保留名称以兼容客户端。

- [x] **步骤 1：写嵌套栏目失败测试**

```ts
const tree = buildSectionForest(fixture, { locale: 'zh-CN', surface: 'editor' })
expect(tree.map((node) => [node.section.id, node.children.map((x) => x.section.id)]))
  .toEqual([['book', ['book-vue']], ['skill', []], ['essay', []], ['work', []]])
expect(findSectionForArticlePath(fixture, 'docs/zh/book/vue/patch.md')?.id)
  .toBe('book-vue')
```

- [x] **步骤 2：运行 RED**

命令：`pnpm --filter @jiahim/site-schema test -- src/sections.test.ts`

- [x] **步骤 3：实现唯一排序和可见性规则**

同级按 `order`、中文名称、稳定 ID 排序；`archived` 在所有表面隐藏；`hidden` 不进入公开导航/侧栏，但保留在编辑器目录树；只处理指定 locale；文章按最长匹配目录归属；不得修改传入配置。

- [x] **步骤 4：让内容仓库消费动态栏目**

`LocalContentRepository` 接收解析后的配置，去重嵌套栏目根目录，递归读取 Markdown，通过共享函数确定文章栏目。新文章请求只提交栏目 ID，目录必须由服务端配置推导，客户端不得提交目录。

- [x] **步骤 5：增加编辑器回归测试**

验证嵌套树、搜索扁平结果、隐藏栏目仍可浏览、归档栏目不进入新建选项，以及原四个栏目文章数量和路径保持不变。

- [x] **步骤 6：验证共享树**

命令：`pnpm --filter @jiahim/site-schema test && pnpm --filter @jiahim/admin test && pnpm typecheck`

预期：编辑器与共享夹具输出相同栏目 ID 顺序。不得提交。

---

### 任务 3：使用已校验适配层替换 VitePress 硬编码

**文件：**
- 新建：`docs/.vitepress/config/load-site-config.ts`、`adapter.ts`、`adapter.test.ts`
- 修改：`shared.ts`、`zh.ts`、`index.ts`、`tools.ts`、`en.ts`
- 修改：`apps/site/package.json`

**接口：**
- `loadSiteConfiguration(repositoryRoot?): NormalizedSiteConfiguration`
- `createVitePressAdapter(config, docsRoot): { shared; locales; nav; sidebar }`
- `generateSidebarItems(directory, routePrefix)` 不再从硬编码路径推断路由。

- [x] **步骤 1：写适配器失败测试**

验证 nav 顺序仍为读书、技术、随笔、工作；sidebar key 与现有路由一致；网站与编辑器树 ID 完全相同；hidden/archived 不公开；嵌套栏目继承折叠配置；外链保留 `newTab`；非法 JSON 错误包含文件路径和字段路径。

- [x] **步骤 2：运行 RED**

命令：`pnpm --filter @jiahim/site test -- docs/.vitepress/config/adapter.test.ts`

- [x] **步骤 3：加入站点 Vitest 配置并实现适配器**

VitePress 配置加载阶段同步读取 JSON，经共享包解析后映射 title、description、head、logo、社交链接、outline、footer、sitemap hostname、locale、nav 和 sidebar。高级插件与本地搜索翻译继续保留在 TypeScript 中。

- [x] **步骤 4：删除重复公开常量**

从 `shared.ts` 和 `zh.ts` 删除栏目、站点身份、页脚和 analytics 的重复值。递归文章排序与 frontmatter 标题回退保留；英文内容在 locale 未启用前继续排除。

- [x] **步骤 5：检查点 2 验证**

命令：`pnpm --filter @jiahim/site test && pnpm build:site`

预期：适配器、网站构建、网站/编辑器栏目一致性通过；非法配置夹具给出可定位错误。不得修改真实配置来制造失败。

---

### 任务 4：实现带内容哈希的设置读取、校验、保存与 Diff API

**文件：**
- 新建：`apps/admin/src/lib/settings/hash.ts`、`repository.ts`、`requests.ts` 及测试
- 新建：`apps/admin/src/app/api/settings/route.ts`
- 新建：`apps/admin/src/app/api/settings/validate/route.ts`
- 新建：`apps/admin/src/app/api/settings/diff/route.ts`
- 修改：`apps/admin/src/lib/git/repository.ts`、`workflow.ts` 及测试

**接口：**
- `hashContent(raw): string` 返回小写 SHA-256 hex。
- `SettingsSnapshot = { config; baseHash; normalizedJson; validation }`
- `SettingsRepository.read()`、`validate(input)`、`save({ config, baseHash })`、`diff()`。
- 哈希冲突返回 HTTP 409；成功返回新快照与精确 `changedPaths`。

- [x] **步骤 1：在临时仓库写失败测试**

覆盖稳定哈希、读取标准化、仅校验不写盘、旧哈希拒绝、非法配置不写盘、JSON 单个末尾换行、原子替换，以及注入 rename 失败后旧文件字节不变。

- [x] **步骤 2：运行 RED**

命令：`pnpm --filter @jiahim/admin test -- src/lib/settings`

- [x] **步骤 3：实现服务端固定路径和原子保存**

只能解析 `<repositoryRoot>/config/site.config.json`；通过 `lstat`/`realpath` 拒绝符号链接与越界；临时文件创建在 `config/` 同目录，写入后 `fsync`，再原子 rename，并在支持时同步目录。文件系统方法通过依赖注入测试异常分支。

- [x] **步骤 4：实现严格请求和路由**

`GET /api/settings` 返回快照和 `no-store`。validate 与 PUT 必须通过 Origin/Host 检查，只接受 `{ config }` 或 `{ config, baseHash }`，拒绝额外字段；问题格式固定为 `{ path, code, message }`。Diff 只允许 `config/site.config.json`，不读取客户端路径。

- [x] **步骤 5：扩展精确 Git 文件集合**

`validateSettingsPublishPaths` 只接受配置文件、当前设置会话创建的栏目 `index.md`、白名单公开资源。继续拒绝预先暂存的无关文件，不运行全仓暂存或 reset。

- [x] **步骤 6：检查点 3 验证**

命令：`pnpm --filter @jiahim/admin test -- src/lib/settings src/app/api/settings src/lib/git/workflow.test.ts && pnpm typecheck`

预期：并发、原子性、路径、请求形状、同源和 Diff 测试全部通过。

---

### 任务 5：实现设置草稿、模式切换、全部表单、校验和 Git Diff

**文件：**
- 新建：`apps/admin/src/lib/settings/drafts.ts`、`form-model.ts` 及测试
- 新建：`components/settings/SettingsWorkspace.tsx`、`SettingsSidebar.tsx`、`SettingsFormHost.tsx`、`SettingsInspector.tsx`
- 新建：`components/settings/forms/` 下基础、品牌、作者、导航、首页、外观、SEO/GEO、页脚社交、集成和高级表单
- 修改：`AdminApp.tsx`、`WorkspaceHeader.tsx`、`globals.css`

**接口：**
- `WorkspaceMode = 'articles' | 'settings'`
- `SettingsDraft = { config; baseHash; dirty; issues }`
- `readSettingsDraft(storage, persistedHash)` 只自动恢复哈希匹配的草稿；旧基准草稿必须显示冲突。
- `SettingsWorkspace` 输出当前设置会话的精确变更路径。

- [x] **步骤 1：写草稿和表单投影失败测试**

覆盖版本化 localStorage、匹配哈希恢复、旧哈希冲突、嵌套不可变更新、显式 order 重排，以及环境变量只暴露名称和“是否存在”，不进入值。

- [x] **步骤 2：实现顶部主模式切换**

在顶栏增加可访问的“文章管理 / 站点设置”tablist。离开有未保存内容的模式前确认；切换后保留文章状态和设置状态；设置模式使用独立三栏并切换 Save/Diff 行为。

- [x] **步骤 3：写设置工作区失败测试**

验证进入设置模式、修改只形成浏览器草稿、显式保存先 validate 再带 `baseHash` PUT、409 显示重新加载/人工合并、保存成功更新哈希、清草稿、刷新 Git 状态并展示 Diff。

- [x] **步骤 4：实现全部已确认字段表单**

中文首发，完整映射任务 1 Schema。栏目/资源不得输入任意路径，集成不得输入秘密或任意代码。高级页显示 Schema 版本、问题列表、环境变量存在状态和只读格式化 JSON。

- [x] **步骤 5：实现右侧检查器**

提供“实时预览 / 校验问题 / Git Diff”三个页签。预览站点身份、导航、页脚与外观；校验按字段路径分组；Diff 只显示配置文件。不得显示 SEO/GEO 综合分数。

- [x] **步骤 6：检查点 4 验证**

命令：`pnpm --filter @jiahim/admin test -- src/lib/settings src/components/settings && pnpm typecheck && pnpm build:admin`

---

### 任务 6：实现栏目事务式新增、安全更新和归档

**文件：**
- 新建：`apps/admin/src/lib/settings/sections.ts`、`section-transaction.ts` 及测试
- 新建：`api/settings/sections/route.ts`
- 新建：`api/settings/sections/[id]/route.ts`
- 新建：`api/settings/sections/[id]/archive/route.ts`
- 新建：`components/settings/SectionManager.tsx` 及测试

**接口：**
- `CreateSectionRequest = { baseHash; name; slug; parentId?; header; sidebar; collapsed }`
- `planSectionCreation` 只根据配置和稳定 ID 在服务端推导目录、路由、order 与 `docs/zh/.../index.md`。
- `countSectionArticles` 排除所有 `index.md`。
- 更新只接受名称、描述、order、父级、导航标志与状态。

- [x] **步骤 1：写栏目不变量失败测试**

覆盖 Unicode 名称、slug 清理、嵌套父级、重复 ID/目录/路由、归档父级、跨语言父级、栏目环、文章计数和非空栏目目录/路由锁定。

- [x] **步骤 2：写事务失败测试**

通过注入文件系统故障，分别模拟临时文件后失败和 `index.md` rename 后失败；断言旧配置恢复、只清理本事务创建的文件/空目录、既有内容字节不变。

- [x] **步骤 3：实现多文件事务**

重新读取配置与哈希，验证完整候选配置，拒绝已存在目标和符号链接，准备两个临时文件，再原子发布 `index.md` 与配置。失败时原子恢复旧配置，仅移除由本事务确认创建的文件及新建空目录。

- [x] **步骤 4：实现更新与归档 API**

所有写入要求同源和 `baseHash`。非空栏目保持目录和路由。归档返回受影响文章数量，只把状态设为 `archived`，绝不 unlink、rename、move 或改写文章。

- [x] **步骤 5：实现栏目向导与确认**

向导收集已批准字段，预览稳定 ID、路由、目录和 `index.md`；重排写入明确 order；归档确认显示文章数量。端到端断言新增栏目在网站和编辑器的层级/顺序一致，归档后不再公开或用于新建，但文章仍可读取。

- [x] **步骤 6：检查点 5 验证**

命令：`pnpm --filter @jiahim/admin test -- src/lib/settings src/components/settings/SectionManager.test.tsx && pnpm --filter @jiahim/site test && pnpm typecheck`

---

### 任务 7：实现安全的公开品牌资源上传

**文件：**
- 新建：`apps/admin/src/lib/settings/assets.ts`、`assets.test.ts`
- 新建：`apps/admin/src/app/api/settings/assets/route.ts`
- 修改：`BrandingSettings.tsx`

**接口：**
- `createBrandAssetDestination(kind, upload)` 只返回 `docs/public/images/site/` 下的服务端路径。
- PNG/JPEG/GIF/WebP/AVIF 最大 8 MB；SVG 只允许 logo/favicon 且必须净化。
- 响应只返回仓库相对路径、公开 URL 和精确变更路径，不返回绝对路径。

- [x] **步骤 1：写白名单与 SVG 净化失败测试**

覆盖 MIME/魔数一致、大小、文件名穿越、随机防碰撞后缀、SVG script/事件处理器/外部引用、符号链接越界。

- [x] **步骤 2：实现上传路由和表单联动**

从资源用途与真实文件类型推导路径，执行同目录临时写入与 rename，通过同源检查。上传后只更新设置草稿中的路径和 alt；写 JSON 仍需单独点击保存。

- [x] **步骤 3：验证资源安全**

命令：`pnpm --filter @jiahim/admin test -- src/lib/settings/assets.test.ts src/app/api/settings/assets && pnpm typecheck`

---

### 任务 8：生成 robots、sitemap、feed、JSON-LD 与实验性 llms.txt

**文件：**
- 新建：`docs/.vitepress/generators/robots.ts`、`sitemap.ts`、`feed.ts`、`structured-data.ts`、`llms.ts`、`articles.ts` 及测试
- 新建：`docs/.vitepress/build/generate-public-files.ts` 及测试
- 修改：VitePress `adapter.ts`、主题 `index.ts`、`apps/site/package.json`

**接口：**
- `readPublicArticles(config, docsRoot): PublicArticleRecord[]`
- `generateRobots`、`generateSitemap`、`generateAtomFeed`、`generateLlmsTxt`
- `createWebsiteJsonLd`、`createPersonJsonLd`、`createBlogPostingJsonLd`、`createBreadcrumbJsonLd`

- [x] **步骤 1：写语义生成器失败测试**

断言 Googlebot、OAI-SearchBot、GPTBot、Google-Extended 独立规则；默认允许发现、禁止训练；sitemap/feed 只含 canonical 可见页面；XML 正确转义；feed 按时间倒序；OG/canonical 绝对 URL；JSON-LD 类型完整；`llms.txt` 默认关闭。

- [x] **步骤 2：实现文章发现与纯生成器**

复用共享栏目归属和 Markdown/frontmatter 规则；排除草稿、隐藏和归档内容；安全转义 XML/HTML/JSON；JSON-LD 只能来自页面真实可见内容；启用 `llms.txt` 时在输出和界面标明实验性、非统一标准。

- [x] **步骤 3：接入构建输出**

构建前在受控 staging/output 中生成文件，不改写源 Markdown 或无关公开资源。通过 VitePress transform hook 注入全站与文章 JSON-LD，并在主题中显示匹配的作者、日期和面包屑。

- [x] **步骤 4：检查点 6 的公开输出验证**

命令：`pnpm --filter @jiahim/site test && pnpm build:site`

预期：robots、sitemap、feed、canonical、OG 和 JSON-LD 存在；默认没有 `llms.txt`；归档路由和 `/admin` 不存在。

---

### 任务 9：增加文章级确定性 SEO/GEO 检查

**文件：**
- 新建：`apps/admin/src/lib/seo/article-checks.ts`、`article-checks.test.ts`
- 新建：`apps/admin/src/components/ArticleQualityPanel.tsx` 及测试
- 修改：`PreviewPane.tsx`、`AdminApp.tsx`、`article-format.ts`、`types.ts`

**接口：**

```ts
interface ArticleFinding {
  id: string
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
  line?: number
}
```

`checkArticleSeoGeo(article, context)` 只返回问题列表，不返回总分、百分比、等级或排名。

- [x] **步骤 1：写规则失败测试**

覆盖 H1 缺失/重复、标题层级跳跃、摘要缺失/过长、作者缺失、发布时间与更新时间冲突、canonical 越域或与实际路由冲突、图片 alt 缺失、引用链接协议非法、裸链接文本可访问性，以及完整文章无错误。

- [x] **步骤 2：实现可解释的纯检查**

解析 Markdown 但不执行 HTML。每项问题必须指出字段、原因和修复方向，并在可能时提供行号。只做确定性 URL 语法/协议检查，本版不联网验证链接。

- [x] **步骤 3：加入文章检查页签**

在预览/大纲旁增加“SEO/GEO 检查”，按严重级别分组并可定位编辑器行，明确显示“完整性检查，不代表排名”。

- [x] **步骤 4：验证文章检查**

命令：`pnpm --filter @jiahim/admin test -- src/lib/seo src/components/ArticleQualityPanel.test.tsx && pnpm typecheck && pnpm build:admin`

---

### 任务 10：文档、全量回归、浏览器验收与交接

**文件：**
- 修改：`README.md`、`apps/admin/README.md`
- 只有实施发现规格问题且用户明确批准时，才修改 PRD/DESIGN。

- [x] **步骤 1：完善使用与边界文档**

说明单一 JSON、Schema/迁移生命周期、中文首发边界、设置草稿与冲突恢复、栏目新增/归档、精确 Git 文件集合、SEO/GEO 产物、环境变量存在状态、`llms.txt` 实验性，以及 `pnpm dev:admin` / `pnpm dev:site`。

- [x] **步骤 2：执行完整自动验证**

```bash
pnpm test
pnpm typecheck
pnpm build:admin
pnpm build:site
git diff --check
test ! -e apps/site/dist/admin
```

预期：全部退出码为 0，公开构建不存在管理端路由。

- [x] **步骤 3：执行回环地址浏览器验收**

验证模式切换与状态保留、全部设置分组、草稿、validate/save/diff、旧哈希冲突、嵌套栏目预览、在一次性临时仓库新增/归档栏目、文章检查定位、桌面三栏和窄屏、键盘与标签、控制台无错误。

- [x] **步骤 4：核验公开产物**

确认 canonical、Open Graph、四类 JSON-LD、robots 权限分离、sitemap、feed 和默认不生成 `llms.txt`；结构化数据必须和页面可见内容一致。

- [x] **步骤 5：检查范围和秘密**

扫描配置、请求/响应夹具、浏览器存储和 diff 中的 token/key/webhook/private-key 字段。确认只有公开 analytics ID 和环境变量名；无构建产物、无内容删除/移动、无无关改动被纳入。

- [x] **步骤 6：重新确认 Git 集成 base**

只读检查远端默认分支与当前特性分支 merge-base，报告偏离情况；不 fetch、不变更远端。任何 rebase/merge 必须先征求明确指示。

- [ ] **步骤 7：仅在另行授权后执行 Git 交接**

如明确授权，按检查点创建单一主题的 `[AI]` 提交，确认 remote/base/head 后推送并创建或更新 `[AI]` PR。合并、改写历史、清理 worktree 和删除分支各自需要单独授权。

---

## 检查点门禁

1. 任务 1：Schema、默认配置、迁移和初始配置通过，旧站点行为不变。
2. 任务 2–3：网站和编辑器只使用一套栏目树，层级与顺序一致。
3. 任务 4：设置 API 的并发、原子性、路径、同源和精确 Diff 安全通过。
4. 任务 5：设置中心草稿、校验、保存、冲突和 Diff 可用。
5. 任务 6–7：栏目事务新增/归档和品牌资源安全通过。
6. 任务 8–9：SEO/GEO 公共产物与文章确定性检查通过。
7. 任务 10：全量测试、类型检查、两套构建、浏览器验收与安全检查通过。

每个检查点完成后停止，报告验证证据与当前变更文件范围，获得审阅后再进入下一阶段。
