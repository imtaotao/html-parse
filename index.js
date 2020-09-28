// 标记
const MODE_TEXT = 0
const MODE_SLASH = 1
const MODE_TAGNAME = 2
const MODE_COMMENT = 3
const MODE_PROP_SET = 4
const MODE_WHITESPACE = 5

// 生成的标记
const TAG_SET = 'tag'
const PROP_SET = 'props'
const CHILD_APPEND = 'child'
const CHILD_RECURSE = 'child_recurse'

// 单标签
const SINGLE_TAGS = [
  'br',
  'hr',
  'img',
  'link',
  'meta',
  'input',
  'param',
]

function filter(code) {
  code = code.trim()
  return code.startsWith('<!DOCTYPE html>')
    ? code.slice(15, code.length).trim()
    : code
}

function makeMap (list) {
  const map = Object.create(null)
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return val => map[val]
}

const isSingleTag = makeMap(SINGLE_TAGS)

export function parse(code) {
  code = filter(code)

  let propName
  let quote = ''
  let buffer = ''
  let scope = []
  let mode = MODE_TEXT
  const len = code.length
  scope.parent = null

  const back = () => {
    const cur = scope
    scope = scope.parent
    scope.push([CHILD_RECURSE, cur])
  }

  const commit = () => {
    if (!buffer) return
    if (mode === MODE_TEXT) {
      // append 文本内容
      if (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')) {
        scope.push([CHILD_APPEND, buffer])
      }
    } else if (mode === MODE_TAGNAME) {
      // tag
      scope.push([TAG_SET, buffer])
      mode = MODE_WHITESPACE
    } else if (mode === MODE_WHITESPACE) {
      // 如果是空格一直下来的，就是下面这种情况
      // <a disable />
      scope.push([PROP_SET, buffer, true])
    } else if (mode === MODE_PROP_SET) {
      scope.push([mode, propName, buffer])
    }
    buffer = ''
  }

  for (let i = 0; i < len; i++) {
    const char = code[i]
  
    if (mode === MODE_TEXT) {
      if (char === '<') {
        commit()
        const current = []
        current.parent = scope
        scope = current
        mode = MODE_TAGNAME
      } else {
        buffer += char
      }
    } else if (mode === MODE_COMMENT) {
      // Filter out comments
      if (buffer === '--' && char === '>') {
        mode = MODE_TEXT
        buffer = ''
      } else {
        buffer = char + buffer[0]
      }
    } else if (quote) {
      // 过滤多于的引号
      // ""a"" --> "a"
      // "'a'" --> "'a'"
      if (char === quote) {
        quote = ''
      } else {
        buffer += char
      }
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === '>') {
      commit()
      if (scope && scope[0]) {
        const [tag, tagName] = scope[0]
        if (tag === TAG_SET && isSingleTag(tagName)) {
          back()
        }
      }
      mode = MODE_TEXT
    } else if (mode === MODE_SLASH) {
      // 如果是 `MODE_SLASH`，这里不需要做任何事情
      // 放在 `char === '='` 前面是因为要处理 `<ab / ba prop = value>`
      // prop 有可能在后面
    } else if (char === '=') {
      // 处理属性
      mode = MODE_PROP_SET
      propName = buffer
      buffer = ''
    } else if (char === '/' && (mode !== MODE_PROP_SET || code[i + 1] === '>')) {
      commit()
      // 前一个是 <, 那么多了一层 child，这里要返回
      if (mode === MODE_TAGNAME) {
        scope = scope.parent
      }

      back()
      mode = MODE_SLASH
    } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      commit()
      mode = MODE_WHITESPACE
    } else {
      buffer += char
    }

    if (mode === MODE_TAGNAME && buffer === '!--') {
      mode = MODE_COMMENT
      scope = scope.parent
    }
  }

  commit()
  return scope
}

export function evaluate(built, cb) {
  const args = ['', null]
  for (let i = 0; i < built.length; i++) {
    const [type, name, prop] = built[i]
    const value = prop === undefined ? name :  prop

    if (type === TAG_SET) {
      args[0] = value
    } else if (type === PROP_SET) {
      (args[1] = args[1] || {})[name] = value
    } else if (type === CHILD_RECURSE) {
      args.push(cb.apply(null, evaluate(value, cb)))
    } else if (type === CHILD_APPEND) {
      args.push(value)
    }
  }
  return args
}
