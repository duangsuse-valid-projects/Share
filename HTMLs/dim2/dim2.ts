type ElConfOp<H extends HTMLElement> = ((e:H)=>any)|null
type ElConf = ElConfOp<HTMLElement>
const withNone: ElConf = null;
function configured(...conf: ElConf[]): ElConf { return (e) => { for (let op of conf) op(e); } }
function withClass(...css:string[]): ElConf {
  return (e) => { for (let s of css) e.classList.add(s); }
}
function withText(s: string): ElConf { return (e) => { e.textContent = s; } }
function withAttrs<H extends HTMLElement, K extends keyof H>(kvs:object, key:K=null): ElConfOp<H> {
  return (e) => { if (key!==null) Object.assign(e[key], kvs); else for (let k in kvs) e.setAttribute(k, kvs[k]); }
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, conf: ElConfOp<HTMLElementTagNameMap[K]>, childs: HTMLElement[]|null = null): HTMLElementTagNameMap[K] {
  let e = document.createElement(tag); if (conf!==null) conf(e);
  if (childs!==null) for (let ee of childs) e.appendChild(ee);
  return e;
}

type SMap = Map<string,string>
function expandSameValues<K,V>(d: Map<K,V>, v:V, ...ks:K[]) { for (let k of ks) d.set(k, v); return d; }
const htmlEvent = function() {
  let d = new Map<string, SMap>();
  expandSameValues(d, expandSameValues(new Map, "window.:resize", "height", "width"), "HTML", "BODY");
  return d;
}();
function solveShadowSet<K,V>(kv:Map<K,Map<K,V>>, k:K, vs: Set<K>): Set<V> { // wtf type constraint...
  let item = kv.get(k);
  let res = new Set<V>();
  for (let [k1, v1] of item) {
    vs.delete(k1); res.add(v1);
  }
  if (vs.size != 0) throw new Error(`cannot solve ${stringify(vs)} from ${k} of ${stringify(kv)} after ${stringify(res)}`);
  return res;
}
function stringify(o) {
  return JSON.stringify(flattenMapOrSet(o))
}
function flattenMapOrSet(o) {
  const rec = arguments.callee;
  return (typeof o == "object")?
    ((o instanceof Map)? (()=>{ let oo={}; for (let [k, v] of o) oo[k] = rec(v); return oo; })() :
     (o instanceof Set)? [...o].map(flattenMapOrSet)
     : (()=>{ let oo={}; for (let k in o) oo[k] = rec(o[k]); return oo; })() )
    : o as any;
}
function addBindOp<H1, H2 extends HTMLElement>(e:H1, e_rel:H2, rel_attrs:string[], update:(e:H1,e1:H2)=>any) {
  let listeners: [EventTarget,string,Function][] = [];
  solveShadowSet(htmlEvent, e_rel.tagName, new Set(rel_attrs)).forEach((s_evn) => {
    let sp = s_evn.split(".:");
    let [e_listen, evn] = (sp.length == 1)? [e_rel, sp[0]] : [sp[0]=="window"?window:document.querySelector(sp[0]), sp[1]];
    let op = () => { update(e, e_rel) };
    e_listen.addEventListener(evn, op, false);
    listeners.push([e_listen, evn, op]);
  });
  update(e, e_rel);
  return listeners;
}

const px = n => n+"px";
const dim2 = el("canvas", configured(
  withClass("dim2"),
  withAttrs({
    position: "fixed",
    left: px(0), top: px(0),
    bottom: px(0), right: px(0),
    zIndex: "10000"
  }, "style")
));
interface HTMLCanvasElement {
  redraw(): void;
}

type HTMLPipe = (e:HTMLElement) => HTMLElement
function makeDraggable(e:HTMLElement, key: HTMLPipe = null, evn_down="pointerdown", evn_up="pointerup", evn_move="pointermove",
  mk_op_move: (xy:number[], e_dst:HTMLElement) => EventListener = (xy,e)=>(ev:MouseEvent)=> {
    e.style.left=px(e.offsetLeft+ev.clientX-xy[0]); e.style.top=px(e.offsetTop+ev.clientY-xy[1]);
    xy[0]=ev.clientX; xy[1]=ev.clientY; // new anchor.
  }) {
  let xy = [0, 0];
  let opMove = mk_op_move(xy, (key===null)? e : key(e));
  e.addEventListener(evn_down, (ev:MouseEvent) => {
    xy[0]=ev.clientX; xy[1]=ev.clientY;
    let e1 = ev.target;
    window.addEventListener(evn_move, opMove);
    e1.addEventListener(evn_up, function() {
      window.removeEventListener(evn_move, opMove); e.removeEventListener(evn_up, arguments.callee as EventListener);
    });
  });
}

function dispatchMovingEventsTo(e:EventTarget, e_rel:HTMLElement, mod = {move:"Shift", scale:"Control", flags: "mg"}) {
  function polyfillGestures(e:HTMLElement) { // https://stackoverflow.com/a/11183333
    const dist = (txs:TouchList) => Math.hypot(
      txs[0].pageX - txs[1].pageX,
      txs[0].pageY - txs[1].pageY);
    let scaling = false;
    e.addEventListener("ontouchstart", (ev:TouchEvent) => { if(ev.touches.length!=2)return; scaling = true; });
    e.addEventListener("ontouchend", (ev:TouchEvent) => {
      if (!scaling)return; ev.preventDefault();
      let d = dist(ev.touches); e.dispatchEvent(new WheelEvent("scale", {deltaY: d, deltaX: d}));
      scaling = false;
    });
  }
  let pressed = { mouse: null };
  switch (mod.flags) {
  case "mg":
    polyfillGestures(e as HTMLElement);
  case "m":
    e.addEventListener("pointerdown", (ev:MouseEvent) => { pressed.mouse = [ev.clientX, ev.clientY]; });
    e.addEventListener("pointerup", () => { pressed.mouse = null; });
    e.addEventListener("pointermove", (ev:MouseEvent) => {
      let old = pressed.mouse;
      if (old===null) return;
      e.dispatchEvent(new WheelEvent("move", { deltaX: (old[0]-ev.clientX)/wh[0], deltaY: (old[1]-ev.clientY)/wh[1] }));
    });
  }
  delete mod.flags;
  for (let v of Object.values(mod)) { pressed[v] = false; }
  const setsKey = (v:boolean) => (ev:KeyboardEvent) => {
    if (ev.key in pressed) { pressed[ev.key] = v; }
    if (pressed["Shift"]) pressed["Shift"] = ev.shiftKey;
  };
  e_rel.addEventListener("keydown", setsKey(true));
  e_rel.addEventListener("keyup", setsKey(false));
  window.addEventListener("wheel", (ev) => { // note: canvas also supports wheel
    if (ev.target != e) return;
    ev.stopPropagation(); ev.preventDefault(); // Ctrl+wheel means "Zoom" in Firefox ;)
    let ev1: WheelEvent;
    let vp = ev.deltaY; // delta: shift of [x, y]
    if (pressed[mod.move]) ev1 = new WheelEvent("move", { deltaX: -vp });
    else if (pressed[mod.scale]) ev1 = new WheelEvent("scale", { deltaX: -vp, deltaY: 0 });
    else ev1 = new WheelEvent("move", { deltaY: vp });
    e.dispatchEvent(ev1);
  }); // for (let evn of ["move","scale"])dim2.addEventListener(evn,(ev)=>console.log(ev.type,ev.deltaX,ev.deltaY))
}

function bindListEditor<T>(e:HTMLElement, a_dst: T[], from: (text:string,e:HTMLElement)=>T, into: (v:T) => string) { // could be genearised using Editor<REPR> param(instead of string).
  let editor = () => el("textarea", withNone);
  const bind = (ed:HTMLTextAreaElement, i:number) => { ed.value = into(a_dst[i]); ed.onchange = () => { a_dst[i] = from(ed.value, ed); }; };
  for (let i=0; i<a_dst.length; i++) { let ed = editor(); e.appendChild(ed); bind(ed, i); }
  let eAdd = editor(); eAdd.classList.add("new-fade"); eAdd.readOnly = true;
  eAdd.onclick = () => { let ed = editor(), v = from(ed.value, ed); eAdd.parentElement.insertBefore(ed, eAdd); bind(ed, a_dst.push(v) -1); };
  e.appendChild(eAdd);
}

const RE_MATH_MEMBER = new RegExp("abs acos asin atan atan2 ceil clz32 cos exp floor imul fround log max min pow random round sin sqrt tan log10 log2 log1p expm1 cosh sinh tanh acosh asinh atanh hypot trunc sign cbrt E LOG2E LOG10E LN2 LN10 PI SQRT2 SQRT1_2".
  split(" ").map(ss => `(${ss}\\()`).join("|"), "g");

let dim2Cfg = {
  hasXAxis: true, hasYAxis: true, hasLegend: false, hasGrid: false, hasDots: false,
  hasRelativeScroll: true, hasNegativeScroll: false, scrollStep: 50, deltaX_MaxWDiv: 2, lineWidth: 2,
  axisColor: "gray", axisMul: 2, axisFont: "12pt Calibri", axisMarkerW: 6,
  equationColors: "red green blue black cyan magenta gray yellow orange pink rgb(145,30,180) rgb(210,245,60) rgb(0,128,128) rgb(128,128,0)".split(" "),
  vpInit: [0, 0], scaleInit: [1, 1], scaleStepInit: [1, 1],
  numPrec: 5, showNum: null, expr: (s) => { try { return eval(s); } catch (e) { alert(e); } return parseFloat(s); }, numToStr: (n:number) => n.toString(),
  newFunction: (code:string) => { let translated = code.replace(RE_MATH_MEMBER, m=>"Math."+m); return eval(`x=>{ const r=Math.random(), t=Date.now(); return ${translated}; }`); }
};
let wh = [0, 0], vp_xy = [...dim2Cfg.vpInit], scale_xy = [...dim2Cfg.scaleInit], scaleStep_xy = [...dim2Cfg.scaleStepInit], step_view = 1, step_x = 1;
let y_funcs:[string,string,(x:number)=>number][] = [["(x>wh[0]/2)?x:-x", "red", (x)=>(x>wh[0]/2)?x:-x]], ys = [0], yfloor = 0, yceil = 0, yzero = 0;
dim2.redraw = function() {
  let g = dim2.getContext("2d");
  let [w, h] = wh;
  g.clearRect(0, 0, w, h);
  let [vx, vy] = vp_xy;
  vx*=step_view; vy*=step_view;
  let [kx, ky] = scale_xy;
  let [kkx, kky] = scaleStep_xy;
  kx*=kkx; ky*=kky;

  let yBounds = 0;
  const drawPt = (y:number) => h - h*y/yBounds; // view y-bounds, y-flip
  g.lineWidth = dim2Cfg.lineWidth;
  g.beginPath();
  yfloor = Infinity; yceil = -Infinity, yzero = 0;
  for (let [_s, color, y_func] of y_funcs) {
    for (let ix=0, x=vx; ix<w; ix++, x+=step_x) {
      let y = (y_func(x/kx)+vy)*ky; // MAIN formula. ky looks unused in graph :(, but used in value
      if (y==0) yzero = (x/kx); // this algorithm is buggy, but I don't have the correct knowledge to fix it. Sorry.
      if (y<yfloor) yfloor = y;
      if (y>yceil) yceil = y;
      ys[ix] = y;
    }
    yBounds = (yceil-yfloor);
    // draw func plot.
    g.strokeStyle = color;
    g.beginPath(); g.moveTo(0, 0);
    ys.forEach((y, x) => { g.lineTo(x, drawPt(y)) });
    g.stroke();
  }
  g.closePath();
  // draw x axis
  g.strokeStyle = dim2Cfg.axisColor;
  g.lineWidth = dim2Cfg.lineWidth*dim2Cfg.axisMul;
  g.font = dim2Cfg.axisFont;
  let markerW = dim2Cfg.axisMarkerW, sn = dim2Cfg.showNum;
  if (dim2Cfg.hasXAxis) {
    let hasL = dim2Cfg.hasLegend;
    let py = drawPt(vy+yzero);
    g.beginPath();
    g.moveTo(0, py); g.lineTo(w, py);
    g.textAlign = "center"; g.textBaseline = "top";
    for (let ix=0; ix<w; ix+=step_x) {
      let x = ix;
      g.moveTo(x, py);
      g.lineTo(x, py-markerW);
      if (hasL) g.fillText(dim2Cfg.numToStr(x), x, py+markerW); // TODO
    }
    g.stroke(); g.closePath();
  }
  if (dim2Cfg.hasRelativeScroll) step_view = Math.max(yfloor, yceil) / dim2Cfg.scrollStep;
  dim2.dispatchEvent(new Event("drawn"));
};


document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(dim2);
  dim2Cfg.showNum = (n:number) => (dim2Cfg.numToStr(n)).length<dim2Cfg.numPrec? dim2Cfg.numToStr(n) : n.toPrecision(dim2Cfg.numPrec);
  dispatchMovingEventsTo(dim2, document.documentElement);
  const storeDelta = (evn:string, dst:number[]) => dim2.addEventListener(evn, (ev:WheelEvent) => {
    if (dim2Cfg.hasNegativeScroll||evn=="move") { dst[0] += ev.deltaX; dst[1] += ev.deltaY; }
    else { if(ev.deltaX!=0)dst[0] /= ev.deltaX; if(ev.deltaY!=0)dst[1] /= ev.deltaY; }
    dim2.redraw();
  });
  storeDelta("move", vp_xy);
  storeDelta("scale", scale_xy);
  const capitalize = (s:string) => s[0].toUpperCase()+s.slice(1);
  const substrAfter = (ss:string, s:string) => s.substr(s.lastIndexOf(ss)+1);
  const
    check = (id,s) => el("div", withNone, [el("input", withAttrs({type: "checkbox", id: id})), el("label", configured(withAttrs({for: id}), withText(s)))]),
    span = s => el("span", withText(s)),
    varib = s => el("var", configured(withAttrs({id: `dim2-info-${s}`}), withClass("dim2-const"), withText(s))),
    bold = s => el("b", withText(s));
  const show: (s:string) => [string,string] = s => [`dim2-show-${s}`, capitalize(s)];

  function arrcopy(a_dst, a) { for (let i=0; i<a.length; i++) a_dst[i] = a[i]; }
  function pairEditor(prefix, a_dst, a_deft, sep = ",") {
    let e = el("div", withNone, [el("mark", withText(prefix)), bold("("), el("span", withNone), el("span", withNone), bold(")")]);
    let ees = e.children, i0 = 2, i1 = i0+2;
    let ee0 = ees[0]; ee0.addEventListener("click", () => {
      let s = prompt("a,b value? or leave blank to reset");
      if (s === "") { arrcopy(a_dst, a_deft); }
      else if (!!s) {
        arrcopy(a_dst, s.split(sep).map(sn => dim2Cfg.expr(sn)));
      }
      dim2.redraw();
    });
    for (let i=i0; i<i1; i++) {
      let ee = ees[i]; ee.addEventListener("click", () => { let s = prompt("new value?"); if (!s)return; a_dst[(i-i0)] = dim2Cfg.expr(s); dim2.redraw(); });
    }
    let update = () => {
      for (let i=i0; i<i1; i++) { ees[i].textContent = dim2Cfg.showNum(a_dst[(i-i0)] as number)+((i!=i1-1)? sep:""); } 
    };
    dim2.addEventListener("drawn", update);
    update();
    return e;
  }

  const status = el("div", configured(
    withClass("dim2-navi"),
    withAttrs({
      fontFamily: "Arial,sans-serif",
      position: "absolute",
			zIndex: "10001",
			textAlign: "right"
    }, "style")
  ), [
    check(...show("xAxis")),
    check(...show("yAxis")),
    check(...show("legend")),
    check(...show("grid")),
    check(...show("dots")),
    check("dim2-use-relativeScroll", "Y-Relative Move"),
    check("dim2-use-negativeScroll", "Neg Scale"),
    el("hr", withNone),
    el("mark", withText("Δx=")), el("i", withNone), el("input", withAttrs({type: "range", min: "1"})),
    pairEditor("P", vp_xy, dim2Cfg.vpInit),
    pairEditor("%", scale_xy, dim2Cfg.scaleInit),
    pairEditor("Δ%", scaleStep_xy, dim2Cfg.scaleStepInit),
    el("hr", withNone),
    el("details", withClass("dim2-equ-list"), [
      el("summary", withText("Equations"))
    ]),
    el("div", withClass("draggable"), [
      span("View: "), varib("dim"),
      span(" [x]: "), varib("xrange"),
      span(" [y]: "), varib("yrange")
    ])
  ]);
  document.body.appendChild(status);
  const styleNewFade = `.new-fade {background: linear-gradient(to top, #393939, rgba(255,255,255,0) 50%); height: 44px;}`;
  document.head.appendChild(el("style", withText(".dim2-navi div {display: inline;user-select: none;} .draggable {cursor: move;} .dim2-equ-list{display:flex;}"+styleNewFade)));

  let deltaX = status.querySelector(`input[type="range"]`) as HTMLInputElement;
  deltaX.valueAsNumber = 1;
  deltaX.addEventListener("change", (ev:Event) => {
    step_x = (ev.target as HTMLInputElement).valueAsNumber; dim2.redraw();
    deltaX.previousElementSibling.textContent = deltaX.value;
  });

  status.querySelectorAll(`input[type="checkbox"]`).forEach((oe) => {
    let e = oe as HTMLInputElement;
    let attr = "has"+capitalize(substrAfter("-", e.id));
    e.checked = dim2Cfg[attr];
    e.onchange = () => { dim2Cfg[attr] = e.checked; dim2.redraw(); };
  });

  let infoOps: [Element, ()=>string][] = [];
  document.querySelectorAll("var.dim2-const").forEach((e) => {
    let id = substrAfter("-", e.id);
    let op: ()=>string;
    const sn = n => dim2Cfg.showNum(n);
    switch (id) {
      case "dim": op = () => {
        let [x, y] = vp_xy;
        x=-x; y=-y; // from shift-offset
        if (x==0) return "(x=0)";
        if (y==0) return "(y=0)";
        return `(${sn(x)},${sn(y)})∊` + ((x>0)?
          ((y>0)? "I" : "IV") :
           (y>0)? "II" : "III");
      }; break;
      case "xrange": op = () => `${sn(vp_xy[0])}..${sn(vp_xy[0]+wh[0]*step_x)}`; break;
      case "yrange": op = () => `${sn(yfloor)}..${sn(yceil)}`; break;
    }
    infoOps.push([e, op]);
  });
  dim2.addEventListener("drawn", () => { for (let [e, op] of infoOps) e.textContent = op(); });
  let colors = dim2Cfg.equationColors;
  bindListEditor(status.querySelector(".dim2-equ-list"), y_funcs, (s,e) => { let c = colors[(y_funcs.length-1)%colors.length]; e.style.borderColor=e.style.borderColor||c; return [s, c, dim2Cfg.newFunction(s)]; }, a => a[0]);

  addBindOp(dim2, document.documentElement, ["width", "height"], (e, e1) => { // NOTE: Yes. That's all. I've finished, and this work takes me at least 9 hour(2 a.m.) to workaround-and-workaround again...
    wh[0] = e1.clientWidth; wh[1] = e1.clientHeight;
    let [w, h] = wh;
    step_view = Math.max(w, h) / dim2Cfg.scrollStep;
    ys = Array(w);
    withAttrs({ display: "block", width: px(w), height: px(h) })(e);
    deltaX.setAttribute("max", `${w/dim2Cfg.deltaX_MaxWDiv}`);
    e.redraw();
  });
  const movePadRight = (e:HTMLElement, vp:number[]) => {
    e.style.left = px(wh[0]-e.offsetWidth+vp[0]);
    e.style.top = px(wh[1]-e.offsetHeight+vp[1]);
  };
  movePadRight(status, [-10, -20]);
  document.querySelectorAll(".draggable").forEach(e => makeDraggable(e as HTMLElement, e => e.parentElement));
});
