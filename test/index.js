const fs = require('fs')
const { parse, evaluate } = require('../dist/htmlParse.cjs')

const errSymbol = Symbol()

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

function log(desc, condition) {
  if (condition) {
    console.log(`✅: [${desc}]`)
  } else {
    console.error(`❌: [${desc}]`)
    process.exit(0)
  }
}

function expectObject() {
  return val => {
    return {
      tobe(res) {
        if (val !== res) {
          throw errSymbol
        }
      },

      // 深度遍历
      toEqual(obj) {
        if (!compare(val, obj)) {
          throw errSymbol
        }
      },

      toThrow(msg) {
        let normal = false
        try {
          val()
          normal = true
        } catch(error) {
          if (msg) {
            normal = error instanceof Error
              ? msg !== error.message
              : msg !== error
          }
        }
        if (normal) throw errSymbol
      },
    }
  }
}

exports.it = function(desc, callback) {
  try {
    callback(expectObject())
    log(desc, true)
  } catch(error) {
    if (error !== errSymbol) {
      console.log(error)
    }
    log(desc, false)
  }
}

exports.n = function(tag, props, children) {
  return { tag, props, children }
}

exports.c = function(code) {
  return evaluate(
    parse(code),
    (tag, props, ...children) => ({ tag, props, children }),
  )
}

console.clear()
fs.readdir(__dirname, (err, files) => {
  if (!err) {
    files.forEach(file => {
      if (file !== 'index.js') {
        require(`./${file}`)
      }
    })
  }
})