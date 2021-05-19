function enableTabs(e0=qs(".tab-bar"),eTabs=qs(".tabs"),eIndi = qs(".tab-indicator",e0),sAct="active") {
  let [eNow, teNow]=[eTabs,e0].map(e=>qs.bind(null, "."+sAct,e));

  const no = e=>parseInt(e.getAttribute("no")),
  moveIndi=(!!eIndi)? (e)=>{
    eIndi.style.left=px(e.offsetLeft);
    eIndi.style.width=px(e.offsetWidth);
  } : noOp,
  moveCopy=(function(){
    let pe = [...eTabs.querySelectorAll("[tab]")].groupBy(e=>e.getAttribute("tab").split(" ").map(sn=>parseInt(sn)) );
    return (pe.size!=0)? (e)=>{
      let es = pe.get(no(e)), eTab=eTabs.children[no(e)]; // 大聪明：我终于记起来该有 pageNo-idx 的存储，可是不知怎自动取 no(e) !
      for(let ee of es) eTab.insertBefore(ee, eTab.childNodes[no(ee)]);
    } : noOp
  })();
  function active(ee) {
    if(ee.classList.contains(sAct))return;
    let e=eNow(), e1=eTabs.children[no(ee)];
    e.hidden=true; forArgs(e=>e.classList.remove(sAct), e, teNow());
    e1.hidden=false; forArgs(e=>e.classList.add(sAct), e1, ee);
    moveIndi(ee); moveCopy(ee);
  }
  e0.querySelectorAll("span").forEach((ee,i)=>{
    ee.setAttribute("no",i);
    ee.onclick=(ev)=>active(ev.target); // hide now, show new
  });
  if(teNow()==null) e0.children[0].className=sAct;
  eTabs.children[no(teNow())].classList.add(sAct); // assign .tabs
  for(let ee of eTabs.children){ee.hidden=true}; eNow().hidden=false;
  moveIndi(teNow());
}
enableTabs.css=(pad,h)=>`
.tab-bar {position:relative}
.tab-bar span {
    padding: ${pad};
    display: inline-block;
}
.tab-indicator {
  height: ${h}; bottom: 0; position: absolute;
  background-color: cadetblue;
  transition: 0.5s left,width ease-in;
}`;
