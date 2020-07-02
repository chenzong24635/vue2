/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.

// 模板编译原理
// 1. 代码转换为 ast 语法树 -- parse 解析
// 2. 标记静态树 -- 树遍历标记 markup
// 3. 通过 ast 生成的语法树，生成render 函数 codegen

export const createCompiler = createCompilerCreator(function baseCompile(
    template: string,
    options: CompilerOptions
): CompiledResult {
    const ast = parse(template.trim(), options)
    if (options.optimize !== false) {
        optimize(ast, options)
    }
    const code = generate(ast, options)
    return {
        ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
    }
})