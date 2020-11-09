const KZ = "\0"; // 1:1 value on Trie node
class Trie {
    constructor(m = new Map) { this.routes = m; }
    get value() { return Trie.valueAt(this.routes); }
    set value(v) { this.routes.set(KZ, v); }
    // path, makePath, get, set, iter, toString, tokenize
    _makePath(ks, has_create) {
        var point = this.routes;
        for (let c of ks) {
            let pvalue = point.get(c);
            if (pvalue !== undefined) {
                let pnext = Trie.asBin(pvalue);
                if (pnext !== undefined) {
                    point = pnext;
                }
                else {
                    let point1 = new Map; // lazy waypoint split
                    point1.set(KZ, pvalue);
                    point.set(c, point1);
                    point = point1;
                }
            }
            else { // create new Bin
                if (has_create) {
                    let newPt = new Map;
                    point.set(c, newPt);
                    point = newPt;
                }
                else {
                    throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`);
                }
            }
        }
        return point;
    }
    path(ks) { return new Trie(this._makePath(ks, false)); }
    makePath(ks) { return new Trie(this._makePath(ks, true)); }
    _getPath(ks) {
        var point = this.routes;
        var pvalue = this.routes;
        const desc = (c) => `failed getting ${ks}:  ${((pvalue !== undefined) ? "end of route" : "no index")} when '${c}'`;
        for (let c of ks) {
            if (point == null) {
                throw Error(desc(c));
            }
            pvalue = point.get(c);
            let pnext = Trie.asBin(pvalue);
            if (pnext !== undefined) {
                point = pnext;
            }
            else {
                point = null;
            } // delay one round.
        }
        if (pvalue === undefined) {
            throw Error(desc(ks[ks.length - 1]));
        }
        return pvalue;
    }
    getPrefix(text) {
        var point = this.routes;
        for (let c of text) {
            let pvalue = point.get(c);
            let pnext = Trie.asBin(pvalue);
            if (pnext !== undefined) {
                point = pnext;
            }
            else if (pvalue !== undefined) {
                return pvalue;
            }
            else {
                break;
            } // just like [tokenize] below
        }
        let pv = Trie.valueAt(point);
        return (pv !== undefined) ? pv : null;
    }
    get(ks) {
        let v = Trie.valueAt(this._getPath(ks));
        if (v === undefined)
            throw Error("not a value path");
        return v;
    }
    set(ks, v) {
        let iKsLast = ks.length - 1; // unchecked
        let point = this._makePath(ks.substr(0, iKsLast), true);
        let k = ks[iKsLast];
        let pvalue = point.get(k);
        if (pvalue !== undefined) {
            let pnext = Trie.asBin(pvalue);
            if (pnext !== undefined) {
                pnext.set(KZ, v);
            } // no split needed
            else {
                let point1 = new Map; // lazy waypoint split
                point1.set(KZ, pvalue);
                point.set(k, point1);
                point = point1;
            }
        }
        else {
            point.set(k, v);
        } // first time: just make a Tip
    }
    remove(ks) {
        let iKsLast = ks.length - 1; // unchecked
        let parent = this._makePath(ks.substr(0, iKsLast), false);
        parent.delete(ks[iKsLast]);
    }
    [Symbol.iterator]() { return this._iter(this.routes, ""); }
    /** This post-order traversal should be fully iterated since it mutates self. */
    *_iter(path, ks_path) {
        let vz = path.get(KZ);
        path.delete(KZ);
        for (let [k, v] of path.entries()) {
            let pnext = Trie.asBin(v);
            if (pnext === undefined || pnext !== undefined && pnext.size == 1 && pnext.get(KZ) !== undefined) {
                yield [ks_path + k, Trie.valueAt(v)]; //< optimize val-only node
            }
            else {
                yield* this._iter(pnext, ks_path + k);
            } //< size != 1
        }
        if (vz !== undefined)
            yield [ks_path, vz];
        path.set(KZ, vz); // restore.
    }
    toString() {
        let sb = new StringBuild;
        for (let [k, v] of this)
            sb.append(`${k}=${v}\n`);
        return sb.toString();
    }
    /** pre-order tree format */
    formatWith(fmt) {
        const _visitRec = (fmt, point) => {
            let vz = point.get(KZ);
            point.delete(KZ); // hide, first KZ
            if (vz != undefined)
                fmt.onItem(`=${vz}`);
            for (let [k, v] of point.entries()) {
                let pnext = Trie.asBin(v);
                if (pnext !== undefined) {
                    fmt.onItem(k);
                    fmt.onOpen();
                    _visitRec(fmt, pnext);
                    fmt.onClose();
                }
                else {
                    fmt.onItem(`${k}=${v}`);
                }
            }
            point.set(KZ, vz);
        };
        _visitRec(fmt, this.routes);
    }
    /** WARN: may get stuck when [inword_grep] replaced to matching sequence, when re subst is "\0", means match treated as unknown  */
    *tokenize(input, inword_grep = () => null) {
        let recognized = new StringBuild; // cannot use getPrefix&substring (feat inword grep)
        var i = 0;
        let n = input.length;
        var point = this.routes;
        while (i < n) {
            let c = input[i]; // trie charseq match.
            let pvalue = point.get(c);
            let pnext = Trie.asBin(pvalue);
            if (pvalue !== undefined) {
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
                } //^ inword grep first, always
                recognized.append(c);
                i++;
                if (pnext !== undefined) {
                    point = pnext;
                }
                else { // lazy value-Tip waypoint
                    yield [recognized.toString(), pvalue];
                    point = this.routes;
                    recognized.clear();
                }
            }
            else { // STOP(pvalue=undef) of one word at its len+1, prepare for re-match
                let state0 = this.routes; // cache initial match state
                let pv = Trie.valueAt(point);
                if (pv !== undefined) {
                    yield [recognized.toString(), pv];
                }
                else {
                    if (!recognized.isEmpty)
                        yield [recognized.toString(), null]; // unknown prefix
                    let iUnrecog = i;
                    while (!state0.has(input[i]) && i < n) {
                        i++;
                    }
                    ; // optimized skip
                    let unrecog = input.substring(iUnrecog, i);
                    if (unrecog != "")
                        yield [unrecog, null];
                }
                point = state0;
                recognized.clear();
            }
        }
        let pv = Trie.valueAt(point);
        if (pv !== undefined) {
            yield [recognized.toString(), pv];
        } // word stop at EOS
        else if (!recognized.isEmpty) {
            yield [recognized.toString(), null];
        }
    }
    static joinValues(toks, sep) {
        let vs = [];
        for (let kv of toks) {
            let v = kv[1];
            if (v !== null && v != "")
                vs.push(v);
        }
        return (vs.length == 0) ? null : vs.join(sep);
    }
    static valueAt(point) { return ((point instanceof Map) ? point.get(KZ) : point); }
    static asBin(point) { return (point instanceof Map) ? point : undefined; }
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
    onClose() {
        let n = this._indent.length;
        this._indent = this._indent.substring(0, n - this.indentation.length);
    }
    onItem(text) { this.append(this._indent); this.append(text); this.append(this.newline); }
}
class BracketFmt extends StringBuild {
    constructor(brackets, separator) {
        super();
        this._isFirst = true;
        this.brackets = brackets;
        this.separator = separator;
    }
    onOpen() {
        this.append(this.separator);
        this.append(this.brackets[0]);
        this._isFirst = true;
    }
    onClose() { this.append(this.brackets[1]); }
    onItem(text) {
        if (!this._isFirst) {
            this.append(this.separator);
        }
        else {
            this._isFirst = false;
        } // switcher
        this.append(text);
    }
    clear() { this._isFirst = true; return super.clear(); }
}
