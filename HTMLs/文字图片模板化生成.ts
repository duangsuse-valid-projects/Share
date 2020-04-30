// Part I: Basics
function withDefaults(): Conf { return (e) => {}; }
function withText(text:string): Conf { return (e) => { e.innerText = text; }; }
function withAttr(name:string, value:any): Conf { return (e) => { e[name] = value; }; }
function withCssAttr(name:string, value:any): Conf { return (e) => { e.style[name] = value; }; }
function withCssClass(...classes:string[]): Conf { return (e) => { for (let c of classes) e.classList.add(c); }; }

type Conf = (e:HTMLElement) => any
function configured(...configs:Conf[]): Conf {
  return e => { for (let config of configs) config(e); };
}
function element<TAG extends keyof(ElementTagNameMap)>(tagName:TAG, config:Conf, ...childs:HTMLElement[]): ElementTagNameMap[TAG] {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e as ElementTagNameMap[TAG];
}
function elem(id:string) { return document.getElementById(id); }

function* findAll(re:RegExp, text:string): Iterable<string[]> {
  while (re.lastIndex < text.length) {
    let match = re.exec(text);
    if (match == null) break; else yield match.slice(1, match.length);
  }
  re.lastIndex = 0;
}

function* map<T, R>(f:(x:T)=>R, xz:Iterable<T>): Iterable<R> {
  for (let x of xz) yield f(x);
}
function drop(n:number, s:string) {
  return s.substring(1, s.length);
}

function cyclicGet<T>(xs:T[], i:number): T {
  if (xs.length == 0) throw Error(`attempt to cyclic get ${i} from empty list`);
  return xs[i % xs.length];
}
function* enumerate<T>(xs:Iterable<T>): Iterable<[number, T]> {
  let index = 0;
  for (let x of xs) { yield [index, x]; index++; }
}

const PAT_URL_PARAM = /[?|&]([^=]+)=([^&;#]+)/g;
function parseURLParameters(text = null): Map<string, string> {
  let match = findAll(PAT_URL_PARAM, text || location.search);
  return new Map(map(m => [m[0], decodeURIComponent(m[1].replace(/\+/g, "%20"))], match));
}

function encodeURLParameters(params:Array<[string,any]>) {
  if (params.length == 0) return "";
  function code(kv:[string,any]) { return `${kv[0]}=${encodeURIComponent(kv[1])}`; }
  let sb = `?${code(params[0])}`;
  for (var i=1; i<params.length; i++) { sb += `&${code(params[i])}`; }
  return sb;
}

function elems(...ids: string[]): [Map<string, HTMLElement>, HTMLElement[]] {
  let elements: HTMLElement[] = [];
  let idMap = new Map();
  for (let id of ids) {
    let e = elem(id);
    elements.push(e);
    idMap.set(id, e);
  }
  return [idMap, elements];
}

type Consumer<T> = (value:T) => any;
type Action = () => any;

function listenKey<H extends HTMLElement>(name:string, e:H, on_up:Consumer<H>): Action {
  e.onkeyup = function(event) {
    if (event.key == name) on_up(event.target as H);
  };
  return () => { on_up(e) };
}

function readDataUrlThen(on_done:Consumer<string|ArrayBuffer>) { return (event:InputEvent) => {
  let file = (event.target as HTMLInputElement).files[0]; if(!file) return;
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => on_done(reader.result);
}; }

function xhrReadText(method:string, url:string, on_done:(status:number,text:string,xhr:XMLHttpRequest)=>any) {
  let xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState != XMLHttpRequest.DONE) return;
    on_done(xhr.status, xhr.responseText, xhr);
  };
  xhr.send();
}

function clearChilds(e:HTMLElement) { while (e.firstChild) e.removeChild(e.firstChild); }

// Part II: Parse
function parseTable(text:string, sep = "==", sep1 = "--") {
  return [...map(r => [...map(c => c.trim(), r.split(sep1))], source_table.value.split(sep))];
}

const PAT_POINT = /\((\d+),\s*(\d+)\)/y;
function* readPointTable(text:string) {
  for (let pt of findAll(PAT_POINT, text)) yield [...map(Number.parseInt, pt)];
}

type StrPair = [string,string];
type FontEntry = [string, number, string, Array<StrPair>];

const PAT_FONT = /\(([^:]+):(\d+),([^,]+)(,[^=]+=[^\)]+)*\)/y;
function* readFontTable(text:string): Iterable<FontEntry> {
  for (let fnt of findAll(PAT_FONT, text)) {
    let font: any[] = [...fnt];
    font[1] = Number.parseInt(fnt[1]);
    font[3] = (fnt[3] == undefined)? [] : drop(1, fnt[3]).split(",").map(kv => kv.split("="));
    yield font as FontEntry;
  }
}

function withPoint(x, y) {
  return configured(withCssAttr("position", "absolute"),
    withCssAttr("left", `${x}px`), withCssAttr("top", `${y}px`));
}
function withFont(family, size, weight, cfgs) {
  return configured(
    withCssAttr("font-family", family),
    withCssAttr("font-size", `${size}px`),
    withCssAttr("font-weight", weight),
    ...map(kv => withCssAttr(kv[0], kv[1]), cfgs)
  );
}

// Part III: Application
function initialBindView(): [Map<string, HTMLElement>, HTMLElement[], HTMLElement[]] {
  const [ed1, elements1] = elems("img-file", "img-url", "points", "fonts");
  const [ed2, elements2] = elems("font-name", "font-file", "font-url", "source-table");
  let idMap = new Map([...ed1, ...ed2]);
  return [idMap, elements1, elements2];
}

const [idMap, elements1, elements2] = initialBindView();
const [img_file, img_url, points, fonts] = elements1 as HTMLInputElement[];
const [font_name, font_file, font_url, source_table] = elements2 as HTMLInputElement[];

const images = elem("images");
const cfg_link = elem("cfg-link");

let params = parseURLParameters();
const hardParams = new Set(["img-file", "font-file"]);
const softParams = new Set(["source-table-url"]);

for (let [name, value] of params) {
  if (hardParams.has(name)) { console.warn(`unsettable param ${name}`); continue; }
  if (idMap.has(name)) { (idMap.get(name) as HTMLInputElement).value = value; }
  else { if (!softParams.has(name)) console.warn(`unknown param ${name}`); }
} //^ set url-param values

let imageUrl = null;
img_file.onchange = readDataUrlThen(it => { imageUrl = it; mainUpdate(); });
let urlFiredImg = listenKey("Enter", img_url, target => {
  imageUrl = target.value;
  mainUpdate();
}); //没法反向要求更新，参数化event.target的缺陷，算了

const PAT_CSS_URL = /(\.css$)|(\/css2?\/|\??)/g;
function appendFont(url:string) {
  if (!url.startsWith("data:") && PAT_CSS_URL.test(url)) {
    document.head.appendChild(element("link",
      configured(withAttr("rel", "stylesheet"), withAttr("href", url))
    ));
  } else {
    let font = new window['FontFace'](font_name.value, `url(${url}) format('woff2')`);
    font.load().then(face => document['fonts'].add(face));
  }
}
font_file.onchange = readDataUrlThen(appendFont);
let urlFiredFont = listenKey("Enter", font_url, target => appendFont(target.value));

function updateLink(target = cfg_link) {
  let params = [];
  for (let [id, view] of idMap.entries()) {
    if (hardParams.has(id)) continue;
    let value = (view as HTMLInputElement).value;
    if (value != "") params.push([id, value]);
  }
  console.log(params);
  (target as HTMLAnchorElement).href = location.pathname+encodeURLParameters(params); //< convenient...
}

function renderText(xy, font, text) {
  return element("text",  configured(
    withPoint(xy[0], xy[1]),
    withFont(font[0], font[1], font[2], font[3]), withText(text))
  );
}

function mainUpdate() {
  if (imageUrl == null) return;
  let vpoints = [...readPointTable(points.value)];
  let vfonts = [...readFontTable(fonts.value)];
  let table = parseTable(source_table.value);
  console.log(vpoints, vfonts, table);
  if (vpoints.length == 0 || vfonts.length == 0) return;

  clearChilds(images);
  for (let row of table) {
    let img = images.appendChild(element("div", withCssClass("drawn-image"),
      element("img", withAttr("src", imageUrl))
    ));
    for (let [i, col] of enumerate(row)) {
      let xy = cyclicGet(vpoints, i);
      let font = cyclicGet(vfonts, i);
      img.appendChild(renderText(xy, font, col));
    }
  }
  updateLink();
}

if (params.size != 0) {
  if (font_url.value != "") urlFiredFont();
  if (img_url.value != "") urlFiredImg();
}
source_table.onblur = mainUpdate;
for (let view of [points, fonts]) listenKey("Enter", view, mainUpdate);

for (let param of softParams) {
  if (!params.has(param)) continue;
  let pvalue = params.get(param);

  if (param == "source-table-url") {
    xhrReadText("GET", pvalue, (status, text, xhr) => {
      if (status != 200) { source_table.value = `从 ${pvalue} 处加载失败, code ${status}... ${xhr.response}`; }
      else { source_table.value = text; mainUpdate(); }
    });
  }
}
