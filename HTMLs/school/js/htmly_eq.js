//JSON,el(tag,cfg,...child) <=> html
opr=(code,b="b")=>eval(`(a,b)=>(a${code}${b})`)
class Equiv/*B,A*/ {
  constructor(ab,ba){this.from=ab,this.into=ba;}
  id(a){return this.into(this.from(a))}
  get flip(){return new Equiv(this.into,this.from)}
  static idp=(x=>x)
  get fwd(){return new Equiv(this.into,Equiv.idp)}
  get backwd(){return new Equiv(Equiv.idp,this.from)}
  static pipe(...eqs){let eqsR=[...eqs].reverse(); return new Equiv(a=>eqs.reduce((o,q)=>q.from(o),a), b=>eqsR.reduce((o,q)=>q.into(o),b))} // abc, cba...
  static op(ca,cb){return d=>new Equiv(opr(ca,d),opr(cb,d))}
  static add=this.op("+","-");
  static json=new Equiv(JSON.stringify, JSON.parse);
}

const eqInput=(eA,eB)=>(eq,opA=(x=>x))=>{
  eA.onchange=()=>eB.value=eq.from(opA(eA.value));
  eB.onchange=()=>eA.value=eq.into(eB.value); // 利用箭头函数复用较鸡肋，写得纯真点
};

//让咱方便举个例子熟悉下
let dEq={
  ten:Equiv.add(10)
};dEq["20"]=Equiv.pipe(dEq.ten,dEq.ten);dEq["-10"]=dEq.ten.flip;

let doc=document, eIn=tag=>/*()=>耶fill()*/doc.body.appendChild(doc.createElement(tag)),
  setEq=eqInput(...Array(2).fill("textarea").map(eIn));
(e=>{ e.onchange=()=>(q=>q.op?setEq(q,q.op):setEq(q))(dEq[e.value]); e.placeholder="equiv name" })(eIn("input"));
setEq(dEq.ten)

//死板 XML 加载、叠加路径，递归函数分第 0,N 次的包装
const
  rec=(op)=>{let run=op; run=op((...a)=>run(...a));return run}, //run= 给余下递归设置好“链接”
  recFunPZero=(a0,a1,op_self)=>{
    let op0=op_self(a0),op1=op_self(a1);
    return op0(op1=op1((...a)=>op1(...a))); //仅 op1(op1) 或再bind只能多递归一层(参数op1本身没 rec)
  },
  id=x=>x,
  concat=(a,b)=>a+b,
  joinStr=recFunPZero(""," ", sep=>rec=> (x,...xs)=>(!x)?"": sep+x+rec(...xs) ), //开始还以为是 id,concat 呢哈哈傻
  numId=rec(op=> n=>(n==0)? 0 : 1+op(n-1)) //n=> 亦可是靠组合子构筑如 join(n," ",rec)

const oJihtml=new Equiv(rec(walk=>e=>{
  if(e.nodeType==Node.TEXT_NODE)return e.textContent;
  let a=[...e.attributes]; a.forEach((ea,i)=>{a[i]=[ea.name,ea.value]});
  return {tag:e.tagName.toLowerCase(), attr:Object.fromEntries(a), inn:[...e.childNodes].map(walk)}
}), rec(elm=>o=>{
  if(typeof o=="string")return doc.createTextNode(o);
  let{tag,attr,inn}=o;
  let e=doc.createElement(tag);
  for(let[k,v]of Object.entries(attr))e.setAttribute(k,v);
  inn.forEach(oo=>e.appendChild(elm(oo)));
  return e;
})), jihtml=Equiv.pipe(oJihtml,Equiv.json);//请玩它 .id(doc.head)

let qs=s=>document.querySelector(s),
  hcode=new Equiv(e=>e.outerHTML, s=>{let e=eIn("div");e.outerHTML=s;return e});
jihtml.op=qs; hcode.op=qs; dEq.jh=Equiv.pipe(hcode.backwd,jihtml); dEq.hcode=hcode;
dEq.jh.op=qs;


//死板 XML 加载只针对 "tag>innTag>..." 路径问一个问题：是否复数，也就是区分 {} kv组和 [] 单行表，默认像 "XXXs" 的都是复数，显然它是赋值到作为参数的目标对象的，PZero 函数便于拼合路径。
const loadXML=recFunPZero("", ">", sep=>rec=>(e,o_dst={},k0="",p_isMulti=s=>s[s.length-1]=="s")=>{
  let ee=[...e.children], walk=ee=>rec(ee,null,k0+sep+ee.tagName);
  if (p_isMulti(k0))return ee.map(walk);
  if(e.childElementCount==0)return e.textContent;
  let o=o_dst||{};
  for(let ee of e.children) { // XML也支持text-node真是服了
    o[ee.tagName]=walk(ee); // 我不负泽分配下一层的 o_dst
  }
  return o; // 规则： multi e=[...load ee]; text e=e.text; obj e={tag ee: load ee}
})

let pXML=(dp=>(s)=>dp.parseFromString(s,"text/xml").firstChild)(new DOMParser), //感觉咱的长活量简写方式真欠打……
xProj=pXML(`
<project>
  <name>foo</name>
  <ver>1.0</ver>
  <plugins>
    <plug>me</plug>
    <plug>made-happy</plug>
  </plugins>
  <model>loose</model>
</project>
`);


//利用 sr 输出 POJO 到 XML
(qs.下次一定)
