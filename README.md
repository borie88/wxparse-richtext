# wxparse-richtext
See sample.js file for details on how to set up:

```
const Html = require('/parse-rich/html.js');

Page({
	data: {
		item: {}
		nodes: []
	},
	onLoad: function () {
		getItem().then(item => {
			this.prepareBody(item.body)
		})
	},
	prepareBody: function (body) {
    var nodes
    function start (body) {
      return Html.html2json(body, 'main')
    }
    nodes = start(body).children
    if (nodes.length) {
      this.setData({nodes}) // or put this in your post dataset
    }
  },
})
```
