/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  target._o = markOnce // v-once render 处理
  target._n = toNumber // 值转换 Number 处理
  target._s = toString // 值转换 String 处理
  target._l = renderList // v-for render 处理
  target._t = renderSlot // slot 槽点 render 处理
  target._q = looseEqual // 判断两个对象是否大体相等
  target._i = looseIndexOf // 对等属性索引，不存在则返回 -1
  target._m = renderStatic // 静态节点 render 处理
  target._f = resolveFilter // filters 指令 render 处理
  target._k = checkKeyCodes // 检查config中的keyCode
  target._b = bindObjectProps // v-bind render 处理，将 v-bind="object" 的属性 merge 到VNode属性中
  target._v = createTextVNode // 创建文本节点
  target._e = createEmptyVNode // 创建空节点
  target._u = resolveScopedSlots // scopeSlots render 处理
  target._g = bindObjectListeners// v-on render 处理
  target._d = bindDynamicKeys
  target._p = prependModifier
}
