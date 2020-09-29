## html-parse [![NPM version][npm-image]][npm-url]
[npm-image]: https://img.shields.io/npm/v/@rustle/html-parse.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@rustle/html-parse

简单的 `html-parse` 解析器，能够兼容无 `/` 单标签。
  > 对 script 标签的内容，如果有 html 内容的字符串，暂无处理

```js
import { parse, evaluate } from '@rustle/html-parse'

const built = parse(`
  <div>
    <br>
    <a href="xxx">
  </div>
`)

const ast = evaluate(built, (tag, props, ...children) => {
  return { tag, props, children }
})

console.log(ast)
```

```js
// 获取所有的 div 标签
const divs = []
evaluate(built, (tag, props, ...children) => {
  if (tag === 'div') {
    divs.push({ tag, props, children })
  }
})
```