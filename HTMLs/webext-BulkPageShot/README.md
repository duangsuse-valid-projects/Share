# 批量页面截图 Chrome 插件

此扩展最初是为应付计算机应用课上各种设计系老师，要求找带某设计点的页面—截图的作业，会提供一些便利操作。

说是 chrome 插件，其实 ff 也对相关 API 有兼容所以都能用啦。本插件参考了 AMO (火狐中国)的 easyscreenshot 插件。

> 请不要对机械性任务机械化手工操作完成，各种浏览器上都有 [GreasyFork](userscript.zone) 、插件系统等脚本平台，能解决很多问题。PPT 本身的插入图集+模板/宏录制功能可以大批量设计带评语和链接的演示稿；计算机本身已足够死板，不要再去学它死板！

当然，或许谷歌、火狐浏览器插件市场已经有相应插件了，所以这个会简单详细些（只会心疼小白）。

## 设计细节

一般插件会实现2页面1脚本： popup 徽标浮窗, options 配置; background 背景脚本

其主要逻辑在 background.js 里，那里可以访问到 `chrome` API 对象，它提供 `chrome.runtime. postMessage/onMessage` 接口按 C/S 模式与被注入脚本等通信。

我们计划配合 `chrome.tabs.captureVisibleTab({format,quality})` 的接口，令用户靠 `tabs.onActiveChanged` 靠切换来手动选择要截图的标签页（可以通过 <kbd>Ctrl+PageUp</kbd> 迅速选完），在 popup 里切换启用和上2参数，以及最关键的切图矩形选择——通过一个资源页面可以创建矩形框，并批量裁切图片文件。

此外还应有 `<textarea>` 按行切分批量打开标签页，以及 `$title_$location.png` 的文件名配置，就全在 popup 浮窗里吧。

### 必要逻辑

其实无配置、不能切图的快速原型实现非常简单：

```js
const
  asy=(f)=>function callwithCallback(...args){
    return new Promise((res)=>f.apply(this, args.concat(res)))
  },
  dataURL2Blob=(u)=>{
    let iSep=u.indexOf(","), b64 = u.slice(iSep+1);
    let a = Uint8Array.from(atob/*decode*/(b64), i=>i.charCodeAt(0));
    return new Blob([a], {type: u.slice("data:".length, iSep-";base64".length)})
  },
  withFinalize=(ctor,fin)=>(o,op)=>{
    let x=ctor(o), res=op(x); fin(x); return res;
  }, withObjectURL=withFinalize(URL.createObjectURL,URL.revokeObjectURL);
```

不过是 `onActiveTabChanged ()=>chrome.dl(filename: "shot.png", url: ObjectURL(dataURL2Blob(cap(curWin, format:"png"))) )`

```js
chrome.tabs.onActiveChanged.addListener(async()=> {
  let b=await asy(chrome.tabs.captureVisibleTab)(/*windowID=*/1,{format:"png"}).then(dataURL2Blob);
  withObjectURL(b, u=>chrome.downloads.download({url:u, filename: "shot.png"}));
});
```

你可以在【调试扩展程序—检查】的终端里执行这些代码，它就能实现切换后自动下载截图

通过 Promise 可以表示成 `cap(curWin,{}).then(toBlob).then(toObjectURL).then(dl)` 的链条。

### 共享子程序

不难发现 `cap()` 的结果是需 `objURL(blob(it))` 才能下载的 DataURL ，所以 `dlDataURL(url,name)` 组织成一块。子程序切分对易化思考很重要！

支持 `$title.png` 展开成 `某页标题.png` 显然是在当前标签的 `document` 上才能取信息的，函数签名是 `expandName(s,doc)`——有点出入，我们不便在 background.js 拿到标签页的 DOM 对象，最好的方法是注入 pagescript 直接在页面上取其结果，故 doc 不该作参数，实际是全局变量即 `document` DOM API。

对 xywh Rect 的建模、`clip(url)` 操作、其向 `localStorage` 的序列化同时在下载前处理、批处理工具里出现，它是复用的。

Rect 选取器控件 `RectPicker(e)` 亦写在同文件。

可能的拓展是支持保存 Rect 列表而不是只保持当前选框，这个可以当作业自己做。

### 参数、用户接口化核心逻辑

必要功能显然是下载截图，然后才是批量裁切这种功能。

而 popup 里的开关可以用 `removeListener` 、通过命名函数引用来实现，不过那较麻烦，所以用 持久化 checkbox `.value` 与 background init+onSettingChanged 预判 /onChanged 再判 `if(!enabled) return;` 实现

听起来很麻烦，其实只要在 background 与 options script 之间通过 `postMessage` 建立 `get("localStorage"), assign("", {enabled: true}), onChange("enabled")` 3接口即可实现 `bind(eCheckbox, "enabled")` 定义性函数，此接口可在 format,quality 的 UI-数据 绑定上复用，甚至能对兼容化的 `RectPicker` 复用。

逻辑是 `init:if(yes){addListener();added=1} setChange:if(!added&&v=1)add();`，这就是惰性的监听器注册。

### 实现框选控件

咱最开始考虑的是纯 `<canvas>` 实现，但那样要么然无选区的实时绘制——只在 `mouse down/up` 时描边矩形，要么然开销太大——每帧都要重新 `drawImage`；其实这是各图形库上最通用的思路，但咱只想在 DOM/CSS 平台：

1. 通过 `position:absolute; z-index: -1` 添加 `<canvas>` 所以每次 `mousemove` 只需 `clearRect;strokeRect`
2. 同样是加绝对位置元素，但靠 `<svg><rect x y width height style="fill:none;stroke-width:1;stroke:red"/>` 矩形的嵌入可以实现更自由的交互拓展
3. 通过 CSS 盒模型的 border 可以直接把 `x,y,w,h` 映照成 `DOMRect`，在光标事件时修改 `e.style` 属性集来实现矩形描边

咱最终选择最 vanilla(pure) 的盒描边，并且令编辑器支持拖选重选、`<input type=number>` 手改 xywh 值的功能点。


