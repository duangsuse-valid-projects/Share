const eGraph = document.getElementById("graph") as HTMLCanvasElement;
Object.assign(eGraph.style, {position: "absolute", left: px(0), top: px(0)});

const vp_xy = [0, 0], scale_xy = [1, 1];
const wh = [0, 0], keyWH = ["width", "height"];
const cfg = {
  moveSpeed: 60,
  axis: 0b1_111, grid: "all"/*none,some,polar*/,
  lineW: 2, markerW: 4, arrowL: 10,
  axisWDiv: 1, gridWDiv: 5, miniorGridLDiv: 4,
  noLinecolor: "gray", axisColor: "black", miniorGridColor: "#66ccff",
  tickStepXY: [0.5, 0.5], tickTextFont: "12pt sans", _fontSize: 0, _scaleKeep: 1,
  numToStr: n=>n.toString(), numPrec: 5, showNum: null, goHome: null,
  grabFocus: true, noDrag: false, epsilon: Math.pow(2, -7), // not 2^-52
  kmXmove: "Shift", kmScale: "Control", kmScaleKeep: "Alt"
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
const ybounds = [0, 0]; // for y axis, per session (no reset on redraw)
const onDraw = { begin: ()=>console.log(vp_xy, scale_xy), end: maths.nop };
addUpdated(window, "resize", () => {
  let e = document.documentElement;
  assignAry(wh, e.clientWidth, e.clientHeight);
  for (let i in keyWH) { let k=keyWH[i], v=wh[i]; eGraph[k] = v; eGraph.style[k] = px(v); }
  if (cfg.grabFocus) eGraph.focus();

  const {numToStr, numPrec} = cfg;
  cfg.showNum = (n:number) => { let ns=numToStr(n); return (ns.length<numPrec)? ns : (n.toPrecision(numPrec) as any)/1; };
  let [w, h] = wh;
  let rwh = w/h;
  cfg.goHome = () => {
    const kyInit = 6; // home sweet home
    assignAry(scale_xy, kyInit*rwh, kyInit);
    assignAry(vp_xy, w/2, w/2); // tested using: div=(a)=>a[0]/a[1]; [wh,scale_xy,vp_xy].map(div)
    assignAry(ybounds, 0, 0);
    cfg._scaleKeep = 1;
    assignAry(cfg.tickStepXY, 0.5, 0.5);
    onDraw.begin();
    eGraph.focus();
  };
  cfg._fontSize = parseInt(cfg.tickTextFont)*1.2/*line-height: normal;*/;
  g = eGraph.getContext("2d");
  g.lineWidth = cfg.lineW; g.font = cfg.tickTextFont;
  onDraw.begin();
});
observeProperty(onDraw, "begin", (v) => v());

function remeberKeyPressOn(e, d, prefix = "key") {
  const setsKey = (v) => (ev) => {
    let k = (ev instanceof MouseEvent||ev instanceof PointerEvent)? `${prefix}${ev.button}` : ev.key;
    if (k in d) { ev.preventDefault(); d[k] = v; }
    if (d["Shift"]) d["Shift"] = ev.shiftKey; // fixes? shift keyup
  };
  for (let k of ["down", "up"]) e.addEventListener(prefix+k, setsKey(k=="down"));
}
function bindkeyNavigation(e, vp, scale, cfg) {
  const {kmXmove, kmScale, kmScaleKeep} = cfg;
  let pressed = {};
  let prefix = (!!window.PointerEvent)? "pointer":"mouse", prefixBtn = prefix+"0";
  for (let k of [kmXmove, kmScale, kmScaleKeep, prefixBtn]) pressed[k] = false;
  remeberKeyPressOn(e, pressed);
  remeberKeyPressOn(e, pressed, prefix);
  let eId = eGraph.id;
  window.addEventListener("wheel", (ev:WheelEvent) => {
    if ((ev.target as HTMLElement).id != eId) return;
    if (!("ontouchstart" in window)) ev.preventDefault();
    let v = ev.deltaY; // xy offset
    let xmove = pressed[kmXmove];
    if (pressed[kmScale]) {
      if (v<0) v=1/-v; // scale down
      if (!xmove) scale[0]*=v; scale[1]*=v/*y-only*/;
      if (pressed[kmScaleKeep]) { let [dx, dy] = cfg.tickStepXY; assignAry(cfg.tickStepXY, dx*v, dy*v); cfg._scaleKeep += v; }
    } else {
      vp[xmove? 0 : 1] += v*cfg.moveSpeed*(xmove? -1 : 1);
    }
    onDraw.begin();
  });
  let mousePos0 = [0,0];
  const rememberMPos = (ev:MouseEvent) => assignAry(mousePos0, ev.offsetX, ev.offsetY);
  e.addEventListener(prefix+"down", rememberMPos);
  e.addEventListener(prefix+"move", (ev:MouseEvent) => {
    if (!pressed[prefixBtn] || cfg.noDrag) return;
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
      onDraw.begin();
    } else { pinchDist = v; }
  });
}
bindkeyNavigation(eGraph, vp_xy, scale_xy, cfg);
eGraph.addEventListener("keydown", (ev) => { if (ev.key == "Home") cfg.goHome(); });

function bindPinch(e:HTMLElement, op: (dist:number)=>void) { // helper
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
const y_funcs: [string,Func,number,string,string][] = [["sin", Math.sin, 0.01, "red",null], ["x**2", x=>x*x, 0.1, "green","dot"]];

const drawArrow = (g:CanvasRenderingContext2D, p1, p2, l) => {
  let [x1, y1] = p1, [x2, y2] = p2;
  let a = (x2 - x1), b = (y2 - y1);
  let
    ang = Math.atan2(b, a),
    hyp = Math.sqrt(a*a + b*b); g.save();
  g.translate(x1, y1); g.rotate(ang);
  let x = hyp-l;
  g.moveTo(x, 0);
  g.lineTo(x, l);
  g.lineTo(hyp, 0);
  g.lineTo(x, -l);
  g.restore();
};

onDraw.begin = () => {
  let [w, h] = wh, [vx, vy] = vp_xy; // unit: px
  let [kx, ky] = scale_xy;
  g.clearRect(0,0, w,h);
  const kWX=1/w*kx, kWY=vy/w*ky; // coeffient cache
  const intoPx = x => (x-vx)*kWX, fromPx = px => px/kWX+vx, // [into/from] Math <=> Screen
    fromPy = py => h-h*(py+kWY/*move speed*/)/ky,
    intoPy = y => (-(y-h)/h)*ky-vy/w;
  // orig func: -((py+vy/w*ky)/ky)*h +h
  let x, x1, x0 = intoPx(0), ww  = intoPx(w);

  const
    lineVert/*-ical*/ = (sx,sy, l) => { g.moveTo(sx,sy); g.lineTo(sx, sy+l); },
    lineHorz/*ition*/ = (sx,sy, l) => { g.moveTo(sx,sy); g.lineTo(sx+l, sy); },
    newPath = () => { g.beginPath(); },
    stroke = () => { g.stroke(); g.closePath(); },
    withStroke = (s, op) => { let old = g.strokeStyle; g.strokeStyle = s; op(); g.strokeStyle = old; };

  const {axis, grid, axisColor, markerW, arrowL, axisWDiv, gridWDiv, miniorGridLDiv, miniorGridColor, tickStepXY: [tick_deltaX, tick_deltaY], showNum, epsilon} = cfg;
  const arrowMode = (axis >> 3/*bit for x,y,text*/);
  const
    strokeGrid = () => { g.lineWidth/=gridWDiv; stroke(); g.lineWidth*=gridWDiv; }, // feature grid,arrow
    drawsArrow = (v, n, idx) => {
      let _1st = (idx==0);
      let a1 = _1st? [v, n] : [0, v]; // (sx h 0) [sx,h], [sx,0]
      let a2 = _1st? [v, 0] : [n, v]; // (sy w 1) [0,sy], [w,sy]
      drawArrow(g, a1, a2, arrowL);
      if (arrowMode==0b1) drawArrow(g, a2, a1, arrowL);
      g.fill();
    };
  g.textBaseline = "top";
  let hasL = axis & 0b1, allGrid = (grid=="all"), someGrid = (allGrid||grid=="some");
  const drawingTicks = true, two = 2; // for if(){} code readability

  for (let [code, y_func, nx_delta, color, mode] of y_funcs) {
    let x_delta = nx_delta*cfg._scaleKeep;
    g.strokeStyle = axisColor; // Draw x axis!
    g.lineWidth /= axisWDiv;
    out:while (axis & 0b010) {
      newPath(); g.textAlign = "center";
      let sy = h-h*(x/w+kWY)/ky; //fromPy((x-0)/w/*~intoPx*/);
      if (Number.isNaN(sy)) break out;
      let markerD = markerW;
      if (sy < 0) { sy=0; }
      else if (sy > (h-markerW)) {
        sy=h; g.textBaseline = "bottom";
        markerD = -markerW;
      }
      g.moveTo(0, sy); g.lineTo(w, sy); stroke();
      if (arrowL!=0) drawsArrow(sy, w, 1);
      newPath();
      for (x=x0; x<ww; x+=x_delta) {
        let sx = fromPx(x);
        lineVert(sx, sy, markerD); // Draw x-metrics!
      }
      strokeGrid();
      if (drawingTicks) {
        newPath();
        x=x0, x1=ww+tick_deltaX;
        let lastSx1 = 0; // right-collide=remove
        for (; x<x1; x+=tick_deltaX) {
          let sx = fromPx(x);
          lineVert(sx, sy, markerD*two);
          if (hasL) {
            let sn = showNum(x), {width} = g.measureText(sn);
            if (lastSx1<=sx) { g.fillText(sn, sx, sy+markerD*two); lastSx1 = sx+width; }
          }
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
      break;
    }
    g.lineWidth *= axisWDiv;
    const getSy = (x:number) => {
      let y = y_func(x);
      if (y<ybounds[0]) ybounds[0] = y;
      else if (y>ybounds[1]) ybounds[1] = y;
      return fromPy(y);
    };
    newPath(); g.strokeStyle = color;
    switch (mode) {
      case null:
      let y = 0;
      for (x=x0, x1=ww; x<x1; x+=x_delta) { y = getSy(x); g.lineTo(fromPx(x), y); } // Draw func!
      stroke();
      if (fromPx(x1 - (x-x_delta)) > 1) { // func: Render hor-end line
        newPath(); g.strokeStyle = cfg.noLinecolor;
        let sy = fromPy(y);
        g.moveTo(fromPx(x-x_delta), sy);
        g.lineTo(w, sy);
        stroke();
      }
      break;
      case "dot":
      let oldFill = g.fillStyle; g.fillStyle = color;
      let l = g.lineWidth*two;
      for (x=x0, x1=ww; x<x1; x+=x_delta) { g.fillRect(fromPx(x), getSy(x), l, l); } // Draw dotted func!
      g.fillStyle = oldFill;
      break;
    }
  }
  g.strokeStyle = axisColor; // Draw y axis! slight different from above
  if (axis & 0b100) {
    g.lineWidth /= axisWDiv;
    newPath(); g.textAlign = "left";
    let sx = fromPx(0);
    let markerD = markerW;
    if (sx<=0) { sx=0; }
    else if (sx>w) {
      sx=w; markerD=-markerW;
      g.textAlign = "right";
    }
    g.moveTo(sx, 0); g.lineTo(sx, h); stroke(); g.lineWidth *= axisWDiv;
    if (arrowL!=0) drawsArrow(sx, h, 0);
    if (drawingTicks) {
      newPath();
      let y=ybounds[0], y1=ybounds[1]+tick_deltaY;
      let lastSy1 = h;
      for (; y<y1; y+=tick_deltaY) {
        let sy = fromPy(y);
        lineHorz(sx, sy, markerD*two);
        if (hasL&&!maths.inboundsPN(epsilon,y)&&(lastSy1>=sy)) { // sy has negate dir
          g.fillText(showNum(y), sx+markerD*two, sy+markerD); lastSy1 = sy-cfg._fontSize;
        }
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