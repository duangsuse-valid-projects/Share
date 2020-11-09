// == Trie & Formatter Backend (Rev. 2, with Lazy Trie.Bin Alloc) ==
type PairString = [string, string]
type STrie = Trie<string>

type Routes<V> = Map<string, Waypoint<V>>
type Waypoint<V> = (Routes<V> | V) // pt[KZ] is V; (lazy allocated) is V
const KZ = "\0"; // 1:1 value on Trie node

class Trie<V> implements Iterable<[string, V]> {
  routes: Routes<V>;
  constructor(m: Routes<V> = new Map) { this.routes = m; }
  get value() { return Trie.valueAt(this.routes); }
  set value(v: V) { this.routes.set(KZ, v); }

  // path, makePath, get, set, iter, toString, tokenize
  _makePath(ks: string, has_create: boolean): Routes<V> {
    var point: Routes<V> = this.routes;
    for (let c of ks) {
      let pvalue = point.get(c);
      let pnext = Trie.asBin(pvalue);
      if (pvalue !== undefined) {
        if (pnext !== undefined) { point = pnext; }
        else {
          let point1: Routes<V> = new Map; // lazy waypoint split
          point1.set(KZ, pvalue as V);
          point.set(c, point1);
          point = point1;
        }
      } else { // create new Bin
        if (has_create) { let newPt: Routes<V> = new Map; point.set(c, newPt); point = newPt; }
        else { throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`); }
      }
    }
    return point;
  }
  path(ks: string): Trie<V> { return new Trie(this._makePath(ks, false)); }
  makePath(ks: string): Trie<V> { return new Trie(this._makePath(ks, true)); }

  _getPath(ks: string): Waypoint<V> { // don't do lazy split
    var point: Waypoint<V> = this.routes;
    for (let c of ks) {
      let pnext = Trie.asBin(point);
      if (pnext !== undefined) { point = pnext.get(c); }
      else {
        let pv = point as V;
        if (pv !== undefined) { return pv; }
        else { throw Error(`failed getting ${ks}: at ${c}`); }
      }
    }
    return point;
  }
  getPrefix(text: string): V|null { // just like above^^^
    var point = this.routes;
    var pvalue: Waypoint<V>;
    for (let c of text) {
      pvalue = point.get(c);
      let pnext = Trie.asBin(pvalue);
      if (pnext !== undefined) { point = pnext; }
      else { break; }
    }
    let pv = Trie.valueAt(pvalue);
    return (pv !== undefined)? pv : null;
  }
  get(ks: string): V {
    let v = Trie.valueAt(this._getPath(ks));
    if (v === undefined) throw Error("not a value path");
    return v;
  }
  set(ks: string, v: V) {
    let iKsLast = ks.length -1; // unchecked
    let point = this._makePath(ks.substr(0, iKsLast), true);
    let k = ks[iKsLast];
    let pvalue = point.get(k);
    if (pvalue !== undefined) {
      let pnext = Trie.asBin(pvalue);
      if (pnext !== undefined) { pnext.set(KZ, v); } // no split needed
      else {
        let point1: Routes<V> = new Map; // lazy waypoint split
        point1.set(KZ, pvalue);
        point.set(k, point1);
        point = point1;
      }
    } else { point.set(k, v); } // first time: just make a Tip
  }
  remove(ks: string) {
    let iKsLast = ks.length -1; // unchecked
    let parent = this._makePath(ks.substr(0, iKsLast), false);
    parent.delete(ks[iKsLast]);
  }

  [Symbol.iterator]() { return this._iter(this.routes, ""); }
  /** This post-order traversal should be fully iterated since it mutates self. */
  *_iter(path: Routes<V>, ks_path: string): Generator<[string, V]> { // rewrite as visitWith to support ES5?
    let vz = path.get(KZ) as V; path.delete(KZ);
    for (let [k, v] of path.entries()) {
      let pnext = Trie.asBin(v);
      if (pnext === undefined || pnext !== undefined && pnext.size == 1 && pnext.get(KZ) !== undefined) {
        yield [ks_path+k, Trie.valueAt(v)]; //< optimize val-only node
      } else { yield* this._iter(pnext, ks_path+k); } //< size != 1
    }
    if (vz !== undefined) yield [ks_path, vz];
    path.set(KZ, vz); // restore.
  }

  toString() {
    let sb = new StringBuild;
    for (let [k, v] of this) sb.append(`${k}=${v}\n`);
    return sb.toString();
  }
  formatWith(fmt: RecurStructFmt) {
    const _visitRec = (fmt: RecurStructFmt, point: Routes<V>) => {
      let vz = point.get(KZ) as V; point.delete(KZ); // hide, first KZ
      if (vz != undefined) fmt.onItem(`=${vz}`);
      for (let [k, v] of point.entries()) {
        let pnext = Trie.asBin(v);
        if (pnext !== undefined) { fmt.onItem(k); fmt.onOpen(); _visitRec(fmt, pnext); fmt.onClose(); }
        else { fmt.onItem(`${k}=${v}`); }
      }
      point.set(KZ, vz);
    };
    _visitRec(fmt, this.routes);
  }

  /** WARN: may get stuck when [inword_grep] replaced to matching sequence, when re subst is "\0", means match treated as unknown  */
  *tokenize(input: string, inword_grep: (c:string) => [RegExp, string]|null = () => null): Iterable<[string, V?]> {
    let recognized = new StringBuild; // cannot use getPrefix&substring (feat inword grep)
    var i = 0; let n = input.length;
    var point = this.routes;
    while (i < n) {
      let c = input[i]; // trie charseq match.
      let pvalue = point.get(c);
      let pnext = Trie.asBin(pvalue);
      if (pvalue !== undefined) {
        let grep = inword_grep(c); // in-word grep feat.
        let m: RegExpExecArray;
        if (grep != null && (m = grep[0].exec(input.substr(i))) != null) {
          let [re, subst] = grep;
          if (subst == c) { i += m[0].length -1/*for c*/; }
          else if (subst == "\0") {
            yield [input.substr(i, m[0].length), null];
            i += m[0].length -1/*for c*/;   //< copycat!
            i++; continue;
          } else {
            input = m[0].replace(re, subst) + input.substr(i+m[0].length);
            i = 0; // reset view at/after c
            if (subst[0] == c) {/*accept*/}
            else { continue; }
          }
        } //^ inword grep first, always
        recognized.append(c); i++;
        if (pnext !== undefined) {
          point = pnext;
        } else { // lazy value-Tip waypoint
          yield [recognized.toString(), pvalue as V];
          point = this.routes;
          recognized.clear();
        }
      } else { // STOP(pvalue=undef) of one word at its len+1, prepare for re-match
        let state0 = this.routes; // cache initial match state
        let pv = Trie.valueAt(point);
        if (pv !== undefined) { yield [recognized.toString(), pv]; }
        else {
          if (!recognized.isEmpty) yield [recognized.toString(), null]; // unknown prefix
          let iUnrecog = i;
          while (!state0.has(input[i]) && i < n) { i++; }; // optimized skip
          let unrecog = input.substring(iUnrecog, i);
          if (unrecog != "") yield [unrecog, null];
        }
        point = state0;
        recognized.clear();
      }
    }
    let pv = Trie.valueAt(point);
    if (pv !== undefined) { yield [recognized.toString(), pv]; } // word stop at EOS
    else if (!recognized.isEmpty) { yield [recognized.toString(), null]; }
  }
  static joinValues(toks: Iterable<[string, any?]>, sep: string) {
    let vs = [];
    for (let kv of toks) { let v = kv[1]; if (v !== null && v != "") vs.push(v); }
    return (vs.length == 0)? null : vs.join(sep);
  }
  static valueAt<V>(point: Waypoint<V>) { return ((point instanceof Map)? point.get(KZ) : point) as V; }
  static asBin<V>(point: Waypoint<V>): Routes<V>|undefined { return (point instanceof Map)? point : undefined; }
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
