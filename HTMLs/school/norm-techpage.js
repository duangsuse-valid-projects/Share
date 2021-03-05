const helem=id=>document.getElementById(id),
  hrefScript = (s) => { let e=document.head.appendChild(document.createElement("script")); e.src = s; return new Promise(done=>e.onload=done); }, // 当然亦可选择 addEventListener
  matchAll=(re,s)=>re[Symbol.matchAll](s),
  fetchText=(url)=>fetch(url).then(r => r.text()).catch(alert);

  el = (tag,conf,childs)=>{ let e=document.createElement(tag); if(!!conf)conf(e); if(!!childs)for (let ee of childs)e.appendChild(ee); return e; },
  withAll = (...confs)=>e=>confs.forEach(op => op(e)),
  sets=(k)=>v=>e=>{ e[k]=v }, withNone=null, withText=sets("innerText");

function loadConfig(code = document.location.search, assign_kv=(k,v)=>alert(`unknown ${k}=${v}`)) {
  let reParam = /[?&]([^=]+)=([^&;#\n]+)/g;
  for (let [k, v] of ([...matchAll(reParam, code)].map(m => [m[1], decodeURIComponent(m[2])] ))) {
    let e = helem(k); if (e != null) { e.value =  v; } else assign_kv(k,v);
  }
}

async function editCode(css, theme="ace/theme/tomorrow") {
  if(!window.ace) await hrefScript("https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.js");
  const mkEditor=(e)=>{
    let editor=ace.edit(e); editor.setOptions({theme:theme, mode:"ace/mode/javascript", highlightActiveLine:true, wrap: "free"}); ace.config.set("basePath", "https://unpkg.com/ace-builds@1.4.12/src-noconflict");
    return editor;
  };
  for (let e of document.querySelectorAll(css)) {
    let code = e.src? await fetchText(e.src) : e.innerHTML;
    let et=e.parentNode.insertBefore(el("div", withNone), e);
    et.style="min-height:200px";
    mkEditor(et).setValue(code||"jsCode?failed : noImpossible;");
  }
}
