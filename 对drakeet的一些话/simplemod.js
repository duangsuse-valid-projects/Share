const fp = require('./fp');
let { foldn, join, map: smap, joinMap } = fp.stm;
let stmb = fp.stmbase;
function makeCharCats(chars) {
  return foldn.curry2(
    xs => join([joinMap(x => smap(c => c+x,chars), xs)
     , xs]), chars);
} 
module.exports = makeCharCats;
