const f = url => fetch(url).then(res => res.text())
const o = url => f(`./getTestHtml?url=${url}`)

const d1 = f('./data/one.html')
const d2 = f('./data/two.html')
const d3 = f('./data/three.html')
const d4 = o('https://www.baidu.com/')
const d5 = o('https://mp.toutiao.com/')
const d6 = o('https://cloud.bytedance.net/')
const d = `
  <div>
    <script type="module">
      window.addEventListener("load", function () {
        try {
          if (window.localStorage.getItem("SUPPORT_WEBP")) return;
          var s = document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0;
          window.localStorage.setItem("SUPPORT_WEBP", s)
        } catch (e) { } 
      });
    </script>
  </div>
  <div></div>
`

window.testHTML = Promise.resolve(d5)