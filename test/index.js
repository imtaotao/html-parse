const fs = require('fs')
const { parse, evaluate } = require('../dist/htmlParse.cjs')


function compare(a, b) {
  if (!a || !b) return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    return wakeArray(a, b)
  } else if(typeof a === 'object' && typeof b === 'object') {
    return wakeObject(a, b)
  } else {
    return a === b
  }
}

// 属性要检验顺序
function wakeArray(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!compare(a[i], b[i])) {
      return false
    }
  }
  return true
}

// 对象不关心顺序
function wakeObject(a, b) {
  const aks = Object.keys(a)
  const bks = Object.keys(b)
  if (aks.length !== bks.length) return false
  for (let i = 0; i < aks.length; i++) {
    const k = aks[i]
    if (!(k in b)) return false
    const l = a[k]
    const r = b[k]

    if (!compare(l, r)) {
      return false
    }
  }
  return true
}

function createExpect(desc) {
  const log = condition => {
    if (condition) {
      console.log(`✅: ${desc}`)
    } else {
      console.error(`❌: ${desc}`)
      process.exit(0)
    }
  }

  return val => {
    return {
      tobe(res) {
        log(val === res)
      },

      // 深度遍历
      toEqual(obj) {
        log(compare(val, obj))
      },

      toThrow(msg) {
        try {
          fn()
          log(false)
        } catch(error) {
          log(msg ? msg === error.message : true)
          console.log(error)
        }
      },
    }
  }
}

exports.test = function(desc, callback) {
  callback(createExpect(desc))
}

exports.vnode = function(tag, props, ...children) {
  return { tag, props, children }
}

exports.createAst = function(code) {
  return evaluate(parse(code), exports.vnode).children
}

console.log()
fs.readdir(__dirname, (err, files) => {
  if (!err) {
    files.forEach(file => {
      if (file !== 'index.js') {
        require(`./${file}`)
      }
    })
  }
})