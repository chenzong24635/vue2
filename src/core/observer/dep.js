/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */

export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    // 存放观察目标watcher的数组
    this.subs = []
  }

  // 添加 watcher
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除 watcher
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 通过调用 watcher 的addDep方法， 执行依赖收集
  depend () {
    if (Dep.target) { // Dep.target存放该 watcher
      Dep.target.addDep(this) // 调用 watcher的addDep方法，并传递Dep实例，来调用 addSub
    }
  }

  // 通知 watcher 触发依赖
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update() //调用 watcher update方法
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.

// Dep.target 保存要被收集的依赖(观察者)
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  // Dep.target 保存着一个观察者对象，这个观察者对象就是即将要收集的目标。
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
