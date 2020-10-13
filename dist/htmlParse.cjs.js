'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// 标记
const MODE_TEXT = 0;
const MODE_SLASH = 1;
const MODE_TAGNAME = 2;
const MODE_COMMENT = 3;
const MODE_PROP_SET = 4;
const MODE_WHITESPACE = 5;
const MODE_FILTERTAGS = 6;

// 生成的标记
const TAG_SET = 'tag';
const PROP_SET = 'props';
const CHILD_APPEND = 'child';
const CHILD_COMMENT = 'child_comment';
const CHILD_RECURSE = 'child_recurse';

// html 声明
const doctypes = [
  '!doctype',
  '!DOCTYPE',
];

// 过滤编译的标签
const filterCompileTag = [
  'style',
  'script',
];

// 单标签
const voidElements = [
  'br',
  'hr',
  'img',
  'col',
  'wbr',
  'area',
  'base',
  'link',
  'meta',
  'input',
  'embed',
  'track',
  'frame',
  'param',
  'keygen',
  'source',
  'command',
  'isindex',
  'basefont',
];

function makeMap(list) {
  const map = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return val => map[val]
}

const doctype = makeMap(doctypes);
const singleTag = makeMap(voidElements);
const filterTag = makeMap(filterCompileTag);

function parse(code, filterWhiteSpace = true) {
  let propName;
  let quote = '';
  let buffer = '';
  let scope = [];
  let mode = MODE_TEXT;
  const len = code.length;
  scope.parent = [];

  const back = () => {
    const cur = scope;
    scope = scope.parent;
    scope.push([CHILD_RECURSE, cur]);
  };

  const curtag = () => {
    if (scope && scope[0]) {
      return scope[0][0] === TAG_SET
        ? scope[0][1]
        : null
    }
    return null
  };

  const commit = () => {
    if (mode !== MODE_COMMENT && !buffer) {
      return
    }

    if (mode === MODE_TEXT) {
      // append 文本内容，pre 标签内的内容要特殊处理
      if (!filterWhiteSpace || curtag() === 'pre') {
        scope.push([CHILD_APPEND, buffer]);
      } else if (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '')) {
        scope.push([CHILD_APPEND, buffer]);
      }
    } else if (mode === MODE_TAGNAME) {
      // tag
      scope.push([TAG_SET, buffer]);
      mode = MODE_WHITESPACE;
    } else if (mode === MODE_WHITESPACE) {
      // 如果是空格一直下来的，就是下面这种情况
      // <a disable />
      scope.push([PROP_SET, buffer, true]);
    } else if (mode === MODE_PROP_SET) {
      scope.push([PROP_SET, propName, buffer]);
    } else if (mode === MODE_COMMENT) {
      scope.push([CHILD_COMMENT, buffer]);
    } else if (mode === MODE_FILTERTAGS) {
      scope.push([CHILD_APPEND, buffer]);
    }

    buffer = '';
  };

  for (let i = 0; i < len; i++) {
    const char = code[i];
    
    if (mode === MODE_TEXT) {
      if (char === '<') {
        if (filterTag(curtag())) {
          buffer += char;
          mode = MODE_FILTERTAGS;
        } else {
          commit();
          const current = [];
          current.parent = scope;
          scope = current;
          mode = MODE_TAGNAME;
        }
      } else {
        buffer += char;
      }
    } else if (mode === MODE_COMMENT) {
      // 记录注释节点
      const l = buffer.length;
      if (buffer[l - 1] === '-' && buffer[l - 2] === '-' && char === '>') {
        buffer = buffer.slice(0, l - 2);
        commit();
        back();
        mode = MODE_TEXT;
      } else {
        buffer += char;
      }
    } else if (mode === MODE_FILTERTAGS) {
      buffer += char;
      if (char === '/' && code[i - 1] === '<') {
        const tag = curtag();
        if (code.slice(i + 1, i + tag.length + 2) === (tag + '>')) {
          buffer = buffer.slice(0, -2);
          commit();
          back();
          i += (tag.length + 2);
          mode = MODE_TEXT;
        }
      }
    } else if (quote) {
      // 过滤多于的引号
      // ""a"" --> "a"
      // "'a'" --> "'a'"
      if (char === quote) {
        quote = '';
      } else {
        buffer += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      commit();
      // 如果是单标签或者 html 类型声明
      const tag = curtag();
      if (singleTag(tag) || doctype(tag)) {
        back();
      }
      mode = MODE_TEXT;
    } else if (mode === MODE_SLASH) ; else if (char === '=') {
      // 处理属性
      mode = MODE_PROP_SET;
      propName = buffer;
      buffer = '';
    } else if (char === '/' && (mode !== MODE_PROP_SET || code[i + 1] === '>')) {
      commit();
      // 前一个是 <, 那么多了一层 child，这里要返回
      if (mode === MODE_TAGNAME) {
        scope = scope.parent;
      }
      back();
      mode = MODE_SLASH;
    } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      commit();
      mode = MODE_WHITESPACE;
    } else {
      buffer += char;
    }

    if (mode === MODE_TAGNAME && buffer === '!--') {
      mode = MODE_COMMENT;
      buffer = '';
    }
  }

  commit();
  return scope
}

function evaluate(built, cb, insert) {
  const args = ['', null];
  for (let i = 0; i < built.length; i++) {
    const [type, name, prop] = built[i];
    const value = prop === undefined ? name :  prop;

    if (type === TAG_SET) {
      args[0] = value;
    } else if (type === PROP_SET) {
      (args[1] = args[1] || {})[name] = value;
    } else if (type === CHILD_RECURSE) {
      args.push(cb.apply(null, evaluate(value, cb, true)));
    } else if (type === CHILD_COMMENT) {
      args[0] = 'COMMENT';
      args.push(value);
    } else if (type === CHILD_APPEND) {
      args.push(value);
    }
  }
  return insert ? args : args.slice(2)
}

exports.evaluate = evaluate;
exports.parse = parse;
