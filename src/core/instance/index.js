import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'


// 为何 Vue 不用 ES6 的 Class 去实现呢？
// 因为Vue 按功能把这些扩展分散到多个模块中去实现，而不是在一个模块里实现所有，
// 通过将Vue 当参数传入方法在 Vue原型上挂载属性方法，这种方式是用 Class 难以实现的。
// 这么做的好处是非常方便代码的维护和管理

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 在Vue.prototype上挂载方法
initMixin(Vue) // 实现上面的Vue函数的 _init 这个初始化方法
stateMixin(Vue) // 实现$data，$props, $watch,$set,$delete
eventsMixin(Vue) // 实现$on,$emit,$once,$off
lifecycleMixin(Vue) // 实现_update，$forceUpdate,$destroy
renderMixin(Vue) // 实现$nextTick，_render

export default Vue
