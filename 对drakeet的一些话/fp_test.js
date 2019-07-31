const fp = require('./fp');
const assert = require('assert');

const {fn, is, kindof,
  func: { docall, id, konst, add, 
  sub, mul, div, not, and, or, elem, oget,
  oset, fulleq, argsv}, stmbase, stmaux, stm, dim, html, parserc,
  functor: {Functor, Monad, Maybe, Either}} = fp;

const teststak = [];
const started = Date.now();
let apis = 0, passes = 0, fails = 0;

function colored(c,s) { return '\x1b['+c+'m'+s+'\x1b[0m'; }

const testing = add.curry1(colored(35, 'Testing: ')).also(
  fn.bound(teststak, 'push')).andThen(console.log);
const fintest = fn.bound(teststak, 'pop').andThen(
  add.curry1(colored(36, '\nFinished: ')).andThen(console.log).also(html.logs('')));

function nomagic(p) {
  if (!p) {
    process.stderr.write(colored(31, 'failed. '));
    fails += 1;
  } else {
    process.stdout.write(colored(32, 'ok! '));
    passes += 1;
  } }
const meq = fn.bound(assert, 'equal').alsoVargs(fn.bound(process.stdout, 'write').curry1('eq! '));
const mok = fn.bound(assert, 'ok');
const allok = function(...xs){ xs.each(nomagic); };

let it;
function its(x) { it = x;
  apis += 1;
  process.stdout.write(colored(37, (x)? x.name : ':(') + '... '); }

function summary() {
  console.log("Done. "+colored(37, apis)+" APIs tested, "+colored(32, passes)+" passed / "
  +colored(31, fails)+" failed in "+(Date.now()-started)/1000+" secs.");
}

testing('Is/Kindof');
its (kindof.undID);
meq(typeof wtf, kindof.undID);
testing('bool/num/int/str/sym/obj/fun');
its (kindof.boolean);
mok(!it(0.0), !('true'));
allok(it(false), it(true));
its (kindof.number);
allok(it(1.0), it(0.0), !it(1n));
its (kindof.integer);
allok(it(1n), !it(0));
its (kindof.string);
allok(it('str'), it('0'), !it(2));
its (kindof.symbol);
allok(!it('str'), it(Symbol.iterator));
its (kindof.object);
allok(it({}), it({a:1}), !it(Date()), !it(1));
its (kindof.fun);
allok(it(console.log), it(allok));
fintest();

testing('nulltype/undeftype/...');
its (kindof.nulltype);
allok(it(null), it({}), !it('null'), !it(console.log));
its (kindof.undeftype);
allok(it(undefined), !it(null), !it('undefined'), !it(NaN));
fintest();

testing('null/undef/und/nan/int/...');
its (is.null);
allok(it(null), !it(1));
its (is.undef);
allok(it(undefined), !it(it));
its (is.und);
allok(it('undefined'), it(typeof wtf), !it(undefined));
its (is.nund);
allok(!it('undefined'), it(it));
its (is.nan);
allok(it(NaN), !it(0), !it(Infinity), !it(-Infinity), !it(''));
fintest();

testing('assertion like is');
its (is.int);
allok(it(0), it(112), it(-1), it(-100));
its (is.natural);
allok(it(0), it(100), !it(-1), !it(-102));
its (is.inf);
allok(it(Infinity), !it(-Infinity), !it(1));
its (is.neginf);
allok(it(-Infinity), !it(-1));
its (is.zero);
allok(it(0), !it(1), !it(-1));
its (is.funamed);
allok(it('allok')(allok), it('its')(its));
its (is.empty);
allok(it([]), !it([1]), !it([2,3]));
its (is.exist);
allok(it('global'), !it('wtf'), !it(undefined), !it(global));
its (is.nund);
allok(it(undefined), !it('undefined'), it(1));
its (is.defined);
allok(it(typeof console), it(''), !it(undefined));
its (is.und);
allok(it(typeof wtf), !it(typeof testing));
its (is.single);
allok(!it([]), it([1]), !it([1,2]));
its (is.some);
allok(it([1]), !it([]), it([2,3]));
fintest();

fintest();

testing('Toplevel this');
its (fn.toplevelThis);
meq(global, it());
fintest();

testing('Auxilary function');
its (fn.ensure);
assert.throws(it.curry1(false));
assert.doesNotThrow(fn.ensure.curry1(true));
assert.throws(it.curry2(false, 'fail'));

its (fn.ensureBehavior);
assert.throws(it.curry2(console, 'logg'));
assert.doesNotThrow(it.curry2(console, 'log'));

its (fn.noimp);
assert.throws(it);

its (fn.mix);
meq(it({a:1})({b:1}).b, 1)
allok(it({a:1}) ({b:'s'}).b == 's', it({a:1})({}).a == 1);
fintest();

testing ('Func');
its (fn.bound);
allok(it(Math, 'floor')(1));
its (fn.args2ary);
allok((function() {return it(arguments);})(1,2,3).length == 3);
its (id);
[1,2n,'str',{},null,undefined].each((x) => allok(id(x) == x));
its (konst);
allok(konst(1)() == 1, konst(2)() != 1);
its (add);
allok(add(1,1) == 2, add('s', '1') == 's1');
its (sub);
allok(sub(2,1) == 1, sub(1,2) == -1);
its (mul);
allok(mul(1, 10) == 10, mul(10,1) == 10, mul(0,10) == 0);
its (div);
allok(div(1,1) == 1, div(10,1) == 10, div(1,10) == 0.1);
its (not);
allok(not(true) == false, not(false) == true);
its (and);
allok(and(true, true) == true, and(false, true) == false);
its (or);
allok(it(true, true) == true, it(false, false) == false, it(false, true) == true);
its (elem);
allok(elem('log', console), elem('random', Math));
its (oget);
allok(oget('1', {1:2}) == 2);
its (oset);
var o = {s:1};
oset('s', o, 2);
allok(o.s == 2);
its (fulleq);
allok(it(2,2), !it(2,'2'), !it(0,1), !it({}, Date()));
its (docall);
allok(docall('toString')({}) == {}.toString(),
  docall('id', 1)({id:x=>x}) == 1, docall('add',1,2)({add:(x,y)=>x+y}) == 3);
fintest();

testing('Functions');
const fpt = Function.prototype;
its (fpt.flip);
mok(sub.flip()(1,2) == 1);
its (fpt.curry1);
mok(sub.curry1(2)(1) == 1);
its (fpt.curry2);
mok(sub.curry2(1, 1)() == 0);
its (fpt.curried1);
mok(not.curried1()(false)() == true);
its (fpt.curried2);
mok(sub.curried2()(2)(1)() == 1);
its (fpt.andThen);
mok(add.curry1(1).andThen(sub.flip().curry1(1))(10) == 10);
its (fpt.andThenVargs);
mok(argsv.andThenVargs(id)(1,2,3)[2] == 3);
its (fpt.also);
let v = 0;
meq(add.curry2(1,1).also(() => ++v)(), 2);
mok(v == 1);
its (fpt.alsoVargs);
v = 0;
mok(argsv.alsoVargs(va => {v+=va[1]})(1,2)[1] == 2);
mok(v == 2);
its (fpt.times);
v = 0;
(() => ++v).times(10);
mok(v == 10);
its (Object.prototype.lets);
v.lets(allok);
allok('s'.lets(x => x+'.') == 's.', 1n.lets(x=>x+1n) === 2n);
its (fpt.ap);
allok(sub.curry1(1).ap([2]) == -1);
allok(sub.curried2().ap([1,2]) == -1);
its (fpt.curriedN);
allok(sub.curriedN(2)(1)(-1)() == 2, sub.curriedN(1)(0)(1) == -1);
fintest();

testing('Streams/base');
its (stmbase.done);
allok(it().done, it().done);
its (stmbase.undone);
allok(!it(1).done, it(2).value == 2);
its (stmbase.breakIter);
allok(it.br);
its (stmbase.nextIter);
allok(!it.br);
its (stmbase.intoIter);
let s = it([1,2,3]);
allok(s().value == 1, s().value == 2, s().value == 3, s().done);
its (stmbase.tryIter);
s = it(s);
allok(s === s, s().done);
s = it(it([1,2]));
s = stmaux.collect(s);
allok(s[0] == 1, s[1] == 2);
its (stmbase.forIter);
let a = 0;
s = stmbase.tryIter([1,2,3]);
it(s, x => { a+=x });
meq(6, a);
its (stmbase.foreach);
s = stmbase.tryIter(['江', '泽', '民']);
a = '';
it(s) (x => { a+=x });
meq("江泽民", a);
its (stmbase.nextProtect);
a = 0;
s = function excitedIter() {
  switch (++a) {
    case 1: return stmbase.undone(0);
    case 2: return stmbase.undone(100);
    case 3: throw stmbase.nextIter;
    case 4: throw stmbase.nextIter;
    case 5: return stmbase.undone('next');
    case 6: throw stmbase.breakIter;
    case 7: return stmbase.undone('nope');
  };
};
meq(0, it(s).value);
meq(100, it(s).value);
meq('next', it(s).value);
meq(true, it(s).done);
fintest();

testing('Streams/aux');
its (stmaux.head);
s = stmbase.tryIter([1]);
allok(it(s) == 1, it([1]) == 1, it([1,2]) == 1);
assert.throws(it.curry1(s));
assert.throws(it.curry1(s));
its (stmaux.single);
s = stmbase.tryIter([1]);
allok(it(s) == 1, it([0]) == 0, it([1]) == 1);
s = stmbase.tryIter([1,2]);
assert.throws(it.curry1(s));
stmaux.collect(s);
assert.throws(it.curry1(s));
its (stmaux.tail);
s = stmbase.tryIter([1,2,3]);
stmaux.head(s);
allok(stmaux.collect(it(s))[0] == 2, it([1,2])[0] == 2);
its (stmaux.take);
s = stmbase.tryIter([1,2,3,4]);
allok(it(1, s)[0] == 1, it(2, s)[1] == 3, it(2, [1,2])[1] == 2);
its (stmaux.drop);
s = stmbase.tryIter([1,2,3,4]);
s = it(2, s);
allok(s().value == 3, s().value == 4, s().done, it(2, [1,2]).length == 0);
its (stmaux.collect);
meq(it([1,2,3])[2] == 3, it(stmbase.tryIter([1,2,3]))[1] == 2);
fintest();

testing('Streams/functions');
its (stm.lookAhead1);
s = stmbase.tryIter([1,2,3]);
s = it(s);
allok(s().value = 1, s().next = 3, s().value = 3, s().done);
its (stm.tryLookAhead1Iter);
s = it([1]);
allok(s().value == 1, s().done);
s = it(stmbase.tryIter([2]));
allok(s().next == undefined, s().done);
its (stm.foldl);
allok(it((a,x)=>a+x, 0, stmbase.tryIter([1,2,3])) == 6);
its (stm.foldl1);
allok(it((a,x)=>a+x, stmbase.tryIter([1,2,3])) == 6);
its (stm.foldr);
allok(it((a,x)=>a+x, 0, stmbase.tryIter([1,2,3])) == 6);
allok(it((x,s)=>s+x, '', ['hello', 'World']) == 'Worldhello');
its (stm.foldr1);
allok(it((a,x)=>a+x, stmbase.tryIter([1,2,3])) == 6);
allok(it((x,s)=>x+s, stmbase.tryIter(['World', '::', 'hello'])) == 'World::hello');
its (stm.foldn);
allok(it(x=>x+1, 0, 10) == 10);
its (stm.foldnl);
allok(it((xs, i) => {xs.push(i); return xs}, [], 10)[0] == 0);
its (stm.foldnr);
allok(it((xs, i) => {xs.push(i); return xs}, [], 10)[0] == 9);
its (stm.map);
allok(it(x=>x+1, stmbase.tryIter([1,22,33]))().value == 2);
allok(stmaux.collect(it(x=>x+2, [1,2,3]))[1] == 4);
its (stm.filter);
allok(stmaux.collect(it(x=>x>10, [1,2,11, 10, 0])).length == 1);
its (stm.takeWhile);
allok(it(x=>x<10, stmbase.intoIter([1,2,3])).length == 3);
allok(it(x=>x<10, [1,2,11,9]).length == 2);
its (stm.dropWhile);
allok(it(x=>x<10, stmbase.intoIter([1,2,3])).length == 0);
allok(it(x=>x<10, [1,2,3,11,9]).length == 2);
its (stm.zipWith);
allok(stmaux.collect(it((x,y) => x-y, [1,2], [0,1]))[1] == 1);
a = stmaux.collect(it((x,y) => x-y, stmbase.tryIter([1,2,3]), stmbase.tryIter([4,5,6])));
allok(a[0] == -3, a[1] == -3, a[2] == -3);
its (stm.zipWith3);
a = stmaux.collect(it((x,y,z)=>x+' and '+y+' vs '+z, ['Billy', 'Van(DEEP DARK Mode)'], ['Muji', '力の金阁'], ['Van', '猎天使魔男']));
allok( a[0] == 'Billy and Muji vs Van', a[1] == 'Van(DEEP DARK Mode) and 力の金阁 vs 猎天使魔男' );
its (stm.unzip3);
s = it([[1,2,3], [-1,-2,-3], [10,10,10]]);
s[0]();
a = stmaux.collect(s[0]);
allok(a[0] == -1, a[1] == 10, a.length == 2);
a = stmaux.collect(s[1]);
allok(a[0] == 2, a[1] == -2, a[2] == 10);
a = stmaux.collect(s[2]);
allok(a.length == 3, a[2] == 10);
its (stm.unzip);
s = it([[1,2,3], [-1,-2,-3], [10,10,10]]);
s[0]();
a = stmaux.collect(s[0]);
allok(a[0] == -1, a[1] == 10, a.length == 2);
a = stmaux.collect(s[1]);
allok(a[0] == 2, a[1] == -2, a[2] == 10);
its (stm.deepIter);
s = stmbase.tryIter([1,2,3]);
s = (it([s, stmbase.tryIter([0,1,0]), stmbase.tryIter([4,5,6])]));
a = stmaux.collect(s);
allok(a[0][0] == 1, a[0][2] == 4, a[1][1] == 1, a[2][2] == 6);
its (stm.iterBy);
s = it(1, x => x+2, konst(true));
a = stmaux.take(100, s);
allok(a[0] == 1, a[1] == 3, a.length == 100);
its (stm.repeat);
s = it('x', 10);
allok(stmaux.collect(s).length == 10);
s = it('a', 1);
allok(s().value == 'a', s().done);
allok(it('x', 0)().done);
its (stm.infseq);
allok(stmaux.take(100, it('x')).length == 100);
its (stm.range);
allok(it(0,1)().value == 0);
a = stmaux.collect(it(0, 100, 2));
allok(a[0] == 0, a[1] == 2, a[99] = 100);
its (stm.join);
a = stmaux.collect(it([[1],[0,2],[3]]));
allok(a[0] == 1, a[1] == 0, a[2] == 2, a[3] == 3);
its (stm.joinMap);
s = it(s => s.split(''), "Oh my shoulder!".split(' '));
a = stmaux.collect(s);
a = stm.foldl((s, c) => s + c, '', a);
allok(a == 'Ohmyshoulder!');
its (stm.filterMap);
s = it(x => x-1, [1,2,3,4,5,6,7], x => x < 5);
a = stmaux.collect(s);
allok(a[0] == 0, a[2] == 2, a[3] == 3, a.length == 4);
its (stm.orderedLT);
allok(it([0]), it([1,2]), it([1, 10, 100]), !it([1,2,3,0]));
fintest();

testing('Multi-dimension arrays');
its (dim.allocSize);
allok(it([1,2,3]) == 6, it([1]) == 1, it([1,2]) == 2);
its (dim.calcPtr);
allok(it([1,2,3])([0, 1, 0]) == 3, it([5,2])([1, 1]) == 3);
fintest();

testing('HTML DOM api exports');
its (html.helem);
its (html.cssSelect);
its (html.merges);
its (html.logs);
its (html.delay);
its (html.secs);
its (html._isLoaded);
its (html._waits);
its (html.waitsId);
its (html.waitsCss);
its (html._____);
its (html.append);
its (html.prepend);
its (html.xhr.send);
its (html.xhr.gets);
its (html.xhr.posts);
fintest();

testing('Parser combinator');
its (parserc.chars);
its (parserc.makeNew);
its (parserc.seq);
its (parserc.lookahead1);
its (parserc.someFold);
its (parserc.manyFold);
its (parserc.chain1LeftRec);
its (parserc.chain1RightRec);
its (parserc.satisfy);
its (parserc.kwP);
its (parserc.elemP);
its (parserc.wsP);
its (parserc.ws0P);
its (parserc.run);
fintest();

testing('Functor/Monads');

testing('Functor');
a = Functor.prototype;
allok(is.undef(a.mu));
its (Functor.of);
allok(Functor.of(1) instanceof Functor);
its (a.eta);
allok(Functor.of(1).eta(2) instanceof Functor,
  Functor.of('s').eta(1).fmap(x=>x == 1));
its (a.fmap);
allok(Functor.of(1).fmap(add.curry1(2)).fmap(x => x == 3));
its (a.toString);
allok(new Functor(1).toString() == 'Cat(1)');
fintest();
testing('Monad');
a = Monad.prototype;
its (Monad.of);
allok(Monad.of(1) instanceof Functor, Monad.of('') instanceof Monad);
its (a.eta);
allok(Monad.of(1).eta(2) instanceof Monad);
its (a.fmap);
allok(Monad.of(2).fmap(x => x-1).equals(Monad.of(1)));
its (a.toString);
allok(new Monad(1).toString().search("Endo").lets(is.nm1));
its (a.join);
allok(Monad.of(1).join() === 1);
its (a.mu);
allok(Monad.of(new Monad(1)).mu().equals(Monad.of(1)));
assert.throws(fn.bound(Monad.of(1), 'mu'));
its (a.flatMap);
allok(Monad.of(1).flatMap(x => Monad.of(x)).fmap(x => x == 1));
fintest();

testing('Maybe');
a = Maybe.prototype;
its (Maybe.of);
allok(Maybe.of(1).isJust());
its (Maybe.NULL);
allok(it.isNothing(), !it.isJust());
assert.throws(fn.bound(it, 'get'));
its (a.isJust);
allok(Maybe.of(2).isJust());
its (a.isNothing);
allok(Maybe.NULL.isNothing());
its (a.get);
allok(Maybe.of('').get().length == 0);
its (a.getOr);
allok(Maybe.of('a').getOr('b') == 'a', Maybe.NULL.getOr('b') == 'b');
its (a.getOrElse);
a = 0;
allok(Maybe.of('a').getOrElse(() => {a++}) == 'a', a == 0);
allok(Maybe.NULL.getOrElse(() => { return a++; }) == 0, a == 1);
its (Functor.prototype.fmap);
allok(Maybe.of(1).fmap(x => x+1).fmap(it => it == 2));
allok(Maybe.NULL.fmap(x => {a+=1;}).equals(Maybe.NULL), a == 1);
its (Monad.prototype.flatMap);
allok(Maybe.of(0).flatMap(x => Maybe.NULL).fmap(x => 1).isNothing());
its (a.toString);
allok(Maybe.NULL.toString() == 'Nothing', Maybe.of(1).toString() == 'Just(1)');
fintest();

testing('Either');
a = Either.prototype;
its (Either.of);
allok(Either.of(1).isLeft());
its (Either.left);
allok(Either.left(1).isLeft());
its (Either.right);
allok(Either.right(1).isRight());
its (a.isLeft);
its (a.isRight);
its (a.get);
allok(Either.left(1).get() == 1, Either.right(2).get() == 2);
its (a.either);
allok(Either.left(1).either(x=>x+1, x_=>x_+2).get() == 2,
  Either.right(2).either(x=>x, x_=>x_-1).get() == 1);
its (a.swap);
a = Either.left(1).swap();
allok(a.isRight(), a.get() == 1);
a = Either.right('').swap();
allok(a.isLeft(), a.get() == '');
its (a.mapLeft);
a = Either.left(2).mapLeft(x=>x-1);
allok(a.isLeft(), a.get() == 1);
allok(Either.right(1).mapLeft(() => { assert.fail() }).get() == 1);
its (a.mapRight);
a = Either.right(2).mapRight(x=>x-1);
allok(a.isRight(), a.get() == 1);
allok(Either.left(1).mapRight(() => { assert.fail() }).get() == 1);
its (a.flatMapLeft);
allok(Either.left(1).flatMapLeft(x => Either.right(x)).isRight());
allok(Either.right(1).flatMapLeft(() => { assert.fail() }).isRight());
its (a.flatMapRight);
allok(Either.right(1).flatMapRight(x => Either.left(x)).isLeft());
allok(Either.left(1).flatMapRight(() => { assert.fail() }).isLeft());
its (a.fmap);
allok(it == a.mapLeft); // lazy~
its (a.flatMap);
allok(it == a.flatMapLeft);
its (a.toString);
allok(Either.left(1).toString() == 'L(1)', Either.right('b').toString() == 'R(b)');
fintest();

fintest();

summary();

