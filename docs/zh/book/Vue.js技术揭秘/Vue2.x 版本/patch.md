---
title: "组件化中的 `patch`"
date: 2025-05-23
cms: true
---

# 组件化中的 `patch`

 原文地址： [组件化 - patch](https://ustbhuangyi.github.io/vue-analysis/v2/components/patch.html#createcomponent)


### 简化版组件渲染流程

#### 1. **组件 VNode 的诞生**
- 当在父组件模板中写 `<ChildComponent>` 时，Vue 会创建一个**组件类型的 VNode**（虚拟节点），这个 VNode 携带了组件的关键信息，比如组件构造函数、props 等。

#### 2. **patch 遇到组件 VNode**
- 在 DOM 更新（patch）过程中，Vue 发现这个 VNode 是组件类型，于是触发**组件初始化流程**：
   ```javascript
   function createElm(vnode) {
     if (是组件VNode) {
       创建组件实例并挂载;
       return; // 跳过普通 DOM 创建
     }
     创建普通DOM元素;
   }
   ```

#### 3. **组件实例化（心脏部分）**
- **init 钩子**：组件 VNode 的 `data.hook.init` 方法被调用，这里做了两件大事：
  - **创建子组件实例**：通过 `new SubComponent(options)`，这里的 `options` 包含关键信息：
    ```javascript
    {
      _isComponent: true, // 标记是组件
      parent: 父组件实例, // 通过全局变量 activeInstance 传递
      _parentVnode: 当前组件VNode // 用于获取 props、事件等
    }
    ```
  - **挂载子组件**：调用 `child.$mount()`，触发子组件的渲染流程。

#### 4. **子组件渲染（递归开始）**
- **子组件渲染**：子组件执行 `_render()` 生成自己的 VNode 树，然后通过 `_update()` 进行 patch。
- **递归处理**：如果子组件的 VNode 中又包含其他组件，重复上述步骤，形成深度优先的递归过程。

#### 5. **DOM 的插入顺序**
- **先子后父**：子组件的 DOM 创建完成后，会通过 `insert(parentElm, childElm)` 插入到父组件的 DOM 中。因此，组件树的 DOM 是从叶子节点开始，逐层向上插入的。

#### 6. **关键机制：activeInstance（上下文管家）**
- **全局变量**：`activeInstance` 保存当前正在渲染的组件实例。
- **保存与恢复**：在进入子组件渲染前，保存父组件的 `activeInstance`，渲染子组件时设置为子组件实例，渲染完成后恢复。这确保了父子关系的正确建立。
  ```javascript
  const prevActive = activeInstance;
  activeInstance = 子组件;
  // ...渲染子组件
  activeInstance = prevActive; // 恢复父组件
  ```

#### 7. **父子关系建立**
- **`vm.$parent` 与 `vm.$children`**：子组件实例的 `$parent` 指向父组件实例，父组件的 `$children` 数组中加入子组件实例，形成双向关联。

### 重点总结
- **组件渲染是递归的**：遇到组件 VNode 就“挖一层”，直到最底层再逐层返回。
- **上下文管理**：通过 `activeInstance` 跟踪当前组件，确保父子关系正确。
- **生命周期顺序**：父组件 beforeCreate → created → beforeMount，然后子组件 beforeCreate → created → beforeMount → mounted，最后父组件 mounted。

理解了这个流程，就能明白 Vue 组件是如何层层渲染，最终构建出完整的 DOM 树的。这个过程就像搭积木，每一块积木（组件）先处理好自己的内部结构，再嵌入到正确的位置。
