## html-parse [![NPM version][npm-image]][npm-url]
[npm-image]: https://img.shields.io/npm/v/@rustle/html-parse.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@rustle/html-parse

简单的 `html-parse` 解析器，能够兼容无 `/` 单标签。
```js
import { parse, evaluate } from '@rustle/html-parse'

const built = parse(`
  <div>
    <br>
    <a href="xxx"/>
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

### 特殊 tag
特殊 tag 用大写标识，因为 html 标签都是用的小写，为了避免冲突，特殊的 tag 用大写标识
+ 注释节点：`COMMENT`

### Caveats
对于缺少闭合标签的语法，暂不能做到和浏览器一直的行为，所以尽可能写标准的 `html` 语法