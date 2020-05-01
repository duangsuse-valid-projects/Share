//tsc 文字图片模板化生成.ts --downLevelIteration -t ES2015
// Part I: Basics
function withDefaults() { return (e) => { }; }
function withText(text) { return (e) => { e.innerText = text; }; }
function withAttr(name, value) { return (e) => { e[name] = value; }; }
function withCssAttr(name, value) { return (e) => { e.style[name] = value; }; }
function withCssClass(...classes) { return (e) => { for (let c of classes)
    e.classList.add(c); }; }
function withListener(event, callback) {
    return (e) => { e.addEventListener(event, callback); };
}
function configured(...configs) {
    return e => { for (let config of configs)
        config(e); };
}
function element(tagName, config, ...childs) {
    let e = document.createElement(tagName);
    config(e);
    for (let child of childs)
        e.appendChild(child);
    return e;
}
function elem(id) { return document.getElementById(id); }
function* findAll(re, text) {
    while (re.lastIndex < text.length) {
        let match = re.exec(text);
        if (match == null)
            break;
        else
            yield match.slice(1, match.length);
    }
    re.lastIndex = 0;
}
function* map(f, xz) {
    for (let x of xz)
        yield f(x);
}
function drop(n, s) {
    return s.substring(1, s.length);
}
function findRemove(predicate, xs) {
    let index = xs.findIndex(predicate);
    if (index != (-1))
        xs.splice(index, 1);
}
function cyclicGet(xs, i) {
    if (xs.length == 0)
        throw Error(`attempt to cyclic get ${i} from empty list`);
    return xs[i % xs.length];
}
function cyclicGetN(n, xs, index) {
    let items = [];
    for (let base = index * n, i = base; i < base + n; i++) {
        items.push(cyclicGet(xs, i));
    }
    return items;
}
function* enumerate(xs) {
    let index = 0;
    for (let x of xs) {
        yield [index, x];
        index++;
    }
}
const PAT_URL_PARAM = /[?|&]([^=]+)=([^&;#]+)/g;
function parseURLParameters(text = null) {
    let match = findAll(PAT_URL_PARAM, text || location.search);
    return new Map(map(m => [m[0], decodeURIComponent(m[1].replace(/\+/g, "%20"))], match));
}
function encodeURLParameters(params) {
    if (params.length == 0)
        return "";
    function code(kv) { return `${kv[0]}=${encodeURIComponent(kv[1])}`; }
    let sb = `?${code(params[0])}`;
    for (var i = 1; i < params.length; i++) {
        sb += `&${code(params[i])}`;
    }
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
    e.onkeyup = function (event) {
        if (event.key == name)
            on_up(event.target);
    };
    return () => { on_up(e); };
}
function readDataUrlThen(on_done) {
    return (event) => {
        let file = event.target.files[0];
        if (!file)
            return;
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => on_done(reader.result);
    };
}
function xhrReadText(method, url, on_done) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState != XMLHttpRequest.DONE)
            return;
        on_done(xhr.status, xhr.responseText, xhr);
    };
    xhr.send();
}
function rewriteChild(index, e, transform) {
    let oldChild = e.children[index];
    e.replaceChild(transform(oldChild), oldChild);
}
function clearChilds(e) { while (e.firstChild)
    e.removeChild(e.firstChild); }
// Part II: Parse
function parseTable(text, sep = "==", sep1 = "--") {
    return [...map(r => [...map(c => c.trim(), r.split(sep1))], text.split(sep))];
}
const PAT_POINT = /\((\d+),\s*(\d+)\)/y;
function* readPointTable(text) {
    for (let pt of findAll(PAT_POINT, text))
        yield [...map(Number.parseInt, pt)];
}
const PAT_FONT = /\(([^:]+):(\d+),([^,]+)(,[^=]+=[^\)]+)*\)/y;
function* readFontTable(text) {
    for (let fnt of findAll(PAT_FONT, text)) {
        let font = [...fnt];
        font[1] = Number.parseInt(fnt[1]);
        font[3] = (fnt[3] == undefined) ? [] : drop(1, fnt[3]).split(",").map(kv => kv.split("="));
        yield font;
    }
}
const PAT_CSS_URL = /\.css$|\/css2?[\/\?]/;
function appendFont(url) {
    if (!url.startsWith("data:") && PAT_CSS_URL.test(url)) {
        document.head.appendChild(element("link", configured(withAttr("rel", "stylesheet"), withAttr("href", url))));
    }
    else {
        let font = new window['FontFace'](font_name.value, `url(${url}) format('woff2')`);
        font.load().then(face => document['fonts'].add(face));
    }
}
function withPoint(x, y) {
    return configured(withCssAttr("position", "absolute"), withCssAttr("left", `${x}px`), withCssAttr("top", `${y}px`));
}
function withFont(family, size, weight, cfgs) {
    return configured(withCssAttr("font-family", family), withCssAttr("font-size", `${size}px`), withCssAttr("font-weight", weight), ...map(kv => withCssAttr(kv[0], kv[1]), cfgs));
}
// Part III: Application
function initialBindView() {
    const [ed1, elements1] = elems("img-file", "img-url", "points", "fonts");
    const [ed2, elements2] = elems("font-name", "font-file", "font-url", "source-table", "imageset-name");
    let idMap = new Map([...ed1, ...ed2]);
    return [idMap, elements1, elements2];
}
const [idMap, elements1, elements2] = initialBindView();
const [img_file, img_url, points, fonts] = elements1;
const [font_name, font_file, font_url, source_table, imageset_name] = elements2;
const images = elem("images");
const image_downloads = elem("image-downloads");
const cfg_link = elem("cfg-link");
let imageUrl = null;
let downloadedText;
let params = parseURLParameters();
const hardParams = new Set(["img-file", "font-file"]);
const softParams = new Set(["source-table-url", "eval"]);
//^ global variable defs
function fillInputValues(value_map) {
    for (let [name, value] of params) {
        if (hardParams.has(name)) {
            console.warn(`unsettable param ${name}`);
            continue;
        }
        if (value_map.has(name)) {
            value_map.get(name).value = value;
        }
        else {
            if (!softParams.has(name))
                console.warn(`unknown param ${name}`);
        }
    } //^ set url-param values
}
fillInputValues(idMap);
function applySoftParams() {
    for (let param of softParams) {
        if (!params.has(param))
            continue;
        let pvalue = params.get(param);
        if (param == "source-table-url") {
            xhrReadText("GET", pvalue, (status, text, xhr) => {
                if (status != 200) {
                    source_table.value = `从 ${pvalue} 处加载失败, code ${status}... ${xhr.response}`;
                }
                else {
                    downloadedText = text;
                    source_table.value = text;
                    mainUpdate();
                }
            });
        }
        else if (param == "eval") {
            let message = `你要执行此配置附带的脚本吗？这样的危险等同访问一个你不信任的链接。\n下面的代码应该简单，并且只有很少的链接：\n${pvalue}`;
            if (window.confirm(message)) {
                eval(pvalue);
                mainUpdate();
            }
        }
    }
}
applySoftParams();
//v main update generation logics
function updateLink(target = cfg_link) {
    let newParams = [];
    for (let [id, view] of idMap.entries()) {
        if (hardParams.has(id))
            continue;
        let value = view.value;
        if (value != "")
            newParams.push([id, value]);
    }
    // softParams are not automatically-exportable
    for (let [param, pvalue] of params) {
        let inherit = () => newParams.push([param, pvalue]);
        if (param == "eval")
            inherit();
        else if (param == "source-table-url" && source_table.value == downloadedText) {
            inherit();
            findRemove(kv => kv[0] == "source-table", newParams);
        }
    }
    console.log(newParams);
    target.href = location.pathname + encodeURLParameters(newParams); //< convenient...
}
function updateImageDownload(index, e) {
    function imgExport(ev) {
        images.classList.add("rendering-png");
        let domtoimage = window["domtoimage"];
        if (!domtoimage)
            return;
        let saveAs = window["saveAs"];
        if (!saveAs)
            return;
        let idx = Number.parseInt(ev.target.innerText);
        let view = images.children[idx];
        let download = () => { domtoimage.toBlob(view).then(b => saveAs(b, `${imageset_name.value}_${idx}.png`)).catch(alert); };
        domtoimage.toPng(view).then(png => rewriteChild(idx, image_downloads, () => element("img", configured(withAttr("src", png), withListener("click", download))))).catch(alert);
    }
    let item = element("li", withDefaults(), element("a", configured(withText(index.toString()), withListener("click", imgExport))));
    image_downloads.appendChild(item);
}
let renderTextElement = (point, font, text) => {
    let [x, y] = point;
    return element("text", configured(withPoint(x, y), withFont(...font), withText(text)));
};
function renderText(vpoints, vfonts, index, text) {
    let point = cyclicGet(vpoints, index);
    let font = cyclicGet(vfonts, index);
    return renderTextElement(point, font, text);
}
function mainUpdate() {
    if (imageUrl == null)
        return;
    let vpoints = [...readPointTable(points.value)];
    let vfonts = [...readFontTable(fonts.value)];
    let table = parseTable(source_table.value);
    console.log(vpoints, vfonts, table);
    if (vpoints.length == 0 || vfonts.length == 0)
        return;
    clearChilds(image_downloads);
    clearChilds(images);
    for (let [i, row] of enumerate(table)) {
        let img = images.appendChild(element("div", withCssClass("drawn-image"), element("img", withAttr("src", imageUrl))));
        for (let [j, col] of enumerate(row)) {
            img.appendChild(renderText(vpoints, vfonts, j, col));
        }
        updateImageDownload(i, img);
    }
    updateLink();
}
function registerImageFontInputs() {
    img_file.onchange = readDataUrlThen(it => { imageUrl = it; mainUpdate(); });
    let urlFiredImg = listenKey("Enter", img_url, target => {
        imageUrl = target.value;
        mainUpdate();
    }); //没法反向要求更新，参数化event.target的缺陷，算了
    font_file.onchange = readDataUrlThen(appendFont);
    let urlFiredFont = listenKey("Enter", font_url, target => appendFont(target.value));
    if (params.size != 0) { //< fire events after url filled
        if (font_url.value != "")
            urlFiredFont();
        if (img_url.value != "")
            urlFiredImg();
    }
}
registerImageFontInputs();
source_table.onblur = mainUpdate;
for (let view of [points, fonts])
    listenKey("Enter", view, mainUpdate);
