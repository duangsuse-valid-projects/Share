# Animations

一些从别处抄来的动画示例，点击代码以载入编辑框。为了方便提供了 HTML/JS 编辑器，每点框外执行一次。

<pre id="code" class="ace_editor" style="min-height:60px"><textarea class="ace_text-input"></textarea></pre>

<a id="edit-selected"></a><b>修改选定内容</b>：<input id="number" onclick="event.target.value=editor.getSelectedText()" type="number"/>，<button onclick="selectPos()">选择座标</button>：<span></span>,<span></span> <a onclick="insert(pos.join())">[^]</a><a onclick="pos=editor.getSelectedText().split(',')">[v]</a> <span onclick="timeoutPairdClick(...takeNextSiblingN(2,event.target), 3000)" style="color:green">marker: </span><a onclick="posMarkers.push(Object.assign(document.body.appendChild(posited('span', pos)), {textContent:''+(posMarkers.length+1), className:'pos-marker'}))">[+]</a> <a onclick="posMarkers.pop().remove()">[-]</a>
<style>.pos-marker { text-decoration-line: underline overline; }</style>

（你大概看不到的）脚本们依次是实现 `number.onchange`、 `selectPos` (clientXY)、 `insert`(替换选区)&`appendTag`(合并需要特殊处理以执行 `<script>` 等)，最后是 `takeNextSiblingN`(刻意秀下都没写对)、`timeoutPairdClick`、`posited`、

<script>document.getElementById("number").onchange=function(ev){ insert(ev.target.value); };</script>
<script>var pos=[0,0]; function selectPos() { var e=document.body, evn="mouseup"; e.style.filter="blur(1.5px)", eXY=takeNextSiblingN(2, event.target); var clk=function(ev){ pos[0]=ev.clientX; pos[1]=ev.clientY; e.style.filter=""; e.removeEventListener(evn,clk); pos_updated(); }; e.addEventListener(evn,clk); eXY[0].onclick=eXY[1].onclick=function(ev) { insert(ev.target.textContent); }; }; posMarkers=[]; function pos_updated() {for (var i=0;i<2;i++) eXY[i].textContent=pos[i];}</script>
<script>function insert(s) { editor.insert(s); var sl=editor.selection, r=sl.getRange(); r.start.column-=s.length; sl.setRange(r); }; var domP = new DOMParser; var RE_COPY_ELEM=/^(SCRIPT)|(LINK)$/; function appendTag(s) { document.body.appendChild(document.createElement("div")).innerHTML=s; }</script>
<script>function appendTag(s) { var doc=domP.parseFromString(s, "text/html"); for (let key of ["head", "body"]) for (let e of doc[key].childNodes) { if (RE_COPY_ELEM.test(e.tagName)) { let e1=document.createElement(e.tagName); copyAttributes(e, e1); e=e1; } document[key].appendChild(e); } }; function copyAttributes(e, e_dst) { for (let k of e.getAttributeNames()) e_dst.setAttribute(k, e.getAttribute(k)); }</script>
<script>function takeNextSiblingN/*FIXME*/(n, e) { var es=[]; do { e=e.nextElementSibling; es.push(e); } while (!!e&&--n!=0); return es; }; function timeoutPairdClick(e, e1, t_delay) { e.click(); setTimeout(function(){e1.click()}, t_delay); }; function posited(tag, xy) { var e=document.createElement(tag); e.style.position="absolute"; var ks=["left","top"]; for (var i=0; i<2; i++) e.style[ks[i]]=xy[i]+"px"; return e; }</script>
<script>takeNextSiblingN(10,document.querySelector('#edit-selected')).forEach(function(e){e.classList.add("noblur");})</script>

## Ballons

> [stevenjoezhang/balloon.js](https://github.com/stevenjoezhang/balloon.js)
 CSS3 彩色气球特效 | Multi-color balloons flying up from the bottom of your screen

- `duration` the animation duration in seconds
- `size` size of the balloons in px
- `count` count of the balloons
- `from` l for left, r for right
- `to` l for left, r for right

```html
<script src="ballon.js" duration="15" size="88" count="15" from="r" to="l"></script>
```

## 气球

> 重写版 Ballons，因为简单干脆就弄中文啦

原项目的 1~4.svg 和 .png 都是预览啦，其实就只 [ballons.js](https://github.com/stevenjoezhang/balloon.js/blob/master/balloon.js) 是实际逻辑，含数据。

- `各项系数` 指源、至点盒的随机大小增量比率，仅在 from/to 是 `x,y` 点时启用，默认 `0.1 1 0.1 -1`。
- `SVG文档` 是关于 `.st0` 颜色的矢量图

```html
<script src="ballon1.js" 秒数="15" 大小="88px" 透明度="50%" 数目="20" 源点="l" 至点="r"></script>
```

```html
<script src="ballon1.js" 秒数="25" 大小="77px" 透明度="100%" 数目="20" 源点="r" 至点="l"></script>
```

```html
<script src="ballon1.js" 秒数="9" 大小="91px" 透明度="20%" 数目="40" 源点="5,442" 至点="1903,447" 各项系数="-4 0.8 0.9 -1"></script>
```

执行下面的脚本可以看到彩虹呦！

```javascript
{let f=()=>{animateBallon(); setTimeout(f, 2000)};f()} 
```

## 另外的脚本们

请保证它们在最末尾！没用 `DOMContentLoaded`，关键在于 `queryParent`(写得好懒)

<noscript><i>悲伤下无法重生的灵魂啊，安宁于浮生天命的漩涡吧！</i></noscript>

<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.js" type="text/javascript" charset="utf-8"></script>
<script>editor=ace.edit("code"); editor.setOptions({theme:"ace/theme/tomorrow", mode:"ace/mode/html", highlightActiveLine:true, wrap: "free"}); ace.config.set("basePath", "https://unpkg.com/ace-builds@1.4.12/src-noconflict");</script>
<script>function queryParent(selector,e) { if(!e) return null; var key=arguments[2]||"parentElement"; for (var e0=e[key]; e0[key]!=null; e0=e0[key]) { var founds=e0[key].querySelectorAll(selector); if ([].slice.call(founds).includes(e0)) return e0; } }</script>
<script>var RE_LANG_CSS=/language-(.*)\s/; var codeLang; [].slice.call(document.getElementsByTagName("code")).forEach(function(e) { var eH=queryParent("div.highlight", e); var lang = (!!eH)? RE_LANG_CSS.exec(eH.parentElement.classList.value)[1] : "text"; e.onclick=function(){editor.session.setValue(e.textContent);editor.session.setMode("ace/mode/"+lang);codeLang=lang;}; e.classList.add("noblur"); }); document.querySelector("#code textarea").addEventListener("blur", function(ev){if((ev.relatedTarget||queryParent("code,b,a,span",ev.rangeParent||ev.explicitOriginalTarget)||ev.target).classList.contains("noblur"));else ((codeLang=="html")? appendTag:eval)(editor.getValue());});</script>
