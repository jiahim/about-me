---
title: "Vercel 踩坑记录"
date: 2025-02-04
cms: true
---

# Vercel 踩坑记录

## Vite+Vue3 的项目，用默认的配置，部署后发现访问首页进行跳转没问题，但是刷新就会出现404
首先，这是因为在项目中的 vue-router 使用了 history 模式
```ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 使用了 History 模式
  // ...其他配置
})
```

查阅[官方文档](https://router.vuejs.org/zh/guide/essentials/history-mode.html#Vercel)可知，需要在项目根目录下添加一个 Vercel 的配置文件 vercel.json，配置后重新部署即可
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

## Vercel 部署大模型聊天网页，因为网络请求时长限制,导致超过 10s 时大模型的回复会被中断
Vercel 默认请求的时长为 10s，但是现在在大模型的使用中，经常使用的流式返回。这就导致其实大模型的回复没结束，就被 vercel 强制中断了。

其实这个有解决方案，可以通过设置进行修改，免费用户最长可以修改为 60s，这已经足够日常使用的请求时长了。

设置的入口如下：

找到需要调整时长的 project，进入到 setting -> Functions -> Function Max Duration。将默认的 10s 修改为需要的时间即可，最大不超过 60s。

![设置最大请求超时时间](<../../public/images/skill/设置最大请求超时时间.png>)
