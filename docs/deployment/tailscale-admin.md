# 在 Tailscale 私有网络中部署文章工作台

## 访问结构

```text
浏览器 -> Tailscale 私有网络 -> 服务器:3000 -> apps/admin
```

本方案不使用 Tailscale Serve、反向代理或应用身份认证。应用直接监听服务器网络接口；Tailscale 网络和服务器防火墙是访问控制边界。应用仍校验精确 Host，并对写请求校验 Origin，避免通过其他地址误访问或跨站触发写操作。

下列示例面向使用 systemd 的 Linux 服务器，默认服务用户为 `jiahim`，仓库目录为 `/srv/jiahim`。如果服务器使用其他用户或目录，先同步修改 unit 与环境文件。

## 1. 前置条件

- Node.js 22+、Corepack/pnpm 10。
- 服务器和访问设备已加入用户自行管理的 Tailscale 网络。
- 服务用户能够读写目标仓库，并已完成 `git remote -v`、SSH 推送和 `gh auth status` 检查。
- Tailscale grants/ACL 或服务器防火墙只允许预期设备访问 TCP 3000。

不要把 SSH 私钥、GitHub Token 或 Tailscale auth key 写入仓库、unit 文件或浏览器配置。

## 2. 选择固定访问地址

任选一个日常稳定使用的地址：

- MagicDNS：`http://feiniunas:3000`
- Tailscale IP：`http://100.x.y.z:3000`

后续必须始终使用同一个地址。应用会拒绝 Host 或 Origin 不匹配的其他别名。

## 3. 安装与构建

以服务用户准备 `/srv/jiahim` 中的仓库，然后在仓库根目录运行：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build:admin
git status --short
gh auth status
```

构建和运行使用同一个 worktree。后管可能修改其中的 Markdown、配置和 Git 状态，不要使用自动拉取或自动覆盖工作区的更新任务。

## 4. 配置运行环境

创建仅 root 可写、服务用户可读的 `/etc/jiahim-admin.env`：

```dotenv
ADMIN_ACCESS_MODE=private
ADMIN_ALLOWED_ORIGIN=http://feiniunas:3000
ADMIN_HOST=0.0.0.0
PORT=3000
LOCAL_REPOSITORY_ROOT=/srv/jiahim
NEXT_PUBLIC_SITE_URL=https://www.jiahim.com
```

- `ADMIN_ALLOWED_ORIGIN` 替换为上一步选定的无路径 HTTP(S) origin。
- `ADMIN_HOST=0.0.0.0` 同时监听 Tailscale 与物理局域网接口。若只允许 Tailnet 访问，可填服务器稳定的 Tailscale IP，或通过防火墙限制 3000 端口只从 `tailscale0` 进入。
- 配置文件建议权限为 `0640`，owner 为 `root`，group 为服务用户所在的私有组。

## 5. 安装常驻服务

检查 `deploy/systemd/jiahim-admin.service` 的 `User`、`Group`、`WorkingDirectory` 和 pnpm 路径后安装：

```bash
sudo cp deploy/systemd/jiahim-admin.service /etc/systemd/system/jiahim-admin.service
sudo systemctl daemon-reload
sudo systemctl enable --now jiahim-admin.service
sudo systemctl status jiahim-admin.service
```

确认监听地址符合配置：

```bash
ss -lntp | grep ':3000'
```

日常访问只需在已加入 Tailnet 的浏览器中打开 `ADMIN_ALLOWED_ORIGIN`，不需要 SSH、反向代理或额外登录。

## 6. 验收

1. 从 Tailnet 设备打开配置地址，文章列表、设置和 Git 状态正常加载。
2. 使用其他主机名或 IP 访问时得到 `403`。
3. 保存一篇无关紧要的测试草稿，确认只修改预期 worktree 文件且不会自动提交。
4. 从不受信任网络确认 3000 端口不可达；若绑定 `0.0.0.0`，同时核对物理局域网访问是否符合预期。
5. 重启服务器后，`systemctl is-active jiahim-admin` 返回 `active`，配置地址恢复访问。

真实推送和 PR/合并仍是独立操作，不应仅为部署验收而触发。

## 7. 更新与回滚

只在 worktree 干净、内容已提交或另行备份时更新。先停止服务，快进到已审核版本，重新安装与构建，再启动并重复验收：

```bash
sudo systemctl stop jiahim-admin
pnpm install --frozen-lockfile
pnpm build:admin
sudo systemctl start jiahim-admin
```

应用回滚使用 Git 中已审核的前一版本重新构建。临时关闭入口只需停止服务：

```bash
sudo systemctl disable --now jiahim-admin
```

停止服务不会删除仓库或文章；内容仍保留在 `/srv/jiahim` worktree 中。
