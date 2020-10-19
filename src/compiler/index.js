/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.

// 模板编译原理
// 1. tempalte转换为 ast 语法树 -- parse 解析
// 2. 标记静态树 -- 树遍历标记 markup
// 3. 通过 ast 生成的语法树，生成render 函数 codegen

export const createCompiler = createCompilerCreator(function baseCompile(
    template: string,
    options: CompilerOptions
): CompiledResult {
    // 通过parse方法（调用parseHTML）解析 template 生成 ast
    const ast = parse(template.trim(), options)

    // 静态语法标记
    if (options.optimize !== false) {
        optimize(ast, options)
    }
    // 生成render函数字符串
    const code = generate(ast, options)
    return {
        ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
    }
})
