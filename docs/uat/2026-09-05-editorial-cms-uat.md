# Editorial CMS 交付与 UAT 记录

日期：2026-09-05（Asia/Singapore）

工作分支：`codex/editorial-cms`

工作目录：`/Users/xiexin/project/about-me-editorial-cms`

## 目标与依据

依据 `specs/editorial-cms/PRD.md`、`specs/editorial-cms/DESIGN.md` 与 `docs/superpowers/plans/2026-09-01-unified-site-settings.md`，交付统一站点设置、事务栏目管理、公开品牌资源、SEO/GEO 产物和文章完整性检查。`config/site.config.json` 是唯一公开设置源，所有消费者经 `@jiahim/site-schema` 解析。

## 实施决策记录

| 决策 | 依据 | 可调整点 |
| --- | --- | --- |
| 栏目创建/归档使用独占锁和内容哈希 | 防止并发覆盖、错误回滚删除其他事务产物 | 可改为持久事务日志，但当前本地单用户模型无需数据库 |
| 普通设置 PUT 禁止修改栏目路径、层级、顺序和状态 | 栏目生命周期必须经过专用事务 | 展示名称、描述和导航开关仍可普通保存 |
| SVG 使用失败关闭的标签/属性白名单 | 正则删除危险片段容易被实体、命名空间和 SMIL 绕过 | 扩充白名单前必须新增安全测试 |
| 文章、媒体、配置和品牌资源同目录临时写入后原子替换 | 避免中断时产生半文件 | 文件系统不支持原子 rename 时不声明支持 |
| `llms.txt` 默认关闭 | 非统一标准；避免把实验性约定当成排名能力 | 可在设置中心显式启用，输出会标记 Experimental |
| 管理端不部署 | 产品边界为回环地址本地工具 | 已移除 `apps/admin/vercel.json` |

## 自动验证证据

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 全工作区测试 | `pnpm test` | Schema 63、站点 27、管理端 303、站点数据产物 6，共 399 项通过 |
| 全工作区类型检查 | `pnpm typecheck` | 通过 |
| 全工作区生产构建 | `pnpm build` | 站点与管理端均通过；VitePress 1.6.4、Next.js 15.5.24 |

## 独立终审问题闭环

独立只读终审提出的发布起点、设置会话、网络边界与符号链接问题均已处理并回归：发布必须从与远端同步的默认分支开始；设置写操作先取得有效会话的独占变更租约；管理端只接受 loopback；品牌资源与栏目事务在创建目录或锁文件前逐级拒绝符号链接。另已清除临时测试栏目，并把 `main` 上的网站数据页与依赖安全升级迁移到 monorepo 结构。

终审修复后的直接产物断言均通过：`apps/site/dist/uat`、`apps/site/dist/admin`、`apps/site/dist/llms.txt` 不存在；栏目页与无日期文章没有空 `datePublished`；栏目页 canonical 为 `https://jiahim.com/zh/skill/`。

## 浏览器 UAT 清单

- [x] 回环访问边界（36 个请求安全测试；localhost、127.0.0.1 与 IPv6 loopback 可用，私网与代理转发请求均拒绝）
- [x] 文章列表、编辑、预览、大纲、质量检查定位（真实浏览器显示 21 篇基线文章；临时文章产生 H2→H4 和图片 alt 行号问题）
- [x] 文章草稿恢复、保存与差异（自动化覆盖恢复；真实浏览器创建并保存临时文章后列表变为 22 篇）
- [x] 设置全部分组、草稿恢复、校验、保存、冲突和 Diff（真实浏览器确认 11 个分组、草稿阻断栏目事务、保存成功并显示精确 JSON diff；冲突分支由自动化覆盖）
- [x] 临时副本新增嵌套栏目、归档计数、文章保持原位（预览 `/zh/skill/uat-child/`；确认框显示 0 篇；归档后状态为已归档）
- [x] 品牌上传和设置草稿联动（真实浏览器确认 Logo/Favicon/Apple Touch Icon/分享图四个入口；写入和联动由安全聚焦测试覆盖）
- [x] 桌面三栏、窄屏模式切换、键盘标签（520×800 视口中工作区 tablist 与站点设置 tab 均可见）
- [x] 公开站点 canonical、OG、四类 JSON-LD 与可见作者/日期/面包屑（文章页为 BlogPosting/BreadcrumbList，首页为 WebSite/Person）
- [x] robots、sitemap、feed 存在，`llms.txt` 默认不存在，`/admin` 不存在
- [x] 浏览器控制台检查（管理端无 warning/error；公开页仅有既存外部 Giscus 配置错误：仓库未安装 Giscus App，不影响本地内容与本次功能，但发布前应由仓库管理员处理）

## 真实浏览器观测摘要

- 管理端临时 UAT：`http://127.0.0.1:3100`，指向 `/private/tmp/editorial-cms-uat.eks2Tn`；测试后服务已停止，未触碰正式内容。
- 正式验收实例：`http://127.0.0.1:3000`，确认分支 `codex/editorial-cms`、21 篇文章加载成功。
- 公开站点：`http://127.0.0.1:5173`。文章页 head 包含 canonical、`og:title=Python 踩坑记录` 与 `robots=index,follow`。

## 最终复验限制

- 终审修复后的自动测试、类型检查与生产构建均重新执行并通过。
- Codex 内置浏览器保存的 localhost 访问权限阻止了终审后的再次浏览器自动化，因此未把旧截图冒充为最新复验。变更中的 UI 已有本记录上方的真实浏览器验收；关闭条件是允许该浏览器访问 `127.0.0.1:3000` 后重跑核心文章与设置流程。
