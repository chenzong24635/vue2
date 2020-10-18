/* @flow */

import { toArray } from '../util/index'

export function initUse(Vue: GlobalAPI) {
    // 作用：使用插件
    Vue.use = function(plugin: Function | Object) {
        // 避免重复加载
        const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
        if (installedPlugins.indexOf(plugin) > -1) {
            return this
        }

        // additional parameters
        // 获取除首个参数外的其余参数
        // Vue.use(xxx,1,2,3)
        const args = toArray(arguments, 1)
        args.unshift(this) // 数组加入 this（Vue）

        // 对传入的 plugin 兼容处理
        // plugin存在install属性且其为函数
        if (typeof plugin.install === 'function') {
            plugin.install.apply(plugin, args)
        } else if (typeof plugin === 'function') {
            // plugin本身就是个函数
            plugin.apply(null, args)
        }
        // 缓存插件，避免重复加载
        installedPlugins.push(plugin)
        return this
    }
}