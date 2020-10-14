'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
  We don't want to include babel-polyfill in our project.
    - Library authors should be using babel-runtime for non-global polyfilling
    - Adding babel-polyfill/-runtime increases bundle size significantly

  We will include our polyfill instance methods as regular functions.
*/

function startsWith (str, searchString, position) {
  return str.substr(position || 0, searchString.length) === searchString
}

function endsWith (str, searchString, position) {
  const index = (position || str.length) - searchString.length;
  const lastIndex = str.lastIndexOf(searchString, index);
  return lastIndex !== -1 && lastIndex === index
}

function stringIncludes (str, searchString, position) {
  return str.indexOf(searchString, position || 0) !== -1
}

function isRealNaN (x) {
  return typeof x === 'number' && isNaN(x)
}

function arrayIncludes (array, searchElement, position) {
  const len = array.length;
  if (len === 0) return false

  const lookupIndex = position | 0;
  const isNaNElement = isRealNaN(searchElement);
  let searchIndex = lookupIndex >= 0 ? lookupIndex : len + lookupIndex;
  while (searchIndex < len) {
    const element = array[searchIndex++];
    if (element === searchElement) return true
    if (isNaNElement && isRealNaN(element)) return true
  }

  return false
}

function feedPosition (position, str, len) {
  const start = position.index;
  const end = position.index = start + len;
  for (let i = start; i < end; i++) {
    const char = str.charAt(i);
    if (char === '\n') {
      position.line++;
      position.column = 0;
    } else {
      position.column++;
    }
  }
}

function jumpPosition (position, str, end) {
  const len = end - position.index;
  return feedPosition(position, str, len)
}

function makeInitialPosition () {
  return {
    index: 0,
    column: 0,
    line: 0
  }
}

function copyPosition (position) {
  return {
    index: position.index,
    line: position.line,
    column: position.column
  }
}

function lexer (str, options) {
  const state = {
    str,
    options,
    position: makeInitialPosition(),
    tokens: []
  };
  lex(state);
  return state.tokens
}

function lex (state) {
  const {str, options: {childlessTags}} = state;
  const len = str.length;
  while (state.position.index < len) {
    const start = state.position.index;
    lexText(state);
    if (state.position.index === start) {
      const isComment = startsWith(str, '!--', start + 1);
      if (isComment) {
        lexComment(state);
      } else {
        const tagName = lexTag(state);
        const safeTag = tagName.toLowerCase();
        if (arrayIncludes(childlessTags, safeTag)) {
          lexSkipTag(tagName, state);
        }
      }
    }
  }
}

const alphanumeric = /[A-Za-z0-9]/;
function findTextEnd (str, index) {
  while (true) {
    const textEnd = str.indexOf('<', index);
    if (textEnd === -1) {
      return textEnd
    }
    const char = str.charAt(textEnd + 1);
    if (char === '/' || char === '!' || alphanumeric.test(char)) {
      return textEnd
    }
    index = textEnd + 1;
  }
}

function lexText (state) {
  const type = 'text';
  const {str, position} = state;
  let textEnd = findTextEnd(str, position.index);
  if (textEnd === position.index) return
  if (textEnd === -1) {
    textEnd = str.length;
  }

  const start = copyPosition(position);
  const content = str.slice(position.index, textEnd);
  jumpPosition(position, str, textEnd);
  const end = copyPosition(position);
  state.tokens.push({type, content, position: {start, end}});
}

function lexComment (state) {
  const {str, position} = state;
  const start = copyPosition(position);
  feedPosition(position, str, 4); // "<!--".length
  let contentEnd = str.indexOf('-->', position.index);
  let commentEnd = contentEnd + 3; // "-->".length
  if (contentEnd === -1) {
    contentEnd = commentEnd = str.length;
  }

  const content = str.slice(position.index, contentEnd);
  jumpPosition(position, str, commentEnd);
  state.tokens.push({
    type: 'comment',
    content,
    position: {
      start,
      end: copyPosition(position)
    }
  });
}

function lexTag (state) {
  const {str, position} = state;
  {
    const secondChar = str.charAt(position.index + 1);
    const close = secondChar === '/';
    const start = copyPosition(position);
    feedPosition(position, str, close ? 2 : 1);
    state.tokens.push({type: 'tag-start', close, position: {start}});
  }
  const tagName = lexTagName(state);
  lexTagAttributes(state);
  {
    const firstChar = str.charAt(position.index);
    const close = firstChar === '/';
    feedPosition(position, str, close ? 2 : 1);
    const end = copyPosition(position);
    state.tokens.push({type: 'tag-end', close, position: {end}});
  }
  return tagName
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#special-white-space
const whitespace = /\s/;
function isWhitespaceChar (char) {
  return whitespace.test(char)
}

function lexTagName (state) {
  const {str, position} = state;
  const len = str.length;
  let start = position.index;
  while (start < len) {
    const char = str.charAt(start);
    const isTagChar = !(isWhitespaceChar(char) || char === '/' || char === '>');
    if (isTagChar) break
    start++;
  }

  let end = start + 1;
  while (end < len) {
    const char = str.charAt(end);
    const isTagChar = !(isWhitespaceChar(char) || char === '/' || char === '>');
    if (!isTagChar) break
    end++;
  }

  jumpPosition(position, str, end);
  const tagName = str.slice(start, end);
  state.tokens.push({
    type: 'tag',
    content: tagName
  });
  return tagName
}

function lexTagAttributes (state) {
  const {str, position, tokens} = state;
  let cursor = position.index;
  let quote = null; // null, single-, or double-quote
  let wordBegin = cursor; // index of word start
  const words = []; // "key", "key=value", "key='value'", etc
  const len = str.length;
  while (cursor < len) {
    const char = str.charAt(cursor);
    if (quote) {
      const isQuoteEnd = char === quote;
      if (isQuoteEnd) {
        quote = null;
      }
      cursor++;
      continue
    }

    const isTagEnd = char === '/' || char === '>';
    if (isTagEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor));
      }
      break
    }

    const isWordEnd = isWhitespaceChar(char);
    if (isWordEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor));
      }
      wordBegin = cursor + 1;
      cursor++;
      continue
    }

    const isQuoteStart = char === '\'' || char === '"';
    if (isQuoteStart) {
      quote = char;
      cursor++;
      continue
    }

    cursor++;
  }
  jumpPosition(position, str, cursor);

  const wLen = words.length;
  const type = 'attribute';
  for (let i = 0; i < wLen; i++) {
    const word = words[i];
    const isNotPair = word.indexOf('=') === -1;
    if (isNotPair) {
      const secondWord = words[i + 1];
      if (secondWord && startsWith(secondWord, '=')) {
        if (secondWord.length > 1) {
          const newWord = word + secondWord;
          tokens.push({type, content: newWord});
          i += 1;
          continue
        }
        const thirdWord = words[i + 2];
        i += 1;
        if (thirdWord) {
          const newWord = word + '=' + thirdWord;
          tokens.push({type, content: newWord});
          i += 1;
          continue
        }
      }
    }
    if (endsWith(word, '=')) {
      const secondWord = words[i + 1];
      if (secondWord && !stringIncludes(secondWord, '=')) {
        const newWord = word + secondWord;
        tokens.push({type, content: newWord});
        i += 1;
        continue
      }

      const newWord = word.slice(0, -1);
      tokens.push({type, content: newWord});
      continue
    }

    tokens.push({type, content: word});
  }
}

const push = [].push;

function lexSkipTag (tagName, state) {
  const {str, position, tokens} = state;
  const safeTagName = tagName.toLowerCase();
  const len = str.length;
  let index = position.index;
  while (index < len) {
    const nextTag = str.indexOf('</', index);
    if (nextTag === -1) {
      lexText(state);
      break
    }

    const tagStartPosition = copyPosition(position);
    jumpPosition(tagStartPosition, str, nextTag);
    const tagState = {str, position: tagStartPosition, tokens: []};
    const name = lexTag(tagState);
    if (safeTagName !== name.toLowerCase()) {
      index = tagState.position.index;
      continue
    }

    if (nextTag !== position.index) {
      const textStart = copyPosition(position);
      jumpPosition(position, str, nextTag);
      tokens.push({
        type: 'text',
        content: str.slice(textStart.index, nextTag),
        position: {
          start: textStart,
          end: copyPosition(position)
        }
      });
    }

    push.apply(tokens, tagState.tokens);
    jumpPosition(position, str, tagState.position.index);
    break
  }
}

function parser (tokens, options) {
  const root = {tagName: null, children: []};
  const state = {tokens, options, cursor: 0, stack: [root]};
  parse(state);
  return root.children
}

function hasTerminalParent (tagName, stack, terminals) {
  const tagParents = terminals[tagName];
  if (tagParents) {
    let currentIndex = stack.length - 1;
    while (currentIndex >= 0) {
      const parentTagName = stack[currentIndex].tagName;
      if (parentTagName === tagName) {
        break
      }
      if (arrayIncludes(tagParents, parentTagName)) {
        return true
      }
      currentIndex--;
    }
  }
  return false
}

function rewindStack (stack, newLength, childrenEndPosition, endPosition) {
  stack[newLength].position.end = endPosition;
  for (let i = newLength + 1, len = stack.length; i < len; i++) {
    stack[i].position.end = childrenEndPosition;
  }
  stack.splice(newLength);
}

function parse (state) {
  const {tokens, options} = state;
  let {stack} = state;
  let nodes = stack[stack.length - 1].children;
  const len = tokens.length;
  let {cursor} = state;
  while (cursor < len) {
    const token = tokens[cursor];
    if (token.type !== 'tag-start') {
      nodes.push(token);
      cursor++;
      continue
    }

    const tagToken = tokens[++cursor];
    cursor++;
    const tagName = tagToken.content.toLowerCase();
    if (token.close) {
      let index = stack.length;
      let shouldRewind = false;
      while (--index > -1) {
        if (stack[index].tagName === tagName) {
          shouldRewind = true;
          break
        }
      }
      while (cursor < len) {
        const endToken = tokens[cursor];
        if (endToken.type !== 'tag-end') break
        cursor++;
      }
      if (shouldRewind) {
        rewindStack(stack, index, token.position.start, tokens[cursor - 1].position.end);
        break
      } else {
        continue
      }
    }

    const isClosingTag = arrayIncludes(options.closingTags, tagName);
    let shouldRewindToAutoClose = isClosingTag;
    if (shouldRewindToAutoClose) {
      const { closingTagAncestorBreakers: terminals } = options;
      shouldRewindToAutoClose = !hasTerminalParent(tagName, stack, terminals);
    }

    if (shouldRewindToAutoClose) {
      // rewind the stack to just above the previous
      // closing tag of the same name
      let currentIndex = stack.length - 1;
      while (currentIndex > 0) {
        if (tagName === stack[currentIndex].tagName) {
          rewindStack(stack, currentIndex, token.position.start, token.position.start);
          const previousIndex = currentIndex - 1;
          nodes = stack[previousIndex].children;
          break
        }
        currentIndex = currentIndex - 1;
      }
    }

    let attributes = [];
    let attrToken;
    while (cursor < len) {
      attrToken = tokens[cursor];
      if (attrToken.type === 'tag-end') break
      attributes.push(attrToken.content);
      cursor++;
    }

    cursor++;
    const children = [];
    const position = {
      start: token.position.start,
      end: attrToken.position.end
    };
    const elementNode = {
      type: 'element',
      tagName: tagToken.content,
      attributes,
      children,
      position
    };
    nodes.push(elementNode);

    const hasChildren = !(attrToken.close || arrayIncludes(options.voidTags, tagName));
    if (hasChildren) {
      const size = stack.push({tagName, children, position});
      const innerState = {tokens, options, cursor, stack};
      parse(innerState);
      cursor = innerState.cursor;
      const rewoundInElement = stack.length === size;
      if (rewoundInElement) {
        elementNode.position.end = tokens[cursor - 1].position.end;
      }
    }
  }
  state.cursor = cursor;
}

function splitHead (str, sep) {
  const idx = str.indexOf(sep);
  if (idx === -1) return [str]
  return [str.slice(0, idx), str.slice(idx + sep.length)]
}

function unquote (str) {
  const car = str.charAt(0);
  const end = str.length - 1;
  const isQuoteStart = car === '"' || car === "'";
  if (isQuoteStart && car === str.charAt(end)) {
    return str.slice(1, end)
  }
  return str
}

function format (nodes, options) {
  return nodes.map(node => {
    const type = node.type;
    const outputNode = type === 'element'
      ? {
        type,
        tagName: node.tagName.toLowerCase(),
        attributes: formatAttributes(node.attributes),
        children: format(node.children, options)
      }
      : { type, content: node.content };
    if (options.includePositions) {
      outputNode.position = node.position;
    }
    return outputNode
  })
}

function formatAttributes (attributes) {
  return attributes.map(attribute => {
    const parts = splitHead(attribute.trim(), '=');
    const key = parts[0];
    const value = typeof parts[1] === 'string'
      ? unquote(parts[1])
      : null;
    return {key, value}
  })
}

function formatAttributes$1 (attributes) {
  return attributes.reduce((attrs, attribute) => {
    const {key, value} = attribute;
    if (value === null) {
      return `${attrs} ${key}`
    }
    const quoteEscape = value.indexOf('\'') !== -1;
    const quote = quoteEscape ? '"' : '\'';
    return `${attrs} ${key}=${quote}${value}${quote}`
  }, '')
}

function toHTML (tree, options) {
  return tree.map(node => {
    if (node.type === 'text') {
      return node.content
    }
    if (node.type === 'comment') {
      return `<!--${node.content}-->`
    }
    const {tagName, attributes, children} = node;
    const isSelfClosing = arrayIncludes(options.voidTags, tagName.toLowerCase());
    return isSelfClosing
      ? `<${tagName}${formatAttributes$1(attributes)}>`
      : `<${tagName}${formatAttributes$1(attributes)}>${toHTML(children, options)}</${tagName}>`
  }).join('')
}

/*
  Tags which contain arbitary non-parsed content
  For example: <script> JavaScript should not be parsed
*/
const childlessTags = ['style', 'script', 'template'];

/*
  Tags which auto-close because they cannot be nested
  For example: <p>Outer<p>Inner is <p>Outer</p><p>Inner</p>
*/
const closingTags = [
  'html', 'head', 'body', 'p', 'dt', 'dd', 'li', 'option',
  'thead', 'th', 'tbody', 'tr', 'td', 'tfoot', 'colgroup'
];

/*
  Closing tags which have ancestor tags which
  may exist within them which prevent the
  closing tag from auto-closing.
  For example: in <li><ul><li></ul></li>,
  the top-level <li> should not auto-close.
*/
const closingTagAncestorBreakers = {
  li: ['ul', 'ol', 'menu'],
  dt: ['dl'],
  dd: ['dl'],
  tbody: ['table'],
  thead: ['table'],
  tfoot: ['table'],
  tr: ['table'],
  td: ['table']
};

/*
  Tags which do not need the closing tag
  For example: <img> does not need </img>
*/
const voidTags = [
  '!doctype', 'area', 'base', 'br', 'col', 'command',
  'embed', 'hr', 'img', 'input', 'keygen', 'link',
  'meta', 'param', 'source', 'track', 'wbr'
];

const parseDefaults = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: false
};

function parse$1 (str, options = parseDefaults) {
  const tokens = lexer(str, options);
  const nodes = parser(tokens, options);
  return format(nodes, options)
}

function stringify (ast, options = parseDefaults) {
  return toHTML(ast, options)
}

exports.parse = parse$1;
exports.parseDefaults = parseDefaults;
exports.stringify = stringify;
