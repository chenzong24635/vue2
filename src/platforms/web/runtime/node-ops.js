/* @flow */

import { namespaceMap } from 'web/util/index'

// 创建指定的 HTML 元素
export function createElement (tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

// 创建文本节点
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

// 创建一个注释节点
export function createComment (text: string): Comment {
  return document.createComment(text)
}

// 插入节点
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

// 删除节点
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

// 添加节点
export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}

// 返回父节点
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

// 返回兄弟节点
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}

// 返回节点标签名
export function tagName (node: Element): string {
  return node.tagName
}

// 设置节点文本内容
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

// 设置样式
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
