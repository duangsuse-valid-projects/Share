const helem = id => document.getElementById(id);
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

let dict: object;
let trie: Trie<string>;
document.addEventListener("DOMContentLoaded", async () => {
  const
    ta_text = helem("text") as HTMLTextAreaElement, // 要分词的
    ta_word = helem("text-word") as HTMLTextAreaElement, // 要查词的
    abb_word = helem("abb-word"),
    list_possibleWord = helem("list-possibleWord") as HTMLUListElement,
    div_out = helem("output"),
    sel_mode = helem("select-mode") as HTMLSelectElement, // 选词典
    sel_display = helem("select-display") as HTMLSelectElement, // 选渲染
    btn_gen = helem("do-generate"),
    btn_showDict = helem("do-showDict"),
    btn_showTrie = helem("do-showTrie"), // 看底层字典
    btn_readDict = helem("do-readDict");
  dict = await readDict(location.search);
  let customHTML: string = null;
  const bracketFmt = new BracketFmt(["{", "}"], ", ");
  const indentFmt = new IndentationFmt();
  let customFmt: RecurStructFmt = indentFmt;

  for (let k in dict) sel_mode.appendChild(element("option", withText(k)));
  const setTrie = () => { trie = dict[sel_mode.value]; };
  sel_mode.onchange = setTrie; setTrie();
  sel_display.onchange = () => {
    if (sel_display.value.endsWith("…")) customHTML = prompt("输入关于 K,V 的 HTML 代码：") ?? "<a>K(V)</a>";
    else customHTML = null;
    customFmt = sel_display.value.endsWith(")")? indentFmt : bracketFmt;
  };
  ta_word.oninput = (ev:InputEvent) => { // 输入法（迫真）
    let wordz: Iterator<[string, string]>;
    let isDeleting = ev.inputType == "deleteContentBackward";
    let input = ta_word.value; if (input == "") return; // 别在清空时列出全部词！
    try {
      let point = trie.path(input);
      if (isDeleting) abb_word.textContent = point.value || "见下表"; // 靠删除确定前缀子串
      wordz = point[Symbol.iterator]();
    } catch (e) { abb_word.textContent = "?"; return; }
    if (!isDeleting) {
      let possible = wordz.next().value; // 显示 longest word
      if (possible == undefined) return;
      ta_word.value += possible[0];
      ta_word.selectionStart -= possible[0].length;
      abb_word.textContent = possible[1];
    }
    clearChild(list_possibleWord); // 此外？的 possible list
    let word; while (!(word = wordz.next()).done) {
      list_possibleWord.appendChild(element("li", withDefaults(),
        element("b", withText(word.value[0])), element("a", withText(word.value[1]))
      ));
    }
  };

  btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
  btn_showTrie.onclick = () => { customFmt.clear(); trie.formatWith(customFmt); ta_text.value = customFmt.toString(); };
  btn_readDict.onclick = () => {
    let table = ta_text.value.split('\n').map(row => row.split('='));
    let failedKs = [];
    for (let [k, v] of table) {
      if (v == undefined) failedKs.push(k);
      else trie.set(k, v);
    }
    if (failedKs.length != 0) alert(`条目导入失败：${failedKs.join("、")} ，请按每行 k=v 输入`);
    alert(`已导入 ${table.length-failedKs.length} 条词关系到词典 ${sel_mode.value}`);
  };
});

function matchAll(re: RegExp, s: string): RegExpExecArray[] {
  return s.match(re).map(part => { re.lastIndex = 0; return re.exec(part) });
}
const PAT_URL_PARAM = /[?&]([^=]+)=([^&;#]+)/g;
async function readDict(s: string) {
  let tries = {};
  for (let m of matchAll(PAT_URL_PARAM, s))
    tries[decodeURIComponent(m[1])] = await readTrie(decodeURIComponent(m[2]));
  return tries;
}
function reduceToFirst<T>(xs: T[], op: (fst:T, item:T) => any): T {
  let fst = xs[0];
  for (let i=1; i < xs.length; i++) op(fst, xs[i]);
  return fst;
}
function shadowKey(key: string, a: object, b: object) {
  if (b[key] != undefined) a[key] = b[key];
}
async function readTrie(s: string) {
  let sources = await Promise.all(s.split('+').map(readTriePipe));
  let fst = reduceToFirst(sources, (merged, it) => { for (let k in it) shadowKey(k, merged, it); });
  let trie = new Trie;
  for (let k in fst) trie.set(k, fst[k]);
  return trie;
}
async function readTriePipe(s: string) {
  let pipes = await Promise.all(s.split('>').map(readTrieData)).catch(([url, msg]) => { alert(`Failed get ${url}: ${msg}`); return []; });
  return reduceToFirst(pipes, (map, data) => {
    for (let k in map) { let gotV = data[map[k]]; if (gotV != undefined) map[k] = gotV; }
  });
}
function readTrieData(url: string): Promise<object> {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState != XMLHttpRequest.DONE) return;
      if (xhr.status != 200) reject([url, xhr.statusText]);
      let res = {};
      for (let [k, v] of xhr.responseText.split("\n").map(row => row.split("="))) res[k] = v;
      resolve(res);
    };
    xhr.send();
  });
}

// == Trie & Formatter Backend ==
type Routes = object;
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
      else throw Error(`failed getting ${ks}: no ${c} at ${point}`);
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

  /** should be fully iterated since it mutates self. */
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
  _isFirst: boolean = true; brackets: [string, string]; separator: string;
  constructor(brackets: [string, string], separator: string) { super(); this.brackets = brackets; this.separator = separator; }
  onOpen() { this.append(this.separator); this.append(this.brackets[0]); this._isFirst = true; }
  onClose() { this.append(this.brackets[1]); }
  onItem(text: string) { if (!this._isFirst) this.append(this.separator); else this._isFirst = false; this.append(text); }
}

function formatRecurArrayWith(fmt: RecurStructFmt, xs: Array<any>) {
  for (let x of xs) if (typeof x === "object") { fmt.onOpen(); formatRecurArrayWith(fmt, x); fmt.onClose(); } else fmt.onItem(x);
  return fmt.toString();
}
