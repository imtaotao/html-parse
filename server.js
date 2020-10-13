const express = require('express')
const request = require('request')
const app = express();

app.use(express.static(__dirname))

// 抓取资源
app.get('/getTestHtml', (req, res) => {
  const url = req.query.url
  if (url) {
    request.get(url).pipe(res)
  } else {
    res.end('')
  }
})

app.listen(2333, () => console.log('http://localhost:2333'))