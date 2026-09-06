# jiahim.com monorepo

仓库包含公开静态站点和本地文章工作台：

- `apps/site`：VitePress 静态站点，由 Vercel 部署到 `www.jiahim.com`。
- `apps/admin`：只在本机运行的三栏 Markdown 编辑器。
- `docs`：两端共享的 Markdown 内容和公开资源。
- `config/site.config.json`：公开站点设置的唯一数据源，由 `packages/site-schema` 迁移、严格校验并提供给两端。

管理端不部署、不登录、不保存 GitHub Token。它直接读写当前 Git worktree，并调用本机 Git 与 `gh` 完成受限的提交、推送、Pull Request 和合并流程。

设置中心覆盖品牌、作者、栏目、导航、首页、外观、SEO/GEO、页脚与公开集成；秘密值不进入配置，只显示所需环境变量是否存在。栏目新增与归档使用独立事务，普通设置保存不能改变栏目路径、层级或状态。

## 本地启动

```bash
pnpm install
pnpm dev:site
pnpm dev:admin
```

- 公开站点：<http://127.0.0.1:5173>
- 文章工作台：<http://127.0.0.1:3000>

首次使用发布功能前，请确认：

```bash
git remote -v
gh auth status
```

## 验证

```bash
pnpm test
pnpm typecheck
pnpm build:admin
pnpm build:site
```

生产构建还会生成 robots、sitemap、Atom feed、canonical、Open Graph 与结构化数据；实验性 `llms.txt` 默认关闭，可在设置中心显式启用。

编辑与安全发布说明见 [`apps/admin/README.md`](apps/admin/README.md)，产品和技术基线见 [`specs/editorial-cms/`](specs/editorial-cms/)。
