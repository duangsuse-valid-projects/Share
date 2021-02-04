# Animations

一些从别处抄来的动画示例，点击代码以载入编辑框。为了方便提供了 HTML/JS 编辑器，每点框外执行一次。

<pre id="code" class="ace_editor" style="min-height:60px"><textarea class="ace_text-input"></textarea></pre>

修改选定内容：<input id="number" class="noblur" onclick="event.target.value=editor.getSelectedText()" type="number"/>，<button class="noblur" onclick="selectPos()">选择座标</button>：<span class="noblur"></span>,<span class="noblur"></span> <a class="noblur" onclick="insert([...document.querySelectorAll('span.noblur')].map(e=>e.textContent).join())">[+]</a>

<script>document.getElementById("number").onchange=function(ev){ insert(ev.target.value); };</script>
<script>function selectPos() { var e=document.body, evn="mouseup"; e.style.filter="blur(1.5px)", eX=event.target.nextElementSibling, eY=eX.nextElementSibling; var clk=function(ev){ eX.textContent=ev.clientX; eY.textContent=ev.clientY; e.style.filter=""; e.removeEventListener(evn,clk); }; e.addEventListener(evn,clk); eX.onclick=eY.onclick=function(ev) { insert(ev.target.textContent); }; }</script>
<script>function insert(s) { editor.insert(s); var sl=editor.selection, r=sl.getRange(); r.start.column-=s.length; sl.setRange(r); }; var domP = new DOMParser; var RE_COPY_ELEM=/^(SCRIPT)|(LINK)$/; function appendTag(s) { document.body.appendChild(document.createElement("div")).innerHTML=s; }</script>
<script>function appendTag(s) { var doc=domP.parseFromString(s, "text/html"); for (let key of ["head", "body"]) for (let e of doc[key].childNodes) { if (RE_COPY_ELEM.test(e.tagName)) { let e1=document.createElement(e.tagName); copyAttributes(e, e1); e=e1; } document[key].appendChild(e); } }; function copyAttributes(e, e_dst) { for (let k of e.getAttributeNames()) e_dst.setAttribute(k, e.getAttribute(k)); }</script>

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

```html
<script src="ballon1.js" 秒数="15" 大小="88px" 透明度="50%" 数目="20" 源点="l" 至点="r"></script>
```

## 脚本们

请保证它们在最末尾！没用 `DOMContentLoaded`

<noscript><i>悲伤下无法重生的灵魂啊，安宁于浮生天命的漩涡吧！</i></noscript>

<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.6/ace.js" type="text/javascript" charset="utf-8"></script>
<script>editor=ace.edit("code"); editor.setOptions({theme:"ace/theme/twilight", mode:"ace/mode/javascript", highlightActiveLine:true, wrap: "free"});</script>
<script>[].slice.call(document.getElementsByTagName("code")).forEach(function(e) { e.onclick=function(){editor.session.setValue(e.textContent);}; }); document.querySelector("#code textarea").addEventListener("blur", function(ev){if(!ev.relatedTarget||!ev.relatedTarget.classList.contains("noblur"))appendTag(editor.getValue());});</script>
