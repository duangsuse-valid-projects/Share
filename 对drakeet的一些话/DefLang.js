const fp = require('./fp');
const p = fp.parserc;

let __ = p.wsP(), _ = p.ws0P();

const
  letterLower = 'abcdefghijklmnopqrstuvwxyz_'.split(''),
  letterUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const letters = letterLower.concat(letterUpper);
const digits = '0123456789'.split('');
const letterDigit = letters.concat(digits);

const NL = ['\n', '\r'];

function disambig(name) {
  switch (name) {
  case "true": return true;
  case "false": return false;
  } return name;
}

const NameP = p.seq( [p.elemP(letters, 'ASCII letter'), p.manyFold(p.elemP(letterDigit, 'ASCII letter/digit char'), ['', fp.func.add])], xs => disambig(xs[0] + xs[1]) );

const BoolP = p.possible([ p.kwP('true'), p.kwP('false') ]);
// LL(1) 分支冲突 无法直接使用	

const NumP = p.someFold(p.elemP(digits, 'digit'), [0, (a,x) => a*10+(x-'0')], f => 'number value (0-9) expected');

const StrP = p.seq([ p.charP('"'), p.manyFold(p.notElemP(['"'])), p.charP('"') ], xs => xs[1]);

let ValueP

function lazily(fname) {
  return function(...as) { return module.exports[fname](...as); }; }

const ValueP_lazy = lazily('ValueP');

const KvP = p.seq([ ValueP_lazy, _, p.charP(':'), _, ValueP_lazy ], xs=>[xs[0], xs[1], xs[3], xs[4]]);

///

////
function DefItem(_d, w0, name, _e, w1, _eq, w2, val) {
  this.wss = [w0, w1, w2];
  this.name = name;
  this.value = val; }

const kw_DEF = p.kwP('def', 'definition item');
const sym_EQ = p.charP('=', 'equals infix');

const DefP = p.seq([kw_DEF, __, NameP, p.ensureP(p.ws.concat('='), 'unterminated identifier'), _, sym_EQ, _, lazily('ValueP')], p.makeNew(DefItem));
let Def = p.run(DefP);

///
function ValueList(l, ws0, rxs) {
  this.wss = []; this.ary = [];
  this.wss.push(ws0); // {ws0} x...
  if (rxs === ']') { return; }
  this.ary.push(rxs[0]); this.wss.push(rxs[1]); // x {a}, y, ..
  for (let [wl, x, wr] of rxs[2]) { this.ary.push(x); this.wss.push(wl, wr); }
}

const List_Item_ChainP = p.seq([p.charP(','), _, ValueP_lazy, _], xs => [xs[1], xs[2], xs[3]]);
const List_ItemsP = p.manyFold(List_Item_ChainP, [p.makeNew(Array), (v,xs)=>{v.push(xs); return v;}]);
const ListP = p.seq([ p.charP('['), _, p.possible([ p.charP(']'), p.seq([ValueP_lazy, _, List_ItemsP, p.charP(']')]) ]) ], p.makeNew(ValueList));
const Listy = p.run(ListP);

/// 那个，这个逻辑本来可以抽提的，大家看文法规则；和用 KvP 作为项目解析器的 ListP 没区别的
function KvList(l, ws0, rxs) {
  this.wss = []; this.kvs = [];
  this.wss.push(ws0); // {ws0} x...
  if (rxs === '}') { return; }
  let [k0, wa0, wb0, v0] = rxs[0]; this.kvs.push([k0, v0]);
  this.wss.push(wa0, wb0); this.wss.push(rxs[1]); // x {a}, y, ..
  for (let [wsn0, [k,wan,wbn,v], wsn1] of rxs[2].slice(0, rxs.length-1)) {
  		 this.wss.push(wsn0,wan,wbn,wsn1); this.kvs.push([k,v]); }
}

const KvList_Item_ChainP = p.seq([p.elemP([';', ',']), _, KvP, _], xs => [xs[1], xs[2], xs[3]]);

const KvList_ItemsP = p.manyFold(KvList_Item_ChainP, [p.makeNew(Array), (v,xs)=>{v.push(xs); return v;}]);

const KvListP = p.seq([ p.charP('{'), _, p.possible([ p.charP('}'),
p.seq([KvP, _, KvList_ItemsP, p.charP('}')]) ]) ], p.makeNew(KvList));

///
ValueP = p.possible([
  NameP, NumP, StrP, ListP, KvListP
], (i,x) => (i===0)? '$'+x : x  );
const Value = p.run(ValueP);

function usyntax(c,ps, psn) {
  return p.seq([p.ensureP(c, `Unterminated ${psn} syntax`, (s,m) => {throw Error(m)}), ps], xs=>xs[1]); }

const LetsP = p.seq([ p.kwP('lets'), __, NameP, __, p.possible([NameP, StrP], (i,x) => i===1? '!'+x: x) ]);
const JustP = p.seq([ p.kwP('just'), __, NameP ]);
const TermP = p.possible([DefP, usyntax('lj', LetsP, 'def'), usyntax('j', JustP, 'lets')]);
let Term = p.run(TermP);

module.exports = { digits, letters, letterDigit, NumP, NameP,
  ValueList, Def, DefItem, Listy, BoolP, StrP, ValueP, Value, Term, TermP, KvListP };
