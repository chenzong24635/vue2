/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'
// 缓存了数组原本属性方法
const arrayProto = Array.prototype
// 创建新对象存储数组原型的属性方法，避免污染原生数组属性方法
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
// 对数组的 7种方法 进行劫持函数
// 在不污染原生数组原型的情况下重写数组的这些方法，
// 截获数组的成员发生的变化，执行原生数组操作的同时dep通知关联的所有观察者进行响应式处理
methodsToPatch.forEach(function(method) {
    // cache original method
    const original = arrayProto[method]
        // 函数劫持 AOP
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args) // 调用原生的数组方法

        // 对数组新插入的元素 进行监测
        const ob = this.__ob__
        let inserted // 新增的数据
        switch (method) {
            case 'push':
            case 'unshift':
                inserted = args
                break
            case 'splice':
                // [1,2,3].splice(0,1,'aaa','bbb')
                // splice 第2位开始的参数是新增的数据
                inserted = args.slice(2)
                break
        }
        // 对新增的元素 进行监测
        if (inserted) ob.observeArray(inserted)
        // notify change
        // 通知所有注册的观察者进行响应式处理
        ob.dep.notify()
        return result
    })
})
