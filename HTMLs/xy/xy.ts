const eGraph = document.getElementById("graph") as HTMLCanvasElement;
Object.assign(eGraph.style, {position: "absolute", left: px(0), top: px(0)});

const vp_xy = [0, 0], scale_xy = [1, 1];
const wh = [0, 0], keyWH = ["width", "height"];
const cfg = {
  moveSpeed: 60,
  axis: 0b111, grid: "all"/*none,some,polar*/,
  lineW: 2, markerW: 4,
  gridWDiv: 5, miniorGridLDiv: 4,
  noLinecolor: "gray", axisColor: "black", miniorGridColor: "#66ccff",
  tickStepXY: [0.5, 0.5], tickTextFont: "12pt sans",
  numToStr: n=>n.toString(), numPrec: 5, showNum: null,
  grabFocus: true, epsilon: Math.pow(2, -7) // not 2^-52
};
function assignAry(a, ...vs) { for (let i=0; i<a.length; i++) a[i] = vs[i]; }
function px(v) { return v+"px"; }
function addUpdated(e, evn, op) { op(); e.addEventListener(evn, op, false); }
function observeProperty(o, k, op) {
  let v = o[k];
  return Object.defineProperty(o, k,
    {get(){return v}, set(v1){v=v1;op(v1);}});
}
const maths = {
  inbounds: (first,last, n) => first<=n&&n<=last,
  inboundsPN: (k, n) => maths.inbounds(-k, k, n),
  coerceIn: (first, last, n) => (n<first)? first : (n>last)? last : n,
  idf: (into, from) => x => into(from(into(x))),
  nop: () => null
};

let g: CanvasRenderingContext2D;
const onDraw = { begin: ()=>console.log(vp_xy, scale_xy), end: maths.nop };
addUpdated(window, "resize", () => {
  let e = document.documentElement;
  assignAry(wh, e.clientWidth, e.clientHeight);
  for (let i in keyWH) { let k=keyWH[i], v=wh[i]; eGraph[k] = v; eGraph.style[k] = px(v); }
  if (cfg.grabFocus) eGraph.focus();

  cfg.showNum = (n:number) => { let ns=cfg.numToStr(n); return (ns.length<cfg.numPrec)? ns : (n.toPrecision(cfg.numPrec) as any)/1; };
  g = eGraph.getContext("2d");
  g.lineWidth = cfg.lineW; g.font = cfg.tickTextFont;
  onDraw.begin();
});
observeProperty(onDraw, "begin", (v) => v());

function remeberKeyPressOn(e, d, prefix = "key") {
  const setsKey = (v) => (ev) => {
    let k = (ev instanceof MouseEvent)? `${prefix}${ev.button}` : ev.key;
    if (k in d) { ev.preventDefault(); d[k] = v; }
    if (d["Shift"]) d["Shift"] = ev.shiftKey; // fixes? shift keyup
  };
  for (let k of ["down", "up"]) e.addEventListener(prefix+k, setsKey(k=="down"));
}
function bindkeyNavigation(e, vp, scale, km_xmove, km_scale) {
  let pressed = {};
  let prefix = (!!window.PointerEvent)? "pointer":"mouse", prefixBtn = prefix+"0";
  for (let k of [km_xmove, km_scale, prefixBtn]) pressed[k] = false;
  remeberKeyPressOn(e, pressed);
  remeberKeyPressOn(e, pressed, prefix);
  let eId = eGraph.id;
  window.addEventListener("wheel", (ev:WheelEvent) => {
    if ((ev.target as HTMLElement).id != eId) return;
    ev.preventDefault();
    let v = ev.deltaY; // xy offset
    let xmove = pressed[km_xmove];
    if (pressed[km_scale]) {
      if (v<0) v=1/-v; // scale down
      if (!xmove) scale[0]*=v; scale[1]*=v/*y-only*/;
    } else {
      vp[xmove? 0 : 1] += v*cfg.moveSpeed*(xmove? -1 : 1);
    }
    onDraw.begin();
  });
  let mousePos0 = [0,0];
  const rememberMPos = (ev:MouseEvent) => assignAry(mousePos0, ev.offsetX, ev.offsetY);
  e.addEventListener(prefix+"down", rememberMPos);
  e.addEventListener(prefix+"move", (ev:MouseEvent) => {
    if (!pressed[prefixBtn]) return;
    let [x0, y0] = mousePos0;
    vp[0]+=(ev.offsetX-x0); vp[1]-=(ev.offsetY-y0);
    rememberMPos(ev);
    onDraw.begin();
  });
  let pinchDist = 0;
  bindPinch(e, v => {
    if (Math.abs(pinchDist) > 0.001) {
      let delta = pinchDist - v;
      let d = delta/Math.min(wh[0], wh[1]);
      scale[0]+=d; scale[1]+=d;
    }
    pinchDist = v;
    onDraw.begin();
  });
}
bindkeyNavigation(eGraph, vp_xy, scale_xy, "Shift", "Control");

function bindPinch(e:HTMLElement, op: (dist:number)=>void) {
  let scaling = false;
  e.addEventListener("touchstart", (ev) => { scaling = (ev.touches.length==2); });
  e.addEventListener("touchmove", (ev) => {
    if (!scaling) return;
    let tx = ev.touches;
    let dist = Math.hypot(
      tx[0].pageX - tx[1].pageX,
      tx[0].pageY - tx[1].pageY);
    op(dist);
  });
  for (let evn of ["end", "cancel"]) e.addEventListener("touch"+evn, () => { scaling = false; });
}

////
type Func = (x:number) => number
const y_funcs: [string,Func,number,string][] = [["sin", Math.sin, 0.01, "red"], ["x**2", x=>x*x, 0.1, "green"]];
const ybounds = [0, 0]; // for y axis, per session (no reset on redraw)

onDraw.begin = () => {
  let [w, h] = wh, [vx, vy] = vp_xy; // unit: px
  let [kx, ky] = scale_xy;
  g.clearRect(0,0, w,h);
  const kWX=1/w*kx, kWY=vy/w*ky; // coeffient cache
  const intoPx = x => (x-vx)*kWX, fromPx = px => px/kWX+vx, // [into/from] Math <=> Screen
    fromPy = py => h-h*(py+kWY/*move speed*/)/ky,
    intoPy = y => (-(y-h)/h)*ky-vy/w;
  // orig func: -((py+vy/w*ky)/ky)*h +h
  let x, x1, x0 = intoPx(0), ww  = intoPx(w), y;

  const
    lineVert/*-ical*/ = (sx,sy, l) => { g.moveTo(sx,sy); g.lineTo(sx, sy+l); },
    lineHorz/*ition*/ = (sx,sy, l) => { g.moveTo(sx,sy); g.lineTo(sx+l, sy); },
    newPath = () => { g.beginPath(); },
    stroke = () => { g.stroke(); g.closePath(); },
    withStroke = (s, op) => { let old = g.strokeStyle; g.strokeStyle = s; op(); g.strokeStyle = old; };

  const {axis, grid, axisColor, markerW, gridWDiv, miniorGridLDiv, miniorGridColor, tickStepXY: [tick_deltaX, tick_deltaY], showNum, epsilon} = cfg;
  const strokeGrid = () => { g.lineWidth/=gridWDiv; stroke(); g.lineWidth*=gridWDiv; }, two = 2;
  g.textBaseline = "top";
  let hasL = axis & 0b1, allGrid = (grid=="all"), someGrid = (allGrid||grid=="some");
  const drawingTicks = true; // for if(){} code readability

  for (let [code, y_func, x_delta, color] of y_funcs) {
    g.strokeStyle = axisColor; // Draw x axis!
    if (axis & 0b010) {
      newPath(); g.textAlign = "center";
      let sy = h-h*(x/w+kWY)/ky; //fromPy((x-0)/w/*~intoPx*/);
      let markerD = markerW;
      if (sy < 0) { sy=0; }
      else if (sy > (h-markerW)) {
        sy=h; g.textBaseline = "bottom";
        markerD = -markerW;
      }
      g.moveTo(0, sy); g.lineTo(w, sy); stroke();
      newPath();
      for (x=x0; x<ww; x+=x_delta) {
        let sx = fromPx(x);
        lineVert(sx, sy, markerD); // Draw x-metrics!
      }
      strokeGrid();
      if (drawingTicks) {
        newPath();
        x=x0, x1=ww+tick_deltaX;
        for (; x<x1; x+=tick_deltaX) {
          let sx = fromPx(x);
          lineVert(sx, sy, markerD*two);
          if (hasL) g.fillText(showNum(x), sx, sy+markerD*two);
          if (someGrid) lineVert(sx, 0, h);
        }
        strokeGrid();
        if (allGrid) {
          newPath(); x = x0;
          let d = tick_deltaX / miniorGridLDiv;
          for (; x<x1; x+=d) lineVert(fromPx(x), 0, h);
          withStroke(miniorGridColor, strokeGrid);  
        }
      }
    }
    newPath(); g.strokeStyle = color;
    for (x=x0, x1=ww; x<x1; x+=x_delta) {
      y = y_func(x);
      if (y<ybounds[0]) ybounds[0] = y;
      else if (y>ybounds[1]) ybounds[1] = y;
      g.lineTo(fromPx(x), fromPy(y)); // Draw func!
    }
    stroke();
    if (fromPx(x1 - (x-x_delta)) > 1) { // func: Render hor-end line
      newPath(); g.strokeStyle = cfg.noLinecolor;
      let sy = fromPy(y);
      g.moveTo(fromPx(x-x_delta), sy);
      g.lineTo(w, sy);
      stroke();
    }
  }
  g.strokeStyle = axisColor; // Draw y axis! slight different from above
  if (axis & 0b100) {
    newPath(); g.textAlign = "left";
    let sx = fromPx(0);
    let markerD = markerW;
    if (sx<=0) { sx=0; }
    else if (sx>w) {
      sx=w; markerD=-markerW;
      g.textAlign = "right";
    }
    g.moveTo(sx, 0); g.lineTo(sx, h); stroke();
    if (drawingTicks) {
      newPath();
      let y=ybounds[0], y1=ybounds[1]+tick_deltaY;
      for (; y<y1; y+=tick_deltaY) {
        let sy = fromPy(y);
        if (hasL&&!maths.inboundsPN(epsilon,y)) g.fillText(showNum(y), sx+markerD*two, sy+markerD);
        lineHorz(sx, sy, markerD*two);
        if (someGrid) lineHorz(0, sy, w);
      }
      strokeGrid();
      if (allGrid) {
        newPath();
        y = ybounds[0];
        let d = tick_deltaY / miniorGridLDiv;
        for (; y<y1; y+=d) lineHorz(0, fromPy(y), w);
        withStroke(miniorGridColor, strokeGrid);
      }
    }
  }
  onDraw.end();
};