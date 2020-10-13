/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import {
  arrayMethods
} from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */

// 将目标对象转换成响应式数据，为目标对象加上getter\setter属性，进行依赖收集以及调度更新
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value
    this.dep = new Dep() // 存储依赖
    this.vmCount = 0

    // 给监测对象添加 __ob__ 属性，并设为不可枚举（防止等会递归监测数据时 进入死循环）
    // 在 observe的时候会先检测是否已经有__ob__，有则表示已监测
    def(value, '__ob__', this)

    // 如果对数组每项都进行监测，过于消耗性能；直接更改数组索引方式不多
    // 因此对数组的监测， 使用函数劫持
    if (Array.isArray(value)) {
      // 这里如果当前浏览器支持__proto__属性， 则直接覆盖当前数组对象原型上的原生数组方法，
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        // 如果不支持该属性，则直接覆盖数组对象的原型。
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      // 是对象则直接walk进行绑定
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   *  遍历所有进行对象响应化
   */
  walk(obj: Object) {
    // 获取对象所有可枚举的属性,循环遍历监测
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 对一个数组的每一个成员进行observe，因为数组的值可能也是对象
  observeArray(items: Array < any > ) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
// 直接覆盖原型的方法来修改目标对象或数组
function protoAugment(target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
// 定义（覆盖）目标对象或数组的某一个方法
function copyAugment(target: Object, src: Object, keys: Array < string > ) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 尝试创建一个Observer实例（__ob__），
// 如果成功创建Observer实例则返回新的Observer实例，
// 如果已有Observer实例（__ob__）则返回现有的Observer实例。
export function observe(value: any, asRootData: ? boolean): Observer | void {
  // 如果数据不是一个对象或者是 VNode 实例，则直接 return
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 数据自身是否有 __ob__ 属性 且 __ob__ 是 Observer 的实例。
  // 当一个数据对象被监测之后将会在该对象上定义 __ob__ 属性（查看上方定义的 Observer 类），
  // 通过__ob__属性 用来避免重复监测一个数据对象。
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 对数据监测的条件：
    /*
     * shouldObserve 为 true
     * 非服务端渲染
     * 当数据对象是数组或纯对象
     * 被监测的数据对象必须是可扩展的 以下方法都可以使得一个对象变得不可扩展：Object.preventExtensions()、Object.freeze() 以及 Object.seal()
     * 非Vue实例 （Vue 实例有 _isVue 属性）
     */

    // 创建一个 Observer 实例，对数据进行监测
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */

// 通过 Object.defineProperty() 将数据对象的数据属性转换为访问器属性, 对数据监测
export function defineReactive(
  obj: Object,
  key: string,
  val: any,
  customSetter ? : ? Function,
  shallow ? : boolean
) {
  // 存储 属性所有的依赖
  const dep = new Dep()

  // 获取对象自有属性对应的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果属性不可配置 则return，不进行监测，
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 避免覆盖对象自身定义的 get,set函数
  const getter = property && property.get
  const setter = property && property.set
  //  （属性不存在 get 函数 或 存在set 函数）且没有传递第三个参数 val
  if ((!getter || setter) && arguments.length === 2) {
    // 设置val值
    val = obj[key]
  }
  // 对象深度监测（对象的键值 可能也是对象，也需要监测）
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      // 如果对象拥有getter方法则执行
      const value = getter ? getter.call(obj) : val
      // 获取属性时，收集依赖
      // Dep.target（watcher 实例） 通过 watch.js 的 Watcher 的get里调用 pushTarget（dep.js） 函数定义
      // 如果Dep.target 存在，收集依赖
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend() // 调用 dep.depend 方法收集依赖
          // 如果读取的属性值是数组，那么需要调用 dependArray 函数逐个触发数组每个元素的依赖收集
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 设置的新值没有改变时 或 新旧值都为 NaN 时，直接返回
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) { // 如果属性自身拥有 set 函数，使用set该函数设置属性值
        setter.call(obj, newVal)
      } else { // 如果属性原本就没有 set 函数，那么就设置 val 的值
        val = newVal
      }
      // 对象深度监测（设置的新值 可能也是对象，也需要监测）
      childOb = !shallow && observe(newVal)
      // 设置属性时 触发依赖
      dep.notify()
    }
  })
}

// defineReactive 之后data数据
/* {
  a: {
    b: 1,
    __ob__: {value:{...}, dep: Dep, vmCount: 0},
    get b: ƒ reactiveGetter(),
    set b: ƒ reactiveSetter(newVal),
    __proto__: Object
  },
  __ob__: {value:{...}, dep: Dep, vmCount: 1},
  get a: ƒ reactiveGetter(),
  set a: ƒ reactiveSetter(newVal),
  __proto__: Object
} */



/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target: Array < any > | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // target 为数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 修改数组的长度, 避免索引>数组长度导致splice()执行有误
    target.length = Math.max(target.length, key)
    // 利用数组的splice变异方法触发响应式
    target.splice(key, 1, val)
    return val
  }
  // target为对象, 且key在target或者target.prototype上 且必须不能在 Object.prototype 上,直接赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 以上都不成立, 即开始给target创建一个全新的属性
  // 获取Observer实例
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
      )
      return val
    }
  // target 本身就不是响应式数据, 直接赋值
  if (!ob) {
    target[key] = val
    return val
  }
  // 进行响应式处理
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target: Array < any > | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array < any > ) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    // 如果该元素的值拥有 __ob__ 对象和 __ob__.dep 对象，
    // 那说明该元素也是一个对象或数组
    // 通过对象上的观察者进行依赖收集
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      // 递归
      dependArray(e)
    }
  }
}
