const fp = require('../fp');
const p = require('../fp').parserc;
const pp = require('./DefLang');
const fs = require('fs');

const collectAry = [p.makeNew(Array), (v, x) => { v.push(x); return v; }];

const NlP = p.manyFold(p.elemP(['\n', '\r']), [0, (n,x) => n+1]);
const TermItem = feeder => { try { return p.seq([NlP, pp.TermP], xs => xs[1])(feeder); } catch (Error) { return p.pfail(); } };
const FileP = p.seq([pp.TermP, p.manyFold(TermItem, collectAry)], xs => [xs[0] , ...xs[1]]);
let DefFile = p.run(FileP);

console.log(process.argv.join(' ')); 

let inspect = false;

const argparser = p.seq([p.satisfy(s => s.includes('node')),
  p.satisfy(sf => sf.endsWith('.js')), p.manyFold(p.elemP(['-p', '--inspect', 'inspect']), [false, (v,o)=>v||o]),
    p.possible([ p.elemP(['-']), p.satisfy(s => s&&!s.startsWith('-')) ],
    (i, x) => (i===0)? '/dev/stdin' : x, (f,i) => 'Filename expected'),
    p.charP(undefined, 'EOA', (f,m) => m+' expected') ], xs => { inspect = xs[2]; return xs[3]; });

let argp = p.run(argparser);

const DefGlobal = new Map;
const Outputs = [];
const Unit = {};

function excited(nam, exp, wss) {
  if (inspect) if (!fp.is.undef(wss.find(x=>x!==1)))
    console.warn(nam+' item ' +exp+ ' has excited indentation: '+ wss.join('/'));
}

function prim(v) {
  if (fp.is.boolean(v)) return v;
  if (v.substring && v.length>1 && v.charAt(0) === '$')
    { return DefGlobal.get(v.slice(1, v.length)) || '~'+v; } // switch
  else if (v.ary) { excited('ary', v.ary.join(', '), v.wss); return v.ary.map(prim); }
  else if (v.kvs) { excited('map', v.kvs.map(kv => 
      kv.join(': ')).join('; '), v.wss); return new Map(v.kvs.map(kv => [prim(kv[0]), prim(kv[1])])); }
  return v;
}

function evaluate(x) {
  if (inspect) { console.table(x); }
  if (x.name && x.value) { //switches
    excited('Def', x.name+'='+x.value, x.wss);
    DefGlobal.set(x.name, prim(x.value));
  } else if (x.length > 1) {
    if (x[0] === 'lets') {
      let [_, w0, name, w1, fname] = x;
      excited('Lets', 'let '+name+' = '+fname+'('+name+')', [w0,w1]);
      if (fname.length>1 && fname[0] === '!') { DefGlobal.set(name, eval('it=>'+ fname.substr(1, fname.length)) (DefGlobal.get(name))); }
      else { DefGlobal.set(name, global[fname](DefGlobal.get(name))); }
    }
    if (x[0] === 'just') {
      let [_, ws0, name] = x;
      excited('Just', 'just '+name, [ws0]);
      Outputs.push(DefGlobal.get(name));
    }
  } 
  return Unit;
}

function execute(filename) {
  console.log(':: Executing ' + filename + (inspect?'(inspect)':'[direct]'));
  let code = fs.readFileSync(filename).latin1Slice();
  let ast = DefFile(code, filename);
  ast.either(console.warn, x => x.map(evaluate).lets(console.log));
  for (let o of Outputs) ((o&&o.length)? console.log:console.table)(o);
}

argp(process.argv)
  .mapLeft(console.warn)
  .mapRight(execute);

