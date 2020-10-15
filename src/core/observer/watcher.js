/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean; // 深度监听
  user: boolean; // 用户创建的 Watcher 实例
  lazy: boolean; // 惰性计算，只有到真正在模板里去读取它的值后才会计算
  sync: boolean;
  dirty: boolean; // 缓存(为true时，表示这个数据是脏数据，需要重新求值；false读取缓存)
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      // 判断 isRenderWatcher，
      // 接着把当前 watcher 的实例赋值给 vm._watcher
      vm._watcher = this
    }
    // 把当前 wathcer 实例 push 到 vm._watchers 中，
    // vm._watcher 是专门用来监听 vm 上数据变化然后重新渲染的，
    // 所以它是一个渲染相关的 watcher，因此在 callUpdatedHooks 函数中，
    // 只有 vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true // wather是否激活绑定，要解除绑定时设为false
    this.dirty = this.lazy // for lazy watchers 计算属性是惰性求值
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 把表达式expOrFn解析成getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // 自定义的 watch的expOrFn应该是个key 或者 'a.b.c'这样的访问路径
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 惰性求值
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 依赖收集
  get () {
    // 将自身 watcher观察者实例 赋值给Dep.target，用以依赖收集
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      /*
        执行了getter操作，看似执行了渲染操作，其实是执行了依赖收集。
        在将Dep.target设置为自生观察者实例以后，执行getter操作。
        譬如说现在的的data中可能有a、b、c三个数据，getter渲染需要依赖a跟c，
        那么在执行getter的时候就会触发a跟c两个数据的getter函数，
        在getter函数中即可判断Dep.target是否存在然后完成依赖收集，
        将该观察者对象放入闭包中的Dep的subs中去。
      */
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 深度监听
      if (this.deep) {
        traverse(value)
      }
      // 收集完后去除
      popTarget()
      // 清空 newDepIds 属性和 newDeps
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // Dep 添加 watcher
  addDep (dep: Dep) {
    const id = dep.id
    // 防止重复收集依赖
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep) // 当前的watcher收集dep
      if (!this.depIds.has(id)) { // 多次求值中避免收集重复依赖的
        dep.addSub(this) // 当前的dep收集当前的watcer
      }
      // 双向保存
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 依赖发生改变的时候执行回调
  update () {
    /* istanbul ignore else */
    if (this.lazy) { // 是不是计算属性的观察者
      this.dirty = true // 代表着还没有求值
      // 后面 evaluate方法 对计算属性求值时，才会将 this.dirty 设置为 false，代表着已经求过值了。
    } else if (this.sync) { // 当变化发生时是否同步更新变化
      this.run() // 同步则执行run直接渲染视图
    } else {
      // 异步则 将当前观察者对象放到一个异步更新队列, 依旧是调用 run()
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    // 如果watch未解除绑定
    if (this.active) {
      const value = this.get()

      // 即便值相同，拥有Deep属性的观察者以及在对象／数组上的观察者应该被触发更新，因为它们的值可能发生改变。
      /* const data = {
        obj: {
          a: 1
        }
      }
      const obj1 = data.obj
      data.obj.a = 2
      const obj2 = data.obj
      console.log(obj1 === obj2) // true
      obj1，obj2 具有相同的引用，所以他们总是相等的，但数据改变了
      */
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value // 存储旧值
        this.value = value // 设置新值
        // 触发回调
        if (this.user) { // 这个观察者是用户定义的
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  // 在src\core\instance\state.js
  // createComputedGetter里触发
  // 专为 computed的watcher 设计的求值函数
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  // 解除当前观察者对属性的观察
  teardown () {
    if (this.active) { // 判断是否已经解除绑定
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) { // 该组件实例是否已经被销毁
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
