import fs from 'fs';

const remove = (file, dir) => {
  try { dir ? fs.rmdirSync(file) : fs.unlinkSync(file) } catch(err) {}
}

remove('./dist/htmlParse.cjs.js')
remove('./dist/htmlParse.umd.js')
remove('./dist', true)

const conf = output => ({
  output,
  input: './index.js',
})

export default [
  conf({
    format: 'cjs',
    file: './dist/htmlParse.cjs.js',
  }),
  conf({
    format: 'umd',
    name: 'htmlParse',
    file: './dist/htmlParse.umd.js',
  }),
]