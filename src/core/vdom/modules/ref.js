/* @flow */

import { remove, isDef } from 'shared/util'

export default {
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}


// ref三种情况:
// * 组件绑定
// * 真实DOM绑定
// * v-for绑定
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  const key = vnode.data.ref // ref键名
  if (!isDef(key)) return

  const vm = vnode.context
  // 给ref赋予当前组件实例或真实DOM
  const ref = vnode.componentInstance || vnode.elm
  const refs = vm.$refs
  // 移除ref
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    // 添加ref
    // 如果是v-for绑定的ref
    // <li v-for="key in [1,2,3]" :ref="key"></li>
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref)
      }
    } else {
      // 单个绑定
      refs[key] = ref
    }
  }
}
