import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 在Vue.prototype上挂载方法
initMixin(Vue) // 实现上面的 _init 这个初始化方法
stateMixin(Vue) // 实现$data，$props, $watch,$set,$delete
eventsMixin(Vue) // 实现$on,$emit,$once,$off
lifecycleMixin(Vue) // 实现_update，$forceUpdate,$destroy
renderMixin(Vue) // 实现$nextTick，_render

export default Vue
