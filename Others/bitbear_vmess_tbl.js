c=(e,i)=>[...e.children].map(r=>r.children[i]),inn=(...a)=>a,zip=(a,b,op=inn)=>a.map((x,i)=>op(x,b[i])),pipe=(f,...fs)=>(...a)=>fs.reduce((r,f1)=>f1(r), f(...a)), n=o=>o.length,
useTpl=(at,vs)=>itr(vs,v=>{let a=[...at],i=0; for(;(x=a[i])||i<n(a);i++)a[i]=x===void 0? v():x;  return a}), itr=(xz,op,on=z=>()=>z.next().value)=>op(n(xz)? on(xz.values()):xz);
vmes=pipe((h,p,uid,ps)=>({add:h,port:p,net:"tcp",id:uid,ps,v:2}), JSON.stringify)//,btoa,s=>"vmess://"+s
tpId=[,8080,"511f3eb1-7813-4e6f--664747526a27",,1];
zip(c($0,0),c($0,1), (...a)=>vmes(...useTpl(tpId,a.map(e=>e.textContent))) ) 
//from base64 import b64encode
//map(lambda s: "vmess://"+b64encode(s))==map(pipe("vmess://".__add__,b64encode),a) 还得 list() ，对骨玩真友好啊。
//[f"vmess://{b64encode(s)}" for s in a]
