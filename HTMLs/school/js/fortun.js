const doc=document,
reC=/\.([A-Z][A-Za-z]*)(=(\S+))?/g,
展开=(s,o)=>reC[Symbol.replace](s, (_,k,_1,cod)=> (it=>cod?eval(cod):it) (o["get"+k].call(o)) ),
双替换=(re,s, f)=>{
    let i=0,m,N, rs=(s,q)=>s? f(s,q) :0;
    while((m=re.exec(s)) ) {N=m[0].length; rs(s.slice(i,m.index),false); rs(m,true); i=m.index+N} rs(s.slice(i),false)
},
置刷新=(o,k,v)=>{o[k]=""; requestIdleCallback(()=>o[k]=v) },
置数=(o,k,v)=>{ if(o[k]!=v){o[k]=v; 置刷新(o,"className",v%2==0? "even":"odd") } },
选=a=>a[Math.floor(Math.random()*a.length)]


doc.write("<p>")
e=doc.body.firstChild
格式=".FullYear-.Month-.Date 周.Day='一二三三四五六日'[it] ， .Hours点.Minutes分.Seconds=it.toString().padStart(2,'0')  "
//setInterval(()=> e.innerHTML=展开(格式,new Date), 1000)

upd=[]
双替换(reC,格式,(m,q)=>{
    let e格=doc.createElement(q?"i":"b");
    q? upd.push(o=>{置数(e格,"innerText", (it=>m[3]?eval(m[3]):it) (o["get"+m[1]].call(o)) );  })&(e格.title=m[1]) : e格.innerText=m
    e.appendChild(e格)
})
setInterval((d=new Date)=>upd.forEach(f=>f(d)) ,1000)//分格更新,非拼接

doc.head.innerHTML=`<style>
body{text-align:center;font-size: xxx-large;height:100vh;margin:0}
body{background: radial-gradient(#0c85201c,59%,black);}
b,i{display:inline-block; transition:.2s color}

i:first-child{line-height:100vh}
i.odd[title=Seconds] {color:red}
i[title=Day] {animation:10s rainbow linear alternate infinite}
.even,.odd{animation:.1s roll ease-out}

@keyframes roll{0%{transform:translateY(50%)} 50%{transform:translateY(-30%)} 100%{transform:translateY(0%)}}
@keyframes rainbow{${"red green blue #7b1fa2 #00838f darkorange purple #ec407a cadetblue".split(" ").map((k,i)=>`${i}0%{color:${k}}`).join("")  }}


p::after {
    content: '你好，世界！';
    position: absolute;
    bottom: 3.2em;
    right: var(--pL); transition:1s right;
    background: linear-gradient(45deg, #4caf50, #1976d2);
    -webkit-background-clip: text;
    color: #0000;
    font-weight: bolder; font-size:60pt;
    -webkit-text-stroke: 2px;
    -webkit-text-stroke-color: sandybrown;
}
p{--pL:19%} p:active{--pL:35%}

`

句="甘于平凡 求知若饥 热爱生活 乐于钻研 诚心探索 广泛学习 相信灵感 大道至简 知其变，守其恒 理论自举 选贤唯能 智慧幽默 勇于肯定 自信克制 为心吃苦 敢做不同 有所不为".split(" ")
setInterval(()=>{let c=doc.styleSheets[0].rules[9].style
  c.content=`'${选(句)}'`; 置刷新(c,"animation","1s roll")
}, 5000)
