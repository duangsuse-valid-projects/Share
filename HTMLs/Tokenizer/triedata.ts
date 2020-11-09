// == Trie & Formatter Backend (Rev. 2, with Lazy Trie.Bin Alloc) ==
type PairString = [string, string]
type STrie = Trie<string, string>

type Routes<K, V> = Map<K, Waypoint<K, V>>
type Waypoint<K, V> = (Routes<K, V> | V) // pt[KZ] is V; (lazy allocated) is V
const KZ = undefined; // 1:1 value on Trie node

class Trie<K, V> implements Iterable<[K[], V]> {
  routes: Routes<K, V>;
  constructor(m: Routes<K, V> = new Map) { this.routes = m; }
  get value() { return Trie.valueAt(this.routes); }
  set value(v: V) { this.routes.set(KZ, v); }

  // path, makePath, get, set, iter, toString, tokenize
  _makePath(ks: K[], has_create: boolean): Routes<K, V> {
    var point = this.routes;
    for (let c of ks) {
      let pvalue = point.get(c);
      if (pvalue !== undefined) {
        let pnext = Trie.asBin(pvalue);
        if (pnext !== undefined) { point = pnext; }
        else {
          let point1: Routes<K, V> = new Map; // lazy waypoint split
          point1.set(KZ, pvalue as V);
          point.set(c, point1);
          point = point1;
        }
      } else { // create new Bin
        if (has_create) { let newPt: Routes<K, V> = new Map; point.set(c, newPt); point = newPt; }
        else { throw Error(`failed getting ${ks}: no ${c} at ${new Trie(point)}`); } // error performance?
      }
    }
    return point;
  }
  path(ks: K[]) { return new Trie(this._makePath(ks, false)); }
  makePath(ks: K[]) { return new Trie(this._makePath(ks, true)); }

  _getPath(ks: K[]): Waypoint<K, V> { // don't do lazy split
    var point = this.routes;
    var pvalue: Waypoint<K, V> = this.routes;
    const desc = (hit:string, c:K) => `failed getting ${ks}:  ${((pvalue !== undefined)? "end of route" : "no index")} ${hit} '${c}'`;
    for (let c of ks) {
      if (point == null) { throw Error(desc("before", c)); }
      pvalue = point.get(c);
      let pnext = Trie.asBin(pvalue);
      if (pnext !== undefined) { point = pnext; }
      else { point = null; } // delay one round.
    }
    if (pvalue === undefined) { throw Error(desc("when", ks[ks.length -1])); }
    return pvalue;
  }
  getPrefix(ks: K[]): V|null {
    var point = this.routes;
    for (let c of ks) {
      let pvalue = point.get(c);
      let pnext = Trie.asBin(pvalue);
      if (pnext !== undefined) { point = pnext; }
      else if (pvalue !== undefined) { return pvalue as V; }
      else { break; } // just like [tokenize] below
    }
    let pv = Trie.valueAt(point);
    return (pv !== undefined)? pv : null;
  }
  get(ks: K[]): V {
    let v = Trie.valueAt(this._getPath(ks));
    if (v === undefined) throw Error("not a value path");
    return v;
  }
  set(ks: K[], v: V) {
    let iKsLast = ks.length -1; // unchecked
    let point = this._makePath(ks.slice(0, iKsLast), true);
    let k = ks[iKsLast];
    let pvalue = point.get(k);
    if (pvalue !== undefined) {
      let pnext = Trie.asBin(pvalue);
      if (pnext !== undefined) { pnext.set(KZ, v); } // no split needed
      else {
        let point1: Routes<K, V> = new Map; // lazy waypoint split
        point1.set(KZ, pvalue);
        point.set(k, point1);
        point = point1;
      }
    } else { point.set(k, v); } // first time: just make a Tip
  }
  remove(ks: K[]) {
    let iKsLast = ks.length -1; // unchecked
    let parent = this._makePath(ks.slice(0, iKsLast), false);
    parent.delete(ks[iKsLast]);
  }

  [Symbol.iterator]() { return this._iter(new Array<K>(), this.routes); }
  /** This post-order traversal should be fully iterated since it mutates self. */
  *_iter(ks_path: K[], path: Routes<K, V>): Generator<[K[], V]> { // rewrite as visitWith to support ES5?
    let vz = path.get(KZ) as V; path.delete(KZ);
    for (let [k, v] of path.entries()) {
      let pnext = Trie.asBin(v);
      ks_path.push(k);
      if (pnext === undefined || pnext !== undefined && pnext.size == 1 && pnext.get(KZ) !== undefined) {
        yield [ks_path, Trie.valueAt(v)]; //< optimize val-only node
      } else { yield* this._iter(ks_path, pnext); } //< size != 1
      ks_path.pop();
    }
    if (vz !== undefined) yield [ks_path, vz];
    path.set(KZ, vz); // restore.
  }

  toString() {
    let sb = new StringBuild;
    for (let [k, v] of this) sb.append(`${k.join("")}=${v}\n`);
    return sb.toString();
  }
  /** pre-order tree format */
  formatWith(fmt: RecurStructFmt) {
    const _visitRec = (fmt: RecurStructFmt, point: Routes<K, V>) => {
      let vz = point.get(KZ) as V; point.delete(KZ); // hide, first KZ
      if (vz != undefined) fmt.onItem(`=${vz}`);
      for (let [k, v] of point.entries()) {
        let pnext = Trie.asBin(v);
        if (pnext !== undefined) { fmt.onItem((`${k}`)); fmt.onOpen(); _visitRec(fmt, pnext); fmt.onClose(); }
        else { fmt.onItem(`${k}=${v}`); }
      }
      point.set(KZ, vz);
    };
    _visitRec(fmt, this.routes);
  }

  static valueAt<K, V>(point: Waypoint<K, V>) { return ((point instanceof Map)? point.get(KZ) : point) as V; }
  static asBin<K, V>(point: Waypoint<K, V>): Routes<K, V>|undefined { return (point instanceof Map)? point : undefined; }
  static fromMap<V>(map: Map<string, V>) {
    let trie: Trie<string, V> = new Trie;
    for (let [k, v] of map.entries()) if (k !== "" && k != null) trie.set(chars(k), v); // check
    return trie;
  } //^ Typescript is bad at overloading...
}

function chars(s: string): string[] { return [...s]; }
function* joinIterate<V>(iter:Iterable<[any[], V]>): Iterable<[string, V]> {
  for (let [ks, v] of iter) yield [ks.join(""), v];
}
function joinValues(toks: Iterable<[string, any?]>, sep: string) {
  let vs = [];
  for (let kv of toks) { let v = kv[1]; if (v !== null && v != "") vs.push(v); }
  return (vs.length == 0)? null : vs.join(sep);
}
/** WARN: may get stuck when [inword_grep] replaced to matching sequence, when re subst is "\0", means match treated as unknown  */
function *tokenizeTrie<V>(trie: Trie<string, V>, input: string, inword_grep: (c:string) => [RegExp, string]|null = () => null): Iterable<[string, V?]> {
  trie.routes.delete(KZ); // force remove unchecked UB data that cause infinte loop
  let recognized = new StringBuild; // cannot use getPrefix&substring (feat inword grep)
  var i = 0; let n = input.length;
  var point = trie.routes;
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
        point = trie.routes;
        recognized.clear();
      }
    } else { // STOP(pvalue=undef) of one word at its len+1, prepare for re-match
      let state0 = trie.routes; // cache initial match state
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
  indentation: string; newline: string; _indent: string = "";
  constructor(indentation: string = "  ", newline = "\n") { super(); this.indentation = indentation; this.newline = newline; }
  onOpen() { this._indent += this.indentation; }
  onClose() {
    let n = this._indent.length;
    this._indent = this._indent.substring(0, n - this.indentation.length);
  }
  onItem(text: string) { this.append(this._indent); this.append(text); this.append(this.newline); }
}
class BracketFmt extends StringBuild implements RecurStructFmt {
  brackets: PairString; separator: string; _isFirst: boolean = true;
  constructor(brackets: PairString, separator: string) { super(); this.brackets = brackets; this.separator = separator; }
  onOpen() {
    this.append(this.separator); this.append(this.brackets[0]);
    this._isFirst = true;
  }
  onClose() { this.append(this.brackets[1]); }
  onItem(text: string) {
    if (!this._isFirst) { this.append(this.separator); }
    else { this._isFirst = false; } // switcher
    this.append(text);
  }
  clear() { this._isFirst = true; return super.clear(); }
}
