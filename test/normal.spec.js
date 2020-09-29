const { test, createAst } = require('./index')

test('ast', expect => {
  const ast = createAst('<div>1</div>')
  expect(ast).toEqual([
    {
      tag: 'div',
      props: null,
      children: ['1'],
    },
  ])
})