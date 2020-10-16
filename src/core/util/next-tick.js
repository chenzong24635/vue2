/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = [] //存放需要异步执行的函数队列
let pending = false // 标记是否已经命令callbacks在下个tick全部执行，防止多次调用。

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0) //一层深拷贝
  callbacks.length = 0 // 清空数组
  // 以上代码是为了在nextTick的方法里再次调用nextTick，能够新开一个异步队列

  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 如果支持Promise(最优的选择)
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  // 如果支持MutationObserver，则实例化一个观察者对象，观察文本节点发生变化时，触发执行所有回调函数。
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  // setImmediate 从技术上讲，它利用了（宏）任务队列，
  // 但它仍然是比setTimeout更好的选择。
  timerFunc = () => {
    // setImmediate 拥有比 setTimeout 更好的性能
    // 因为setTimeout 在将回调注册为 (macro)task 之前要不停的做超时检测，而 setImmediate 则不需要
    // 仅IE支持
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    // 都不支持使用setTimeout
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) { // 回调队列是否空闲
    pending = true
    timerFunc()  // 执行时会调用flushCallbacks， 将pending设为false
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}

// nextTick主要使用了宏任务和微任务。根据执行环境分别尝试采用
// * Promise
// * MutationObserver
// * setImmediate
// * 以上都不支持，最后再使用 setTimeout

// 任务队列总体可分为 宏任务 (macro)task，微任务 microtask
// 当调用栈空闲后每次事件循环只会从 (macro)task 中读取一个任务并执行，
// 而在同一次事件循环内会将 microtask 队列中所有的任务全部执行完毕，且要先于下一个 (macro)task。
// 另外 (macro)task 中两个不同的任务之间可能穿插着UI的重渲染，
// (macro)task -> microtask -> UI重新渲染 -> 下一个(macro)task
// 那么我们只需要在 microtask 中把所有在 UI重新渲染 之前需要更新的数据全部更新，这样只需要一次重渲染就能得到最新的DOM了 ，
// 所以要优先选用 microtask 去更新数据状态而不是 (macro)task
