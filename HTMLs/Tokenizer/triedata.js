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
                throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`);
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
    remove(ks) {
        let iKsLast = ks.length - 1;
        let parent = this.path(ks.substr(0, iKsLast)).routes;
        delete parent[ks[iKsLast]];
    }
    /** This should be fully iterated since it mutates self. */
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
    formatWith(fmt) {
        const _visitRec = (fmt, point) => {
            let vz = point[KZ];
            delete point[KZ]; // hide, first KZ
            if (vz != undefined)
                fmt.onItem(`=${vz}`);
            for (let k in point) {
                fmt.onItem(k);
                fmt.onOpen();
                _visitRec(fmt, point[k]);
                fmt.onClose();
            }
            point[KZ] = vz;
        };
        _visitRec(fmt, this.routes);
    }
    /** WARN: may got stuck when [inword_grep] replaced to matching sequence, when re subst is "\0", means match treated as unknown  */
    *tokenize(input, inword_grep = () => null) {
        let recognized = new StringBuild;
        var i = 0;
        let n = input.length;
        var point = this.routes;
        while (i < n) {
            let c = input[i]; // trie charseq match.
            if (c in point) {
                let grep = inword_grep(c); // in-word grep feat.
                let m;
                if (grep != null && (m = grep[0].exec(input.substr(i))) != null) {
                    let [re, subst] = grep;
                    if (subst == c) {
                        i += m[0].length - 1 /*for c*/;
                    }
                    else if (subst == "\0") {
                        yield [input.substr(i, m[0].length), null];
                        i += m[0].length - 1 /*for c*/; //< copycat!
                        i++;
                        continue;
                    }
                    else {
                        input = m[0].replace(re, subst) + input.substr(i + m[0].length);
                        i = 0; // reset view at/after c
                        if (subst[0] == c) { /*accept*/ }
                        else {
                            continue;
                        }
                    }
                }
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
    static joinValues(toks, sep = " ") {
        let vs = [];
        for (let kv of toks) {
            let v = kv[1];
            if (v != null && v != "")
                vs.push(v);
        }
        return (vs.length == 0) ? null : vs.join(sep);
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
    clear() { this._isFirst = true; return super.clear(); }
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
