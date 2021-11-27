doc=document,n=o=>o.length; doc.write`<style>hr{width:20px;height:20px;border-radius: 50%; background:red;margin:0}</style>
<input id=bt type=button value=变大> <hr><br><hr>`

if(this.bt)bt.onclick=()=>$('hr').each((e,i, k=i%2==0?"height":"width")=> wSty(
  k, cssVal(e,k)*2
))


cssVal=(e,k)=>1? e.computedStyleMap().get(k).value : parseInt(getComputedStyle(e)[k])
$=s=>[...doc.querySelectorAll(s)]//v 以既有类型封装,不转化多项调用
Array.prototype.each=function(f){this.forEach((x,i)=>{let r=f(x,i); if(r)r(x); }) }
wSty=(...kv)=>e=>{
  for(let i=0;i<n(kv);i+=2) e.style[kv[i]]=kv[i+1]+"px"
}


aN=(n,f)=>Array(n).fill(0).map((x,i)=>f(i)), aD2=(n,m)=>aN(n,i=>aN(m,j=> i*m+j )), //若用线性i模拟ij,就不草的aN初始化
transpo=a=>{let M=n(a[0]),N=n(a), b=aD2(M,N),i,j; for(i=0;i<N;i++)for(j=0;j<M;j++)b[j][i]=a[i][j]; return b}

chunk=function*(m,a,zero){let i=0,i1,N=n(a);
for(;(i1=i+m)<N;i=i1)yield a.slice(i,i1);
yield a.slice(i).concat(Array(i1-N).fill(zero))
}
a=[...chunk(3,prompt("2x3矩阵", "114 514 119 810 233 69").split(/\D+/).map(s=>parseInt(s)) ,0)] //不用iterD2=>[i,j] 赋值了,还是分块正宗

div=Math.floor
qsort=a=>{let iC=div(n(a)/2),c=a[iC],it=p=>qsort(a.filter(p)); return iC==0?a: [...it(x=>x<c),c,...it(x=>x>c) ] }//not slice(0,iC)c (iC+1,n)

即地快排=a=>{ //v 中点,俩有序子表
  let
  swap=(o,a,b)=>{let oa=o[a];o[a]=o[b],o[b]=oa;},
  于=(i0,i1)=>{if(i0<i1){
    let 切点=()=>{let L=i0,R=i1,C=L+div((R-L)/2);while(L!=R){if(a[L]==a[R])C++;(a[L]<a[R])?L++: swap(a,L,R--/*持有L当前最大值*/)} console.log([...a],L,C);return C/*如果持续aL<aR,末L!=C,低交换性能好*/},
    iC=切点(); 于(i0,iC);于(iC+1,i1)
  }}
  于(0,n(a)-1);return a //二分需要i0~i1在栈:可堆叠
}
//提醒下切点不是合并2有序列 if(a[L]<=a[R])L++; if(a[L]>a[R])swap(a,L,R--) 或插入排序 仅是收集+长
//(a[L]==a[C])?swap(a,L++,C+=1):swap(a,L++,C+1)
console.log(qsort(a=[666,233,555,120,120,110,1,-1]),即地快排(a))
