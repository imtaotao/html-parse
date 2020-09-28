## html-parse
简单的 `html-parse` 解析器，能够兼容无 `/` 单标签。
  > 对 script 标签的内容，暂无处理

```js
import { parse, evaluate } from './index.js'

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