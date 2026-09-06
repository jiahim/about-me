# Admin shadcn/ui、真实设置预览与发布链路交接

日期：2026-09-05（Asia/Singapore）

## 交付范围

- Admin 通用交互统一到仓库内 shadcn/ui primitives、Tailwind v4 语义 Token 与 system/light/dark 主题。
- 文章工作区保留 CodeMirror 和三栏信息架构，通用按钮、输入、选择、Tab、Sheet、Dialog、Tooltip、Skeleton 等完成迁移。
- 站点设置拆为 11 个中文分组；作者身份链接与页面可见社交链接职责分离。
- 栏目新增/归档使用统一 shadcn 交互与合理间距；导航具备新增栏目入口、新增链接、编辑、显隐、上下移动和删除能力。
- 设置 Inspector 使用真实 VitePress 页面 iframe：支持聚焦/整页、桌面/平板/手机、75/100/125/适应、可调整分栏和全屏；非视觉字段展示真实构建产物。
- 设置保存后自动显示服务端会话范围的精确 Diff，并提供独立“提交设置并推送”流程。
- Git 发布范围由服务端会话生成；合并确认绑定当前 PR head OID 和 fresh 服务端复核。
- 文章栏目过滤改为带计数的单一下拉框；编辑器默认 14px、阅读预览默认 16px，均支持独立三级调节和浏览器本地持久化。
- Admin 根字号尊重浏览器 `100%` 设置，常规 UI 统一以 `.875rem` 表达 14px；设置发布禁用原因在工作区直接可见，并与顶部 Tooltip 共用同一状态计算。

## 核心安全契约

1. 浏览器只提交 `{ scope: 'settings', message, date }`，不能提供 Git 路径。
2. 设置会话绑定 repository realpath、branch、HEAD、配置 base hash、30 分钟空闲期和创建前 dirty paths。
3. 只有设置保存、栏目事务和品牌上传成功返回的 `changedPaths` 能被登记；开始前已 dirty 的目标文件被拒绝。
4. 未被当前保存配置引用的 `/images/site/*` 上传资源不进入发布范围。
5. Diff 与 commit 都在路径前使用 Git `--`，并拒绝范围外已有暂存文件。
6. 设置发布只允许从默认分支开始，创建 `content/YYYY-MM-DD-site-settings`，推送后创建/读取 PR；成功后会话失效，不自动合并。
7. 合并前 fresh 校验用户、仓库、PR、base/head、OPEN/non-draft/non-fork、CLEAN、checks、工作区/暂存区为空、upstream、ahead/behind=0 和三方 OID 一致；命令保留 `--match-head-commit`。
8. 预览 iframe 只接受精确 origin/source/session/version；预览模式不运行 analytics/Giscus；生产产物门禁禁止 bridge 泄漏。

## 验证结果

- `@jiahim/site-schema`: 9 test files / 62 tests passed。
- `@jiahim/site`: 11 test files / 27 tests passed；新增真实页脚 target/聚焦/滚动/清理回归。
- `@jiahim/admin`: 60 test files / 300 tests passed；包含视觉回归、深色表面/WCAG 对比度、手机主题入口、CodeMirror/Sonner/浏览器 chrome 主题、字号契约、偏好持久化、栏目下拉、设置发布原因、长表单滚动所有权、导航空候选和全局按钮前景色断言。
- 根级 `pnpm typecheck`: passed。
- 根级 `pnpm build`: passed；Admin `/` 368 kB，First Load JS 481 kB。
- 临时 Git 仓库测试确认设置范围只提交配置、栏目首页和品牌资源，范围外 `package.json` 保持未暂存。
- 静态扫描确认业务源码不再引用旧按钮/backdrop/card class，无 `postMessage('*')`，站点生产产物无预览协议泄漏。
- 真实浏览器已验证主题刷新持久化、11 个设置分组、作者用途说明、导航管理、真实 iframe/产物映射、聚焦/整页、手机 390/125%、全屏以及 520×800 双 Sheet；UAT 中发现的预览生命周期、握手重试、栏目/首页路径和受控全屏问题均已修复并补回归测试。
- 逐项 UAT 和剩余浏览器状态见 `docs/uat/2026-09-05-admin-shadcn-settings-uat.md`。
- 用户复验后的样式回归已重新开门禁并关闭：设置三列显式排位、1024px 单栏 Sheet、1100px 头部收起、文章行自适应高度/统一左对齐均通过自动回归和真实浏览器复验；决策与根因见 `docs/superpowers/plans/2026-09-05-admin-visual-regression-remediation.md`。
- 深色模式复验已关闭硬编码浅色表面、编辑器默认浅色主题、Toaster 主题、destructive/warning 前景色和浏览器 theme-color 同步问题；桌面、520px 与 390px 移动端的主题菜单、Sheet、设置/文章工作区均通过真实浏览器检查。真实网站 iframe 继续独立使用站点主题。
- 页脚模块聚焦在真实 UAT 中发现文章页 footer 被 VitePress 隐藏，已让 `footer-social` 预览使用首页路径并补充先红后绿的回归测试；真实移动端 iframe 已显示页脚及聚焦描边。
- 2026-09-06 补充 UAT 已验证栏目下拉、编辑器 13/14/16px、预览 14/16/18px、刷新持久化、11 个设置模块字号与深浅主题，以及“先保存→分支门禁”的发布解释链路；最终恢复 14/16px 默认值且未保留测试配置。
- 长设置表单滚动已修复：桌面由 `.settings-form-pane` 独立滚动，窄屏由 `.settings-workspace` 整页滚动；栏目、导航、高级与 760px 视口均完成真实坐标滚动并验证顶部/底部可达。
- 栏目导航空候选 UX 已收口：全部启用顶级栏目均已入导航时禁用“添加栏目导航”并常驻解释删除/隐藏差异；其他启用语言仍有候选时自动选择该语言，避免空对话框。
- 空状态“新建文章”主按钮颜色已修复：移除覆盖 shadcn variant 的未分层全局 `button` 颜色重置；浅色与深色均和左侧主操作保持同一语义 Token 与正确对比色。

## 当前服务

- Admin（本机）：`http://127.0.0.1:3000/`，tmux 会话 `jiahim-admin`，监听 PID 56274（按钮颜色生产构建后已重启，入口、文章 API 与真实浏览器均已复验）
- Site（本机）：`http://127.0.0.1:5173/`，tmux 会话 `jiahim-site`，监听 PID 43716（根路径与 `/zh/` 均为 HTTP 200）
- 私网 TCP proxy：已停止，不再监听 LAN 地址

两个进程均需保持运行供验收。普通交互式命令会在执行会话结束后被回收；验收服务应放在独立 tmux 会话中。当前状态可用 `tmux list-sessions` 查看、日志可用 `tmux capture-pane -pt jiahim-admin` 和 `tmux capture-pane -pt jiahim-site` 查看。若服务必须重启，沿用：

```bash
VITE_SETTINGS_PREVIEW_ADMIN_ORIGINS=http://127.0.0.1:3000 pnpm --filter @jiahim/site exec vitepress dev ../../docs --host 127.0.0.1 --port 5173
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:5173 pnpm --filter @jiahim/admin exec next dev --hostname 127.0.0.1 --port 3000
```

不要同时重复启动同一端口；先用 `lsof -nP -iTCP:<port> -sTCP:LISTEN` 核对。

同一 worktree 中 `next dev` 与 `next build` 共用 `apps/admin/.next`。不要在开发服务运行时执行 Admin 生产构建；如必须执行，构建后必须重启 Admin，否则旧开发进程可能继续返回引用已被替换的 CSS/JS 路径，表现为首页 200 但静态资源 404、页面完全无样式。站点 VitePress 服务不受这次问题影响。

## 真实仓库验收边界

当前分支是 `codex/editorial-cms`，默认分支是 `main`，工作区有大量未提交内容且 `config/site.config.json` 在设置会话开始前已经 dirty/untracked。因此真实 UI 必须禁止设置发布，并显示“只能从默认分支”或服务端 pre-existing-dirty 原因。本次未执行任何真实 commit、push、PR 创建或 merge。

要实际发布，需由用户先在终端按自己的变更归属处理工作区，并明确授权远端操作。禁止为通过 UI 门禁而自动 reset、checkout、stash、clean、全仓 stage 或切换/改写分支。

## 已知限制与后续操作

- 局域网入口在 Codex 内置浏览器和用户 Safari 中均无法正常打开。用户于 2026-09-05 14:56 决定恢复纯本机入口，旧 LAN 代理已停止；最终验收只使用 `127.0.0.1`。
- UAT 判定为 Ready for user acceptance。真实远端 push、PR 和 merge 有意未执行，仍须用户另行明确授权。
- 浏览器控制层未提供逐请求 Network 日志或任意脚本注入；预览模式无 Giscus DOM、严格消息来源校验与生产隔离分别由真实 DOM、协议测试、静态扫描和生产泄漏门禁覆盖。
- 构建报告 36 条文章内容信号警告，主要为缺少更新时间或站外引用；属于既有内容质量工作，不阻断本次代码构建。
- Admin 首页首包较大（First Load JS 471 kB），当前功能正确性门禁通过，但后续可按 settings/editor 路由拆包优化。
- 所有代码和文档仍在未提交工作区；没有获得 commit、push 或 PR 授权。
