---
title: "vitepress 踩坑记录"
date: 2025-02-05
cms: true
---

# vitepress 踩坑记录

## 1. rewrites 属性在开发和生产环境表现不一致

### 背景

我在搭建这个网站的时候，希望默认是中文，期望的效果是，访问 `https://www.jiahim.com/xxx.html` ，默认访问的是静态资源中的 `/zh/xxx.html`，并且在 URL 中不体现出来，所以在 `vite.config.ts` 中添加了如下配置：

```js
export const shared = defineConfig({
  // ... 其他配置 ...
  rewrites: {
    "zh/:rest*": ":rest*",
  },
  // ... 其他配置 ...
});
```

并且本来的项目结构就预留好了多语言, 想着结合上面的配置，默认就能实现中文作为默认页面，结果发现不行。

```shell
docs/
├── zh/                 # 中文内容
│   ├── index.md        # 中文首页
│   ├── book/
│   ├── skill/
│   └── ...
└── en/                 # 英文内容
    ├── index.md        # 英文首页
    ├── book/
    ├── skill/
    └── ...
```

### 问题表现

当我做了上述配置后，在开发环境表现正常，但是打包部署后，发现首页看似正常，点击首页的页面跳转后，会找不到对应的路由文件，经过查询发现，它们在开发和生产的表现是不一致的，主要区别在于：

1. 开发环境（dev）：
   - 使用 Vite 的开发服务器处理路由
   - 路由重写是实时的，通过内存处理
   - 当访问 /some-page 时，会自动寻找 zh/some-page.md 的内容
2. 生产环境（build）：
   - 静态文件生成时，文件路径映射是在构建时确定的
   - 你的配置 'zh/:rest*': ':rest*' 实际上会导致构建时将文件从 zh/ 目录复制到根目录，但不会正确处理路由关系
   - 当访问 /some-page 时，找不到对应的静态文件，因为文件实际位置和 URL 路径不匹配

### 解决方案

1.  移除 rewrites 属性
2.  将原本中文的 index.md 移到根目录下，其他不变，调整后文件结构参考如下：

```shell
docs/
├── index.md            # 中文首页
├── zh/                 # 中文内容
│   ├── book/
│   ├── skill/
│   └── ...
└── en/                 # 英文内容
   ├── index.md         # 英文首页
   ├── book/
   ├── skill/
   └── ...
```
### 参考资料
1. [Github issues: rewrite URL got 404 in build mode #3766](https://github.com/vuejs/vitepress/issues/3766)
