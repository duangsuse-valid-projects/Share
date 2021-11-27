const doc=document,div=Math.floor

doc.write(`
<style>
p>i{display:inline-block; border: 10px solid; border-radius:100%; width: calc(50% / 3);height: 50%; margin-left: 2em; vertical-align:text-top }
p>b{font-size:xxx-large}
p i:nth-child(1){background:red}
p i:nth-child(2){background:yellow}
p i:nth-child(3){background:green}
</style>
<p style="width: 50%;height: 25%;
   border: 2px solid; border-radius: 5em;">

<i></i> <i></i> <i></i> <b>T</b></p>`)

e灯=doc.body.firstChild.children,dt=[3,1,4],

灯=(i,v)=>e灯[i].style.filter=v,
往返=(n,i=0)=>()=>console.log(i,div(i/n),div(i%n),div(i/n)%2==0)||div( div(++i/n)%2==0? i%n : (n-1 -i%n) );

var 下i=往返(dt.length),i=2,计时=0
灯(0,"brightness(0.2)")//始=黄灯
setInterval(()=>{
    if(计时==0){
        let i0=i;i=下i();if(i==i0)i=下i();//碰边重复.
        灯(i0,"brightness(0.2)");灯(i,"");计时=dt[i]}
    e灯[3].innerText=计时--;
}, 1000)
