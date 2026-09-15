# 通过 Tailscale 部署文章工作台

## 访问结构

```text
浏览器 -> Tailnet HTTPS -> Tailscale Serve -> 127.0.0.1:3000 -> apps/admin
```

Next.js 不直接监听 LAN 或 Tailscale IP。Tailscale Serve 负责 TLS、Tailnet 网络访问和身份头清洗/注入；应用使用登录名白名单和严格 Origin 校验做第二层授权。禁止配置 Tailscale Funnel。

下列示例面向使用 systemd 的 Linux 服务器，默认服务用户为 `jiahim`，仓库目录为 `/srv/jiahim`。如果服务器使用其他用户或目录，先同步修改 unit 与环境文件。

## 1. 前置条件

- Node.js 22+、Corepack/pnpm 10。
- Tailscale 已登录，MagicDNS 与 Tailnet HTTPS 已启用。
- 服务用户能够读写目标仓库，并已完成 `git remote -v`、SSH 推送和 `gh auth status` 检查。
- Tailnet grants/ACL 只允许预期用户或设备访问该服务器的 HTTPS 服务。

不要把 SSH 私钥、GitHub Token 或 Tailscale auth key 写入仓库、unit 文件或浏览器配置。

## 2. 安装与构建

以服务用户准备 `/srv/jiahim` 中的仓库，然后在仓库根目录运行：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build:admin
git status --short
gh auth status
```

构建和运行使用同一个 worktree。后管可能修改其中的 Markdown、配置和 Git 状态，不要使用自动拉取或自动覆盖工作区的更新任务。

## 3. 配置运行环境

创建仅 root 可写、服务用户可读的 `/etc/jiahim-admin.env`：

```dotenv
ADMIN_ACCESS_MODE=tailscale
ADMIN_PUBLIC_ORIGIN=https://editor.example-tailnet.ts.net
ADMIN_TAILSCALE_ALLOWED_USERS=owner@example.com
LOCAL_REPOSITORY_ROOT=/srv/jiahim
NEXT_PUBLIC_SITE_URL=https://www.jiahim.com
```

- `ADMIN_PUBLIC_ORIGIN` 必须替换为 `tailscale serve` 显示的完整 HTTPS origin，不能包含路径。
- `ADMIN_TAILSCALE_ALLOWED_USERS` 使用 Tailscale 登录名；多个用户用逗号分隔。
- 配置文件建议权限为 `0640`，owner 为 `root`，group 为服务用户所在的私有组。

## 4. 安装常驻服务

检查 `deploy/systemd/jiahim-admin.service` 的 `User`、`Group`、`WorkingDirectory` 和 pnpm 路径后安装：

```bash
sudo cp deploy/systemd/jiahim-admin.service /etc/systemd/system/jiahim-admin.service
sudo systemctl daemon-reload
sudo systemctl enable --now jiahim-admin.service
sudo systemctl status jiahim-admin.service
```

服务只应监听回环地址：

```bash
curl --fail-with-body http://127.0.0.1:3000/
```

在 Tailscale 模式下，这个直接请求返回 `403` 是正确结果，因为它没有可信的 Tailscale 身份。

## 5. 建立 Tailnet HTTPS 入口

在服务器上运行：

```bash
sudo tailscale serve --bg 3000
sudo tailscale serve status
```

把输出的 `https://<device>.<tailnet>.ts.net` 写入 `ADMIN_PUBLIC_ORIGIN`。如地址发生变化，更新环境文件并重启后管。

日常访问只需在已加入 Tailnet 的浏览器中打开该 HTTPS 地址，不需要 SSH，也不需要手动填写端口。

## 6. 验收

1. 白名单用户打开 HTTPS 地址，文章列表、设置和 Git 状态正常加载。
2. 保存一篇无关紧要的测试草稿，确认只修改预期 worktree 文件且不会自动提交。
3. 非白名单 Tailnet 用户得到 `403`。
4. 直接访问服务器 LAN/Tailscale IP 的 3000 端口失败。
5. `curl http://127.0.0.1:3000/api/articles` 得到 `403`。
6. 重启服务器后，`systemctl is-active jiahim-admin` 和 `tailscale serve status` 均恢复正常。

真实推送和 PR/合并仍是独立操作，不应仅为部署验收而触发。

## 7. 更新与回滚

只在 worktree 干净、内容已提交或另行备份时更新。先停止服务，快进到已审核版本，重新安装与构建，再启动并重复验收：

```bash
sudo systemctl stop jiahim-admin
pnpm install --frozen-lockfile
pnpm build:admin
sudo systemctl start jiahim-admin
```

应用回滚使用 Git 中已审核的前一版本重新构建。网络入口可立即关闭：

```bash
sudo tailscale serve off
```

关闭 Serve 不会删除仓库或文章；服务数据仍保留在 `/srv/jiahim` worktree 中。
