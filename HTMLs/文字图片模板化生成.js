// Part I: Basics
function withDefaults() { return (e) => {}; }
function withText(text) { return (e) => { e.innerText = text; }; }
function withAttr(name, value) { return (e) => { e[name] = value; }; }
function withCssAttr(name, value) { return (e) => { e.style[name] = value; }; }

function configured(...configs) {
  return e => { for (let config of configs) config(e); };
}
function element(tagName, config, ...childs) {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e;
}
function elem(id) { return document.getElementById(id); }

function* findAll(re, text) {
  while (re.lastIndex < text.length) {
    let match = re.exec(text);
    if (match == null) break; else yield match.slice(1, match.length);
  }
  re.lastIndex = 0;
}

function* map(f, xz) {
  for (let x of xz) yield f(x);
}
function drop(n, s) {
  return s.substring(1, s.length);
}

function cyclicGet(xs, i) {
  if (xs.length == 0) throw Error(`attempt to cyclic get ${i} from empty list`);
  return xs[i % xs.length];
}
function* withIndex(xs) {
  let index = 0;
  for (let x of xs) { yield [index, x]; index++; }
}

const PAT_URL_PARAM = /[?|&]([^=]+)=([^&;#]+)/g;
function parseURLParameters(text = null) {
  let match = findAll(PAT_URL_PARAM, text || location.search);
  return new Map(map(m => [m[0], decodeURIComponent(m[1].replace(/\+/g, "%20"))], match));
}

function encodeURLParameters(params) {
  if (params.length == 0) return "";
  function code(kv) { return `${kv[0]}=${encodeURIComponent(kv[1])}`; }
  let sb = `?${code(params[0])}`;
  for (var i=1; i<params.length; i++) { sb += `&${code(params[i])}`; }
  return sb;
}

function elems(...ids) {
  let elements = [];
  let idMap = new Map();
  for (let id of ids) {
    let e = elem(id);
    elements.push(e);
    idMap.set(id, e);
  }
  return [idMap, elements];
}

function listenKey(name, e, on_up) {
  e.onkeyup = function(event) {
    if (event.key == name) on_up(event.target);
  };
  return () => { on_up(e) };
}

function readDataUrlThen(on_done) { return (event) => {
  let file = event.target.files[0]; if(!file) return;
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => on_done(reader.result);
}; }

function clearChilds(e) { while (e.firstChild) e.removeChild(e.firstChild); }

// Part II: Parse
function parseTable(text, sep = "==", sep1 = "--") {
  return [...map(r => [...map(c => c.trim(), r.split(sep1))], source_table.value.split(sep))];
}

const PAT_POINT = /\((\d+),\s*(\d+)\)/y;
function* readPointTable(text) {
  for (let pt of findAll(PAT_POINT, text)) yield [...map(Number.parseInt, pt)];
}

const PAT_FONT = /\(([^:]+):(\d+),([^,]+)(,[^=]+=[^\)]+)*\)/y;
function* readFontTable(text) {
  for (let fnt of findAll(PAT_FONT, text)) {
    fnt[1] = Number.parseInt(fnt[1]);
    fnt[3] = (fnt[3] == undefined)? [] : drop(1, fnt[3]).split(",").map(kv => kv.split("="));
    yield fnt;
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
function initialBindView() {
  const [ed1, elements1] = elems("img-file", "img-url", "points", "fonts");
  const [ed2, elements2] = elems("font-name", "font-file", "font-url", "source-table");
  let idMap = new Map([...ed1, ...ed2]);
  return [idMap, elements1, elements2];
}

const [idMap, elements1, elements2] = initialBindView();
const [img_file, img_url, points, fonts] = elements1;
const [font_name, font_file, font_url, source_table] = elements2;

const images = elem("images");
const cfg_link = elem("cfg-link");

let urlParams = parseURLParameters();
const hardParams = new Set(["img-file", "font-file"]);

for (let [name, value] of urlParams) {
  if (hardParams.has(name)) { console.warn(`unsettable param ${name}`); continue; }
  if (idMap.has(name)) { idMap.get(name).value = value; }
  else { console.warn(`unknown param ${name}`); }
}

let imageUrl = null;
img_file.onchange = readDataUrlThen(it => { imageUrl = it; mainUpdate(); });
let urlFiredImg = listenKey("Enter", img_url, target => {
  imageUrl = target.value;
  mainUpdate();
}); //没法反向要求更新，参数化event.target的缺陷，算了

function appendFont(url) {
  let font = new FontFace(font_name.value, `url(${url}) format('woff2')`);
  font.load().then(face => document.fonts.add(face));
}

font_file.onchange = readDataUrlThen(it => appendFont(it));
let urlFiredFont = listenKey("Enter", font_url, target => appendFont(target.value));

function updateLink(target = cfg_link) {
  let params = [];
  for (let [id, view] of idMap.entries()) {
    if (!hardParams.has(id) && view.value != "") params.push([id, view.value]);
  }
  console.log(params);
  target.href = location.pathname+encodeURLParameters(params); //< convenient...
}

function render(xy, font, text) {
  return element("text",
    configured(withPoint(xy[0], xy[1]), withFont(...font), withText(text) )
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
    let img = images.appendChild(element("div", withCssAttr("position", "relative"),
      element("img", withAttr("src", imageUrl))
    ));
    for (let [i, col] of withIndex(row)) {
      let xy = cyclicGet(vpoints, i);
      let font = cyclicGet(vfonts, i);
      img.appendChild(render(xy, font, col));
    }
  }
  updateLink();
}

if (urlParams.size != 0) {
  if (font_url.value != "") urlFiredFont();
  if (img_url.value != "") urlFiredImg();
}
source_table.onblur = mainUpdate;
for (let view of [points, fonts]) listenKey("Enter", view, mainUpdate);
