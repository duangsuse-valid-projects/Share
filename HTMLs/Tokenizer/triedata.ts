// == Trie & Formatter Backend (rev 2 with Lazy Alloc) ==
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
    var point = this.routes;
    var point0: Routes<V>; 
    var c0: string;
    for (let c of ks) {
      c0 = c; point0 = point; // store parent pt.
      let pvalue = point.get(c) as Routes<V>;
      if (pvalue !== undefined) { point = pvalue; }
      else {
        if (has_create) { let newPt: Routes<V> = new Map; point.set(c, newPt); point = newPt; }
        else { throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`); }
      }
    }
    if (!(point instanceof Map)) { // lazy waypoint split
      let point1: Routes<V> = new Map;
      point1.set(KZ, point as V);
      point0.set(c0, point1);
      point = point1;
    }
    return point;
  }
  path(ks: string): Trie<V> { return new Trie(this._makePath(ks, false)); }
  makePath(ks: string): Trie<V> { return new Trie(this._makePath(ks, true)); }

  get(ks: string): V {
    let v = Trie.valueAt(this._makePath(ks, false));
    if (v == undefined) throw Error("not a value path");
    return v;
  }
  set(ks: string, v: V) { this._makePath(ks, true).set(KZ, v); }
  remove(ks: string) {
    let iKsLast = ks.length -1; // unchecked
    let parent = this._makePath(ks.substr(0, iKsLast), false);
    parent.delete(ks[iKsLast]);
  }

  /** This should be fully iterated since it mutates self. */
  [Symbol.iterator]() { return this._iter(this.routes, ""); }
  *_iter(path: Routes<V>, ks_path: string): Generator<[string, V]> { // rewrite as visitWith to support ES5?
    let vz = path.get(KZ) as V; path.delete(KZ);
    for (let [k, v] of path.entries()) {
      let pv = Trie.valueAt(v);
      let isMap = v instanceof Map;
      if (pv !== undefined && (!isMap || isMap && (v as Routes<V>).size == 1)) yield [ks_path+k, pv]; // optimize val-only node
      else yield* this._iter(v as Routes<V>, ks_path+k);
    }
    if (vz !== undefined) yield [ks_path, vz]; // post-order
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
        fmt.onItem(k);
        fmt.onOpen(); _visitRec(fmt, v as Routes<V>); fmt.onClose();
      }
      point.set(KZ, vz);
    };
    _visitRec(fmt, this.routes);
  }

  /** WARN: may got stuck when [inword_grep] replaced to matching sequence, when re subst is "\0", means match treated as unknown  */
  *tokenize(input: string, inword_grep: (c:string) => [RegExp, string]|null = () => null): Iterable<[string, V?]> {
    let recognized = new StringBuild;
    var i = 0; let n = input.length;
    var point = this.routes;
    while (i < n) {
      let c = input[i]; // trie charseq match.
      let pvalue = point.get(c);
      if (pvalue != undefined) {
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
        }
        point = pvalue as Routes<V>;
        recognized.append(c);
      } else { // stop of one word at len+1, prepare for re-match
        let pv = Trie.valueAt(point);
        let state0 = this.routes; // initial match state
        if (pv != undefined) { i--; yield [recognized.toString(), pv]; }
        else {
          if (!recognized.isEmpty) yield [recognized.toString(), null]; // unknown prefix
          let iUnrecog = i;
          while (!state0.has(input[i]) && i < n) { i++; } // optimized skip
          let unrecog = input.substring(iUnrecog, i);
          if (unrecog.length != 0) yield [unrecog, null];
          i--; // =continue, to recogzd idx.
        }
        point = state0;
        recognized.clear();
      }; i++
    }
    let pv = Trie.valueAt(point);
    if (pv != undefined) { yield [recognized.toString(), pv]; } // word stop at EOS
    else if (!recognized.isEmpty) { yield [recognized.toString(), null]; }
  }
  static joinValues(toks: Iterable<[string, any?]>, sep: string) {
    let vs = [];
    for (let kv of toks) { let v = kv[1]; if (v != null && v != "") vs.push(v); }
    return (vs.length == 0)? null : vs.join(sep);
  }
  static valueAt<V>(point: Waypoint<V>) { return ((point instanceof Map)? point.get(KZ) : point) as V; }
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
