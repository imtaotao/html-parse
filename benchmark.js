const benchmark = require('htmlparser-benchmark')
const { parse, evaluate } = require('./dist/htmlParse.cjs')

const bench = benchmark((html, callback) => {
  try {
    const built = parse(html)
    evaluate(built, (tag, props, ...children) => {
      return { tag, props, children }
    })
    callback()
  } catch(error) {
    console.log(error);
    callback()
  }
})

bench.on('progress', key => {
  console.log('finished parsing ' + key + '.html')
})

bench.on('result', stat => {
  console.log(stat.mean().toPrecision(6) + ' ms/file ± ' + stat.sd().toPrecision(6))
})