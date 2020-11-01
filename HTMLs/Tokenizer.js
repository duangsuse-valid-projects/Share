const helem = id => document.getElementById(id);
const ta_text = helem("text"), // 要分词的
ta_word = helem("text-word"), // 要查词的
div_out = helem("output"), sel_mode = helem("select-mode"), // 选词典
sel_display = helem("select-display"), // 选渲染
btn_gen = helem("do-generate"), btn_showDict = helem("do-showDict"), btn_showTrie = helem("do-showTrie"), // 看底层字典
btn_readDict = helem("do-readDict");
const KZ = "\0"; // 1:1 value on Trie node
class Trie {
    constructor(m = {}) { this.routes = m; }
    get value() { return this.routes[KZ]; }
    set value(v) { this.routes[KZ] = v; }
    // path, makePath, get, set, iter, toString, tokenize
    _path(ks) {
        var point = this.routes;
        for (let c of ks) {
            if (c in point)
                point = point[c];
            else
                throw Error(`failed getting ${ks}: no ${c} at ${point}`);
        }
        return point;
    }
    path(ks) { return new Trie(this._path(ks)); }
    makePath(ks) {
        var point = this.routes;
        for (let c of ks) {
            if (!(c in point))
                point[c] = new Object;
            point = point[c];
        }
        return new Trie(point);
    }
    get(ks) {
        let v = this._path(ks)[KZ];
        if (v == undefined)
            throw Error("not a value path");
        return v;
    }
    set(ks, v) { this.makePath(ks).value = v; }
    [Symbol.iterator]() { return this._iter(this.routes, ""); }
    *_iter(path, ks_path) {
        let v_mid = path[KZ];
        delete path[KZ];
        for (let k in path) {
            let v = path[k];
            if (v[KZ] != undefined && Object.keys(v).length == 1)
                yield [ks_path + k, v[KZ]]; // optimize val-only node
            else
                yield* this._iter(v, ks_path + k);
        }
        if (v_mid != undefined)
            yield [ks_path, v_mid];
        path[KZ] = v_mid; // restore.
    }
    toString() {
        let sb = new StringBuild;
        for (let [k, v] of this)
            sb.append(`${k}=${v}\n`);
        return sb.toString();
    }
    *tokenize(input) {
        let recognized = new StringBuild;
        var i = 0;
        let n = input.length;
        var point = this.routes;
        while (i < n) {
            let c = input[i]; // trie charseq match.
            if (c in point) {
                point = point[c];
                recognized.append(c);
            }
            else { // stop of one word at len+1, prepare for re-match
                if (point[KZ] != undefined) {
                    i--;
                    yield [recognized.toString(), point[KZ]];
                }
                else {
                    if (!recognized.isEmpty)
                        yield [recognized.toString(), null]; // unknown prefix
                    let iUnrecog = i;
                    while (!(input[i] in this.routes) && i < n) {
                        i++;
                    } // optimized skip
                    let unrecog = input.substring(iUnrecog, i);
                    if (unrecog.length != 0)
                        yield [unrecog, null];
                    i--; // =continue, to recogzd idx.
                }
                point = this.routes;
                recognized.clear();
            }
            ;
            i++;
        }
        if (point[KZ] != undefined) {
            yield [recognized.toString(), point[KZ]];
        } // word stop at EOS
        else if (!recognized.isEmpty) {
            yield [recognized.toString(), null];
        }
    }
}
class StringBuild {
    constructor() { this._buf = []; }
    append(s) { this._buf.push(s); }
    clear() { this._buf.splice(0, this._buf.length); }
    get isEmpty() { return this._buf.length == 0; }
    toString() { return this._buf.join(""); }
}
class IndentationFmt extends StringBuild {
    constructor(indentation = "  ", newline = "\n") {
        super();
        this._indent = "";
        this.indentation = indentation;
        this.newline = newline;
    }
    onOpen() { this._indent += this.indentation; }
    onClose() { let n = this._indent.length; this._indent = this._indent.substring(0, n - this.indentation.length); }
    onItem(text) { this.append(this._indent); this.append(text); this.append(this.newline); }
}
class BracketFmt extends StringBuild {
    constructor(brackets, separator) {
        super();
        this._isFirst = true;
        this.brackets = brackets;
        this.separator = separator;
    }
    onOpen() { this.append(this.separator); this.append(this.brackets[0]); this._isFirst = true; }
    onClose() { this.append(this.brackets[1]); }
    onItem(text) { if (!this._isFirst)
        this.append(this.separator);
    else
        this._isFirst = false; this.append(text); }
}
function formatRecurArrayWith(fmt, xs) {
    for (let x of xs)
        if (typeof x === "object") {
            fmt.onOpen();
            formatRecurArrayWith(fmt, x);
            fmt.onClose();
        }
        else
            fmt.onItem(x);
    return fmt.toString();
}
