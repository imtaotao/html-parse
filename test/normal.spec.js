const { c, n, it } = require('./index')

it('空字符串', expect => {
  expect(c('')).toEqual([])
})

it('生成树', expect => {
  expect(c('<div>1</div>')).toEqual([n('div', null, ['1'])])
})

it('多个标签', expect => {
  const ast = c(`
    <div>1</div>
    <div>2</div>
  `)
  expect(ast).toEqual([
    n('div', null, ['1']),
    n('div', null, ['2']),
  ])
})

it('属性', expect => {
  const ast1 = c('<div id=test>1</div>')
  expect(ast1).toEqual([n('div', { id: 'test' }, ['1'])])
  const ast2 = c('<div id=\'test\'>1</div>')
  expect(ast2).toEqual([n('div', { id: 'test' }, ['1'])])
  const ast3 = c('<div id="test">1</div>')
  expect(ast3).toEqual([n('div', { id: 'test' }, ['1'])])
})