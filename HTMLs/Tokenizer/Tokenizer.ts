function helem<T extends HTMLElement>(id:string) { return document.getElementById(id) as T; }
function findElemIn(xs: HTMLCollection, p: (e:Element) => boolean) {
  for (let e of xs) if (p(e)) return e;
  return null;
}
// duangsuse: 很抱歉写得如此低抽象、不可复用
// 毕竟 TypeScript 不是特别走简洁风（无论面向对象还是方法扩展），而且要考虑 ES5/ES6 的问题，也比较纠结。
// 而且我也不清楚该用 object 还是 Map 的说，所以就比较混淆了，实在该打（误
// 对不起，真的对不起。 其实就是字典迭代的问题，毕竟 JS 的数据结构比较不统一嘛。

function clearChild(e:HTMLElement) {
  while (e.firstChild != null) e.removeChild(e.firstChild);
}
type Conf = (e:HTMLElement) => any
function withDefaults(): Conf { return (e) => {}; }
function withText(text:string): Conf { return (e) => { e.textContent = text; }; }
function element<TAG extends keyof(HTMLElementTagNameMap)>(tagName:TAG, config:Conf, ...childs:(Element|Text)[]): HTMLElementTagNameMap[TAG] {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e as HTMLElementTagNameMap[TAG];
}

function xhrReadText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState != XMLHttpRequest.DONE) return;
      if (xhr.status != 200) reject([url, xhr.statusText]);
      resolve(xhr.responseText);
    };
    xhr.send();
  });
}
const alertFailedReq = ([url, msg]) => alert(`Failed get ${url}: ${msg}`);

type TokenIter = Iterable<[string, string?]>
type CustomRender = (name:string, desc:string) => HTMLElement
type SMap = Map<string, string>
function matchAll(re: RegExp, s: string): RegExpExecArray[] {
  return s.match(re)?.map(part => { re.lastIndex = 0; return re.exec(part) }) ?? [];
}
function reduceToFirst<T>(xs: T[], op: (fst:T, item:T) => any): T {
  let fst = xs[0];
  for (let i=1; i < xs.length; i++) op(fst, xs[i]);
  return fst;
}

let dict: Map<String, ()=>STrie> = new Map;
let trie: STrie;
let noTrie: STrie = new Trie; noTrie.set(["X"], "待加载");
let delimiters: PairString = ["\n", "="];
const SEP = " ";
const newlines = {}; for (let nl of ["\n", "\r", "\r\n"]) newlines[nl] = null;

let customHTML: CustomRender;
let inwordGrep = {};

function splitTrieData(s: string) {
  return s.split(delimiters[0]).map((row) => {
    let iDelim = row.indexOf(delimiters[1]);
    return (iDelim == -1)? [row, undefined] : [row.substr(0, iDelim), row.substr(iDelim+1, row.length)]; // split-first feat.
  });
}
function tokenize(input: string): TokenIter {
  return tokenizeTrie(trie, input, c => inwordGrep[c]);
}
function registerOneshotClicks(es: HTMLCollection, actions: (() => any)[]) { // "feat=" oneshot feat.
  let i = 0;
  for (let e of es) {
    let no = i; // closure upvalue!
    e.addEventListener("click", () => { let op = actions[no]; if (op != null) { op(); actions[no] = null; } e.setAttribute("hidden", ""); });
    i++; // zip iter
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  const
    ta_text = helem<HTMLTextAreaElement>("text"), // 要分词的
    ta_word = helem<HTMLTextAreaElement>("text-word"), // 要查词的
    abb_word = helem("abb-word"),
    list_possibleWord = helem<HTMLUListElement>("list-possibleWord"),
    div_out = helem("output"),
    sel_mode = helem<HTMLSelectElement>("select-mode"), // 选词典
    sel_display = helem<HTMLSelectElement>("select-display"), // 选渲染
    btn_gen = helem("do-generate"),
    num_fontSize = helem<HTMLInputElement>("slider-fontsize"),
    btn_showDict = helem("do-showDict"),
    btn_showTrie = helem("do-showTrie"), // 看底层字典
    btn_readDict = helem("do-readDict"),
    btn_revDict = helem("do-reverse");

  let dlStatus: HTMLOptionElement;
  const setTrie = () => { let name = sel_mode.value; trie = dict.has(name)? dict.get(name)() : noTrie; };
  const prepLoadConfig = () => { // conf-add feat.
    dlStatus = element("option", withText("待从配置加载！"));
    sel_mode.appendChild(dlStatus);
    setTrie(); // noTrie
  };
  const loadConfig = async (url: string) => {
    await readDict(url, (k, mk_trie) => {
      dlStatus.textContent = `在下载 ${k}…`;
      if (!dict.has(k)) {
        sel_mode.appendChild(element("option", withText(k)));
      } // 加字典选项 若还未存 feat appendOptUnion.
      dict.set(k, mk_trie);
      setTrie(); if (trie !== noTrie) { doGenerate(); } // start rendering as early as possible
    });
    sel_mode.removeChild(dlStatus);
    setTrie(); // first trie
  };

  const featConfiger = () => { //v misc in-helpDoc button event, dyn generated.
    const e = btn_revDict;
    let btn_import = element("button", withText("导入参数"));
    btn_import.onclick = () => { prepLoadConfig(); loadConfig(ta_text.value); };
    e.parentNode.insertBefore(btn_import, e.nextSibling);
    let btn_loadRendered = element("button", withText("叠改已渲染文本"));
    btn_loadRendered.onclick = () => { ta_text.value = div_out.innerText; doGenerate(); };
    e.parentNode.insertBefore(btn_loadRendered, e.nextSibling);
  };
  let featureEnablers = initFeatureEnablers(btn_gen, div_out, sel_display);
  featureEnablers[1] = featConfiger;
  registerOneshotClicks(helem("output").getElementsByTagName("button"), featureEnablers);

  let customFmtRef: [RecurStructFmt] = [undefined];
  initDisplayOnChange(sel_display, customFmtRef);

  sel_mode.onchange = setTrie;
  prepLoadConfig();
  createIME((text) => { ta_text.value += text; }, ta_word, () => trie, abb_word, list_possibleWord);

  num_fontSize.onchange = () => { div_out.style.fontSize = `${num_fontSize.value}pt`; }; // convenient shortcut methods
  ta_text.addEventListener("keydown", (ev:KeyboardEvent) => { if (ev.ctrlKey && ev.key == "Enter") doGenerate(); });

  btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
  btn_showTrie.onclick = () => {
    if (sel_display.selectedIndex == 1) for (let k of ["\n", "\r"]) trie.remove([k]); // remove-CRLF tokenize feat.
    let customFmt = customFmtRef[0];
    trie.formatWith(customFmt); ta_text.value = customFmt.toString(); customFmt.clear();
  };

  btn_readDict.onclick = () => doLoadDict(ta_text.value.trim(), sel_mode.value);
  btn_revDict.onclick = () => doRevDict(sel_mode);
  const doLoadDict = (text:string, dict_name:string) => {
    let table = splitTrieData(text);
    let failedKs = [];
    for (let [k, v] of table) {
      if (v === undefined) failedKs.push(k);
      else trie.set(chars(k), v);
    }
    if (failedKs.length != 0) alert(`条目导入失败：${failedKs.join("、")} ，请按每行 k${delimiters[1]}v 输入`);
    alert(`已导入 ${table.length-failedKs.length} 条词关系到词典 ${dict_name}`);
  };
  const doRevDict = (e:HTMLSelectElement) => {
    let name = e.value;
    if (name.startsWith('~')) { e.value = name.substr(1); setTrie(); } // DOM 不能把 .value= 一起 onchange 真麻烦
    else {
      let rName = `~${name}`;
      const ok = () => { e.value = rName; setTrie(); };
      if (!dict.has(rName)) { prepLoadConfig(); loadConfig(`?${rName}=~:${name}`).then(ok); } // rev-trie feat.
      else ok();
    }
  };

  const doGenerate = () => { clearChild(div_out); renderTokensTo(div_out, tokenize(ta_text.value)); };
  btn_gen.addEventListener("click", doGenerate); // nth=0

  await loadConfig(location.search);
  if (ta_text.value.length != 0) doGenerate();
});

function initFeatureEnablers(btn_update: HTMLElement, div_out: HTMLElement, sel_display: HTMLElement) {
  const featExpander = () => {
    const toggle = (ev:Event) => { 
      const css = "abbr-expand";
      let e = ev.target as HTMLElement;
      let e1 = e.nextElementSibling;
      if (e1 != null && e1.tagName == "SPAN" && e1.classList.contains(css)) e1.remove();
      else e.parentNode.insertBefore(element("span", (newE) => { newE.textContent = `(${e.title})`; newE.classList.add(css); }), e.nextSibling);
    };
    const addAbbrExpand = () => {
      for (let abbr of div_out.getElementsByTagName("abbr")) abbr.onclick = toggle;
    };
    btn_update.addEventListener("click", addAbbrExpand); addAbbrExpand(); // nth=1
  };
  const feat2ndTokenize = () => {
    const wrapRender = () => {
      let oldRender = customHTML;
      customHTML = (k, v) => {
        let elem = oldRender(k, v);
        let accumHTML = elem.innerHTML; // 2nd tokenize feat
        let lastV = v;
        while (true) {
          let newV = joinValues(tokenize(lastV), SEP);
          if (newV == null) break;
          accumHTML = accumHTML.replace(lastV, newV); // replace val only
          lastV = newV;
        }
        if (accumHTML != elem.innerHTML) { elem.innerHTML = accumHTML; elem.classList.add("recognized-2nd"); }
        return elem;
      };
    }; sel_display.addEventListener("change", wrapRender); wrapRender(); // nth=1
  };
  return [featExpander, null, feat2ndTokenize];
}

function initDisplayOnChange(sel_display: HTMLSelectElement, customFmtRef: [RecurStructFmt]) {
  const bracketFmt = new BracketFmt(["{", "}"], ", ");
  const indentFmt = new IndentationFmt();
  const setDisplay = () => { //v two <select> s.
    let vSel = sel_display.value;
    customFmtRef[0] = vSel.endsWith(")")? indentFmt : bracketFmt;
    switch (vSel) {
      case "上标(Ruby notation)": customHTML = (k, v) => element("ruby", withDefaults(), document.createTextNode(k), element("rt", withText(v))); break;
      case "翻转上标": customHTML = (k, v) => element("ruby", withDefaults(), document.createTextNode(v), element("rt", withText(k))); break;
      case "粗体+后括号": customHTML = (k, v) => element("span", withDefaults(), element("b", withText(k)), document.createTextNode(`(${v})`)); break;
      case "标记已识别": customHTML = (k, v) => element("u", withText(k)); break;
      case "替换已识别": customHTML = (k, v) => element("abbr", (e) => { e.textContent = v; e.title = k; }); break;
      case "添加释义": customHTML = (k, v) => element("abbr", (e) => { e.textContent = k; e.title = v; }); break;
      default:
        if (vSel.endsWith("…")) {
          let htmlCode = prompt("输入关于 K,V 的 HTML 代码：") ?? "<a>K(V)</a>";
          customHTML = (k, v) => {
            let span = document.createElement("span");
            span.innerHTML = htmlCode.replace(/[KV]/g, c => (c[0] == "K")? k : v);
            return span;
          };
        } else throw Error(vSel);
    } //^ update vars.
  };
  sel_display.addEventListener("change", setDisplay); setDisplay(); // nth=0
}

function createIME(op_out: (s:string) => void, tarea: HTMLTextAreaElement, get_trie: () => STrie, e_fstWord: HTMLElement, ul_possibleWord: HTMLUListElement) {
  const handler = (ev:InputEvent) => { // 输入法（迫真）
    let wordz: Iterator<PairString>;
    let isDeleting = ev.inputType == "deleteContentBackward";
    let input = tarea.value; if (input == "") return; // 别在清空时列出全部词！
    try {
      let point = get_trie().path(chars(input));
      if (isDeleting) e_fstWord.textContent = point.value || "见下表"; // 靠删除确定前缀子串
      wordz = joinIterate(point)[Symbol.iterator]();
    } catch (e) { e_fstWord.textContent = "?"; return; }
    if (!isDeleting) {
      let possible = wordz.next().value; // 显示 longest word
      if (possible == undefined) return;
      tarea.value += possible[0];
      tarea.selectionStart -= possible[0].length;
      e_fstWord.textContent = possible[1];
    }
    clearChild(ul_possibleWord); // 此外？的 possible list
    let word; while (!(word = wordz.next()).done) {
      let item = element("li", withDefaults(),
        element("b", withText(word.value[0])), element("a", withText(word.value[1]))
      );
      item.firstChild.addEventListener("click", () => {
        op_out(item.lastChild.textContent);
      });
      ul_possibleWord.appendChild(item);
    } // 不这么做得加 DownlevelIteration
  };
  tarea.oninput = handler;
  e_fstWord.onclick = () => { op_out(e_fstWord.textContent); tarea.value = ""; };
}

function renderTokensTo(e: HTMLElement, tokens: TokenIter) {
  for (let [name, desc] of tokens) {
    if (desc == null) {
      if (name in newlines) e.appendChild(document.createElement("br"));
      else e.appendChild(document.createTextNode(name)); // 直接从 JS 堆提交给 DOM 吧，他们会处理好拼接
    } else {
      let eRecog = customHTML(name, desc);
      eRecog.classList.add("recognized");
      e.appendChild(eRecog);
    }
  }
} //^ 或许咱不必处理换行兼容 :笑哭:

const PAT_URL_PARAM = /[?&]([^=]+)=([^&;#\n]+)/g;
const PAT_GREP = /(.)=([^=]+)=(.*)$/g;
const PAT_CSS_ARGUMENT = /\/\*\[\s*(\d+)\s*\]\*\//g;
async function referText(desc: string) {
  let isUrl = desc.startsWith(':');
  try { return isUrl? await xhrReadText(desc.substr(1)) : desc; }
  catch (req) { alertFailedReq(req); return ""; }
}
async function readDict(query: string, on_load: (name:string, trie:()=>STrie) => any) { // generator+async 是不是有点 cutting edge 了…
  for (let m of matchAll(PAT_URL_PARAM, query)) {
    let name = decodeURIComponent(m[1]);
    let value = decodeURIComponent(m[2]);
    switch (name) {
      case "text":
        helem<HTMLInputElement>("text").value += await referText(value); // text concat feat.
        break;
      case "mode":
        helem<HTMLOptionElement>("select-mode").value = value;
        break;
      case "font-size":
        helem("output").style.fontSize = value;
        break;
      case "style":
        let iArg = value.lastIndexOf('@'); // style=:a.css@cyan,yellow
        let desc = (iArg != -1)? value.substr(0, iArg) : value; // style-args feat.
        let code = await referText(desc);
        let css = (iArg != -1)? code.replace(PAT_CSS_ARGUMENT, (_, no) => value.substr(iArg+1).split(',')[Number.parseInt(no)] ) : code;
        document.head.appendChild(element("style", withText(css))); // add-style feat
        break;
      case "delim0": delimiters[0] = value; break;
      case "delim1": delimiters[1] = value; break;
      case "conf":
        try {
          let qs = await xhrReadText(value); // conf-file feat
          await readDict(qs, on_load);
        } catch (req) { alertFailedReq(req); }
        break;
      case "feat":
        helem("output").getElementsByTagName("button")[Number.parseInt(value)].click();
        break;
      case "inword-grep":
        let [_, c, sRe, subst] = PAT_GREP.exec(value);
        let re = RegExp(sRe);
        if (subst.length >= 2 && subst.indexOf(c, 1) != -1 && subst != c) { alert(`${re} 替换后，"${subst}" 不得在首含外有 "${c}"`); return; }
        inwordGrep[c] = [re, subst];
        break;
      default:
        let trie = await readTrie(value);
        on_load(name, trie);
    }
  }
}

async function readTrie(expr: string): Promise<()=>STrie> {
  const shadowKey = (key: string, a: SMap, b: SMap) => { if (b.has(key)) a.set(key, b.get(key)); };
  let sources = await Promise.all(expr.split('+').map(readTriePipePlus));
  let fst = reduceToFirst(sources, (merged, it) => { for (let k of it.keys()) shadowKey(k, merged, it); });
  for (let k in newlines) fst.set(k, null); // append CRLF
  let loaded: STrie = null;
  return () => { if (loaded == null) { loaded = Trie.fromMap(fst); } return loaded; } // lazy-load trie feat.
}
async function readTriePipePlus(expr: string) { // tokenize-dict feat.
  let piped = await Promise.all(expr.split(">>").map(readTriePipe));
  return reduceToFirst(piped, (accum, rules) => {
    if (accum.get("") === undefined) accum.delete("");
    for (let [k, v] of accum.entries()) {
      if (v == null) continue;
      accum[k] = joinValues(tokenizeTrie(Trie.fromMap(rules), v), SEP);
    }
  });
}
async function readTriePipe(expr: string) {
  let pipes = await Promise.all(expr.split('>').map(readTrieData));
  return reduceToFirst(pipes, (map, data) => {
    for (let [k, v] of map.entries()) { let gotV = data.get(v); if (gotV !== undefined) map.set(k, gotV); }
  });
}
async function readTrieData(expr: string): Promise<SMap> {
  let inverted = expr.startsWith('~');
  let path = inverted? expr.substr(1) : expr;
  let data: string[][];
  let map: SMap = new Map;
  if (path.startsWith(':')) {
    let name = path.substr(1);
    if (dict.has(name)) { data = [...joinIterate(dict.get(name)() as STrie)]; }
    else { alert(`No trie ${name} in dict`); return map; }
  } else {
    try { // download it.
      let text = await xhrReadText(path);
      data = splitTrieData(text);
    } catch (req) { alertFailedReq(req); return map; }
  }
  if (!inverted) for (let [k, v] of data) map.set(k, v); // ~invert feat.
  else for (let [k, v] of data) map.set(v, k);
  return map;
}
