const logs=op=>(...a)=>{let r=op(...a); console.log(r,...a); return r}, breakIf=(p,op)=>(...a)=>{let r=op(...a); if(r==p)throw r;   return r},
opChain=(x,o,lev)=>{
  let aTop=[], oR;
  const only=(o0,a)=>{ //v for b|a=1&x depth:1,3,2
    let v,o1, l=lev,  iArg, _p=()=>{v=x(); if(!v)throw[o0,a,aTop,oR]; iArg=a.push(v);}
    _p();
    let l0=l(o0), l1;
    while ((o1=o())) { l1=l(o1);
      if(l0>l1) return(o1); else// b<a means b tops/forks a
      if(l0<l1 ||o1!=o0) {
        a1=[o1,a.pop()];a.push(a1); oR=only(o1,a1);  if(oR){ //< o1 grabs v, recurseRead&landing-pad!
         // console.log(o0,o1,oR, l0,l1);
        if(Math.abs(l0-l1)>1 && l0<l1&&l(oR)<l1 ||o0==0)  { //won't find & layer: o_01R |=& 132 or: &| at-root, can mk. top: &=| 231
          let grab=a.splice(iArg-1,1)/*! is ary*/; a1=[oR,...grab];a.push(a1);a=a1; //v*2: try create&replace layer // ["b&a=1| x&c", "b&a=1&x|c", "b|a=1&x|c","b|a=1&x|d|c", "b|a=1&x|d", "b&a=1=c|x&c=1|d"]
        } else if(l0>=l(oR)) {
          a.unshift(oR, a.splice(0,n(a))); // as-parent [oR, orig, ...arg]
        }
        else return oR;   o0=oR,l0=l(o0); _p();}
      } else _p();
    }
    return null; // no fall-rewrite
  }
  only(0,aTop); return aTop
},
runOptab=(d)=>(re=>s=>{
  let ss=[...re[Symbol.split](s)].values(), op=p=>()=>{let v=ss.next().value; return (v in d)==p? v:null; }
  return opChain(breakIf("",op(false)), op(true), o=>d[o][0])
})(RegExp("(["+Object.keys(d).join("")+"])")),
rua=runOptab({
  ["="]:[3, ],
  ["&"]:[2, ],
  ["|"]:[1, ], // U can use L/R precedence for RAssoc, add a Map for type-RHS-like special ops.
  [0]:[0, ] // for parser stream see: scan.js
})
//ss("a&b|c b&a=1|x b|a=1&x b&a=1|x b|a=1=5&x b&a=1=c|x b&a=1=c|x|d b&a=1=c|x&c").map(s=>(r=>[s,r.join(),r])(rua(s)))
