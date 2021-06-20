var _=_||{};
_.defineOps=(T,code)=>{
  const names=_.strsMap("+ plus - neg * times / div ~ negate");
  let [k,ops,k1,...kProps]=code.split(" "), c=T.prototype;
  let sAssign = op=>kProps.map(kp=>`${k}.${kp}=${k}.${kp}${op}${k1}.${kp}`).join();
  for(let op of ops) c[names.get(op)+"_"]=eval(`function(${k1}){let ${k}=this; ${sAssign(op)};}`);
  return T;
};
