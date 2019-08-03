const fp = require('./fp');
const p = fp.parserc;

let __ = p.wsP(), _ = p.ws0P();

const digits = '0123456789'.split('');
const
  letterLower = 'abcdefghijklmnopqrstuvwxyz'.split(''),
  letterUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const letters = letterLower.concat(letterUpper);
const letterDigit = letters.concat(digits);

let numP = p.someFold(p.elemP(digits, 'digit'), [0, (a,x) => a*10+(x-'0')], f => 'number value (0-9) expected');
const nameP = p.seq( [p.elemP(letters, 'ASCII letter'), p.manyFold(p.elemP(letterDigit, 'ASCII letter/digit char'), ['', fp.func.add]), p.ensureP(p.ws.concat('='), 'unterminated identifier')], xs => xs[0] + xs[1] );

////
function DefItem(_d, w0, name, w1, _eq, w2, val) {
  this.wss = [w0, w1, w2];
  this.name = name;
  this.value = val; }

const kw_DEF = p.kwP('def', 'definition item');
const sym_EQ = p.charP('=', 'equals infix');

const DefP = p.seq([kw_DEF, __, nameP, _, sym_EQ, _, numP], p.makeNew(DefItem));
let Def = p.run(DefP);

///
function NumList(l, ws0, rxs) {
  this.wss = []; this.ary = [];
  this.wss.push(ws0); // {ws0} x...
  if (rxs === ']') { return; }
  this.ary.push(rxs[0]); this.wss.push(rxs[1]); // x {a}, y, ..
  for (let [wl, x, wr] of rxs[2]) { this.ary.push(x); this.wss.push(wl, wr); }
}
const List_Item_ChainP = p.seq([p.charP(','), _, numP, _], xs => [xs[1], xs[2], xs[3]]);
const List_ItemsP = p.manyFold(List_Item_ChainP, [p.makeNew(Array), (v,xs)=>{v.push(xs); return v;}]);
const ListP = p.seq([ p.charP('['), _, p.possible([ p.charP(']'), p.seq([numP, _, List_ItemsP, p.charP(']')]) ]) ], p.makeNew(NumList));
const Listy = p.run(ListP);

module.exports = { digits, letters, letterDigit, numP, nameP,
  NumList, Def, DefItem, Listy };
