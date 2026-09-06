# Admin shadcn/ui、真实预览与设置发布 UAT

日期：2026-09-05（Asia/Singapore）

风险深度：Deep。原因是本次同时改变用户可见 UI、响应式交互、持久配置、跨窗口预览协议及 Git 提交/推送/合并链路。

当前判定：**Ready for user acceptance（可供用户验收）**。自动门禁、生产构建、临时仓库 Git 验证、本机 HTTP 探针和真实浏览器桌面/窄屏 UAT 均已通过。局域网入口在 Codex 内置浏览器和用户 Safari 中均无法正常打开，用户于 2026-09-05 14:56 决定改用纯本机入口，局域网代理随即停止。真实 push、PR 与 merge 仍未获授权，因此不属于本次 UAT 的执行范围。

## 范围与不变量

- 工作目录：`/Users/xiexin/project/about-me-editorial-cms`
- 工作分支：`codex/editorial-cms`
- 远端：`origin = git@github.com:xiexin12138/about-me.git`
- 当前工作区包含大量本任务前已存在或与整项 CMS 工作共同产生的未提交改动；未执行 stage、commit、push、PR、merge、rebase、reset、checkout、stash 或 clean。
- 真实工作区不在默认分支且 `config/site.config.json` 为会话开始前的未跟踪文件，设置发布必须显示阻断原因。
- 成功 Git 路径只在 `/private/tmp` 下创建的临时仓库中验证；没有访问真实远端。

## 自动验证台账

| 时间 | 命令 | 结果 | 证据/处置 |
| --- | --- | --- | --- |
| 15:27 | `pnpm --filter @jiahim/site-schema test` | passed | 9 files / 62 tests，0 failure |
| 21:55 | `pnpm --filter @jiahim/site test` | passed | 11 files / 27 tests，0 failure；包含页脚 target 标记、聚焦滚动与清理的运行时门禁 |
| 22:01 | `pnpm --filter @jiahim/admin test` | passed | 58 files / 288 tests，0 failure；包含深色表面/WCAG 对比度、手机主题入口、CodeMirror/Sonner/浏览器 chrome 主题和页脚真实预览路径回归断言 |
| 15:23 | `pnpm typecheck` | passed | site-schema 与 admin 均退出 0 |
| 22:03 | `pnpm build` | passed | 最终代码与文档下 VitePress/Next.js 生产构建退出 0；Admin `/` 为 368 kB，First Load JS 481 kB |
| 15:29 | `pnpm --filter @jiahim/site build` | passed | 文档收口后再次构建 VitePress，最终 UAT/交接文档可渲染，内容信号仍为同一组非阻断提醒 |
| 15:23 | 旧业务 class 扫描 | passed | 排除 CSS 与测试后，无 `primary-button`、`quiet-button`、旧 backdrop、`settings-card-list` 或单数旧 tab class |
| 15:23 | `postMessage('*')` 扫描 | passed | `apps/admin/src` 与 `docs/.vitepress` 无命中 |
| 15:23 | 站点生产产物泄漏扫描 | passed | `apps/site/dist` 无设置预览协议、`site-preview=1`、预览 origin 环境变量或 Admin loopback 标记 |
| 15:23 | 调试标记与 `git diff --check` | passed | 无 `settings-preview-debug` 残留；已跟踪 diff 无 whitespace error |

构建输出仍有 36 条既有内容信号警告（文章缺少更新时间或站外引用）。它们属于内容质量提醒，不是本次 Admin/设置发布构建失败，也没有被静默描述为通过项。

## 安全与跨层证据

| 关注点 | 状态 | 可观察证据 | 残余风险/下一步 |
| --- | --- | --- | --- |
| 设置会话绑定仓库/分支/HEAD/hash | passed | `session.test.ts` 覆盖 repository realpath、branch、HEAD、配置 hash、30 分钟超时与完成后失效；服务重启后真实 UI 正常恢复 | — |
| 浏览器不能注入发布路径 | passed | `/api/git/publish` 路由测试只接受 `scope/message/date`，额外 `paths` 返回 400 | — |
| 会话前旧改动不进入范围 | passed | 会话状态机测试把 pre-existing dirty path 标为 rejected；真实 UI 发布按钮禁用，Tooltip 显示“当前设置会话没有可发布的文件” | — |
| 精确文本/二进制 Diff | passed | tracked、untracked、staged/worktree、空范围和二进制摘要测试通过；真实 Inspector 的预览/问题/Diff 标签可访问 | 真实工作区无本次新保存，故未制造 Diff |
| 精确提交 | passed | 临时仓库提交配置、栏目首页、品牌资源 3 文件；故意修改的 `package.json` 留在工作区且未暂存 | 未测试真实 push/PR（有意禁止） |
| 发布环境门禁 | passed | 缺失公开集成环境变量时路由返回 409，任何 Git 工作流调用前停止 | — |
| 合并绑定 OID | passed | Dialog 显示 OID；服务端要求显示 OID、fresh PR OID 与本地 HEAD 三者一致，并要求 clean、upstream、ahead/behind=0 | 未执行真实 merge（有意禁止） |
| 预览桥来源与生产隔离 | passed | 协议单测、严格 origin/source/version、握手重试、生产泄漏扫描；真实 iframe 收到草稿后带 `settings-preview-active`，预览模式禁用 Giscus/analytics | 未用 DevTools 逐请求截图；生产门禁和运行时禁用测试覆盖该边界 |

## 需求 R1–R9 UAT 矩阵

| ID | 风险/原因 | 状态 | 当前证据 | 浏览器关闭条件 |
| --- | --- | --- | --- | --- |
| R1 保存后发布 | 跨文件和真实 Git 意图 | passed | 顶部与表单文案明确“先本地保存，再从发布设置进入 Git 审查”；真实发布按钮安全禁用并显示精确 Tooltip；临时仓库完整成功路径 passed | 真实 push/PR/merge 需用户另行授权 |
| R2 作者链接解释 | 容易误解公开位置 | passed | 真实作者页显示“用于 Person JSON-LD 的 sameAs 身份确认，不会显示在页脚；网站可见链接请在‘页脚与社交’中设置” | — |
| R3 新增栏目按钮 | 原生控件回归 | passed | 真实页面统一使用语义 Button；旧业务 class 扫描无命中；桌面/520px 页面均可操作 | — |
| R4 归档间距 | 纯视觉布局 | passed | 栏目卡片操作区由 `gap-3` 管理；真实桌面/520px 布局无重叠或贴边 | — |
| R5 导航 CRUD | 状态同步和排序 | passed | 真实导航页显示添加栏目、添加外链、标签、显隐、上下移动、删除；添加外链 Dialog 可打开且确认前校验；纯函数与组件测试覆盖完整事务 | UAT 未确认删除，避免修改真实草稿 |
| R6 全量 shadcn/主题 | 全局视觉和持久化 | passed | 深色切换后根元素为 `dark`，刷新仍保持；已恢复“跟随系统”；520×800 顶栏与设置 Sheet 可用 | — |
| R7 分模块真实预览 | iframe 与真实 Vue UI 跨层 | passed | 11 分组可访问；基础/作者/栏目/导航/首页/外观/页脚使用真实 VitePress iframe；SEO、公开集成、高级展示 robots/sitemap/Feed/llms/JSON-LD 等真实生成产物 | — |
| R8 聚焦/整页/缩放 | 响应式、滚动和可读性 | passed | 真实验证聚焦/完整页面、手机 390、125%、全屏；全屏时内联 iframe 卸载且同一受控 iframe 继续接收更新；520×800 使用独立预览 Sheet | 75/100/fit、桌面/平板由组件测试覆盖 |
| R9 无效配置清零 | Schema/消费方一致性 | passed | v1→v2、消费矩阵、公开 adapter/generator、内容门禁测试 passed | 浏览器只做代表性产物抽查 |

## 服务与网络证据

局域网入口 `http://192.168.5.21:3000/` 曾通过命令行探针，但在 Codex 内置浏览器和用户 Safari 中均不能正常打开。按用户最新决定，验收传输改回产品原始安全边界：仅绑定 loopback，不再暴露 LAN。

| 层 | 地址 | PID | 2026-09-06 00:41 最终 GET 探针 |
| --- | --- | --- | --- |
| Admin Next dev | `http://127.0.0.1:3000/` | 90835 | `/` HTTP 200；`/api/settings` HTTP 200；CSP `frame-src http://127.0.0.1:5173` |
| Site VitePress dev | `http://127.0.0.1:5173/` | 90799 | `/zh/` HTTP 200 |
| LAN TCP proxy | 已停止 | — | 不再监听 `192.168.5.21:3000` 或 `:5173` |

当前启动命令：

```bash
VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS=http://127.0.0.1:3000 pnpm --filter @jiahim/site exec vitepress dev ../../docs --host 127.0.0.1 --port 5173
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:5173 pnpm --filter @jiahim/admin exec next dev --hostname 127.0.0.1 --port 3000
```

## 真实浏览器执行记录

1. 本机 Admin 加载 21 篇文章，分类计数为 4/7/3/7；11 个设置分组均可进入。
2. 预览桥初次连接问题在 UAT 中暴露并修复：Vue 生命周期改由真实组件承载，ready 握手在首个有效更新前重试。修复后 iframe 出现 `settings-preview-active`，草稿主题与模块定位实时生效。
3. 栏目和首页原先错误使用代表文章路径，导致聚焦目标为 0；修复为根页面后，两组均找到 1 个真实模块目标。
4. 全屏预览原先创建未受控的第二个 iframe；修复为全屏时卸载内联画布并复用同一受控 iframe。
5. 页脚组以手机 390px、125% 和聚焦模式验证；完整页面与全屏均可切换，Escape 可关闭全屏。
6. 520×800 下“设置分组”和“预览当前模块”均以 Sheet 打开，真实 VitePress iframe 可见；结束时已恢复默认视口。
7. 深色主题切换、刷新持久化通过，结束时恢复“跟随系统”。
8. 文档构建后再次执行浏览器冒烟：11 个设置分组、1 个真实 iframe、0 个“正在连接”状态；未保存任何 UAT 测试数据，未调用真实 push、创建 PR 或 merge。最终浏览器已回到 `http://127.0.0.1:3000/` 的文章管理首页供用户验收。

## 视觉回归补充验收（18:43–18:51）

用户复验指出页面样式混乱后，原“Ready”判定即时降级，按 `docs/superpowers/plans/2026-09-05-admin-visual-regression-remediation.md` 重新执行根因分析、测试驱动修复和真实浏览器验收。没有把先前自动测试结果当成视觉通过证据。

| 验收点 | 修复前证据 | 修复后真实浏览器证据 | 状态 |
| --- | --- | --- | --- |
| 设置三栏排位 | 宽屏表单实际宽约 8px，拖拽条误占第一列 | 桌面预设下表单/拖拽条/预览依次约 632/8/449px，x 坐标单调递增，无空白错列 | passed |
| 设置中屏 | 855px 下 Inspector 被压到约 32px | 1024 与默认 855 宽度均显示全宽单列表单；侧栏、内联预览、拖拽条隐藏；“设置分组”和“预览当前模块”Sheet 可打开 | passed |
| 中屏头部 | 855px 内部最小宽度约 941px，右侧被裁切 | 855px 下页面与头部 `scrollWidth === clientWidth === 855`；分支/mode/直接 merge 隐藏，发布短标签与更多菜单保留 | passed |
| 文章行高 | shadcn 默认高度约 36px 压缩两行 | 桌面、中屏和手机抽屉前 8 行均约 48.31px，连续无重叠，`white-space: normal` | passed |
| 文章左对齐 | 不同长度标题起点不同，计算样式居中 | 手机抽屉前 5 行标题 left 均约 17.71px，`align-items/justify-content: stretch` | passed |
| 真实预览可读性 | 中屏预览几乎不可见 | 855px 与手机宽度下预览 Sheet 全屏打开；聚焦/整页、设备、适应/75/100/125、全屏控件全部可操作；手机“适应”后 iframe 约 292.5×552px | passed |
| 文章工作区回归 | 通用 resize class 存在跨布局污染风险 | 桌面三栏约 220/6/542/6/535px；1024 预设下为 260px 侧栏 + 671px 编辑区；手机使用可关闭抽屉 | passed |

浏览器视口由当前 CUA 宿主按约 1.1 显示缩放映射：1440/1024/520 宿主预设对应页面测得约 1309/931/472 CSS px；另使用宿主默认视口直接复验精确 855 CSS px。所有档位 `documentElement.scrollWidth` 均未超过页面视口。截图逐张人工检查，不以 DOM 数值代替视觉结论。

## 深色模式与模块聚焦补充验收（21:24–21:48）

用户指出夜间模式未完成后，UAT 再次降级并逐层检查根元素、语义 Token、第三方编辑器主题、浮层和响应式工作区。修复遵循“Admin 外壳跟随 Admin 主题，真实网站 iframe 保持站点自身主题”的边界，没有把 Admin 主题强行注入网站预览。

| 验收点 | 修复前证据/根因 | 修复后证据 | 状态 |
| --- | --- | --- | --- |
| Admin 主表面 | 根元素已有 `.dark`，但文章/设置侧栏、Inspector、模式切换和全局状态仍写死 `white/#f2ede3/#ebe5d9` 等浅色 | 桌面设置页可见亮色背景扫描为 0；侧栏 `rgb(29,36,31)`、表单 `rgb(32,40,34)`、Inspector `rgb(29,36,31)`，页面无横向滚动 | passed |
| Markdown 编辑器 | CodeMirror 未传入主题，深色 Admin 中仍使用默认白色编辑器 | `theme={resolvedTheme}`；真实页面 `.cm-editor/.cm-gutters` 为 `rgb(40,44,52)`，文字分别为 `rgb(171,178,191)` / `rgb(125,135,153)` | passed |
| 浮层与全局组件 | Toaster 未绑定当前主题；destructive 组件固定白字，暗色危险背景下对比错误；预览 warning 小字对比不足 | `AdminToaster` 读取解析后的主题；Button/Badge 使用 `destructive-foreground`；warning 浅/深实算对比度约 7.20:1/8.56:1；主题菜单、更多菜单、版本控制 Sheet、设置分组 Sheet 和预览 Sheet 均在真实浏览器检查 | passed |
| 浏览器元信息 | `themeColor` 只声明浅色值，且手动主题可能与 OS 偏好相反 | 首屏 light/dark media 分别声明 `#f3efe6` 与 `#151a17`；客户端按 `resolvedTheme` 同步全部 theme-color meta。深色真实页面两项均为 `#151a17` | passed |
| 移动端布局 | 需要确认主题修复没有重新引入溢出或亮色抽屉；原 480px 规则隐藏唯一主题入口 | 520×900 下文章编辑、文章列表抽屉、设置表单、设置分组 Sheet 和预览 Sheet可用；390×844 下主题菜单仍显示且可选择系统/浅色/深色；两档均无横向溢出，亮色背景扫描为 0 | passed |
| 页脚聚焦 | 真实 UAT 发现页脚预览仍打开带侧栏文章页；VitePress `.VPFooter.has-sidebar` 为 `display:none`，目标虽被标记但不可见 | 新回归测试先失败后通过；`footer-social` 改用首页路径。移动端真实 iframe 为 `/`，页脚正文与 `Copyright © 2024-2026 Jia him` 可见并带聚焦描边 | passed |

深色表面契约测试递归检查关键选择器必须使用语义背景 Token，并禁止业务规则重新引入已知浅色字面量。保留的固定深色仅限 Markdown 代码块、Git diff 和移动抽屉遮罩，它们本身就是深色语义表面。最终只读代码审查的 2 个 Important 与 2 个 Minor 均已关闭，并分别补充自动或真实浏览器证据。

## 密度、字号与发布引导补充验收（2026-09-06 00:20–00:39）

| 用户验收点 | 实现依据 | 自动/真实产品证据 | 状态 |
| --- | --- | --- | --- |
| 栏目过滤过于占空间 | 复用原 `category` 筛选状态，UI 改为带数量的 shadcn Select | 真实下拉显示“全部文章 · 21”和 4 个栏目；选择“技术 · 7”后列表只剩技术文章，再恢复全部；组件测试覆盖选项映射与选择回调 | passed |
| 编辑器字号偏大且可调 | 编辑器独立 13/14/16px 偏好，默认 14px | 深色真实页面显示 `A− 14px A+`；切到 16px、刷新并重开文章后仍为 16px，随后恢复默认；CodeMirror 使用 `--editor-source-font-size` 而非硬编码 px | passed |
| 阅读预览字号偏大且可调 | 预览独立 14/16/18px 偏好，默认 16px | 深色真实页面显示 `A− 16px A+`；切到 14px、刷新并重开文章后仍为 14px，随后恢复默认；标题、H2/H3 与正文共用预览语义变量 | passed |
| 设置模块字号不一致 | Admin 正文/控件基线 `.875rem`，设置分组标题 1.25rem，侧栏标题拆成 1rem/0.75rem 两级 | 深色逐页人工检查基础、栏目、导航、作者、页脚与社交、高级；脚本巡检 11 个设置分组均有正确标题且无错误；浅色复验高级、文章编辑和预览 | passed |
| “站点设置公开配置”层级异常 | `.pane-heading` 改为两行语义标题，不再把两个层级拼成同一行 | 深色真实设置页显示“站点设置”主标题与“公开配置”辅助标题，大小和间距稳定 | passed |
| 修改后无法理解为什么不能提交推送 | 由同一 Git 状态模型生成可见状态与 Tooltip；优先提示先保存，保存后提示实际分支门禁 | 将站点名临时改为 `Jia him UAT` 时显示“请先保存”；还原并保存同值草稿后显示“当前分支为 codex/editorial-cms，设置只允许从 main 提交并推送”；未执行真实 push/PR/merge | passed |
| 根字号与 14px 基线 | `html: 100%`，Admin 基线 `.875rem`，不锁死用户浏览器根字号 | `TypographyContract.test.tsx` 锁定根字号、Admin token 和 CodeMirror 变量；浏览器计算样式与深浅主题人工检查通过 | passed |
| 状态窄屏防溢出 | 设置状态栏允许换行，文本允许任意长词断行 | `SettingsWorkspace.test.tsx` 锁定正常文档流和 `flex-wrap: wrap`；既有 520/390px 设置工作区与 Sheet 回归仍由响应式套件覆盖 | passed |

最终自动门禁：`@jiahim/admin` 60 个测试文件、296 项测试全部通过；Admin typecheck 通过；Next 生产构建通过，首页 369 kB、First Load JS 481 kB。测试运行中 CodeMirror 在 jsdom 尝试调用未实现的 `Range#getClientRects` 会输出 stderr，但对应 `EditorPane` 用例通过，真实浏览器编辑、字号切换和持久化另行通过；该信息不影响产品判定，但保留在台账供后续选择是否增加测试 polyfill。

UAT 未更改配置内容：仅为验证“先保存”提示建立并还原同值本地草稿，最终使用产品保存动作清除草稿状态；Git 修改数保持 317。未执行 commit、push、PR、merge、stash、checkout、reset 或 clean。

### 生产构建后的开发服务恢复（2026-09-06）

最终交付后用户截图发现页面只剩未排版 HTML。诊断证据为：`GET /` 仍返回 200，但首页实际引用的 `/_next/static/css/app/layout.css`、`main-app.js` 与 `app/page.js` 全部返回 404。根因是同一 worktree 中仍在运行的 `next dev` 与随后执行的 `next build` 共用 `apps/admin/.next`，生产构建替换了开发进程持有的资源清单。

只重启 Admin 开发进程，未重启站点服务。重启后 `/`、实际 CSS、`main-app.js` 和 `app/page.js` 均返回 200；真实浏览器强制刷新后重新出现完整深色布局、栏目下拉和响应式工作区。运行约束：同一 worktree 不并行或交错运行 `next dev` 与 `next build`；必须构建时，构建完成后重启 Admin，或在独立 worktree/构建目录执行。

## 设置长表单滚动补充验收（2026-09-06 00:48–00:54）

| 关注点 | 修复前证据 | 修复后真实产品证据 | 状态 |
| --- | --- | --- | --- |
| 根因 | `.settings-form-pane` 为 1849/1849px，无自身溢出；父级 `.settings-form-panel` 为 705/1849px 且 `overflow:hidden` | 父级变为 705/705px、`min-height:0`；语义表单区域变为 705/1849px、`overflow-y:auto` | passed |
| 栏目长表单 | 鼠标/触控板没有合法滚动容器 | 真实坐标滚动从 `scrollTop 0` 到 1143.5（最大 1144），再回到 0；底部“工作”栏目可达 | passed |
| 导航与高级 | 与栏目共用同一错误容器契约 | 导航从 0 到最大 653.5；高级从 0 到 801（最大 911）；切换分组后均从顶部开始 | passed |
| 760px 窄屏 | 必须避免桌面修复制造双重内滚动 | `.settings-form-pane` 随内容展开，`.settings-workspace` 为唯一滚动容器；真实坐标滚动从 0 到 800（最大 961），标准化 JSON 区域可达 | passed |
| 自动门禁 | 无长表单滚动所有权断言 | 新测试先失败于父级缺少 `min-height:0`，修复后 `SettingsWorkspace` 11/11 通过；完整 Admin 60 个测试文件、297 项测试通过；typecheck 与 Next 生产构建通过 | passed |

本轮只修改布局契约与回归测试，没有更改任何站点配置、文章内容或 Git 发布状态。生产构建前先停止开发服务，构建通过后再重启，最终 `/`、CSS、核心 JS、页面 JS 与 VitePress `/zh/` 全部返回 200。验收视口已恢复默认，页面停留在“栏目”顶部供用户继续测试。

## 导航空候选 UX 补充验收（2026-09-06）

| 关注点 | 产品规则 | 验收证据 | 状态 |
| --- | --- | --- | --- |
| 空选择器 | 所有启用顶级栏目已进入导航时，不再打开没有选项的对话框 | 真实浏览器中“添加栏目导航”为禁用态，解释文案可见，页面内 `dialog` 数量为 0 | passed |
| 删除与隐藏 | 删除导航项释放对应栏目；关闭“显示”只隐藏现有导航项，不释放候选 | 常驻文案明确区分两种操作；既有删除状态事务测试与新增组件测试通过 | passed |
| 多语言 | 当前语言无候选但其他启用语言有候选时，不应误判为全局不可添加 | 新组件测试构造英文 `Notes` 候选，入口可用且对话框自动选择 English / Notes | passed |
| 自动门禁 | 交互变化不得破坏既有导航 CRUD 或设置工作区 | Admin 60 个测试文件、299 项测试全部通过；typecheck 与 VitePress 生产构建通过 | passed |

本轮真实 UAT 没有点击删除、保存或发布，不改变用户配置和 Git 发布状态。Admin 生产构建通过（首页 369 kB、First Load JS 482 kB）；按运行约束先停止开发服务、构建后重启，`/`、实际 CSS、核心 JS 与 VitePress `/zh/` 均返回 200。验收页停留在“导航”顶部，用户可直接查看禁用入口与说明。

## 本机验收服务持久性补充（2026-09-06 08:37–08:40）

用户反馈链接无法访问后，端口与 HTTP 探针确认 3000、5173 均无监听并直接拒绝连接；代码、路由和静态资源不是故障点。复现表明普通交互式执行会话在回合结束后会回收其子进程，`nohup` 也会被当前运行环境清理。两个服务已迁移到独立 tmux 会话 `jiahim-admin` 与 `jiahim-site`。迁移后 `tmux list-sessions`、两个监听端口及 Admin `/`、Site `/zh/` 均通过；真实浏览器重新加载 21 篇文章，控制台错误数为 0。

## 空状态主按钮颜色补充验收（2026-09-06 09:02–09:08）

| 关注点 | 根因与修复 | 真实产品证据 | 状态 |
| --- | --- | --- | --- |
| 浅色主按钮 | 未分层的全局 `button { color: inherit }` 覆盖 shadcn `text-primary-foreground`，空状态按钮继承父级灰字；移除该按钮颜色重置，保留字体重置与 Tailwind preflight | 左侧“新建”和空状态“新建文章”均为 `rgb(40, 84, 67)` 背景、`rgb(255, 255, 255)` 文字，均非 disabled、opacity 1 | passed |
| 深色主按钮 | 同一 variant 应自动使用深色主题 Token，不增加局部特例 class | 两个按钮均为 `rgb(142, 183, 161)` 背景、`rgb(16, 39, 30)` 文字；复验后恢复浅色主题 | passed |
| 回归与构建 | 新增全局按钮前景色契约，先红后绿 | 聚焦契约 14/14；完整 Admin 60 个测试文件、300 项测试全部通过；typecheck 与 Next 生产构建通过 | passed |

生产构建前停止 `jiahim-admin`，构建后在同名 tmux 会话重启；Admin `/` 与 Site `/zh/` 均为 HTTP 200。真实 UAT 未点击“新建文章”，因此未创建草稿或改动内容数据。
