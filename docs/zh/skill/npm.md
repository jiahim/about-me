---
title: "NPM 报错集锦"
date: 2025-02-04
cms: true
---

# NPM 报错集锦

## npm ERR! Cannot read properties of null (reading 'isDescendantOf')
要安装新的 npm 包，发现一直报这个错，不是网络问题

```shell
npm ERR! Cannot read properties of null (reading 'isDescendantOf')
```

删除项目下的 `node_modules` 目录，重新执行 `npm instal`，然后再安装想要安装的包即可

> 参考：[[BUG] Running npm i fails with Cannot read properties of null (reading 'isDescendantOf') #5687](https://github.com/npm/cli/issues/5687)
