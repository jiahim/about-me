# Admin 视觉回归修复记录

日期：2026-09-05（Asia/Singapore）

状态：已确认并实施，等待本文所列门禁全部复核后交付。

## 背景与确认范围

用户在 `http://127.0.0.1:3000/` 复验 shadcn/ui 重构后，确认“很多样式都不对，都是乱的”。经真实页面取证，双方确认本轮只处理以下可复盘边界：

1. 修复设置工作区表单、拖拽条、预览三列错位。
2. 设置页在中等宽度改为单列表单，复用已有 Sheet 承载分组和真实预览。
3. 中等宽度头部收起分支信息和直接“合并并发布”，继续通过已有更多菜单提供次要动作。
4. 文章列表行退出 shadcn Button 的固定高度和居中布局，保证标题与元数据不重叠且统一左对齐。
5. 用真实浏览器覆盖桌面、中屏、默认验收宽度和手机宽度；自动测试、类型检查、生产构建与文档同步作为交付门禁。

本轮不改变配置数据结构、预览协议、Git 状态模型、保存/发布语义，也不执行真实 commit、push、PR 或 merge。

## 根因证据

| 问题 | 可观察证据 | 根因 | 修复策略 |
| --- | --- | --- | --- |
| 设置页宽屏表单近乎空白 | `.settings-main-panels` 三个子项实际落在错误列：表单占 8px，拖拽条占第一列 | 通用 `.workspace-resize-handle { grid-row: 1 }` 参与嵌套 Grid 自动排位 | 将文章工作区规则限定为直接子项，并显式指定设置表单/拖拽条/预览为第 1/2/3 列 |
| 855px 设置页预览被压成约 32px | 仍采用 220px 侧栏 + 双面板桌面布局 | 设置 Sheet 断点只有 760px，无法容纳三栏 | 设置专用响应式断点提前到 1024px，复用既有两个 Sheet |
| 855px 顶栏被最小内容宽度撑开 | 顶栏内部宽度约 941px，分支徽标与直接合并动作仍显示 | 次要信息收起过晚 | 1100px 以下隐藏 mode/branch 与直接 merge，缩短发布标签，次要动作保留在更多菜单 |
| 文章标题/日期互相挤压 | `.article-row` 实测约 36px，却包含标题与元数据两行 | shadcn Button 默认 `h-9 whitespace-nowrap` | 文章行使用 `h-auto whitespace-normal` 并由组件样式设为自适应高度 |
| 不同长度文章标题忽左忽中 | 移动抽屉中每行标题起点不同；计算样式为 `justify-content: center` | Button 默认 `items-center justify-center` 在 Grid 行继续生效 | `.article-row` 明确 `align-items/justify-content: stretch` |

## 测试与可调整点

- `ArticleSidebar.test.tsx` 锁定自适应高度、正常换行、拉伸对齐和既有两行信息结构。
- `SettingsWorkspace.test.tsx` 锁定三列显式归属及 1024px 单栏/Sheet 契约。
- `WorkspaceHeader.test.tsx` 锁定 1100px 中屏收起项与简短发布标签。
- 断点、列宽和行高只由 `apps/admin/src/app/globals.css` 管理；后续若调整宽度策略，可先改对应断言，再改同一处 CSS，避免散落到业务状态层。
- 组件只增加语义 class，没有复制设置导航、预览或发布状态。

最终实测、命令结果、服务地址和残余边界统一记录在 `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`。

## 深色模式追加决策

用户后续指出夜间模式仍不完整，本记录追加以下已确认的长期契约：

1. `html.dark` 只负责选择语义 Token；业务表面不得写死 `white`、米白背景或与主题绑定的半透明白色。
2. Admin 侧栏、表单、Inspector、预览设备画布、状态条和输入框必须使用 `--sidebar`、`--paper`、`--paper-deep`、`--surface`、`--muted` 等语义变量。
3. 受控第三方组件必须显式消费解析后的主题：CodeMirror 使用 `resolvedTheme`，Sonner 由 `AdminToaster` 统一绑定；系统主题不能直接以 `system` 字符串传给只接受 light/dark 的组件。
4. 危险操作前景色通过 `--destructive-foreground` 单独定义，避免暗色主题把背景调亮后仍固定白字。
5. 真实网站 iframe 是独立产品表面，使用站点配置和站点主题；Admin 深色模式只影响 iframe 外壳，不覆盖 iframe 内主题。
6. 模块聚焦的代表页面必须保证真实目标可见。VitePress 在带侧栏文章页隐藏 `.VPFooter.has-sidebar`，因此 `footer-social` 与首页/栏目一样使用根页面作为代表路径。
7. 主题入口在所有支持的响应式宽度都必须可用；390px 手机端保留主题菜单，不再以 CSS 隐藏唯一入口。
8. 小字号 warning 状态使用独立的 `--warning-foreground` 保证对比；不能因为背景已带 warning 色就复用同一强调色作为文字。
9. 服务端 metadata 继续提供无脚本的 light/dark media 初始值，客户端再按 `resolvedTheme` 同步浏览器 `theme-color`，覆盖手动主题与系统偏好相反的情况。

对应自动门禁位于 `apps/admin/src/app/dark-surface-contract.test.ts`、`MarkdownEditor.test.ts`、`theme-provider.test.tsx` 和 `settings-preview/SettingsPreviewWorkbench.test.tsx`；真实浏览器证据统一写入 UAT 台账。

## 2026-09-06 密度、字号与发布引导追加决策

用户在真实页面继续指出栏目过滤占用空间、文章编辑/预览字号偏大、设置模块字号不一致，以及设置已修改时无法理解为什么不能提交推送。确认后的实现边界如下：

1. 文章栏目过滤复用现有 shadcn Select，选项同时显示栏目名称和数量，不新增第二套筛选状态。
2. `html` 使用 `font-size: 100%` 尊重浏览器偏好；Admin 的默认 UI 基线通过 `.875rem` 语义 token 表达 14px，不把根元素写死为 14px。
3. 编辑器默认 14px，可选 13/14/16px；阅读预览默认 16px，可选 14/16/18px。两组偏好使用独立 localStorage key，不修改站点正文 CSS。
4. 设置导航标题、分组标题、说明、标签、输入和按钮统一进入同一 token 层级；站点预览 iframe 继续保持站点自己的排版。
5. 设置发布原因复用现有 Git 状态模型计算，优先显示“请先保存”，保存后再显示分支、权限、会话或文件范围门禁；同一文本同时供可见状态和按钮 Tooltip 使用。
6. 发布原因在窄屏允许换行，不以隐藏、截断或横向滚动换取单行布局。

可调整点集中在 `apps/admin/src/app/globals.css` 的 `--text-*`、`--editor-*`、`--preview-*` token，字号偏好状态集中在 `apps/admin/src/lib/editor/font-size-preference.ts`，发布引导优先级集中在 `apps/admin/src/lib/git/client-state.ts`。对应自动证据由 `TypographyContract.test.tsx`、`font-size-preference.test.ts`、`EditorPane.test.tsx`、`PreviewPane.test.tsx`、`ArticleSidebar.test.tsx`、`SettingsWorkspace.test.tsx` 与 `client-state.test.ts` 提供。

## 2026-09-06 长设置表单滚动追加决策

真实浏览器测量确认，桌面端 `.settings-form-pane` 曾按全部内容展开到 1849px，自身 `scrollHeight === clientHeight`，而仅 705px 高的父级 `.settings-form-panel` 使用 `overflow: hidden`。因此键盘 PageDown 可程序化改变隐藏父级位置，鼠标滚轮和触控板却没有合法的滚动容器。

滚动所有权保持单一：桌面端由语义区域 `.settings-form-pane` 承担滚动，父级网格单元显式 `min-height: 0`，表单区域使用 `height: 100%; overflow: auto`；1024px 及以下继续由 `.settings-workspace` 承担整页滚动，避免嵌套滚动。该契约由 `SettingsWorkspace.test.tsx` 锁定，并以栏目、导航、高级三组长内容和 760px 窄屏执行真实触控板等价滚动。

## 2026-09-06 导航空候选 UX 追加决策

能力审计确认 `listAvailableHeaderSections` 已统一处理“启用顶级栏目且尚未存在于导航”的候选规则，`removeNavigation` 只删除导航项而不删除栏目或文章，`visible` 只控制显示状态。因此本轮不新增接口、配置字段或存储状态，只收口入口反馈。

当所有启用语言均无可添加栏目时，“添加栏目导航”直接禁用，并在操作区常驻说明：删除某个导航项后可重新添加，仅关闭“显示”不会释放候选。若当前语言无候选、其他启用语言仍有候选，对话框自动切换到第一个可添加的语言和栏目。该行为由 `NavigationManager.test.tsx` 的空候选与多语言用例锁定，真实浏览器验证禁用态、解释文案和零空对话框。
