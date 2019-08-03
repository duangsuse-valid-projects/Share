'use strict';

/* JavaScript ((partial) Function Programming)? library~ */

//// ES5(6) Type checks
function _is(ident) {
  return function judger(obj)
    { return typeof obj === ident; };
}
function _isActual(ref) {
  return function coldJudger(obj)
    { return obj === ref; };
}
var kindof = {
  boolean: _is('boolean'),
  number: _is('number'),
  integer: _is('bigint'),
  string: _is('string'),
  symbol: _is('symbol'),
  object: _is('object'),
  fun: _is('function'),
  nulltype: _is('object'),
  undeftype: _is('undefined'),
  undID: typeof undefined
};
var is = Object.create(kindof);
is.null = _isActual(null);
is.undef = _isActual(undefined);
is.und = _isActual(kindof.undID);
is.nan
  = (Number.isNaN)? function nan(x) { return Number.isNaN(x); }
  : function _nan(x) { return isNaN(x); };
is.int = function _isInt(x) { return Math.trunc(x) === x; };
is.natural = function _natural(x) { return x>=0 && is.int(x); };
is.inf = _isActual(Infinity);
is.neginf = _isActual(-Infinity);
is.zero = _isActual(0);
is.m1 = _isActual(-1);
is.funamed = function funamed(name) {
  return function fjudge(f) { return is.fun(f) && f.name === name; }; };
is.empty = function isempty(x) { return x.length === 0; };
is.exist = function exists(name) { return is.defined(toplevelThis()[name]); };
is.none = function isNone(x) { return is.null(x) || is.undef(x); };

function toplevelThis() {
  var bad = function() { return Function('return this')(); }
  return (is.nund(typeof globalThis)? (globalThis)
  :(is.nund(typeof self)? (self)
  :(is.nund(typeof window)? (window)
  :(is.nund(typeof global)? (global) : bad())))); }

function ensure(p,m) { if(!p) throw Error(m); }
function ensureBehavior(it, fname) {
  if (fname in it) { return it[fname]; }
  else { throw Error("Undefined behavior `"+fname+"' for "+it); }}
function noimp() { throw Error("Function not implemented"); }

//// PlainJS module for Node compat
if(!is.object(document))
var document = document || {
  getElementById:noimp, querySelectorAll:noimp, importNode:noimp};
var NodeList = NodeList || null;
var HTMLCollection = HTMLCollection || null;

//// Functions
function bound(self, meth) { return ensureBehavior(self, meth).bind(self); }
function boundVargs(self, meth) { var f=bound(self, meth);
  return function boundCallVargs(argv) { return f.apply(f, argv); }; }
function boundStaticVargs(f) { 
  return function staticCallVargs(argv) { return f.apply(f, argv); }; }

function args2ary(argsv) { var ary=[];
  forIter(tryIter(argsv), bound(ary, 'push')); return ary; }
  
function id(x) { return x; }
function konst(x) { return function constant() { return x; }; }

function add(a,b) { return a+b; }
function sub(a,b) { return a-b; }
function mul(a,b) { return a*b; }
function div(a,b) { return a/b; }

function not(p) { return !p; }
function and(p, q) { return p && q; }
function or(p, q) { return p || q; }

function lessThan(a, x) { return x < a; }
function fulleq(x, y) { return x === y; }
function greaterThan(a, x) { return x > a; }

function elem(x, o) { return x in o; }
function oget(x, o) { return o[x]; }
function oset(x, o, v) { o[x] = v; }

// Monkey patching!
Function.prototype.flip = function flip() { var method = this;
  return function flipped() { return method.apply(method, args2ary(arguments).reverse()); }; };
Function.prototype.curry1 = function curry1(x0) { return this.bind(this, x0); };
Function.prototype.curry2 = function curry2(x0, x1) { return this.bind(this, x0, x1); };
Function.prototype.curried1 = function curried1() { var f=this;
  return function give1(x0) { return function() { return f(x0); }; }; };
Function.prototype.curried2 = function curried2() { var f=this;
  return function give2(x0) {
  return function give1(x1) { return function() { return f(x0, x1); }; }; }; };
Function.prototype.andThen = function andThen(g) { var f=this;
  return function composition(x) { return g(f(x)); }; };
Function.prototype.andThenVargs = function andThenVargs(g) { var f=this;
  return function vcomposition() { return g(f.apply(f, arguments)); }; };
Function.prototype.also = function also(g) { var f=this;
  return function effectAlso(x) { var y=f(x); g(y); return y; }; };
Function.prototype.alsoVargs = function alsoVargs(g) { var f=this;
  return function veffectAlso() { var y=f.apply(f, arguments); g(y); return y; }; };
Function.prototype.times = function times(t) { for(;t!==0;--t) this(); }
Object.prototype.lets = Object.prototype.lets || function lets(f) { return f(this); };

function _curriedN(f, ff, n) {
  if (n == 0) return ff;
  return function nextDefault(x_)
    { return _curriedN(f, ff.bind(f, x_), n-1); };
}

Function.prototype.curriedN = function
		curriedN(n) { return _curriedN(this, this, n); };

Function.prototype.ap = function apply(argsv) {
  if (!argsv || argsv.length ===0) return this();
  for (var fx = this; is.fun(fx); fx = fx(argsv.shift()));
  return fx; };

function docall(fname, x0, x1) {
  return function invoko(it) {
    var fn = bound(it, fname);
    if (x1) return fn(x0, x1);
    return (x0)? fn(x0): fn(); };
}

function argsv() { return args2ary(arguments); }

is.some = is.empty.andThen(not);
is.single = oget.curry1('length').andThen(fulleq.curry1(1));
is.defined = is.undef.andThen(not);
is.nund = is.und.andThen(not);
is.nm1 = is.m1.andThen(not);
is.notfun = is.fun.andThen(not);
var mix = bound(Object, 'assign').curriedN(1);
var globalThis = globalThis || toplevelThis();

//// Stream iterator function
function _done() { return { value: undefined, done: true }; }
function _undone(v) { return { value: v, done: false }; }

var breakIter = Object.create(Error);
breakIter.br = true;
var nextIter = Object.create(Error);
nextIter.br = false;

function intoIter(xs) { var i = 0;
  return function
    iterator() { return (i<xs.length)? _undone(xs[i++]) : _done(); }; }
function tryIter(xs) {
  if (typeof xs ==='function') return xs;
  if (!Symbol || !(xs[Symbol.iterator])) return intoIter(xs);
  return bound(xs[Symbol.iterator](), 'next'); }
function forIter(it, f) {
  var fst = it(); if(fst.done) return;
  for (var xc=fst; !xc.done; xc = it())
    try { f(xc.value); }
    catch (e) { if (e.br) break; else continue; }}

var foreach = tryIter.andThen(bound(forIter, 'curry1'));

function _nextProtect(it) {
  try { var res = it(); }
  catch (e) { return (e.br)? {done:true,value:breakIter}
    : _undone(nextIter); }
  return res;
}
function nextProtect(it) {
  var res1 = _nextProtect(it);
  if (!res1.done && res1.value === nextIter) {
    var res_ = res1;
    while (!res_.done && res_.value === nextIter)
      res_ = _nextProtect(it);
    return res_;
  } else return res1;
}

//// Stream helper functions
function xsSingle(xs) {
  if (typeof xs ==='function') {
    var fst = nextProtect(xs);
    ensure(!fst.done, 'Generator is empty');
    ensure(nextProtect(xs).done, 'Generator not single');
    return fst.value; }
  else {
    ensure(xs.length === 1, 'Array-like not single ('+xs.length+')');
    return xs[0]; }
}

function xsHead(xs) {
  if (typeof xs ==='function') {
    var fst = nextProtect(xs);
    ensure(!fst.done, 'Generator is empty');
    return fst.value; }
  else {
    ensure(xs.length >= 1, 'Array-like is empty');
    return xs[0]; }
}
// Use it paired with xsHead
function xsTail(xs) {
  if (typeof xs ==='function') { return xs; } // no effect
  else { return xs.slice(1, xs.length); }
}

function take(n, xs) {
  var ary = [];
  xs = tryIter(xs);
  var x; while (n !=0 && !(x = nextProtect(xs)).done) {
    ary.push(x.value); --n; }
  return ary;
}
function drop(n, xs) {
  xs = tryIter(xs);
  for(var i=1; i<=n; ++i) nextProtect(xs); return xs; }

var collect = take.curry1(Infinity);

//// Web Browser \ DOM related
function _isLoaded(rs) {
  return rs === undefined ||
    rs === 'loaded' ||
    rs === 'complete'; }

function _waits(nd, f) {
  if (nd ===document.body) {
    bound(document, 'addEventListener').curry1('DOMContentLoaded')(f);
    return; }
  nd.onload = nd.onreadystatechange = function () {
    if (_isLoaded(this.readystate)) { f(); } };
}

var logs = console.log.curried1();
var helem = bound(document, 'getElementById');
var merges = bound(document, 'importNode').flip().curry1(true);
var cssSelect = bound(document, 'querySelectorAll');

var waitsId = helem.andThen(_waits.curriedN(1));
var waitsCss = cssSelect.andThen(xsSingle).andThen(_waits.curriedN(1));
var _____ = _waits.curry1(document.body);

function delay(t, f) { window.setTimeout(f, t); }
var secs = mul.curry1(1000);

function append(nd, x) { nd.parentNode.insertAfter(x, nd); };
function prepend(nd, x) { nd.parentNode.insertBefore(x, nd); };

function xhrSend() {}
function xhrGET() {}
function xhrPOST() {}

var xhr = { send: xhrSend, gets: xhrGET, posts: xhrPOST };

// Monkey patching!
foreach ([NodeList, HTMLCollection, Array]) (function(it){
  it.prototype.each = function each(f) { foreach(this)(f); };
});

//// Multi-Dimension arrays
var dimAllocSize = foldl.curry2(mul, 1);
function dimGetElemPtr(sizes) { return function(is) {
  var ptr = 0;
  for (var i=0; i<is.length; i++) {
    var csize = (i+1<is.length)? sizes[i+1] : 1;
    ptr += (csize * is[i]); }
  return ptr;
}; }

//// More stream operator \ generator
function lookAhead1(xs) {
  if (typeof xs ==='function' && xs.name === 'peeky') return xs;
  var fst = null, cachey = nextProtect(xs);
  return function peeky() {
    fst = nextProtect(xs);
    if (fst.done) { if (cachey !=null)
      { var _cachey=cachey;cachey=null;
        return _undone(_cachey.value); }
      else { return _done(); }}
    return mix(_undone(cachey.value)) ({next:(cachey=fst).value}); };
}
var tryLookAhead1Iter = tryIter.andThen(lookAhead1);

function _foldl(f, v, xs) { var x;
  if ((x = nextProtect(xs)).done) return v;
  else return _foldl(f, f(v, x.value), xs);
}
function foldl(f,v,xs) { return _foldl(f, v, tryIter(xs)); }
function foldl1(f, xs) {
  var init = xs.lets(xsHead);
  return foldl(f, init, xs.lets(xsTail));
}

function _foldr(f, v, xs) { var x;
  if ((x = nextProtect(xs)).done) return v;
  else return f(x.value, _foldr(f, v, xs));
}
function foldr(f,v,xs) { return _foldr(f, v, tryIter(xs)); }

function foldr1(f, xs) { var x, r;
  if ((x = nextProtect(xs)).done) return undefined;
  r = foldr1(f, xs);
  if (is.undef(r)) return x.value;
  else return f(x.value, r);
}

function foldnl(f, v, t) {
  for (var i=0; i !== t; ++i) {
    v = f(v, i);
  } return v;
}
function foldnr(f, v, t) {
  while (t !== 0) {
    --t;
    v = f(v, t);
  } return v;
}
var foldn = foldnr;

function map(f, xs) {
  xs = tryIter(xs);
  return function mapper() {
    var x; if(!(x = nextProtect(xs)).done)
      { return _undone(f(x.value)); }
    else { return _done(); } };
}
function filter(p, xs) {
  xs = tryIter(xs);
  return function filt() {
    var x; if(!(x = nextProtect(xs)).done)
      { return _undone(p(x.value)? x.value : nextIter); }
    else { return _done(); } };
}
// join all streams
function join(xss) {
  xss = map(Array.andThen(boundStaticVargs(tryIter)), xss); // iter [[x]]
  var xs = nextProtect(xss); if (xs.done) return konst(_done());
  xs = xs.value; var alldone = false; // :P
  return function joinAll() { var x, phx;
    if (!( phx= (x = nextProtect(xs)).done ) || // iter1
       (!alldone && (!(xs = nextProtect(xss)).done || // ne|xt case
          (!( (xs = konst(_done())) && (alldone = true) )) ) )) { // Ahhhhhh fin case
      if (phx) { xs = xs.value /*:P*/; x = nextProtect(xs); }
      return (x.done)? _done() : _undone(x.value); }
    else return _done(); };
}
// map andThen join
function joinMap(f, xs) {
  xs = tryIter(xs); var ys = konst(_done());
  return function flattenMapper() { var rxs, y;
    if (!(y = nextProtect(ys)).done) { return _undone(y.value); }
    if (!(rxs = nextProtect(xs)).done) {
      ys = tryIter(f(rxs.value));
      throw nextIter; } else { return _done(); } };
}
// [x | x <- xs, x > 10]
function filterMap(f, xs, p) {
  xs = tryIter(xs);
  return function filtMapper() { var x;
    while (!(x = nextProtect(xs)).done) {
      x = x.value;
      if (!p(x)) continue;
      return _undone(f(x)); } return _done(); }; }

// Why not stream? define takeWhile as collector will save my time...
function takeWhile(p, xs) {
  var ary = [];
  xs = tryIter(xs);
  var x; while (!(x = nextProtect(xs)).done && p(x.value))
    ary.push(x.value);
  return ary;
}
// Why not stream? define dropWhile as collector will save my time...
function dropWhile(p, xs) {
  xs = tryLookAhead1Iter(xs); var ary = [];
  if (!p((x = nextProtect(xs)).value)) return ary;
  var x; do { ary.push(x.value); } while (!(x = nextProtect(xs)).done && p(x.next));
  ary.push(x.value);
  return ary;
}

function zipWith(f, xs, ys) {
  xs = tryIter(xs); ys = tryIter(ys);
  return function zipper() {
    var x, y;
    if ((x = nextProtect(xs)).done || (y = nextProtect(ys)).done)
      return _done();
    else return _undone(f(x.value, y.value)); };
}
function zipWith3(f, xs, ys, zs) {
  xs = tryIter(xs); ys = tryIter(ys); zs = tryIter(zs);
  return function trizipper() {
    var x, y, z;
    if ((x = nextProtect(xs)).done ||
        (y = nextProtect(ys)).done ||
        (z = nextProtect(zs)).done) return _done();
    else return _undone(f(x.value, y.value, z.value)); };
}

// [[x, y]] to [[x], [y]]
function unzip(xss) {
  xss = tryIter(xss);
  var reads = [];
  var xi = 0, yi = 0, xsi = -1;
  var gc = function removeGarbageRoots() {
    var mindex = Math.min(xi, yi);
    if (mindex === 0) return;
    reads.splice(0, mindex+1); // splice (0, mindex)
    xi -= mindex; yi -= mindex; // waitfor next index
  };
  var readNext = function cacheNext() {
    gc(); var xs; xs = nextProtect(xss);
    if (xs.done) return;
    reads.push(xs); ++xsi; };
  var checkNext = function checkNext(i) {
      if (i >= reads.length) throw breakIter; };
  var xs = function unzipX() {
    if (xsi < xi) readNext();
    checkNext(xi);
    return _undone(reads[xi++].value[0]);
  };
  var ys = function unzipY() {
    if (xsi < yi) readNext();
    checkNext(yi);
    return _undone(reads[yi++].value[1]);
  };
  return [xs, ys];
}
// [[x, y, z]] to [[x], [y], [z]]
function unzip3(xss) {
  xss = tryIter(xss);
  var reads = [];
  var xi = 0, yi = 0, zi = 0, xsi = -1;
  var gc = function removeGarbageRoots() {
    var mindex = Math.min(xi, yi, zi);
    if (mindex === 0) return;
    reads.splice(0, mindex+1); // splice (0, mindex)
    xi -= mindex; yi -= mindex; zi -= mindex;
  };
  var readNext = function cacheNext() {
    gc(); var xs; xs = nextProtect(xss);
    if (xs.done) return;
    reads.push(xs); ++xsi; };
  var checkNext = function checkNext(i) {
      if (i >= reads.length) throw breakIter; };
  var xs = function unzipX() {
    if (xsi < xi) readNext();
    checkNext(xi);
    return _undone(reads[xi++].value[0]);
  };
  var ys = function unzipY() {
    if (xsi < yi) readNext();
    checkNext(yi);
    return _undone(reads[yi++].value[1]);
  };
  var zs = function unzipZ() {
    if (xsi < zi) readNext();
    checkNext(zi);
    return _undone(reads[zi++].value[2]);
  };
  return [xs, ys, zs];
}

function deepIter(xss) {
  return function undeep() {
    var ary = [];
    xss.each(docall('ap').andThen(bound(ary, 'push')));
    for (var i in ary) { if (ary[i].done) return _done(); }
    return _undone(collect(map(oget.curry1('value'), ary))); };
}

/// Generators
function iterBy(o, next, has_next) {
  if (is.undef(has_next)) has_next = konst(true);
  var acc = o;
  return function iterchain() {
    if (has_next(acc)) {
      var _acc=acc; acc = next(acc);
      return _undone(_acc);
    } else { return _done(); } };
}

function repeat(x, n) {
  var count = n;
  return function repeater() {
    if (count ===0) return _done();
    else --count;
      return _undone(x); };
}

var infseq = repeat.flip().curry1(Infinity);

// Not floating point-safe?
function range(a, b, i) {
  if (!i) { i = 1; }
  var n = a;
  return function enumerator() {
    if (n >= b) return _done();
    var _n = n; n += i;
    return _undone(_n);
  };
}

// Why not simplify? It's a bit complex... QAQ
function orderedLT(xs) {
  if (xs.length && xs.length < 2) return true;
  xs = tryIter(xs); var l = -Infinity, x, y;
  var ps = [];
  while (!(x = nextProtect(xs)).done) {
    y = nextProtect(xs); if (y.done)
      { ps.push(lessThan(x.value, l)); break; }
    x = x.value; y = y.value; //:P
    ps.push(lessThan(y, x));
    l = y;
  }
  return foldl(and, true, ps);
}

function makeCats(items) {
  return foldn.curry2(function(xs) {
    return join([joinMap(function(x) { return map(
      function(c) { return c+x; }, items); }, xs), xs]); }, items);
}

function lazyCats(items) { var xs = items;
return function cats(n) {
  return join([xs, joinMap(function(x)
    { return map(function(c) { return c+x; }, items); },
      (n !== 0)? cats(--n) : konst(_done()))]);
}; }

//// Simple Left-Right recursive(1) Parser Combinator
function chars(str) {
  if (str instanceof Array) return str;
  var iter; if (Symbol && Symbol.iterator &&
    (iter = String.prototype[Symbol.iterator]))
      return bound(iter.bind(str)(), 'next');
  return tryIter(str.split('')); }

function Feeder(charz, fname) {
  this.stream = tryLookAhead1Iter(is.string(charz)? chars(charz) : charz);
  this.count = 0; this.col = 0;
  this.lineNum = 1; this.scanCRLF = false;
  this.fileName = fname || '<feed>';
  this.lastItem = null; this.nextItem = null;
  this.userContext = {};
  this.stack = null;
  this.saveCount = 0;
}
function _eof(s) { return (is.undef(s))? "<eof>" : (is.null(s))? "<begin>" : "`"+s+"'"; }
function _sp(s) { if(is.undef(s)) return '';
  var c = s.charAt(0); return (c == ' ' || c == ':')? s : ' '+s; }
Feeder.prototype.lastIsLF = function isLineFeed()
  { return this.lastItem === '\n'; };
Feeder.prototype.lastIsCR = function isCarriageReturn()
  { return this.lastItem === '\r'; };
Feeder.prototype.lastIsCRLF = function isCRLF()
  { return (this.nextItem === '\n' && this.lastItem === '\r'); };

Feeder.prototype.duplast = function dupLastItem() { ++this.saveCount; };
Feeder.prototype.reset1Tho = function dupLastOnce(r) { this.saveCount = 1; return r; };
Feeder.prototype.next = function nextItem() {
  if (this.saveCount !== 0) { --this.saveCount; return this.lastItem; }
  var x; if ((x = this.stream()).done) { return (this.lastItem= undefined); }
  this.lastItem = x.value; this.nextItem = x.next; var p;
  if ((p = (this.lastIsCRLF() && (this.scanCRLF = true))  )
    || this.lastIsCR() // carriage return is ok immediately
    ||(!this.scanCRLF && this.lastIsLF()) // skip one '\n'
    ||((this.scanCRLF && this.lastIsLF()) && (this.scanCRLF = false)) )
    { ++this.lineNum; this.col = p? (-2)/*for next <nl>*/ : (-1); }
  this.count += 1; this.col += 1;
  return this.lastItem; };
Feeder.prototype.nextNext = function next2() { this.next(); return this.nextItem; };
Feeder.prototype.consume = function consumeItem(fx) {
  if (!is.fun(fx)) { this.next(); return fx; }
  else { var y = fx(this.lastItem); this.next(); return y; }
};
Feeder.prototype.eof = function lastEOF() { return is.undef(this.lastItem); };
Feeder.prototype.hasNext = function nextEOF()
  { return !is.undef(this.nextItem) || this.count === 0; };
Feeder.prototype.loc = function sourceLocation()
  { return this.fileName+':'+this.lineNum+':'+this.col; };
Feeder.prototype.desc = function describe(prefix)
  { return this.loc() +(prefix? prefix : ' ')
    +"(pos="+this.count+'@'+_eof(this.lastItem)+(this.nextItem? ", next=`"+this.nextItem+"')" : ")"); };
Feeder.prototype.logs = function pushStack(x)
  { if (!is.null(this.stack)) this.stack.push(x); return this; };
Feeder.prototype.leave = function popStack()
  { if (!is.null(this.stack)) this.stack.pop(); return this; };

function primCtor(ct) {
switch (ct) {
  case Object: return true;
  case Array: return true;
  case String: return true;
  case Number: return true;
  case Boolean: return true;
  case Function: return true;
  case Error: return true;
  case Date: return true;
  case RegExp: return true;
} return false;
}

function makeNew(ctor) {
  return function constructNew(matches) {
    if (primCtor(ctor)) { return ctor.apply(null, matches); }
    var ths = new Object; var o = ctor.apply(ths, matches); return ths; } }
///
function parsed(xs) { return xs[0]; }
function presult(xs) { return xs[1]; }
function perror(xs) { return xs[1]; }

function pmatch(v) { return [true, v]; }
function pfail(m) { return [false, is.undef(m)? '' : m]; }

//
function seq(ps, folder, msgr) { // 不好意思... 这个流组合子的架构有点过分了...
if (!is.fun(msgr)) msgr = function failed(f, r, i, err) // 好像很多子程序都得手动指定自己消不消耗字符
  { return "Parser failed @"+f.desc()+", sequence item "+i+": " + err; };
if (!is.fun(folder)) folder = makeNew(Array);
return function sequential(feeder) {
  var rs = [], i = 0, fail = null;
  foreach(ps)(function(parser) {
    var result = parser(feeder);
    if (parsed(result)) { rs.push(presult(result)); }
    else { var msg = msgr(feeder, rs, i, perror(result));
      fail = msg; throw breakIter; }
    i += 1; });
  if (!is.null(fail)) {
    if (fail instanceof Error) { throw fail; }
    else return pfail(fail); }
  return pmatch(folder(rs));
}; }

// 想想看 seq 的方式和 possible 的方式还可能是无法调节，
// 重置，可是如果是在 possible 里，如果让 possible 处理这个不一致则会显得莫名其妙
// （而且很难看，因为目标是 next，如果一个成功什么都不做、如果一个失败你还得 next 一下，莫名其妙）
// 我还是决定.... 不要 possible 算了，possible 的用户都自己写。
function possible(ps, msgr) {
if (!is.fun(msgr)) msgr = function failedBr(f, r, i)
  { return "All parser branches have failed @"+f.desc()
    +", while matching item #"+i+": " + r[i][1]; };
return function branches(feeder) {
  var i = -1, fails = [], accepted = null;
  foreach(ps)(function(branch) {
    var result = branch(feeder);
    if (parsed(result)) { accepted = presult(result); throw breakIter; }
    else { i += 1; fails.push([i, perror(result)]); throw nextIter; }
  });
  if (is.null(accepted)) {
    var msg = msgr(feeder, fails, i);
    if (msg instanceof Error) throw msg;
    else return pfail(msg); }
  return pmatch(accepted);
}; }

function lookahead1(pmap, flmap, msgr) {
if (!is.fun(msgr)) msgr = function failedLookAhead(f, n, i)
  { return "Lookahead1: unexpected item "+_eof(n)+", expecting one of ["
    +Object.keys(pmap).join(', ')+"] item"; };
return function prefetch1(feeder) {
  var ahead1 = feeder.nextItem;
  if (is.object(pmap)) {
    if (!(ahead1 in pmap)) {
      var msg = msgr(feeder, ahead1);
      if (msg instanceof Error) throw msg;
      else return pfail(msg); }
    return pmatch(pmap[ahead1](ahead1));
  } else { // is ahead-looking predicates
    var match = null, i = 0; // 迫真 i
    foreach(pmap)(function(case1) {
      if (case1(ahead1)) { match = flmap[case1.name]; throw breakIter; }
      i += 1; });
    if (is.null(match)) { var msg = msgr(feeder, ahead1, i);
      if (msg instanceof Error) throw msg;
      else return pfail(msg); }
    return pmatch(match(ahead1)); }
}; }

function _foldMakeIf(fx) { return (is.fun(fx))? fx() : fx; }
function someFold(p, folder, msgr) { // use it in seq
if (is.undef(folder) || !is.some(folder)) folder = ['', add];
if (!is.fun(msgr)) msgr = function failedFold(f, m) {
  return "Failed fold1+: "+m; };
return function foldChain(feeder) { var match, v = _foldMakeIf(folder[0]), f = folder[1];
  match = p(feeder);
  if (!parsed(match)) { var msg = msgr(feeder, perror(match));
    if (msg instanceof Error) throw msg;
    else return pfail(msg); }
  v = f(v, presult(match));
  while (parsed( (match = p(feeder)) )) {
    v = f(v, presult(match)); }
  return pmatch(v);
}; }
function manyFold(p, folder) { // use it in seq
if (is.undef(folder) || !is.some(folder)) folder = ['', add];
return function foldChain0(feeder) { var match, v = _foldMakeIf(folder[0]), f = folder[1];
  match = p(feeder);
  if (!parsed(match)) { return pmatch(v); }
  v = f(v, presult(match));
  while (parsed( (match = p(feeder)) )) {
    v = f(v, presult(match));  }
  return pmatch(v);
}; }

function chain1LeftRec(p, f) {
return function chainRecL(feeder, v) { var lm;
  lm = p(feeder);
  if (!parsed(match)) { return pmatch(v); }
  else return pmatch( chainRecL(feeder, f(v, x)) );
}; }
function chain1RightRec(p, f, v) {
return function chainRecR(feeder) { var lm;
  lm = p(feeder);
  if (!parsed(match)) { return pmatch(v); }
  else return pmatch( f(x, presult(chainRecL(feeder, v))) );
}; }

function satisfy(predicate, m, fmt) {
if (!is.fun(fmt)) fmt = function(s, mm) { return mm; };
return function expectful(feeder) {
  var it = feeder.lastItem;
  return (predicate(it))? feeder.consume(pmatch(it)) : pfail(fmt(feeder, m));
}; }

function charP(c, m, fmt) {
if (!is.fun(fmt)) fmt = function (s, mm) { return 'expecting ' + c +_sp(mm); };
return function expectChar(feeder) {
  var x = feeder.lastItem;
  return (x === c)? feeder.consume(pmatch(x)) : pfail(fmt(feeder, m));
}; }

function skip(c, m, fmt) {
if (!is.fun(fmt)) fmt = function (s, mm) { return 'skiping ' + c +_sp(mm); };
return function skipChar(feeder) {
  var x = feeder.lastItem;
  if (is.undef(c) || x === c) { return feeder.consume(pmatch(x)); }
  else { return pfail(fmt(feeder, m)); }
}; }

var _sindex = String.prototype.codePointAt?
   function cpAt(s, idx) { return s.codePointAt(idx); }
  :function chAt(s, idx) { return s.charAt(idx); };
function kwP(str, m, fmt) {
if (!is.string(m)) m = '';
if (!is.fun(fmt)) fmt = function format(s, i)
  { return (s.eof()? 'Unexpected EOF. ':'') + 'Expecting keyword <'+str+'>@'+i+ _sp(m); };
return function stringP(feeder) {
  if (!feeder.eof() && _sindex(str, 0) === _sindex(feeder.lastItem,0))
  { var i = 1; for (var x = feeder.nextItem;
      i !==str.length && is.string(x) && _sindex(x,0) === _sindex(str, i);
      x = feeder.nextNext(), ++i) {}
    return (i === str.length)? feeder.consume(pmatch(str)) : pfail(fmt(feeder, i)); }
  return pfail(fmt(feeder, 0));
}; }
function elemP(iset, m, fmt) {
if (!is.string(m)) m = '';
if (!is.fun(fmt)) fmt = function format(s)
  { return (s.eof()? 'Unexpected EOF. ':'') + 'Expecting one of ['
    +iset.join(', ')+']' +_sp(m); };
return function containsP(feeder) {
  var it = feeder.lastItem;
  return (iset.includes(it))? feeder.consume(pmatch(it)) : pfail(fmt(feeder));
}; }
function notElemP(iset, m, fmt) {
if (!is.string(m)) m = '';
if (!is.fun(fmt)) fmt = function format(s)
  { return (s.eof()? 'Unexpected EOF. ':'') + 'NOT expecting one of ['
    +iset.join(', ')+']' +_sp(m); };
return function containsP(feeder) {
  var it = feeder.lastItem;
  return (!iset.includes(it))? feeder.consume(pmatch(it)) : pfail(fmt(feeder));
}; }

var ws = " \t\n\r".split('');
function setWs(wscharz) { ws = wscharz; }
function wsP(msg, fmt) {
if (!is.string(msg)) msg = 'at least one whitespace';
if (!is.fun(fmt)) fmt = function(f){ return msg; };
return function skipWhite(feeder) {
  if (!ws.includes(feeder.lastItem)) return pfail(fmt(feeder, msg));
  var count = 0+1;
  while (ws.includes(feeder.nextItem)) { feeder.next(); ++count; };
  return feeder.consume(pmatch(count));
}; }
function ws0P() {
return function skipWhiteMaybe(feeder) {
  if (!ws.includes(feeder.lastItem)) { return pmatch(0); }
  var count = 0+1;
  while (ws.includes(feeder.nextItem)) { feeder.next(); ++count; };
  return feeder.consume(pmatch(count));
}; }

function run(parser) {
return function runParser(input) {
  if (!(input instanceof Feeder)) input = new Feeder(input);
  if (is.null(input.lastItem)) input.next();
  try { var res = parser(input); }
  catch (e) { return Either.left(e); }
  return (parsed(res))? Either.right(presult(res)) : Either.left(perror(res));
}; }

//// Useful Monads
// class Functor (c :: * -> *) where id :: forall a. c a a; (.) :: c y z -> c x y -> c x z
function Functor(cat) {
  this.inner = cat; // inner category to perform morphism
}
Functor.of = function newFunctor() { var ths=new this;
  this.apply(ths, arguments);  return ths; };
Functor.prototype.eta = function wrap(x) { return this.constructor.of(x); };
// fmap :: (c a b) -> d (t a) (t b)
Functor.prototype.fmap = function functorMap(f) { return this.eta(f(this.inner)); };
Functor.prototype.toString = function show() { return 'Cat('+this.inner+')'; };
Functor.prototype.equals = function equality(y)
  { return (y instanceof this.constructor) && y.inner === this.inner;  };

var extendWith = argsv.andThenVargs(map.curry1(oget.curry1('prototype'))
  .andThen(collect)).andThenVargs(boundVargs(Object, 'setPrototypeOf'));
var extendAlso = bound(Object, 'setPrototypeOf');
function inherits(child, parent) { extendWith(child, parent); extendAlso(child, parent); }

function Monad(cat) {
  Functor.bind(this)(cat);
  return this;
} inherits(Monad, Functor);
Monad.prototype.join = function flatten() { return this.inner; };
Monad.prototype.mu = function mu() { if (this.inner instanceof Functor)
  return this.join(); else throw Error('Inner object `'
    +this.inner+'\' is not Functor') };
Monad.prototype.flatMap = function flatMap(f) { return this.fmap(f).mu(); };
Monad.prototype.toString = function show()
  { return 'Cat@Endo('+this.inner+')'; };

function Maybe(cat) {
  Monad.bind(this)(cat);
  return this;
} inherits(Maybe, Monad);

Maybe.NULL = Maybe.of(null);
Maybe.prototype.isNothing = function isNothing() { return is.none(this.inner); };
Maybe.prototype.isJust = function isJust() { return !is.none(this.inner); };
Maybe.prototype.get = function unwrap()
  { if (this.isJust()) return this.inner; else throw Error('Unwrapping NULL Maybe'); };
Maybe.prototype.or = function otherMay(that) { return (this.isJust())? this : that ; }
Maybe.prototype.getOr = function unwrapOr(y)
  { return (this.isJust())? this.get() : y; };
Maybe.prototype.getOrElse = function unwrapOrElse(pf)
  { return (this.isJust())? this.get() : pf(); };

Maybe.prototype.fmap = function isNullQ(f) {
  if (is.none(this.inner)) return Maybe.NULL;
  else return this.eta(f(this.inner));
};
Maybe.prototype.toString = function show() { return (this.isJust())?
  'Just('+this.inner+')' : 'Nothing'; };

function Either(cat, side_l) {
  if (is.undef(side_l)) side_l = true; 
  Monad.bind(this)(cat);
  this.left = side_l;
  return this;
} inherits(Either, Monad);
Either.left = function leftSide(x) { return Either.of(x, true); };
Either.right = function rightSide(x) { return Either.of(x, false); };

Either.prototype.isLeft = function isLeft() { return this.left; };
Either.prototype.isRight = function isRight() { return !this.left; };
Either.prototype.get = function unwrap() { return this.inner; };

Either.prototype.either = function either(f, g) {
  return this.eta((this.isLeft())? f(this.get()) : g(this.get()));
};
Either.prototype.swap = function swap()
  { return this.either(Either.right, Either.left).mu(); };

Either.prototype.mapLeft = function mapLeft(f) {
  return (this.isLeft())? this.eta(f(this.get())) : this;
};
Either.prototype.mapRight = function mapRight(g) {
  return (this.isRight())? Either.right(g(this.get())) : this;
};
Either.prototype.fmap = Either.prototype.mapLeft;

Either.prototype.flatMapLeft = function flatMapLeft(f) {
  return (this.isLeft())? this.eta(f(this.get())).mu() : this;
};
Either.prototype.flatMapRight = function flatMapRight(g) {
  return (this.isRight())? Either.right(g(this.get())).mu() : this;
};
Either.prototype.flatMap = Either .prototype.flatMapLeft;

Either.prototype.toString = function show() { return (this.isLeft())?
  'L('+this.inner+')' : 'R('+this.inner+')'; };

//// Node.JS CommonJS Module exports
try{ if (is.nund(typeof module))
module.exports = {
  version: '1.0',
  kindof, is,
  fn: { bound, boundVargs, boundStaticVargs, args2ary, mix, toplevelThis, primCtor,
    ensure, ensureBehavior, noimp, extendWith, extendAlso, inherits },
  func: { id, konst, add, sub, mul, div,
    not, and, or, elem, lessThan, greaterThan,
    oget, oset, fulleq, docall, argsv },
  stmbase: {
    done:_done, undone:_undone, breakIter, nextIter,
    intoIter, tryIter, forIter, foreach, nextProtect },
  stmaux: {
    single:xsSingle, head:xsHead, tail:xsTail,
    take, drop, collect },
  stm: {
    lookAhead1, tryLookAhead1Iter,
    foldl, foldl1, foldr, foldr1,
    foldnl, foldnr, foldn,
    map, filter, join, joinMap, filterMap,
    takeWhile, dropWhile,
    zipWith, unzip, zipWith3, unzip3, deepIter,
    iterBy, repeat, infseq, range, orderedLT,
    combination: makeCats, lazyCombination: lazyCats },
  dim: { allocSize:dimAllocSize, calcPtr:dimGetElemPtr },
  html: { _isLoaded, _waits, 
    logs, helem, merges, cssSelect, waitsId, waitsCss,
    _____, delay, secs,
    append, prepend, xhr },
  parserc: { chars, Feeder, makeNew, seq, possible, lookahead1, skip,
    parsed, pmatch, pfail, presult, perror,
    someFold, manyFold, chain1LeftRec, chain1RightRec,
    satisfy, charP, kwP, elemP, notElemP, ws, setWs, wsP, ws0P, run },
  functor: { Functor, Monad, Maybe, Either }
}; }catch(SyntaxError){}

