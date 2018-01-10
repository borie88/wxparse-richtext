var wxDiscode = require('./replace.js');
var HTMLParser = require('./htmlparser.js');

var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr");
var block = makeMap("br,a,code,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");
var inline = makeMap("abbr,acronym,applet,b,basefont,bdo,big,button,cite,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");
var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");
var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");
var special = makeMap("wxxxcode-style,script,style,view,scroll-view,block");

function makeMap(str) {
  var obj = {}, items = str.split(",");
  for (var i = 0; i < items.length; i++)
    obj[items[i]] = true;
  return obj;
}

function q(v) {
  return '"' + v + '"';
}

function removeDOCTYPE(html) {
  return html
    .replace(/<\?xml.*\?>\n/, '')
    .replace(/<.*!doctype.*\>\n/, '')
    .replace(/<.*!DOCTYPE.*\>\n/, '');
}

function trimHtml(html) {
  return html
    .replace(/\r?\n+/g, '')
    .replace(/<!--.*?-->/ig, '')
    .replace(/\/\*.*?\*\//ig, '')
    .replace(/[ ]+</ig, '<')
}


function html2json(html, bindName) {
  //处理字符串
  //html = removeDOCTYPE(html);
  html = trimHtml(html);
  html = wxDiscode.strDiscode(html);
  //生成node节点
  var bufArray = [];
  var results = {
    name: bindName,
    children: []
  };
  var index = 0;
  HTMLParser(html, {
    start: function (tag, attrs, unary) {
      //debug(tag, attrs, unary);
      // node for this element
      var node = {
        name: tag
      };

      if (bufArray.length === 0) {
        node.index = index.toString()
        index += 1
      } else {
        var parent = bufArray[0];
        if (parent.children === undefined) {
          parent.children = [];
        }
        node.index = parent.index + '.' + parent.children.length
      }

      if (block[tag]) {
        node.tagType = "block";
      } else if (inline[tag]) {
          node.tagType = "inline";
      } else if (closeSelf[tag]) {
          node.tagType = "closeSelf";
      }

      if (attrs.length !== 0) {
        node.attrs = attrs.reduce(function (pre, attr) {
          var name = attr.name;
          var value = attr.value;
          if (name == 'class') {
            //console.dir(value);
            //  value = value.join("")
            node.class = value;
          }
          if (name == 'id') {
            return pre;
          }
          if (name == 'alt') {

          }
          // has multi attibutes
          // make it array of attribute
          if (name == 'style') {
            //console.dir(value);
            //  value = value.join("")
            node.styleStr = value;
          }
          if (value.match(/ /)) {
            //value = value.split(' ');
          }


          // if attr already exists
          // merge it
          if (pre[name]) {
            if (Array.isArray(pre[name])) {
              // already array, push to last
              pre[name].push(value);
            } else {
              // single value, make it array
              pre[name] = [pre[name], value];
            }
          } else {
            // not exist, put it
            pre[name] = value;
          }

          return pre;
        }, {});
      }

      //对img添加额外数据
      if (node.name === 'img') {
        var imgUrl = node.attrs.src;
        if (imgUrl[0] == '') {
          imgUrl.splice(0, 1);
        }
        imgUrl = imgUrl;
        node.attrs.src = imgUrl;
        var style = node.attrs.style || '';
        node.attrs.style = style + "width:100%;";
      }

      if (unary) {
        // if this tag dosen't have end tag
        // like <img src="hoge.png"/>
        // add to parents
        var parent = bufArray[0] || results;
        if (parent.children === undefined) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        bufArray.unshift(node);
      }
    },
    end: function (tag) {
      //debug(tag);
      // merge into parent tag
      var node = bufArray.shift();
      if (node.name !== tag) console.error('invalid state: mismatch end tag');

      //当有缓存source资源时于于video补上src资源
      if (node.name === 'video' && results.source) {
        node.attrs.src = results.source;
        delete results.source;
      }

      if (bufArray.length === 0) {
        results.children.push(node);
      } else {
        var parent = bufArray[0];
        if (parent.children === undefined) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    },
    chars: function (text) {
      //debug(text);
      var node = {
        type: 'text',
        text: text
      };

      if (bufArray.length === 0) {
        node.index = index.toString()
        index += 1
        results.children.push(node);
      } else {
        var parent = bufArray[0];
        if (parent.children === undefined) {
          parent.children = [];
        }
        node.index = parent.index + '.' + parent.children.length
        parent.children.push(node);
      }
    },
  });
  return results;
};

module.exports = {
  html2json
}