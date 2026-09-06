# 站点设置中心 Handoff

## 1. 新对话目标

在现有本地文章工作台上，实现统一站点设置中心：使用单一 JSON 配置和共享 TypeScript Schema 驱动 VitePress 网站与编辑器，支持可扩展栏目、常见公开站点设置以及 SEO/GEO 管理。

## 2. 开始前必须阅读

按顺序完整阅读：

1. `specs/editorial-cms/PRD.md`
2. `specs/editorial-cms/DESIGN.md`
3. `docs/superpowers/specs/2026-09-01-unified-site-settings-design.md`
4. `docs/superpowers/plans/2026-09-01-local-editorial-workbench.md`
5. 根目录 `AGENTS.md`（如存在）及系统提供的全局协作约定

规格已经完成 brainstorming 并获得用户确认。新对话不要重新讨论已确认的架构；先使用 writing-plans 技能创建新的详细实施计划，交用户审阅后再实施。

## 3. 仓库与隔离状态

- 仓库：`/Users/xiexin/project/about-me`
- 当前功能 worktree：`/Users/xiexin/project/about-me-editorial-cms`
- 当前分支：`codex/editorial-cms`
- 当前基准包含 `e600c73 [AI] 优化站点导航和首页体验`
- 当前分支并非直接基于最新 `main`；集成前必须重新确认目标 base。
- 不得在默认分支或共享分支直接开发。
- 未获得 commit、push、PR、merge 或清理 worktree 授权。

工作区已有大量与当前文章工作台相关的未提交文件和 Markdown/frontmatter 变更。不得 reset、checkout、clean、stash、覆盖或顺手整理来源不明改动。

## 4. 已完成能力

- pnpm monorepo：`apps/site`、`apps/admin`、`docs`。
- 仅绑定 `127.0.0.1` 的本地 Next.js 管理端。
- 三栏文章编辑器，左侧文章列表可收起。
- CodeMirror Markdown 编辑、草稿恢复、实时预览和大纲。
- 新建/保存文章、白名单媒体上传。
- Git 状态、文章 diff、提交历史。
- 精确暂存当前文章和本次媒体，内容分支、commit、push、PR 和 squash merge。
- 管理端不保存 GitHub/Vercel Token，不部署到公开站点。

最近完整验证结果：14 个测试文件、27 个测试通过；TypeScript 类型检查、Admin 构建、VitePress 站点构建和 `git diff --check` 通过；`apps/site/dist/admin` 不存在。

## 5. 本轮待实现范围

- `config/site.config.json` 单一公开配置源。
- `packages/site-schema` 类型、默认值、验证和迁移。
- VitePress 配置适配层，移除网站与编辑器重复栏目硬编码。
- 网站与编辑器共用的栏目树和排序逻辑。
- 顶部“文章管理 / 站点设置”模式切换。
- 基础、品牌、作者、栏目、导航、首页、外观、SEO/GEO、页脚、社交和公开集成设置。
- 设置草稿、Schema 校验、内容哈希并发保护、原子保存和 Git Diff。
- 栏目新增事务与安全归档；不做物理目录迁移。
- 文章级 SEO/GEO 完整性检查。
- robots、sitemap、feed、JSON-LD 和可选实验性 `llms.txt`。
- 中文首发，数据结构预留未来多语言和一键翻译。

## 6. 不得改变的边界

- VitePress 仍是公开网站渲染核心。
- 管理端仅本地运行，不部署、不登录、不引入数据库。
- 不在仓库或浏览器保存任何秘密。
- 不直接调用 Vercel API；GitHub 合并生产分支后由 Vercel 自动 CI 部署。
- 设置 API 不允许任意路径或任意 shell。
- 栏目删除只归档，不删除内容。
- 默认允许 AI 搜索发现，默认禁止模型训练；搜索与训练权限分开。
- 不提供 GEO 排名承诺或黑盒综合评分。

## 7. 推荐实施检查点

1. Schema 和默认配置通过测试，旧站点行为未变化。
2. VitePress 完全改用适配层，两套栏目输出一致。
3. 设置 API 通过并发、路径和事务测试。
4. 设置中心基础模块可保存并查看 diff。
5. 栏目新增/归档端到端通过。
6. SEO/GEO 输出与文章检查通过。
7. 全量测试、类型检查、两套构建及浏览器验收通过。

每个检查点完成后再进入下一阶段。任何远端 Git 操作都需要用户单独明确授权。

## 8. 建议的新对话首条指令

> 请在 `/Users/xiexin/project/about-me-editorial-cms` 继续站点设置中心工作。先完整阅读 handoff 中列出的 PRD、设计规格和现有计划，检查当前 Git/worktree 状态；使用 writing-plans 技能为统一 JSON 配置、共享 Schema、VitePress 适配、栏目管理和 SEO/GEO 创建详细 TDD 实施计划。先给我审阅计划，不要直接实现，也不要提交或推送。
