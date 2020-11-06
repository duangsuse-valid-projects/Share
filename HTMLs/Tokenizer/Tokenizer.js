var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function helem(id) { return document.getElementById(id); }
function findElemIn(xs, p) {
    for (let e of xs)
        if (p(e))
            return e;
    return null;
}
// duangsuse: 很抱歉写得如此低抽象、不可复用
// 毕竟 TypeScript 不是特别走简洁风（无论面向对象还是方法扩展），而且要考虑 ES5/ES6 的问题，也比较纠结。
// 而且我也不清楚该用 object 还是 Map 的说，所以就比较混淆了，实在该打（误
// 对不起，真的对不起。 其实就是字典迭代的问题，毕竟 JS 的数据结构比较不统一嘛。
function clearChild(e) {
    while (e.firstChild != null)
        e.removeChild(e.firstChild);
}
function withDefaults() { return (e) => { }; }
function withText(text) { return (e) => { e.textContent = text; }; }
function element(tagName, config, ...childs) {
    let e = document.createElement(tagName);
    config(e);
    for (let child of childs)
        e.appendChild(child);
    return e;
}
function xhrReadText(url) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState != XMLHttpRequest.DONE)
                return;
            if (xhr.status != 200)
                reject([url, xhr.statusText]);
            resolve(xhr.responseText);
        };
        xhr.send();
    });
}
const alertFailedReq = ([url, msg]) => alert(`Failed get ${url}: ${msg}`);
let dict = {};
let trie;
let delimiters = ["\n", "="];
const newlines = {};
for (let nl of ["\n", "\r", "\r\n"])
    newlines[nl] = null;
let customHTML;
let inwordGrep = {};
function splitTrieData(s) {
    return s.split(delimiters[0]).map((row) => {
        let iDelim = row.indexOf(delimiters[1]);
        return (iDelim == -1) ? [row, undefined] : [row.substr(0, iDelim), row.substr(iDelim + 1, row.length)]; // split-first feat.
    });
}
function tokenize(input) {
    return trie.tokenize(input, c => inwordGrep[c]);
}
function registerOneshotClicks(es, actions) {
    let i = 0;
    for (let e of es) {
        let no = i; // closure upvalue!
        e.addEventListener("click", () => { let op = actions[no]; if (op != null) {
            op();
            actions[no] = null;
        } e.setAttribute("hidden", ""); });
        i++; // zip iter
    }
}
document.addEventListener("DOMContentLoaded", () => __awaiter(this, void 0, void 0, function* () {
    const ta_text = helem("text"), // 要分词的
    ta_word = helem("text-word"), // 要查词的
    abb_word = helem("abb-word"), list_possibleWord = helem("list-possibleWord"), div_out = helem("output"), sel_mode = helem("select-mode"), // 选词典
    sel_display = helem("select-display"), // 选渲染
    btn_gen = helem("do-generate"), num_fontSize = helem("slider-fontsize"), btn_showDict = helem("do-showDict"), btn_showTrie = helem("do-showTrie"), // 看底层字典
    btn_readDict = helem("do-readDict"), btn_revDict = helem("do-reverse");
    let dlStatus;
    let noTrie = new Trie({ "X": { [KZ]: "待加载" } });
    const setTrie = () => { let name = sel_mode.value; trie = (name in dict) ? dict[name] : noTrie; };
    const prepLoadConfig = () => {
        dlStatus = element("option", withText("待从配置加载！"));
        sel_mode.appendChild(dlStatus);
        setTrie(); // noTrie
    };
    const loadConfig = (url) => __awaiter(this, void 0, void 0, function* () {
        yield readDict(url, (k, trie) => {
            dlStatus.textContent = `在下载 ${k}…`;
            if (!(k in dict)) {
                sel_mode.appendChild(element("option", withText(k)));
            } // 加字典选项 若还未存 feat appendOptUnion.
            dict[k] = trie;
        });
        sel_mode.removeChild(dlStatus);
        setTrie(); // first trie
    });
    //v misc in-helpDoc button event, dyn generated.
    const featExpander = () => {
        const toggle = (ev) => {
            const css = "abbr-expand";
            let e = ev.target;
            let e1 = e.nextElementSibling;
            if (e1 != null && e1.tagName == "SPAN" && e1.classList.contains(css))
                e1.remove();
            else
                e.parentNode.insertBefore(element("span", (newE) => { newE.textContent = `(${e.title})`; newE.classList.add(css); }), e.nextSibling);
        };
        const addAbbrExpand = () => {
            for (let abbr of div_out.getElementsByTagName("abbr"))
                abbr.onclick = toggle;
        };
        btn_gen.addEventListener("click", addAbbrExpand);
        addAbbrExpand(); // nth=1
    };
    const featConfiger = () => {
        const e = btn_revDict;
        let btn_import = element("button", withText("导入参数"));
        btn_import.onclick = () => { prepLoadConfig(); loadConfig(ta_text.value); };
        e.parentNode.insertBefore(btn_import, e.nextSibling);
        let btn_loadRendered = element("button", withText("叠改已渲染文本"));
        btn_loadRendered.onclick = () => { ta_text.value = div_out.innerText; generate(); };
        e.parentNode.insertBefore(btn_loadRendered, e.nextSibling);
    };
    const feat2ndTokenize = () => {
        const wrapRender = () => {
            let oldRender = customHTML;
            customHTML = (k, v) => {
                let elem = oldRender(k, v);
                let accumHTML = elem.innerHTML; // 2nd tokenize feat
                let lastV = v;
                while (true) {
                    let newV = Trie.joinValues(tokenize(lastV));
                    if (newV == null)
                        break;
                    accumHTML = accumHTML.replace(lastV, newV); // replace val only
                    lastV = newV;
                }
                if (accumHTML != elem.innerHTML) {
                    elem.innerHTML = accumHTML;
                    elem.classList.add("recognized-2nd");
                }
                return elem;
            };
        };
        sel_display.addEventListener("change", wrapRender);
        wrapRender(); // nth=1
    };
    registerOneshotClicks(helem("output").getElementsByTagName("button"), [featExpander, featConfiger, feat2ndTokenize]);
    const bracketFmt = new BracketFmt(["{", "}"], ", ");
    const indentFmt = new IndentationFmt();
    let customFmt;
    const setDisplay = () => {
        var _a;
        let vSel = sel_display.value;
        customFmt = vSel.endsWith(")") ? indentFmt : bracketFmt;
        switch (vSel) {
            case "上标(Ruby notation)":
                customHTML = (k, v) => element("ruby", withDefaults(), document.createTextNode(k), element("rt", withText(v)));
                break;
            case "翻转上标":
                customHTML = (k, v) => element("ruby", withDefaults(), document.createTextNode(v), element("rt", withText(k)));
                break;
            case "粗体+后括号":
                customHTML = (k, v) => element("span", withDefaults(), element("b", withText(k)), document.createTextNode(`(${v})`));
                break;
            case "标记已识别":
                customHTML = (k, v) => element("u", withText(k));
                break;
            case "替换已识别":
                customHTML = (k, v) => element("abbr", (e) => { e.textContent = v; e.title = k; });
                break;
            case "添加释义":
                customHTML = (k, v) => element("abbr", (e) => { e.textContent = k; e.title = v; });
                break;
            default:
                if (vSel.endsWith("…")) {
                    let htmlCode = (_a = prompt("输入关于 K,V 的 HTML 代码：")) !== null && _a !== void 0 ? _a : "<a>K(V)</a>";
                    customHTML = (k, v) => {
                        let span = document.createElement("span");
                        span.innerHTML = htmlCode.replace(/[KV]/g, c => (c[0] == "K") ? k : v);
                        return span;
                    };
                }
                else
                    throw Error(vSel);
        } //^ update vars.
    };
    sel_display.addEventListener("change", setDisplay);
    setDisplay(); // nth=0
    sel_mode.onchange = setTrie;
    prepLoadConfig();
    createIME(ta_word, () => trie, abb_word, list_possibleWord);
    abb_word.onclick = () => { ta_text.value += abb_word.textContent; ta_word.value = ""; };
    num_fontSize.onchange = () => { div_out.style.fontSize = `${num_fontSize.value}pt`; };
    btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
    btn_showTrie.onclick = () => {
        if (customFmt == bracketFmt)
            for (let k of ["\n", "\r"])
                trie.remove(k); // remove-CRLF tokenize feat.
        customFmt.clear();
        trie.formatWith(customFmt);
        ta_text.value = customFmt.toString();
    };
    btn_readDict.onclick = () => {
        let table = splitTrieData(ta_text.value.trim());
        let failedKs = [];
        for (let [k, v] of table) {
            if (v == undefined)
                failedKs.push(k);
            else
                trie.set(k, v);
        }
        if (failedKs.length != 0)
            alert(`条目导入失败：${failedKs.join("、")} ，请按每行 k${delimiters[1]}v 输入`);
        alert(`已导入 ${table.length - failedKs.length} 条词关系到词典 ${sel_mode.value}`);
    };
    btn_revDict.onclick = () => {
        let name = sel_mode.value;
        if (name.startsWith('~')) {
            sel_mode.value = name.substr(1);
            setTrie();
        } // DOM 不能把 .value= 一起 onchange 真麻烦
        else {
            let rName = `~${name}`;
            const ok = () => { sel_mode.value = rName; setTrie(); };
            if (!(rName in dict)) {
                prepLoadConfig();
                loadConfig(`?${rName}=~:${name}`).then(ok);
            } // rev-trie feat.
            else
                ok();
        }
    };
    const generate = () => { clearChild(div_out); renderTokensTo(div_out, tokenize(ta_text.value)); };
    btn_gen.addEventListener("click", generate); // nth=0
    yield loadConfig(location.search);
    if (ta_text.value.length != 0)
        generate();
}));
function createIME(tarea, trie, e_fstWord, ul_possibleWord) {
    const handler = (ev) => {
        let wordz;
        let isDeleting = ev.inputType == "deleteContentBackward";
        let input = tarea.value;
        if (input == "")
            return; // 别在清空时列出全部词！
        try {
            let point = trie().path(input);
            if (isDeleting)
                e_fstWord.textContent = point.value || "见下表"; // 靠删除确定前缀子串
            wordz = point[Symbol.iterator]();
        }
        catch (e) {
            e_fstWord.textContent = "?";
            return;
        }
        if (!isDeleting) {
            let possible = wordz.next().value; // 显示 longest word
            if (possible == undefined)
                return;
            tarea.value += possible[0];
            tarea.selectionStart -= possible[0].length;
            e_fstWord.textContent = possible[1];
        }
        clearChild(ul_possibleWord); // 此外？的 possible list
        let word;
        while (!(word = wordz.next()).done) {
            ul_possibleWord.appendChild(element("li", withDefaults(), element("b", withText(word.value[0])), element("a", withText(word.value[1]))));
        } // 不这么做得加 DownlevelIteration
    };
    tarea.oninput = handler;
}
function renderTokensTo(e, tokens) {
    for (let [name, desc] of tokens) {
        if (desc == null) {
            if (name in newlines)
                e.appendChild(document.createElement("br"));
            else
                e.appendChild(document.createTextNode(name)); // 直接从 JS 堆提交给 DOM 吧，他们会处理好拼接
        }
        else {
            let eRecog = customHTML(name, desc);
            eRecog.classList.add("recognized");
            e.appendChild(eRecog);
        }
    }
} //^ 或许咱不必处理换行兼容 :笑哭:
function matchAll(re, s) {
    var _a, _b;
    return (_b = (_a = s.match(re)) === null || _a === void 0 ? void 0 : _a.map(part => { re.lastIndex = 0; return re.exec(part); })) !== null && _b !== void 0 ? _b : [];
}
const PAT_URL_PARAM = /[?&]([^=]+)=([^&;#\n]+)/g;
const PAT_GREP = /(.)=([^=]+)=(.*)$/g;
const PAT_CSS_ARGUMENT = /\/\*\[\s*(\d+)\s*\]\*\//g;
function referText(desc) {
    return __awaiter(this, void 0, void 0, function* () {
        let isUrl = desc.startsWith(':');
        try {
            return isUrl ? yield xhrReadText(desc.substr(1)) : desc;
        }
        catch (req) {
            alertFailedReq(req);
            return "";
        }
    });
}
function readDict(query, on_load) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let m of matchAll(PAT_URL_PARAM, query)) {
            let name = decodeURIComponent(m[1]);
            let value = decodeURIComponent(m[2]);
            switch (name) {
                case "text":
                    helem("text").value += yield referText(value); // text concat feat.
                    break;
                case "mode":
                    helem("select-mode").value = value;
                    break;
                case "font-size":
                    helem("output").style.fontSize = value;
                    break;
                case "style":
                    let iArg = value.lastIndexOf('@'); // style=:a.css@cyan,yellow
                    let desc = (iArg != -1) ? value.substr(0, iArg) : value; // style-args feat.
                    let code = yield referText(desc);
                    let css = (iArg != -1) ? code.replace(PAT_CSS_ARGUMENT, (_, no) => value.substr(iArg + 1).split(',')[Number.parseInt(no)]) : code;
                    document.head.appendChild(element("style", withText(css))); // add-style feat
                    break;
                case "delim0":
                    delimiters[0] = value;
                    break;
                case "delim1":
                    delimiters[1] = value;
                    break;
                case "conf":
                    try {
                        let qs = yield xhrReadText(value); // conf-file feat
                        yield readDict(qs, on_load);
                    }
                    catch (req) {
                        alertFailedReq(req);
                    }
                    break;
                case "feat":
                    helem("output").getElementsByTagName("button")[Number.parseInt(value)].click();
                    break;
                case "inword-grep":
                    let [_, c, sRe, subst] = PAT_GREP.exec(value);
                    let re = RegExp(sRe);
                    if (subst.length >= 2 && subst.indexOf(c, 1) != -1 && subst != c) {
                        alert(`${re} 替换后，"${subst}" 不得在首含外有 "${c}"`);
                        return;
                    }
                    inwordGrep[c] = [re, subst];
                    break;
                default:
                    let trie = yield readTrie(value);
                    for (let k in newlines)
                        trie.set(k, null);
                    on_load(name, trie);
            }
        }
    });
}
function reduceToFirst(xs, op) {
    let fst = xs[0];
    for (let i = 1; i < xs.length; i++)
        op(fst, xs[i]);
    return fst;
}
function readTrie(expr) {
    return __awaiter(this, void 0, void 0, function* () {
        const shadowKey = (key, a, b) => { if (b[key] != undefined)
            a[key] = b[key]; };
        let sources = yield Promise.all(expr.split('+').map(readTriePipePlus));
        let fst = reduceToFirst(sources, (merged, it) => { for (let k in it)
            shadowKey(k, merged, it); });
        let trie = new Trie;
        for (let k in fst)
            trie.set(k, fst[k]);
        return trie;
    });
}
function readTriePipePlus(expr) {
    return __awaiter(this, void 0, void 0, function* () {
        let piped = yield Promise.all(expr.split(">>").map(readTriePipe));
        return reduceToFirst(piped, (accum, rules) => {
            let trie = new Trie;
            for (let k in rules)
                trie.set(k, rules[k]);
            if (accum[""] == undefined)
                delete accum[""];
            for (let k in accum) {
                let v = Trie.joinValues(trie.tokenize(accum[k]));
                if (v != null)
                    accum[k] = v;
            }
        });
    });
}
function readTriePipe(expr) {
    return __awaiter(this, void 0, void 0, function* () {
        let pipes = yield Promise.all(expr.split('>').map(readTrieData));
        return reduceToFirst(pipes, (map, data) => {
            for (let k in map) {
                let gotV = data[map[k]];
                if (gotV != undefined)
                    map[k] = gotV;
            }
        });
    });
}
function readTrieData(expr) {
    return __awaiter(this, void 0, void 0, function* () {
        let inverted = expr.startsWith('~');
        let path = inverted ? expr.substr(1) : expr;
        let data;
        if (path.startsWith(':')) {
            let name = path.substr(1);
            if (name in dict) {
                data = [...dict[name]];
            }
            else {
                alert(`No trie ${name} in dict`);
                return {};
            }
        }
        else {
            try { // download it.
                let text = yield xhrReadText(path);
                data = splitTrieData(text);
            }
            catch (req) {
                alertFailedReq(req);
                return {};
            }
        }
        let obj = {};
        if (!inverted)
            for (let [k, v] of data)
                obj[k] = v; // ~invert feat.
        else
            for (let [k, v] of data)
                obj[v] = k;
        return obj;
    });
}
