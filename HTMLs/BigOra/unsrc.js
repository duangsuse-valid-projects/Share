//工作是辅助 SinglePage 插件，把 script 和 .css/img 里的 svg url 引用 base64 化

function get(name){
  return fetch(document.location.pathname.let(s=>s.slice(0,s.lastIndexOf('/') )));
}
function unsrc(){
  qsEach("script[src]",e=>{get(e.src).then(s=>{e.textContent=s}) })
  qsEach("img[src]",e=>{e.src=dataURLImg(e)})
  qsEach("link[rel=icon,href]",e=>{e.href=mapImgLink(e.href,dataURLImg) })
  let bgRules = [...document.styleSheets].flatMap(ss=>[...ss.rules].filter(ru=>{if(ru.type!=1)return false; let sBg=ru.style.backgroundImage; return sBg!=""&&sBg!="initial"} ));
  for(let ru of bgRules)ru.style.backgroundImage=mapImgURL(ru.style.backgroundImage,dataURLImg)
}
const reURL = /url\((.*?)\)/g;
function dataURLImg(e){
  let eCan=emet("canvas"),g=eCan.getContext("2d");
  Object.copyKeys(eCan,e, "width height");
  g.drawImage(e);
  let url = eCan.toDataURL("image/png");
  eCan.remove(); return url
}
function mapImgURL(s,op){
  let m=reURL.exec(s); if(!m)return s;
  return mapImgLink(m[1]).then(s=>`url(${s})`)
}
function mapImgLink(s,op){
  let e=new Image(); 
  return Promise((res,rej)=>{ e.onload=()=>res(op(e)); e.onempty=rej; e.src=m[1]; })
}
