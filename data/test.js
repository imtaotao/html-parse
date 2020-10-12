const f = url => fetch(url).then(res => res.text())

const d1 = f('./data/one.html')
const d2 = f('./data/two.html')
const dn = `
  <div v-for="v in list">
    <!-- <main>121</main> -->
    <br>
    <script type="module">
      window.addEventListener("load", function () {
        try {
          if (window.localStorage.getItem("SUPPORT_WEBP")) return;
          var s = document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0;
          window.localStorage.setItem("SUPPORT_WEBP", s)
        } catch (e) { } 
      });
      var a = '<main>121</main>'
      var b = '<!-- <main>121</main> -->'
    </script>
  </div>
`

window.testHTML = Promise.resolve(dn)