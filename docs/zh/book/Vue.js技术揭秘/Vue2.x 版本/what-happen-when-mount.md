---
title: "`src/core/instance/lifecycle.js` 中的 `mountComponent`"
date: 2025-02-09
cms: true
---

# `src/core/instance/lifecycle.js` 中的 `mountComponent`

## 完整源码
```js
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```

## 1. 函数定义与参数
```js
export function mountComponent (
  vm: Component,        // Vue 组件实例
  el: ?Element,         // 挂载的 DOM 元素
  hydrating?: boolean   // 是否服务端渲染（hydration）
): Component {
```
**作用** ：定义挂载组件的核心函数，处理组件实例的渲染和挂载流程

## 2. 初始化挂载元素
```js
vm.$el = el;  // 将 DOM 元素保存到组件实例的 $el 属性
``` 
**关键**：记录组件挂载的目标 DOM 节点。

## 3. 检查渲染函数是否存在
```js
if (!vm.$options.render) {  // 如果用户未提供 render 函数
  vm.$options.render = createEmptyVNode;  // 设置一个空的虚拟节点渲染函数
  // 开发环境下警告
  if (process.env.NODE_ENV !== 'production') {
    if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
      vm.$options.el || el) {
      // 警告：当前使用运行时构建（未包含模板编译器）
      warn('You are using the runtime-only build...', vm);
    } else {
      // 警告：未定义模板或渲染函数
      warn('Failed to mount component...', vm);
    }
  }
}
```
**核心逻辑**：
- Vue 的运行时构建（runtime-only）不包含模板编译器，若使用 template 但未预编译，会抛出警告。
- 若用户未提供 render 函数，默认生成一个空节点（createEmptyVNode）。

## 4. 触发 beforeMount 生命周期钩子
```js
callHook(vm, 'beforeMount');  // 调用组件 beforeMount 生命周期钩子
```
**作用**：通知开发者组件即将挂载。

## 5. 定义更新组件的函数 updateComponent
```js
let updateComponent;
if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
  // 开发环境 + 启用性能监控时，添加性能标记
  updateComponent = () => {
    const name = vm._name;
    const id = vm._uid;
    // 记录渲染和更新的性能
    mark(startTag);
    const vnode = vm._render();  // 生成虚拟 DOM
    mark(endTag);
    measure(`vue ${name} render`, startTag, endTag);

    mark(startTag);
    vm._update(vnode, hydrating);  // 将虚拟 DOM 更新到真实 DOM
    mark(endTag);
    measure(`vue ${name} patch`, startTag, endTag);
  };
} else {
  // 生产环境或不需要查看性能时，直接执行渲染和更新
  updateComponent = () => {
    vm._update(vm._render(), hydrating);
  };
}
```
**关键点**：
- `vm._render()`：调用渲染函数生成虚拟 DOM（vnode）。
- `vm._update()`：将虚拟 DOM 转换为真实 DOM 并挂载。
- 开发环境下使用 mark 和 measure 进行性能分析（需浏览器支持 Performance API）。

## 6. 创建渲染 Watcher
```js
new Watcher(vm, updateComponent, noop, {
  before() {
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate');  // 触发 beforeUpdate 钩子
    }
  }
}, true /* isRenderWatcher */);
```
**作用**：
- 创建一个 `Watcher` 实例，负责依赖收集和组件更新。
- `updateComponent` 作为 `Watcher` 的回调函数，当数据变化时触发重新渲染。
- `isRenderWatcher: true` 表示这是组件的渲染 `Watcher（每个组件只有一个）。`

## 7. 完成挂载
```js
hydrating = false;  // 标记服务端渲染（hydration）结束

if (vm.$vnode == null) {        // 如果是根组件
  vm._isMounted = true;         // 标记组件已挂载
  callHook(vm, 'mounted');      // 触发 mounted 生命周期钩子
}
return vm;  // 返回组件实例
```
**逻辑解析**：
- `vm.$vnode == null` 表示当前组件是根组件（非子组件）。
- 只有根组件会立即触发 `mounted` 钩子，子组件的 `mounted` 在其 DOM 插入父节点后触发。

## 总结流程
 1. **初始化**：绑定挂载元素，检查渲染函数。
 2. **生命周期**：触发 beforeMount 钩子。
 3. **渲染机制**：定义更新函数，创建 Watcher 监听变化。
 4. **挂载完成**：标记状态并触发 mounted 钩子。

## 核心设计思想
 1. **响应式驱动**：通过 Watcher 监听数据变化，自动触发 updateComponent。
 2. **虚拟 DOM**：使用 _render 生成虚拟 DOM，_update 进行 Diff 和 DOM 更新。
 3. **生命周期管理**：在关键节点（如挂载前、挂载后、更新前）触发钩子函数。
