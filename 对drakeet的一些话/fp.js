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
  xs = tryLookAhead1Iter(xs);
  var x; while (!(x = nextProtect(xs)).done && p(x.next)) {}
  return collect(xs);
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

//// Simple Left-Right recursive(1) Parser Combinator
function chars(str) {
  if (Symbol && Symbol.iterator &&
    String.prototype[Symbol.iterator]) return [...str];
  return str.split(''); }

function makeNew(ctor) {}

function seq(ps, folder, msgr) {}
function lookahead1(pmap, flmap, msgr) {}

function someFold(p, folder, msgr) {}
function manyFold(p, folder, msgr) {}

function chain1LeftRec() {}
function chain1RightRec() {}

function satisfy(predicate) {}

function kwP(str) {}
function elemP(iset) {}

var ws = " \t\n\r"

function wsP() {}
function ws0P() {}

function run() {}

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
Maybe.prototype.isNothing = function isNothing() { return is.null(this.inner); };
Maybe.prototype.isJust = function isJust() { return !is.null(this.inner); };
Maybe.prototype.get = function unwrap()
  { if (this.isJust()) return this.inner; else throw Error('Unwrapping NULL Maybe'); };
Maybe.prototype.getOr = function unwrapOr(y)
  { return (this.isJust())? this.get() : y; };
Maybe.prototype.getOrElse = function unwrapOrElse(pf)
  { return (this.isJust())? this.get() : pf(); };

Maybe.prototype.fmap = function isNullQ(f) {
  if (is.null(this.inner)) return Maybe.NULL;
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
  fn: { bound, boundVargs, boundStaticVargs, args2ary, mix, toplevelThis,
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
    iterBy, repeat, infseq, range, orderedLT },
  dim: { allocSize:dimAllocSize, calcPtr:dimGetElemPtr },
  html: { _isLoaded, _waits, 
    logs, helem, merges, cssSelect, waitsId, waitsCss,
    _____, delay, secs,
    append, prepend, xhr },
  parserc: { chars, makeNew, seq, lookahead1,
    someFold, manyFold, chain1LeftRec, chain1RightRec,
    satisfy, kwP, elemP, wsP, ws0P, run },
  functor: { Functor, Monad, Maybe, Either }
}; }catch(SyntaxError){}

