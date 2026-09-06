# Admin shadcn/ui 全量重构设计

日期：2026-09-05（Asia/Singapore）

状态：用户已于 2026-09-05 确认，进入实施计划

工作分支：`codex/editorial-cms`

工作目录：`/Users/xiexin/project/about-me-editorial-cms`

实施计划：

- `docs/superpowers/plans/2026-09-05-admin-shadcn-refactor-master.md`
- `docs/superpowers/plans/2026-09-05-settings-contract-v2.md`
- `docs/superpowers/plans/2026-09-05-admin-shadcn-and-preview.md`
- `docs/superpowers/plans/2026-09-05-settings-publish-and-uat.md`

## 背景

管理端已经具备文章编辑、站点设置、栏目事务、配置校验和受限 Git 工作流程，但 UI 仍主要依赖一份约 2439 行的全局 CSS。设置页已出现浏览器原生按钮、控件外观不统一、卡片与操作间距不足、功能解释不清和列表管理能力不完整等问题。继续按页面增加临时 class 会扩大维护成本，也无法为深色模式、弹窗、焦点管理和响应式行为提供稳定约束。

本次文档定义一次完整的管理端 UI 与配置契约重构：在 `apps/admin` 接入 Tailwind CSS v4 和 shadcn/ui，保留 Jia him 的米白与森林绿品牌语言，完成设置发布、导航 CRUD、主题和现有页面组件迁移；同时收口所有“可编辑但不生效”的配置，并让每个设置分组能够预览真实公开站点 UI 或其实际生成产物。

## 目标

1. `apps/admin` 的通用 UI 全部由本地维护的 shadcn/ui 组件和语义化主题 Token 承载。
2. 保留文章管理与站点设置两大信息架构，以及文章编辑器现有三栏工作流。
3. 支持跟随系统、浅色和深色三种主题，刷新后保持选择且不产生明显首屏闪烁。
4. 补齐站点设置保存后的安全 Git 提交、推送、Pull Request 和合并入口。
5. 补齐导航新增、编辑、显隐、重排和移除能力，并保持栏目顶部导航标志一致。
6. 明确作者身份链接与可见社交链接的不同公开用途。
7. 建立 `schemaVersion: 2` 迁移，使每个可编辑字段都有公开站点消费方、构建/发布门禁或可验证产物；无有效语义的字段从 Schema 与 UI 移除。
8. 在设置页嵌入真实 VitePress 页面预览，支持模块聚焦、完整页面、设备尺寸、缩放、拖动调整和全屏查看。
9. 用自动测试、真实浏览器 UAT 和文档门禁防止重新出现两套组件规范或“保存成功但实际不生效”的配置。

## 非目标

- 不替换 CodeMirror 或修改 Markdown 存储格式。
- 不改变 `config/site.config.json` 作为唯一站点配置源的地位。
- 不重写栏目事务、Schema 校验、原子保存或现有 Git 安全规则。
- 不重做公开 VitePress 站点的视觉语言或内容组件；只接通已经承诺的配置消费、预览桥和必要的稳定定位标记。
- 不在本次引入拖拽排序框架；列表排序使用可访问的上移、下移操作。
- 不在 UAT 中执行真实 push、创建 PR 或合并；任何远端 Git 写操作仍需用户另行明确授权。

### 已批准的验收传输调整

2026-09-05：局域网代理入口虽然通过命令行 HTTP 探针，但在 Codex 内置浏览器和用户 Safari 中均无法正常打开。用户明确要求改回本机地址。最终验收入口因此仅绑定 `127.0.0.1`；此调整不改变 Admin 本地运行、真实站点 iframe 预览或 Git 发布安全契约。

## 需求追踪

| ID | 用户反馈或已确认方向 | 设计落点 | 验收证据 |
| --- | --- | --- | --- |
| R1 | 保存设置后需要知道如何推送远端 | 设置 Git 发布设计 | 保存提示、精确 Diff、发布 Dialog、非默认分支阻断 UAT |
| R2 | 作者链接用途不清楚 | 作者身份链接、Schema v2 | UI 解释、Person JSON-LD 产物、visible social 分离测试 |
| R3 | “新增栏目”出现原生按钮 | shadcn 基础层、栏目管理 | Button 语义与真实浏览器截图 |
| R4 | “归档栏目”上方间距不合理 | `SectionItem` 布局 | 桌面与窄屏 UAT 截图 |
| R5 | 导航缺少增删改查 | 导航管理 | CRUD、排序、显隐、header 同步测试与 UAT |
| R6 | admin 全量接入 shadcn，后续统一维护 | 技术基础层、迁移顺序 | 组件清单、旧 class 无引用扫描、主题 UAT |
| R7 | 设置每个模块能预览对应网站 UI | 真实站点实时预览 | 逐分组真实 UI/产物对照和保存后一致性检查 |
| R8 | iframe 内容不能过小，要有完整/局部与缩放 UX | 预览形态与 UX | 聚焦/整页、设备、缩放、平移、全屏和状态保持 UAT |
| R9 | 选择 A，彻底关闭无效配置 | 配置契约有效性与 Schema v2 | 字段消费矩阵、v1→v2 golden tests、无死字段门禁 |

实施中若需求、技术约束或验收结论发生变化，必须在本表追加偏差记录、原因、影响范围和新的关闭条件，不覆盖原始决策。

## 现有能力映射

| 用户动作 | 现有入口或接口 | 权威状态与副作用 | 缺口 | 决策 | 依据 |
| --- | --- | --- | --- | --- | --- |
| 保存站点设置 | `SettingsWorkspace` → `/api/settings` | 校验并原子写入 `config/site.config.json`，使用 base hash 防并发覆盖 | 保存后没有设置发布入口 | Reuse | `apps/admin/src/components/SettingsWorkspace.tsx`、`apps/admin/src/lib/settings/repository.ts` |
| 查看设置差异 | `/api/settings/diff` | 仅读取配置文件 Git diff | 不包含栏目首页和品牌资源 | Extend | `apps/admin/src/lib/git/repository.ts` |
| 提交设置并推送 | 文章模式已有 `/api/git/publish` 与 `publishChanges` | 检查默认分支、精确暂存、commit、push、创建或复用 PR | 契约只接受文章和文章媒体 | Extend | `apps/admin/src/lib/git/workflow.ts` |
| 合并并发布 | `/api/git/merge` | 复核身份、仓库、PR、检查状态和 head SHA 后 squash merge | 设置模式没有入口 | Compose | `apps/admin/src/lib/git/workflow.ts` |
| 编辑作者身份链接 | `author.sameAs` 表单 | 首页 Person JSON-LD 的 `sameAs` | 用途不清晰；无增删排序；`newTab` 没有公开效果 | Extend | `docs/.vitepress/generators/structured-data.ts` |
| 管理可见社交链接 | “页脚与社交”中的 `footer.social` | 生成 VitePress 顶部社交链接 | 与作者身份链接容易混淆 | Reuse | `docs/.vitepress/config/adapter.ts` |
| 新增与归档栏目 | `SectionManager` 与栏目事务 API | 创建栏目首页并更新配置；归档保留文章 | 按钮样式和卡片间距不统一 | Reuse | `apps/admin/src/components/settings/SectionManager.tsx` |
| 编辑导航 | `navigation[]` 设置表单 | 公开站点按 locale、visible、order 生成顶部导航 | 无新增、删除、重排和目标选择；可能与 section header 脱节 | Extend | `apps/admin/src/components/SettingsFormHost.tsx`、`docs/.vitepress/config/adapter.ts` |
| 三栏文章编辑 | 自定义 resize、CodeMirror、预览与大纲 | 本地文章及浏览器布局偏好 | 通用控件和响应式外壳仍依赖散落 CSS | Compose | `apps/admin/src/components/AdminApp.tsx` |
| 设置效果预览 | Inspector 当前只展示通用结构摘要 | 不消费表单草稿，也不呈现真实公开站点组件 | 用户无法确认页脚、导航、首页等设置实际落点和样式 | Replace | `apps/admin/src/components/SettingsWorkspace.tsx`、`docs/.vitepress/theme/index.ts` |
| 配置字段消费 | Schema、adapter、generators 和公开主题共同消费 | 部分字段仅能保存、被重复定义或被静默忽略 | 形成“看似可配、实际无效”的错误契约 | Extend / Remove | `packages/site-schema/src/schema.ts`、`docs/.vitepress/config/adapter.ts`、`docs/.vitepress/generators/` |

所有配置、路径、排序、权限、Git 状态和生命周期判断均为确定性产品契约。本次不引入模型推理或 AI 决策。

## 配置契约有效性与 Schema v2

### 有效性规则

设置表单中的每一个字段必须且只能落入以下三类之一：

1. **运行时消费**：保存后由公开站点 UI、主题或生成器真实读取并产生可观察变化。
2. **产物或门禁消费**：不直接改变视觉，但产生可预览的 SEO、Feed、JSON-LD、robots、环境就绪状态或内容审计结果。
3. **移除**：字段没有稳定产品语义、与另一字段重复或会被公开层静默忽略；通过 v1→v2 迁移清理，不继续伪装为有效设置。

管理端不得为未接通的字段制作“模拟生效”预览。字段消费矩阵作为 Schema、管理端表单、公开站点和测试之间的权威清单，并在评审时逐项核对。

### 字段收口决策

| 配置域 | v2 决策 | 公开消费或产物 |
| --- | --- | --- |
| 基础与语言 | 保留 `site.*`；增加 `defaultLocale` 与唯一根 locale 的不变量 | VitePress 根路由、语言映射、canonical |
| 品牌 | 保留 logo；接通 logo alt；删除 favicon/apple-touch 的无意义 alt；把 `branding.shareImage` 与 `seo.openGraph.image` 合并为唯一分享图 | 导航品牌、favicon、Open Graph 图片和 `og:image:alt` |
| 作者 | `sameAs` 收口为 URL 列表；删除不会生效的 label/newTab；删除未展示头像的 alt | Person JSON-LD 产物预览；可见社交入口继续由 footer social 管理 |
| 栏目与导航 | 保留现有模型并增加唯一引用、连续顺序和 header 原子同步校验 | 顶部导航、侧栏、面包屑和栏目页面 |
| 首页 | 保留 hero/features；移除当前公开层不支持的 `featuredArticles` | 真实首页 hero 与 features |
| 外观 | 正式接通默认主题、强调色、内容宽度/布局和代码主题；代码主题限制为受支持的 Shiki 值并标明属于保存后重载项 | 真实文章页、首页、outline 和代码块 |
| SEO | 接通 title template；保留索引、canonical、sitemap、Feed、结构化数据；移除会被逐页逻辑覆盖的全局 Open Graph type | SERP、OG、Feed、sitemap 和 JSON-LD 产物 |
| GEO / 内容信号 | crawler purpose 改为按 ID 推导；接通 content signals 到文章质量检查与构建审计 | robots/llms 产物与内容审计；自动 canonical 计入完整性 |
| 页脚与社交 | social 改为 provider + label + href；删除无效 newTab；未知旧 provider 迁移为安全通用图标而不是丢弃 | VitePress 顶部社交与页脚真实组件 |
| 分析与评论 | 保留公开站点字段；把 required env 纳入发布/构建就绪门禁 | 预览中只显示禁用占位和环境状态，不发出第三方请求 |

### v1→v2 迁移

- 读取层同时接受 v1 和 v2；v1 必须先经过确定性迁移，再以 v2 校验、展示和持久化，不能把“当前 Schema 也能解析”当成迁移。
- 分享图冲突时选择当前公开站点实际生效的 `seo.openGraph.image`，并产生可见迁移告警；不存在冲突时无损合并。
- `author.sameAs` 保留每一项 href；`footer.social` 保留未知项目并映射为通用 provider；不可静默丢弃用户数据。
- 已存在的本地设置草稿同时迁移版本键；若草稿与磁盘配置基准冲突，保留草稿并要求人工对照。
- 为冲突分享图、未知 social、sameAs URL、默认 locale 根路由和旧草稿建立 golden migration tests。

## 技术基础层

### 依赖与目录

仅在 `apps/admin` 配置：

- Tailwind CSS v4；
- shadcn/ui；
- Lucide 图标；
- `next-themes`；
- shadcn 组件所需的 Radix primitives、`class-variance-authority`、`clsx` 和 `tailwind-merge`。

新增或标准化目录：

```text
apps/admin/
├── components.json
└── src/
    ├── components/
    │   ├── ui/              # shadcn 基础组件，仅在此维护组件 variants
    │   ├── shell/           # AdminShell、顶栏、模式导航、主题切换
    │   ├── articles/        # 文章管理业务组件
    │   ├── settings/        # 设置业务组件与导航管理器
    │   └── git/             # Diff、发布、合并对话框
    └── lib/
        ├── utils.ts         # cn 等纯工具
        ├── theme/           # 主题枚举和无闪烁初始化边界
        └── settings-preview/ # iframe 协议、视口和聚焦状态

packages/site-schema/src/
├── schema.ts                # v2 权威 Schema
├── migrations.ts            # v1 → v2 确定性迁移
└── preview.ts               # render-only 预览模型与消息契约

docs/.vitepress/theme/
└── preview/                 # 仅开发环境启用的站点预览桥
```

不创建跨应用 `packages/ui`：公开站点是 Vue/VitePress，当前没有第二个 React 消费方。若以后出现第二个 React 应用，再独立评估共享包。

### 主题

现有品牌变量映射为 shadcn 语义 Token：

| 现有语义 | shadcn Token | 用途 |
| --- | --- | --- |
| paper / surface | `background`、`card`、`popover` | 页面、卡片、浮层 |
| ink / muted | `foreground`、`muted-foreground` | 主文本和辅助文本 |
| forest | `primary`、`ring` | 主操作、选中态和焦点 |
| sage | `secondary`、`accent` | 次级操作和柔和高亮 |
| amber | `warning` 自定义 Token | 警告和待处理状态 |
| danger | `destructive` | 删除、错误和危险确认 |

浅色主题保持当前米白、纸张和森林绿；深色主题使用低亮度墨绿与暖黑表面，维持相同层级关系和 AA 级文本对比目标。主题选择为 `system | light | dark`，由 `next-themes` 持久化并在根布局注入 hydration 保护。

### 样式所有权

`globals.css` 重构后只保留：

- Tailwind 与 shadcn 主题导入；
- 根 Token 和基础 reset；
- AdminShell、三栏网格和窄屏布局等真正跨组件布局；
- CodeMirror、Markdown 预览和少量第三方控件适配。

Button、Input、Textarea、Select、Checkbox、Switch、Badge、Card、Tabs、Dialog、AlertDialog、Sheet、Tooltip、Separator、ScrollArea、DropdownMenu、Skeleton、Toast/Sonner 和 Resizable 等外观由 `components/ui` 统一管理。业务页面不得新增等价的 `.primary-button`、`.quiet-button` 或临时卡片 class。

## 页面与组件设计

### AdminShell

`AdminShell` 负责：

- 品牌标识与本地工作区状态；
- Git 分支、变更数和阻断原因；
- “文章管理 / 站点设置”模式 Tabs；
- 主题切换；
- 当前模式对应的保存、Diff、提交、合并操作；
- 全局 notice、error 和 loading 反馈。

顶栏操作在窄屏收进 DropdownMenu 或 Sheet，但保存和当前最重要的下一步操作保持直接可见。所有禁用操作提供 Tooltip 解释原因。

### 文章管理

保留现有三栏：文章库、源码编辑、预览与大纲。

- 文章库统一使用 Input、Badge、Button、ScrollArea 和 Skeleton。
- 桌面分栏由 shadcn Resizable 承载；继续保存宽度与编辑/预览比例，并保留键盘调整与重置。
- CodeMirror 不替换，仅将标题、元数据、工具栏、上传入口、完整性问题和保存状态迁入统一组件。
- GitPanel 改为 Sheet；发布和合并使用 Dialog / AlertDialog。
- 窄屏继续使用文章库抽屉和源码/预览切换，不把三栏压缩为不可操作宽度。

### 站点设置

- 桌面左侧为设置分组 Sidebar，窄屏改为 Sheet。
- 中栏表单由 Field、Card、Input、Textarea、Select、Checkbox 和 Switch 组合。
- 右栏升级为真实站点预览工作台，同时保留问题和 Diff Tabs；窄屏通过全屏 Sheet 打开预览，不把 iframe 压成不可辨认的小卡片。
- 每个设置分组标题使用中文展示名，不再直接显示 `author`、`navigation`、`sections` 等内部键。
- 保存成功文案明确下一步：“已保存到本地；可查看差异并提交设置”。

### 作者身份链接

将当前区域命名为“作者身份链接（SEO / Person JSON-LD）”，说明：

- 它用于搜索引擎识别同一作者身份；
- 不会自动显示在页面；
- 页面可见 GitHub 等入口在“页脚与社交 → 社交链接”管理。

作者身份链接复用列表管理模式，支持新增、编辑、上移、下移和删除。UI 只编辑身份 URL，不展示无公开效果的名称或“新窗口打开”。旧数据由 v1→v2 迁移保留 href，v2 不再延续无效字段。

### 栏目管理

- “新增栏目”使用统一次级 Button，不再出现浏览器原生外观。
- 新增向导使用 Card 和表单控件；确认创建使用主 Button。
- 栏目卡片与“归档栏目”操作放入有明确 gap 的 `SectionItem`。
- 归档使用 AlertDialog，正文显示受影响文章数并说明文章保持原位。
- 栏目事务的数据、锁、确认语义和服务端接口不变。

### 导航管理

导航管理器支持：

1. 新增栏目入口：从尚未被引用的 active 顶级栏目中选择；创建后同步把 `section.navigation.header` 设为 `true`。
2. 新增自定义链接：填写标签、站内或 HTTPS URL 和新窗口选项；稳定 ID 由确定性纯函数生成并解决冲突。
3. 编辑：栏目型可改标签和显隐；链接型可改标签、URL、显隐和打开方式。
4. 重排：上移、下移后按视觉顺序把 `order` 规范化为从 0 开始的连续整数。
5. 移除：链接型直接移除；栏目型移除导航项并同步把对应栏目的 header 标志设为 `false`，不归档栏目、不移动文章。

Schema 增加同一栏目最多被一个栏目型导航引用的确定性校验。归档栏目时隐藏所有关联导航项，避免历史异常数据只处理第一项。

## 真实站点实时预览

### 预览形态与 UX

设置预览加载完整的真实 VitePress 页面，不复制一套 React 假组件。默认使用“聚焦模块”模式：根据当前设置分组导航到代表性页面，自动滚动到对应真实模块并以非侵入式轮廓标记；用户可切换为“完整页面”自由浏览。

预览工具栏提供：

- 聚焦模块 / 完整页面；
- 自适应、桌面、平板、手机视口；
- 75%、100%、125% 和适应窗口缩放；
- 可拖动调整预览栏宽度和全屏预览；
- 记忆主题、视口、缩放和预览模式；
- 在画布小于目标视口时允许横向、纵向平移，不把内容无限缩小；适应窗口最低自动缩放为 75%。

iframe 内的站内导航默认被管理端接管并保持预览上下文；工具栏另提供“打开真实页面”，用于保存后在普通站点环境做最终确认。窄屏管理端通过全屏 Sheet 展示预览。

### 模块映射

| 设置分组 | 聚焦的真实 UI 或产物 |
| --- | --- |
| 基础与品牌 | 导航 logo、站点名称；favicon 和分享图使用产物卡片 |
| 作者 | 真实 ArticleMeta；Person JSON-LD 使用结构化产物视图 |
| 栏目 | 顶部导航、侧栏、面包屑和栏目首页；未落盘的新栏目先展示事务预览 |
| 导航 | 真实顶部导航 |
| 首页 | 真实 hero 与 features |
| 外观 | 真实首页/文章页、outline、强调色和内容布局；代码主题明确标为保存后重载 |
| SEO / GEO | SERP、Open Graph、robots、Feed、sitemap、llms.txt、JSON-LD 和内容审计 Tabs |
| 页脚与社交 | 真实 `.VPFooter` 与顶部社交入口 |
| 分析与评论 | 禁用网络请求的分析状态卡和评论占位；环境变量就绪状态 |
| 高级 | locale、路由、Schema 版本和环境门禁产物 |

### 数据流与安全边界

`packages/site-schema` 提供共享的 `createSettingsPreviewModel`：它只从已通过 v2 校验的草稿生成版本化、render-only 消息，不发送仓库路径、密钥、环境变量值或整份原始配置。表单变化以约 150ms debounce 发送；草稿暂时无效时 iframe 保持最后一个有效模型，并在工具栏显示“预览仍为上次有效版本”。

公开站点预览桥只在开发环境且 URL 带显式 `?site-preview=1` 时启用。父子窗口使用严格的 `origin`、`source` 和协议版本校验，禁止 `postMessage('*')`。管理端 CSP 只增加精确站点 origin 的 `frame-src`；生产构建断言不得包含预览标记、管理端路由或桥接入口。

预览桥可以应用即时安全的运行时字段；需要 VitePress 重建的字段展示“保存后重载”状态并触发受控刷新。analytics、Giscus 或其他第三方脚本在预览模式下一律不执行，只渲染本地占位。稳定聚焦目标由主题内显式 data attribute 或稳定 VitePress selector 提供，不依赖易变的文本查询。

## 设置 Git 发布设计

### 会话范围

服务端创建不透明的设置编辑会话，至少绑定：

- 仓库真实路径；
- 创建时的分支和 HEAD；
- 配置 base hash；
- 当前服务进程内产生的精确 changed paths；
- 创建时间和最近使用时间。

普通设置保存、栏目创建/归档和品牌资源上传必须携带会话 ID。服务端在业务操作成功后登记自身返回的 changed paths；客户端不能自行把任意路径加入会话。

会话在以下条件失效：

- 服务重启；
- 仓库、分支或 HEAD 改变；
- 配置基准出现无法解释的外部变化；
- 发布成功；
- 超过固定空闲期限。

失效时 UI 保留未保存表单草稿，但要求重新加载配置并重新建立发布范围。会话只提供路径级来源隔离；如果目标文件在会话开始前已经 dirty，则阻止把该文件加入本次设置发布，并要求先在终端处理，避免整文件暂存混入旧改动。

### Diff 与确认

- 配置和栏目首页展示文本 diff。
- 品牌二进制资源展示路径、大小和新增/修改状态，不尝试渲染二进制 diff。
- 发布 Dialog 展示提交信息、目标 remote、将创建的分支和精确文件清单。
- 设置保存后顶栏出现“提交设置并推送”；尚未保存、会话为空、Git 不可写或不在默认分支时禁用，并显示具体原因。

### Git 编排

扩展现有 publish workflow 的判别式输入，不新建平行 Git 实现：

- article scope 继续使用文章及会话媒体路径；
- settings scope 从服务端设置会话读取并校验路径；
- 两者复用 Git 状态检查、默认分支门禁、唯一受管分支、精确暂存、commit、push、PR 创建/复用和合并验证。

设置分支仍使用受管 `content/` 前缀，例如 `content/2026-09-05-site-settings`，从而兼容现有合并安全校验。提交信息继续由现有规则补充 `[Human] ` 前缀。

## 状态、错误和错误恢复

- 加载使用 Skeleton；短操作使用按钮内 spinner；不会用全屏遮罩隐藏上下文。
- notice、warning 和 error 使用统一 Alert/Toast 语义；持久错误保留在对应工作区，短暂成功提示使用 Toast。
- Dialog 打开时初始焦点落在首个安全字段；关闭后焦点回到触发按钮。
- 危险操作不能以 Toast 代替确认；栏目归档和 PR 合并必须使用 AlertDialog。
- 表单校验失败自动切到“问题”页签并聚焦首个可定位字段。
- 设置冲突保留当前草稿，并提供重新加载与人工对照路径。

## 响应式与可访问性

- 桌面保留三栏文章布局和三栏设置布局。
- `<= 760px` 时，文章库与设置分组进入 Sheet；编辑器与预览用 Tabs 切换；顶栏操作收敛但保存始终可达。
- 所有图标按钮有可访问名称和 Tooltip。
- 使用原生 label、fieldset、heading 层级和 role；不以颜色作为唯一状态信号。
- 键盘可完成导航管理、栏目向导、主题切换、Dialog 确认和 Resizable 调整。
- 对话框、Sheet、DropdownMenu 和 Tooltip 使用 Radix/shadcn 焦点与 Escape 语义，不自行实现焦点陷阱。

## 迁移顺序

迁移在同一功能分支串行完成，不长期保留两套体系：

1. 配置 Tailwind、shadcn、路径别名、主题 provider、Token 和基础组件。
2. 重构 AdminShell、全局状态反馈和主题切换。
3. 建立字段消费矩阵，先接通不破坏 Schema 的公开消费方和产物门禁。
4. 实现 `schemaVersion: 2`、v1 配置与本地草稿迁移、迁移告警和 golden tests。
5. 重构站点设置通用字段、侧栏、各设置分组与 Schema v2 表单。
6. 实现作者身份 URL、栏目 UI 修复和导航 CRUD。
7. 实现共享 preview model、公开站点开发预览桥、CSP 和构建泄漏断言。
8. 实现设置预览工作台、模块聚焦、完整页面、设备尺寸、缩放、拖动和全屏 UX。
9. 实现设置会话、聚合 Diff、设置发布 Dialog 与现有 Git workflow 扩展。
10. 重构文章库、三栏外壳、Git Sheet、发布与合并 Dialog。
11. 删除已无调用的旧 UI class、旧字段和组件样式；保留经清单确认的复杂布局、CodeMirror 和 Markdown 样式。
12. 完成自动验证、真实浏览器 UAT、文档更新和验证债务清零。

每一步先新增或迁移对应测试，再删除旧实现。中途页面必须保持可启动；若某阶段不能在一个检查点内完成，则通过适配组件保持业务接口稳定，不允许业务逻辑同时存在新旧两份。

## 测试策略

### 自动测试

- 主题：三种模式、持久化、hydration 边界和主题切换可访问名称。
- 基础组件：只测试项目自定义 variants 和业务封装，不复制上游 Radix 测试。
- 导航纯函数：稳定 ID、重复栏目、添加、删除、移动、连续 order 和 section header 同步。
- Schema：字段消费矩阵完整性、同一栏目导航唯一、链接安全、default locale 唯一根映射和栏目引用一致。
- v2 迁移：冲突分享图选择当前生效值并告警、未知 social 保留、sameAs href 无损、旧草稿迁移与冲突恢复。
- 公开消费：logo alt、title template、主题、强调色、布局、代码主题、分享图 alt、内容信号和环境门禁均有消费者回归测试。
- 预览模型：只输出 render-only 白名单字段；无效草稿保持最后有效版本并标记 stale。
- iframe 协议：拒绝错误 origin、source、版本和消息形状；站内导航接管与聚焦目标可恢复。
- 预览构建安全：生产包不包含 preview query、桥接注册和管理端 origin；预览模式不触发第三方请求。
- 设置会话：仓库/分支/HEAD/base hash 绑定、路径登记、预存 dirty 拒绝、失效与发布后清空。
- Git workflow：settings scope 精确暂存、范围外 staged 拒绝、非默认分支阻断、PR 输入和错误传播。
- 组件：设置保存下一步、作者链接解释、栏目按钮样式语义、归档确认、导航 CRUD、发布 Dialog 文件范围和禁用原因。
- 文章回归：列表、筛选、创建、编辑、草稿、保存、上传、Diff、布局持久化和响应式切换。

所有行为变更遵循 RED → GREEN → REFACTOR；新增测试必须先观察到因功能缺失产生的预期失败。

### 真实产品 UAT

本次是用户可见 UI、持久配置和 Git 工作流的跨层重构，按 Deep 深度验收：

| 关注点 | 必须观察的证据 |
| --- | --- |
| 真实入口 | 从管理端顶部切换文章管理与站点设置，不依赖隐藏直达路由 |
| 主题 | system/light/dark 均可切换，刷新保持，首屏无明显错误主题闪烁 |
| 文章关键链路 | 加载 21 篇基线文章，打开、编辑、预览、保存、刷新后保持 |
| 设置关键链路 | 修改安全字段、保存、查看 Diff、刷新后读取权威配置 |
| 配置实际生效 | 按消费矩阵抽查视觉、SEO/GEO、结构化数据和门禁字段；不存在可编辑但无消费者的字段 |
| v1→v2 迁移 | 用带冲突分享图、未知 social 和 sameAs 的 v1 fixture 启动；结果可解释、无静默丢失并可持久化为 v2 |
| 模块预览 | 逐个设置分组验证真实 UI 或真实产物；草稿修改后预览更新，保存后普通站点结果一致 |
| 预览工作台 | 聚焦/完整页面、四种视口、75/100/125/适应、平移、调整栏宽和全屏均可操作且状态保持 |
| 预览安全 | 错误消息源被拒绝；无效草稿显示上次有效版本；分析与评论不产生第三方网络请求 |
| 导航 CRUD | 新增链接和栏目入口、编辑、显隐、上下移动、删除、保存、刷新、公开站点预览一致 |
| 栏目事务 | 新增向导、预览、取消；归档预检显示文章数并可取消，不破坏文章 |
| 发布准备 | 设置发布 Dialog 列出精确范围；非默认分支显示阻断原因；不实际 push |
| 失败恢复 | 校验失败、配置冲突或会话失效时草稿保留，提示可执行下一步 |
| 响应式 | 代表性桌面和 520×800 窄屏中导航、表单、Sheet、Tabs、Dialog 可操作 |
| 可访问性 | 键盘完成主要链路，焦点关闭后回归触发器，图标按钮均有名称 |

自动测试和构建只作为辅助证据，不能替代以上真实渲染结果。每一项只记录 `passed`、`failed` 或 `not-tested`。

## 文档与维护门禁

交付时同步维护：

- `apps/admin/README.md`：启动、主题、设置发布和安全边界；
- `docs/architecture/admin-ui.md`：组件目录、Token、variants、业务组件边界；
- `docs/architecture/settings-contract.md`：逐字段消费方、预览类型、迁移策略和移除依据；
- `docs/uat/`：本次逐项 UAT 证据；
- 本设计文档：记录实施中经确认的偏差和原因。

代码评审检查：

- 通用控件是否复用 `components/ui`；
- 是否新增了可由语义 Token 表达的硬编码颜色；
- 是否在业务组件中重新实现 Dialog、Sheet、Tooltip 或 focus trap；
- 是否改变配置、栏目或 Git 安全边界而没有对应测试和文档；
- 是否遗留无引用旧 class 或重复组件。

## 风险与控制

| 风险 | 控制措施 |
| --- | --- |
| Tailwind base 与旧全局 CSS 冲突 | 先建立 Token 和组件适配层，按页面迁移；每阶段检查截图和关键交互后才删除旧 class |
| 大范围组件替换破坏业务状态 | 保持现有业务 hooks、API 和 props 边界，先替换呈现层，再做有限拆分 |
| Resizable 迁移改变布局持久化 | 保留现有存储格式或提供一次性兼容转换，并覆盖桌面/窄屏 UAT |
| 深色主题下预览或编辑器不可读 | 为 CodeMirror 和 Markdown 预览定义独立语义 Token，逐视口检查对比度 |
| iframe 跨 origin 或 CSP 配置过宽 | `frame-src`、消息 origin/source 和站点 origin 使用精确白名单；协议有显式版本与消息校验 |
| 无效草稿让预览误导用户 | 仅发送通过 v2 校验的 render-only 模型；保留上次有效画面并明显标记 stale |
| 预览桥泄漏到生产公开站点 | 只在开发模式和显式 query 下注册，并以构建产物扫描作为发布门禁 |
| 完整页面在右栏过小不可读 | 最低自动缩放 75%，支持平移、调整宽度、预设视口和全屏 Sheet |
| 第三方分析或评论在预览中产生副作用 | 预览模式禁用外部脚本和请求，仅渲染本地占位与就绪状态 |
| Schema v2 迁移静默丢失旧值 | 确定性迁移、可见告警和 golden fixtures；未知 social 保留为通用 provider |
| 设置发布混入旧改动 | 服务端会话绑定 Git 基准；会话开始前已 dirty 的目标文件拒绝加入范围 |
| 服务重启丢失设置会话 | UI 明确会话失效并保留设置草稿；重新加载后建立新会话，不根据工作区猜测来源 |
| 品牌上传后放弃设置形成孤儿文件 | 不自动删除用户文件；发布仅允许当前会话且被已保存配置引用的资源，孤儿清理另行显式确认 |
| 当前功能 worktree 大量改动无法真实发布 UAT | 保持发布按钮阻断，不执行远端写；通过测试仓库验证 Git 编排并记录真实环境限制 |

## 已确认决策

- 全量重构 `apps/admin`，不是只迁移设置页。
- 保留现有 Jia him 米白与森林绿视觉语言。
- 同时交付 system/light/dark 三种主题。
- 保留文章管理三栏信息架构和既有编辑逻辑。
- 导航使用按钮重排，不引入拖拽依赖。
- shadcn 负责 UI，业务状态、配置和 Git 契约仍由现有领域模块负责。
- 设置预览加载完整真实 VitePress 页面；默认聚焦当前模块，同时保留完整页面模式。
- 预览支持设备尺寸、缩放、平移、可调栏宽和全屏；窄屏使用全屏 Sheet。
- 采用方案 A：本次同步关闭全部配置消费断点，不保留“能编辑但实际不生效”的字段。
- 配置升级为真正的 Schema v2，并对磁盘配置与本地草稿提供可测试的 v1→v2 迁移。
- 非视觉设置必须展示其真实生成产物或门禁状态，不能用模拟 UI 代替。
- 未获得单独 Git 授权前，不 commit、push、创建 PR、merge、rebase 或清理 worktree。
