---
title: "ES6细节备忘录"
date: 2025-02-04
cms: true
---

# ES6细节备忘录

## 1. 怎么实现类的私有方法？
### 1. 在类方法名前面加上下划线 `_`
```js
class MyClass {
  func1(value) {
    this._privateFunc(value)
  }

  _privateFunc() { // 注意看这里，用了下划线
    this.value = value
    console.log('this is a private function', value)
  }
}
```
### 2. 通过在类外部定义方法，然后在类内部调用
```js
class MyClass {
  func1(value) {
    privateFunc.call(this, value)
  }
}

function privateFunc(value) {
  this.value = value
  console.log('this is a private function', value)
}
```
### 3. 用`Symbol`类型为私有方法命名
```js
const privateFunc = Symbol('privateFunc');

class MyClass{
  func1(value) {
    this[privateFunc](value)
  }

  [privateFunc](value) {
    this.value = value
    console.log('this is a private function', value)
  }
}
```
