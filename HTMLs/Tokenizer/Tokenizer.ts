function helem<T extends HTMLElement>(id:string) { return document.getElementById(id) as T; }
// duangsuse: 很抱歉写得如此低抽象、不可复用
// 毕竟 TypeScript 不是特别走简洁风（无论面向对象还是方法扩展），而且要考虑 ES5/ES6 的问题，也比较纠结。
// 而且我也不清楚该用 object 还是 Map 的说，所以就比较混淆了，实在该打（误
// 对不起，真的对不起。 其实就是字典迭代的问题，毕竟 JS 的数据结构比较不统一嘛。

function clearChild(e:HTMLElement) {
  while (e.firstChild != null) e.removeChild(e.firstChild);
}
type Conf = (e:HTMLElement) => any
function withDefaults(): Conf { return (e) => {}; }
function withText(text:string): Conf { return (e) => { e.innerText = text; }; }
function element<TAG extends keyof(HTMLElementTagNameMap)>(tagName:TAG, config:Conf, ...childs:(Element|Text)[]): HTMLElementTagNameMap[TAG] {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e as HTMLElementTagNameMap[TAG];
}

type CustomRender = (name:string, desc:string) => HTMLElement
type PairString = [string, string]
type STrie = Trie<string>

let dict = {};
let trie: STrie;
let delimiters: PairString = ["\n", "="];
const newlines = {}; for (let nl of ["\n", "\r", "\r\n"]) newlines[nl] = null;
let customHTML: CustomRender;

function splitTrieData(s: string) {
  return s.split(delimiters[0]).map((row) => {
    let iDelim = row.indexOf(delimiters[1]);
    return (iDelim == -1)? [row, undefined] : [row.substr(0, iDelim), row.substr(iDelim+1, row.length)]; // split-first feat.
  });
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
    btn_readDict = helem("do-readDict");
  let dlStatus: HTMLOptionElement;

  let noTrie = new Trie({ "X": {[KZ]:"待加载"} });
  const setTrie = () => { let name = sel_mode.value; trie = (name in dict)? dict[name] : noTrie; };
  const prepLoadConfig = () => { // conf-add feat.
    dlStatus = element("option", withText("待从配置加载！"));
    sel_mode.appendChild(dlStatus);
    setTrie(); // noTrie
  };
  const loadConfig = async (url: string) => {
    await readDictTo(dict, url, (k) => {
      dlStatus.textContent = `在下载 ${k}…`;
      sel_mode.appendChild(element("option", withText(k))); // 加字典选项.
    });
    sel_mode.removeChild(dlStatus);
    setTrie(); // first trie
  };

  //v misc in-helpDoc event.
  const [btn_expander, btn_configer] = document.getElementById("output").getElementsByTagName("button"); // HTMLCollection mutates so.
  btn_expander.onclick = () => {
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
    btn_gen.addEventListener("click", addAbbrExpand); addAbbrExpand(); // nth=1
    btn_expander.remove();
  };
  btn_configer.onclick = () => {
    const e = btn_readDict;
    let btn_import = element("button", withText("导入参数"));
    btn_import.onclick = async () => { prepLoadConfig(); await loadConfig(ta_text.value); };
    e.parentNode.insertBefore(btn_import, e.nextSibling);
    btn_configer.remove();
  };

  const bracketFmt = new BracketFmt(["{", "}"], ", ");
  const indentFmt = new IndentationFmt();
  let customFmt: RecurStructFmt;

  const setDisplay = () => { //v two <select> s.
    let vSel = sel_display.value;
    customFmt = vSel.endsWith(")")? indentFmt : bracketFmt;
    switch (vSel) {
      case "上标(Ruby notation)": customHTML = (k, v) => element("ruby", withDefaults(), document.createTextNode(k), element("rt", withText(v))); break;
      case "粗体+后括号": customHTML = (k, v) => element("span", withDefaults(), element("b", withText(k)), document.createTextNode(`(${v})`)); break;
      case "标记已识别": customHTML = (k, v) => element("u", withText(k)); break;
      case "替换已识别": customHTML = (k, v) => element("abbr", (e) => { e.textContent = v; e.title = k; }); break;
      default:
        if (vSel.endsWith("…")) {
          let htmlCode = prompt("输入关于 K,V 的 HTML 代码：") ?? "<a>K(V)</a>";
          customHTML = (k, v) => {
            let span = document.createElement("span");
            span.innerHTML = htmlCode.replace(/([KV])/g, m => (m[0] == "K")? k : v);
            return span;
          };
        } else throw Error(vSel);
    } //^ update vars.
  };
  sel_display.onchange = setDisplay; setDisplay();
  sel_mode.onchange = setTrie;
  prepLoadConfig();

  createIME(ta_word, () => trie, abb_word, list_possibleWord);
  abb_word.onclick = () => { ta_text.value += abb_word.textContent; ta_word.value = ""; };

  num_fontSize.onchange = () => { div_out.style.fontSize = `${num_fontSize.value}pt`; };
  btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
  btn_showTrie.onclick = () => {
    if (customFmt == bracketFmt) for (let k of ["\n", "\r"]) trie.remove(k); // remove-CRLF tokenize feat.
    customFmt.clear(); trie.formatWith(customFmt); ta_text.value = customFmt.toString();
  };
  btn_readDict.onclick = () => {
    let table = splitTrieData(ta_text.value.trim());
    let failedKs = [];
    for (let [k, v] of table) {
      if (v == undefined) failedKs.push(k);
      else trie.set(k, v);
    }
    if (failedKs.length != 0) alert(`条目导入失败：${failedKs.join("、")} ，请按每行 k${delimiters[1]}v 输入`);
    alert(`已导入 ${table.length-failedKs.length} 条词关系到词典 ${sel_mode.value}`);
  };

  await loadConfig(location.search);
  const generate = () => { clearChild(div_out); renderTokensTo(div_out, trie.tokenize(ta_text.value)); };
  btn_gen.addEventListener("click", generate); if (ta_text.value.length != 0) generate(); // nth=0
});

function createIME(tarea: HTMLTextAreaElement, trie: () => STrie, e_fstWord: HTMLElement, ul_possibleWord: HTMLUListElement) {
  const handler = (ev:InputEvent) => { // 输入法（迫真）
    let wordz: Iterator<PairString>;
    let isDeleting = ev.inputType == "deleteContentBackward";
    let input = tarea.value; if (input == "") return; // 别在清空时列出全部词！
    try {
      let point = trie().path(input);
      if (isDeleting) e_fstWord.textContent = point.value || "见下表"; // 靠删除确定前缀子串
      wordz = point[Symbol.iterator]();
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
      ul_possibleWord.appendChild(element("li", withDefaults(),
        element("b", withText(word.value[0])), element("a", withText(word.value[1]))
      ));
    } // 不这么做得加 DownlevelIteration
  };
  tarea.oninput = handler;
}

function renderTokensTo(e: HTMLElement, tokens: Iterable<[string, string?]>) {
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

function matchAll(re: RegExp, s: string): RegExpExecArray[] {
  return s.match(re)?.map(part => { re.lastIndex = 0; return re.exec(part) }) ?? [];
}
const PAT_URL_PARAM = /[?&]([^=]+)=([^&;#\n]+)/g;
async function referText(desc_url: string) {
  let isUrl = desc_url.startsWith(':');
  try { return isUrl? await xhrReadText(desc_url.substr(1)) : desc_url; }
  catch (req) { alertFailedReq(req); return ""; }
}
async function readDictTo(tries: object, s: string, on_load: (name:string) => any) { // generator+async 是不是有点 cutting edge 了…
  for (let m of matchAll(PAT_URL_PARAM, s)) {
    let name = decodeURIComponent(m[1]);
    let value = decodeURIComponent(m[2]);
    switch (name) {
      case "delim0": delimiters[0] = value; break;
      case "delim1": delimiters[1] = value; break;
      case "text":
        helem("text").textContent += await referText(value); // text concat feat.
        break;
      case "mode":
        helem<HTMLOptionElement>("select-mode").value = value;
        break;
      case "font-size":
        helem("output").style.fontSize = value;
        break;
      case "style":
        let css = await referText(value);
        document.head.appendChild(element("style", withText(css))); // add-style feat
        break;
      case "conf":
        try {
          let qs = await xhrReadText(value); // conf-file feat
          await readDictTo(tries, qs, on_load);
        } catch (req) { alertFailedReq(req); }
        break;
      default:
        tries[name] = await readTrie(value);
        for (let k in newlines) tries[name].set(k, null);
        on_load(name);
    }
  }
}
function reduceToFirst<T>(xs: T[], op: (fst:T, item:T) => any): T {
  let fst = xs[0];
  for (let i=1; i < xs.length; i++) op(fst, xs[i]);
  return fst;
}
async function readTrie(s: string) {
  const shadowKey = (key: string, a: object, b: object) => { if (b[key] != undefined) a[key] = b[key]; };
  let sources = await Promise.all(s.split('+').map(readTriePipe));
  let fst = reduceToFirst(sources, (merged, it) => { for (let k in it) shadowKey(k, merged, it); });
  let trie = new Trie;
  for (let k in fst) trie.set(k, fst[k]);
  return trie;
}
async function readTriePipe(s: string) {
  let pipes = await Promise.all(s.split('>').map(readTrieData));
  return reduceToFirst(pipes, (map, data) => {
    for (let k in map) { let gotV = data[map[k]]; if (gotV != undefined) map[k] = gotV; }
  });
}
async function readTrieData(url: string): Promise<object> {
  let inverted = url.startsWith('~');
  let path = inverted? url.substr(1) : url;
  let data: string[][];
  if (path.startsWith(':')) {
    let name = path.substr(1);
    if (name in dict) { data = [...dict[name] as STrie]; }
    else { alert(`No trie ${name} in dict`); return {}; }
  } else {
    try { // download it.
      let text = await xhrReadText(path);
      data = splitTrieData(text);
    } catch (req) { alertFailedReq(req); return {}; }
  }
  let obj = {};
  if (!inverted) for (let [k, v] of data) obj[k] = v; // ~invert feat.
  else for (let [k, v] of data) obj[v] = k;
  return obj;
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


// == Trie & Formatter Backend ==
type Routes = object
const KZ = "\0"; // 1:1 value on Trie node
class Trie<V> implements Iterable<[String, V]> {
  routes: Routes;
  constructor(m: Routes = {}) { this.routes = m; }
  get value() { return this.routes[KZ]; }
  set value(v) { this.routes[KZ] = v; }

  // path, makePath, get, set, iter, toString, tokenize
  _path(ks: string): Routes {
    var point = this.routes;
    for (let c of ks) {
      if (c in point) point = point[c];
      else throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`);
    }
    return point;
  }
  path(ks: string): Trie<V> { return new Trie(this._path(ks)); }
  makePath(ks: string): Trie<V> {
    var point = this.routes;
    for (let c of ks) {
      if (!(c in point)) point[c] = new Object;
      point = point[c];
    }
    return new Trie(point);
  }

  get(ks: string): V {
    let v = this._path(ks)[KZ];
    if (v == undefined) throw Error("not a value path");
    return v;
  }
  set(ks: string, v: V) { this.makePath(ks).value= v; }
  remove(ks: string) {
    let iKsLast = ks.length-1;
    let parent = this.path(ks.substr(0, iKsLast)).routes;
    delete parent[ks[iKsLast]];
  }

  /** This should be fully iterated since it mutates self. */
  [Symbol.iterator]() { return this._iter(this.routes, ""); }
  *_iter(path: Routes, ks_path: string): Generator<[string, V]> { // rewrite as visitWith to support ES5?
    let v_mid = path[KZ]; delete path[KZ];
    for (let k in path) {
      let v = path[k];
      if (v[KZ] != undefined && Object.keys(v).length == 1) yield [ks_path+k, v[KZ]]; // optimize val-only node
      else yield* this._iter(v, ks_path+k);
    }
    if (v_mid != undefined) yield [ks_path, v_mid];
    path[KZ] = v_mid; // restore.
  }

  toString() {
    let sb = new StringBuild;
    for (let [k, v] of this) sb.append(`${k}=${v}\n`);
    return sb.toString();
  }
  formatWith(fmt: RecurStructFmt) {
    const _visitRec = (fmt: RecurStructFmt, point: Routes) => {
      let vz = point[KZ]; delete point[KZ]; // hide, first KZ
      if (vz != undefined) fmt.onItem(`=${vz}`);
      for (let k in point) {
        fmt.onItem(k);
        fmt.onOpen(); _visitRec(fmt, point[k]); fmt.onClose();
      }
      point[KZ] = vz;
    };
    _visitRec(fmt, this.routes);
  }

  *tokenize(input: string): Generator<[string, V?]> {
    let recognized = new StringBuild;
    var i = 0; let n = input.length;
    var point = this.routes;
    while (i < n) {
      let c = input[i]; // trie charseq match.
      if (c in point) {
        point = point[c];
        recognized.append(c);
      } else { // stop of one word at len+1, prepare for re-match
        if (point[KZ] != undefined) { i--; yield [recognized.toString(), point[KZ]]; }
        else {
          if (!recognized.isEmpty) yield [recognized.toString(), null]; // unknown prefix
          let iUnrecog = i;
          while (!(input[i] in this.routes) && i < n) { i++; } // optimized skip
          let unrecog = input.substring(iUnrecog, i);
          if (unrecog.length != 0) yield [unrecog, null];
          i--; // =continue, to recogzd idx.
        }
        point = this.routes;
        recognized.clear();
      }; i++
    }
    if (point[KZ] != undefined) { yield [recognized.toString(), point[KZ]]; } // word stop at EOS
    else if (!recognized.isEmpty) { yield [recognized.toString(), null]; }
  }
}

interface RecurStructFmt { // bad, but usable
  onOpen(): void
  onClose(): void
  onItem(text: string): void
  clear(): void // reuse buffer
}
class StringBuild {
  _buf: string[];
  constructor() { this._buf = []; }
  append(s: string) { this._buf.push(s); }
  clear() { this._buf.splice(0, this._buf.length); }
  get isEmpty() { return this._buf.length == 0; }
  toString() { return this._buf.join(""); }
}
class IndentationFmt extends StringBuild implements RecurStructFmt {
  _indent: string = ""; indentation: string; newline: string;
  constructor(indentation: string = "  ", newline = "\n") { super(); this.indentation = indentation; this.newline = newline; }
  onOpen() { this._indent += this.indentation; }
  onClose() { let n = this._indent.length; this._indent = this._indent.substring(0, n-this.indentation.length); }
  onItem(text: string) { this.append(this._indent); this.append(text); this.append(this.newline); }
}
class BracketFmt extends StringBuild implements RecurStructFmt {
  _isFirst: boolean = true; brackets: PairString; separator: string;
  constructor(brackets: PairString, separator: string) { super(); this.brackets = brackets; this.separator = separator; }
  onOpen() { this.append(this.separator); this.append(this.brackets[0]); this._isFirst = true; }
  onClose() { this.append(this.brackets[1]); }
  onItem(text: string) { if (!this._isFirst) this.append(this.separator); else this._isFirst = false; this.append(text); }
  clear() { this._isFirst = true; return super.clear(); }
}

function formatRecurArrayWith(fmt: RecurStructFmt, xs: Array<any>) {
  for (let x of xs) if (typeof x === "object") { fmt.onOpen(); formatRecurArrayWith(fmt, x); fmt.onClose(); } else fmt.onItem(x);
  return fmt.toString();
}
