var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var withNone = null;
function configured() {
    var conf = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        conf[_i] = arguments[_i];
    }
    return function (e) {
        var e_1, _a;
        try {
            for (var conf_1 = __values(conf), conf_1_1 = conf_1.next(); !conf_1_1.done; conf_1_1 = conf_1.next()) {
                var op = conf_1_1.value;
                op(e);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (conf_1_1 && !conf_1_1.done && (_a = conf_1["return"])) _a.call(conf_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
}
function withClass() {
    var css = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        css[_i] = arguments[_i];
    }
    return function (e) {
        var e_2, _a;
        try {
            for (var css_1 = __values(css), css_1_1 = css_1.next(); !css_1_1.done; css_1_1 = css_1.next()) {
                var s = css_1_1.value;
                e.classList.add(s);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (css_1_1 && !css_1_1.done && (_a = css_1["return"])) _a.call(css_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
}
function withText(s) { return function (e) { e.textContent = s; }; }
function withAttrs(kvs, key) {
    if (key === void 0) { key = null; }
    return function (e) { if (key !== null)
        Object.assign(e[key], kvs);
    else
        for (var k in kvs)
            e.setAttribute(k, kvs[k]); };
}
function el(tag, conf, childs) {
    var e_3, _a;
    if (childs === void 0) { childs = null; }
    var e = document.createElement(tag);
    if (conf !== null)
        conf(e);
    if (childs !== null)
        try {
            for (var childs_1 = __values(childs), childs_1_1 = childs_1.next(); !childs_1_1.done; childs_1_1 = childs_1.next()) {
                var ee = childs_1_1.value;
                e.appendChild(ee);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (childs_1_1 && !childs_1_1.done && (_a = childs_1["return"])) _a.call(childs_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
    return e;
}
function expandSameValues(d, v) {
    var e_4, _a;
    var ks = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        ks[_i - 2] = arguments[_i];
    }
    try {
        for (var ks_1 = __values(ks), ks_1_1 = ks_1.next(); !ks_1_1.done; ks_1_1 = ks_1.next()) {
            var k = ks_1_1.value;
            d.set(k, v);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (ks_1_1 && !ks_1_1.done && (_a = ks_1["return"])) _a.call(ks_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return d;
}
var htmlEvent = function () {
    var d = new Map();
    expandSameValues(d, expandSameValues(new Map, "window.:resize", "height", "width"), "HTML", "BODY");
    return d;
}();
function solveShadowSet(kv, k, vs) {
    var e_5, _a;
    var item = kv.get(k);
    var res = new Set();
    try {
        for (var item_1 = __values(item), item_1_1 = item_1.next(); !item_1_1.done; item_1_1 = item_1.next()) {
            var _b = __read(item_1_1.value, 2), k1 = _b[0], v1 = _b[1];
            vs["delete"](k1);
            res.add(v1);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (item_1_1 && !item_1_1.done && (_a = item_1["return"])) _a.call(item_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    if (vs.size != 0)
        throw new Error("cannot solve " + stringify(vs) + " from " + k + " of " + stringify(kv) + " after " + stringify(res));
    return res;
}
function stringify(o) {
    return JSON.stringify(flattenMapOrSet(o));
}
function flattenMapOrSet(o) {
    var rec = arguments.callee;
    return (typeof o == "object") ?
        ((o instanceof Map) ? (function () {
            var e_6, _a;
            var oo = {};
            try {
                for (var o_1 = __values(o), o_1_1 = o_1.next(); !o_1_1.done; o_1_1 = o_1.next()) {
                    var _b = __read(o_1_1.value, 2), k = _b[0], v = _b[1];
                    oo[k] = rec(v);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (o_1_1 && !o_1_1.done && (_a = o_1["return"])) _a.call(o_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return oo;
        })() :
            (o instanceof Set) ? __spread(o).map(flattenMapOrSet)
                : (function () { var oo = {}; for (var k in o)
                    oo[k] = rec(o[k]); return oo; })())
        : o;
}
function addBindOp(e, e_rel, rel_attrs, update) {
    var listeners = [];
    solveShadowSet(htmlEvent, e_rel.tagName, new Set(rel_attrs)).forEach(function (s_evn) {
        var sp = s_evn.split(".:");
        var _a = __read((sp.length == 1) ? [e_rel, sp[0]] : [sp[0] == "window" ? window : document.querySelector(sp[0]), sp[1]], 2), e_listen = _a[0], evn = _a[1];
        var op = function () { update(e, e_rel); };
        e_listen.addEventListener(evn, op, false);
        listeners.push([e_listen, evn, op]);
    });
    update(e, e_rel);
    return listeners;
}
var px = function (n) { return n + "px"; };
var dim2 = el("canvas", configured(withClass("dim2"), withAttrs({
    position: "fixed",
    left: px(0), top: px(0),
    bottom: px(0), right: px(0),
    zIndex: "10000"
}, "style")));
function makeDraggable(e, key, evn_down, evn_up, evn_move, mk_op_move) {
    if (key === void 0) { key = null; }
    if (evn_down === void 0) { evn_down = "pointerdown"; }
    if (evn_up === void 0) { evn_up = "pointerup"; }
    if (evn_move === void 0) { evn_move = "pointermove"; }
    if (mk_op_move === void 0) { mk_op_move = function (xy, e) { return function (ev) {
        e.style.left = px(e.offsetLeft + ev.clientX - xy[0]);
        e.style.top = px(e.offsetTop + ev.clientY - xy[1]);
        xy[0] = ev.clientX;
        xy[1] = ev.clientY; // new anchor.
    }; }; }
    var xy = [0, 0];
    var opMove = mk_op_move(xy, (key === null) ? e : key(e));
    e.addEventListener(evn_down, function (ev) {
        xy[0] = ev.clientX;
        xy[1] = ev.clientY;
        var e1 = ev.target;
        window.addEventListener(evn_move, opMove);
        e1.addEventListener(evn_up, function () {
            window.removeEventListener(evn_move, opMove);
            e.removeEventListener(evn_up, arguments.callee);
        });
    });
}
function dispatchMovingEventsTo(e, e_rel, mod) {
    var e_7, _a;
    if (mod === void 0) { mod = { move: "Shift", scale: "Control", flags: "mg" }; }
    function polyfillGestures(e) {
        var dist = function (txs) { return Math.hypot(txs[0].pageX - txs[1].pageX, txs[0].pageY - txs[1].pageY); };
        var scaling = false;
        e.addEventListener("ontouchstart", function (ev) { if (ev.touches.length != 2)
            return; scaling = true; });
        e.addEventListener("ontouchend", function (ev) {
            if (!scaling)
                return;
            ev.preventDefault();
            var d = dist(ev.touches);
            e.dispatchEvent(new WheelEvent("scale", { deltaY: d, deltaX: d }));
            scaling = false;
        });
    }
    var pressed = { mouse: null };
    switch (mod.flags) {
        case "mg":
            polyfillGestures(e);
        case "m":
            e.addEventListener("pointerdown", function (ev) { pressed.mouse = [ev.clientX, ev.clientY]; });
            e.addEventListener("pointerup", function () { pressed.mouse = null; });
            e.addEventListener("pointermove", function (ev) {
                var old = pressed.mouse;
                if (old === null)
                    return;
                e.dispatchEvent(new WheelEvent("move", { deltaX: (old[0] - ev.clientX) / wh[0], deltaY: (old[1] - ev.clientY) / wh[1] }));
            });
    }
    delete mod.flags;
    try {
        for (var _b = __values(Object.values(mod)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var v = _c.value;
            pressed[v] = false;
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
        }
        finally { if (e_7) throw e_7.error; }
    }
    var setsKey = function (v) { return function (ev) {
        if (ev.key in pressed) {
            pressed[ev.key] = v;
        }
        if (pressed["Shift"])
            pressed["Shift"] = ev.shiftKey;
    }; };
    e_rel.addEventListener("keydown", setsKey(true));
    e_rel.addEventListener("keyup", setsKey(false));
    window.addEventListener("wheel", function (ev) {
        if (ev.target != e)
            return;
        ev.stopPropagation();
        ev.preventDefault(); // Ctrl+wheel means "Zoom" in Firefox ;)
        var ev1;
        var vp = ev.deltaY; // delta: shift of [x, y]
        if (pressed[mod.move])
            ev1 = new WheelEvent("move", { deltaX: -vp });
        else if (pressed[mod.scale])
            ev1 = new WheelEvent("scale", { deltaX: -vp, deltaY: 0 });
        else
            ev1 = new WheelEvent("move", { deltaY: vp });
        e.dispatchEvent(ev1);
    }); // for (let evn of ["move","scale"])dim2.addEventListener(evn,(ev)=>console.log(ev.type,ev.deltaX,ev.deltaY))
}
function bindListEditor(e, a_dst, from, into) {
    var editor = function () { return el("textarea", withNone); };
    var bind = function (ed, i) { ed.value = into(a_dst[i]); ed.onchange = function () { a_dst[i] = from(ed.value, ed); }; };
    for (var i = 0; i < a_dst.length; i++) {
        var ed = editor();
        e.appendChild(ed);
        bind(ed, i);
    }
    var eAdd = editor();
    eAdd.classList.add("new-fade");
    eAdd.readOnly = true;
    eAdd.onclick = function () { var ed = editor(), v = from(ed.value, ed); eAdd.parentElement.insertBefore(ed, eAdd); bind(ed, a_dst.push(v) - 1); };
    e.appendChild(eAdd);
}
var RE_MATH_MEMBER = new RegExp("abs acos asin atan atan2 ceil clz32 cos exp floor imul fround log max min pow random round sin sqrt tan log10 log2 log1p expm1 cosh sinh tanh acosh asinh atanh hypot trunc sign cbrt E LOG2E LOG10E LN2 LN10 PI SQRT2 SQRT1_2".
    split(" ").map(function (ss) { return "(" + ss + "\\()"; }).join("|"), "g");
var dim2Cfg = {
    hasXAxis: true, hasYAxis: true, hasLegend: false, hasGrid: false, hasDots: false,
    hasRelativeScroll: true, hasNegativeScroll: false, scrollStep: 50, deltaX_MaxWDiv: 2, lineWidth: 2,
    axisColor: "gray", axisMul: 2, axisFont: "12pt Calibri", axisMarkerW: 6,
    equationColors: "red green blue black cyan magenta gray yellow orange pink rgb(145,30,180) rgb(210,245,60) rgb(0,128,128) rgb(128,128,0)".split(" "),
    vpInit: [0, 0], scaleInit: [1, 1], scaleStepInit: [1, 1],
    numPrec: 5, showNum: null, expr: function (s) { try {
        return eval(s);
    }
    catch (e) {
        alert(e);
    } return parseFloat(s); }, numToStr: function (n) { return n.toString(); },
    newFunction: function (code) { var translated = code.replace(RE_MATH_MEMBER, function (m) { return "Math." + m; }); return eval("x=>{ const r=Math.random(), t=Date.now(); return " + translated + "; }"); }
};
var wh = [0, 0], vp_xy = __spread(dim2Cfg.vpInit), scale_xy = __spread(dim2Cfg.scaleInit), scaleStep_xy = __spread(dim2Cfg.scaleStepInit), step_view = 1, step_x = 1;
var y_funcs = [["(x>wh[0]/2)?x:-x", "red", function (x) { return (x > wh[0] / 2) ? x : -x; }]], ys = [0], yfloor = 0, yceil = 0, yzero = 0;
dim2.redraw = function () {
    var e_8, _a;
    var g = dim2.getContext("2d");
    var _b = __read(wh, 2), w = _b[0], h = _b[1];
    g.clearRect(0, 0, w, h);
    var _c = __read(vp_xy, 2), vx = _c[0], vy = _c[1];
    vx *= step_view;
    vy *= step_view;
    var _d = __read(scale_xy, 2), kx = _d[0], ky = _d[1];
    var _e = __read(scaleStep_xy, 2), kkx = _e[0], kky = _e[1];
    kx *= kkx;
    ky *= kky;
    var yBounds = 0;
    var drawPt = function (y) { return h - h * y / yBounds; }; // view y-bounds, y-flip
    g.lineWidth = dim2Cfg.lineWidth;
    g.beginPath();
    yfloor = Infinity;
    yceil = -Infinity, yzero = 0;
    try {
        for (var y_funcs_1 = __values(y_funcs), y_funcs_1_1 = y_funcs_1.next(); !y_funcs_1_1.done; y_funcs_1_1 = y_funcs_1.next()) {
            var _f = __read(y_funcs_1_1.value, 3), _s = _f[0], color = _f[1], y_func = _f[2];
            for (var ix = 0, x = vx; ix < w; ix++, x += step_x) {
                var y = (y_func(x / kx) + vy) * ky; // MAIN formula. ky looks unused in graph :(, but used in value
                if (y == 0)
                    yzero = (x / kx); // this algorithm is buggy, but I don't have the correct knowledge to fix it. Sorry.
                if (y < yfloor)
                    yfloor = y;
                if (y > yceil)
                    yceil = y;
                ys[ix] = y;
            }
            yBounds = (yceil - yfloor);
            // draw func plot.
            g.strokeStyle = color;
            g.beginPath();
            g.moveTo(0, 0);
            ys.forEach(function (y, x) { g.lineTo(x, drawPt(y)); });
            g.stroke();
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (y_funcs_1_1 && !y_funcs_1_1.done && (_a = y_funcs_1["return"])) _a.call(y_funcs_1);
        }
        finally { if (e_8) throw e_8.error; }
    }
    g.closePath();
    // draw x axis
    g.strokeStyle = dim2Cfg.axisColor;
    g.lineWidth = dim2Cfg.lineWidth * dim2Cfg.axisMul;
    g.font = dim2Cfg.axisFont;
    var markerW = dim2Cfg.axisMarkerW, sn = dim2Cfg.showNum;
    if (dim2Cfg.hasXAxis) {
        var hasL = dim2Cfg.hasLegend;
        var py = drawPt(vy + yzero);
        g.beginPath();
        g.moveTo(0, py);
        g.lineTo(w, py);
        g.textAlign = "center";
        g.textBaseline = "top";
        for (var ix = 0; ix < w; ix += step_x) {
            var x = ix;
            g.moveTo(x, py);
            g.lineTo(x, py - markerW);
            if (hasL)
                g.fillText(dim2Cfg.numToStr(x), x, py + markerW); // TODO
        }
        g.stroke();
        g.closePath();
    }
    if (dim2Cfg.hasRelativeScroll)
        step_view = Math.max(yfloor, yceil) / dim2Cfg.scrollStep;
    dim2.dispatchEvent(new Event("drawn"));
};
document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(dim2);
    dim2Cfg.showNum = function (n) { return (dim2Cfg.numToStr(n)).length < dim2Cfg.numPrec ? dim2Cfg.numToStr(n) : n.toPrecision(dim2Cfg.numPrec); };
    dispatchMovingEventsTo(dim2, document.documentElement);
    var storeDelta = function (evn, dst) { return dim2.addEventListener(evn, function (ev) {
        if (dim2Cfg.hasNegativeScroll || evn == "move") {
            dst[0] += ev.deltaX;
            dst[1] += ev.deltaY;
        }
        else {
            if (ev.deltaX != 0)
                dst[0] /= ev.deltaX;
            if (ev.deltaY != 0)
                dst[1] /= ev.deltaY;
        }
        dim2.redraw();
    }); };
    storeDelta("move", vp_xy);
    storeDelta("scale", scale_xy);
    var capitalize = function (s) { return s[0].toUpperCase() + s.slice(1); };
    var substrAfter = function (ss, s) { return s.substr(s.lastIndexOf(ss) + 1); };
    var check = function (id, s) { return el("div", withNone, [el("input", withAttrs({ type: "checkbox", id: id })), el("label", configured(withAttrs({ "for": id }), withText(s)))]); }, span = function (s) { return el("span", withText(s)); }, varib = function (s) { return el("var", configured(withAttrs({ id: "dim2-info-" + s }), withClass("dim2-const"), withText(s))); }, bold = function (s) { return el("b", withText(s)); };
    var show = function (s) { return ["dim2-show-" + s, capitalize(s)]; };
    function arrcopy(a_dst, a) { for (var i = 0; i < a.length; i++)
        a_dst[i] = a[i]; }
    function pairEditor(prefix, a_dst, a_deft, sep) {
        if (sep === void 0) { sep = ","; }
        var e = el("div", withNone, [el("mark", withText(prefix)), bold("("), el("span", withNone), el("span", withNone), bold(")")]);
        var ees = e.children, i0 = 2, i1 = i0 + 2;
        var ee0 = ees[0];
        ee0.addEventListener("click", function () {
            var s = prompt("a,b value? or leave blank to reset");
            if (s === "") {
                arrcopy(a_dst, a_deft);
            }
            else if (!!s) {
                arrcopy(a_dst, s.split(sep).map(function (sn) { return dim2Cfg.expr(sn); }));
            }
            dim2.redraw();
        });
        var _loop_1 = function (i) {
            var ee = ees[i];
            ee.addEventListener("click", function () { var s = prompt("new value?"); if (!s)
                return; a_dst[(i - i0)] = dim2Cfg.expr(s); dim2.redraw(); });
        };
        for (var i = i0; i < i1; i++) {
            _loop_1(i);
        }
        var update = function () {
            for (var i = i0; i < i1; i++) {
                ees[i].textContent = dim2Cfg.showNum(a_dst[(i - i0)]) + ((i != i1 - 1) ? sep : "");
            }
        };
        dim2.addEventListener("drawn", update);
        update();
        return e;
    }
    var status = el("div", configured(withClass("dim2-navi"), withAttrs({
        fontFamily: "Arial,sans-serif",
        position: "absolute",
        zIndex: "10001",
        textAlign: "right"
    }, "style")), [
        check.apply(void 0, __spread(show("xAxis"))),
        check.apply(void 0, __spread(show("yAxis"))),
        check.apply(void 0, __spread(show("legend"))),
        check.apply(void 0, __spread(show("grid"))),
        check.apply(void 0, __spread(show("dots"))),
        check("dim2-use-relativeScroll", "Y-Relative Move"),
        check("dim2-use-negativeScroll", "Neg Scale"),
        el("hr", withNone),
        el("mark", withText("Δx=")), el("i", withNone), el("input", withAttrs({ type: "range", min: "1" })),
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
    var styleNewFade = ".new-fade {background: linear-gradient(to top, #393939, rgba(255,255,255,0) 50%); height: 44px;}";
    document.head.appendChild(el("style", withText(".dim2-navi div {display: inline;user-select: none;} .draggable {cursor: move;} .dim2-equ-list{display:flex;}" + styleNewFade)));
    var deltaX = status.querySelector("input[type=\"range\"]");
    deltaX.valueAsNumber = 1;
    deltaX.addEventListener("change", function (ev) {
        step_x = ev.target.valueAsNumber;
        dim2.redraw();
        deltaX.previousElementSibling.textContent = deltaX.value;
    });
    status.querySelectorAll("input[type=\"checkbox\"]").forEach(function (oe) {
        var e = oe;
        var attr = "has" + capitalize(substrAfter("-", e.id));
        e.checked = dim2Cfg[attr];
        e.onchange = function () { dim2Cfg[attr] = e.checked; dim2.redraw(); };
    });
    var infoOps = [];
    document.querySelectorAll("var.dim2-const").forEach(function (e) {
        var id = substrAfter("-", e.id);
        var op;
        var sn = function (n) { return dim2Cfg.showNum(n); };
        switch (id) {
            case "dim":
                op = function () {
                    var _a = __read(vp_xy, 2), x = _a[0], y = _a[1];
                    x = -x;
                    y = -y; // from shift-offset
                    if (x == 0)
                        return "(x=0)";
                    if (y == 0)
                        return "(y=0)";
                    return "(" + sn(x) + "," + sn(y) + ")\u220A" + ((x > 0) ?
                        ((y > 0) ? "I" : "IV") :
                        (y > 0) ? "II" : "III");
                };
                break;
            case "xrange":
                op = function () { return sn(vp_xy[0]) + ".." + sn(vp_xy[0] + wh[0] * step_x); };
                break;
            case "yrange":
                op = function () { return sn(yfloor) + ".." + sn(yceil); };
                break;
        }
        infoOps.push([e, op]);
    });
    dim2.addEventListener("drawn", function () {
        var e_9, _a;
        try {
            for (var infoOps_1 = __values(infoOps), infoOps_1_1 = infoOps_1.next(); !infoOps_1_1.done; infoOps_1_1 = infoOps_1.next()) {
                var _b = __read(infoOps_1_1.value, 2), e = _b[0], op = _b[1];
                e.textContent = op();
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (infoOps_1_1 && !infoOps_1_1.done && (_a = infoOps_1["return"])) _a.call(infoOps_1);
            }
            finally { if (e_9) throw e_9.error; }
        }
    });
    var colors = dim2Cfg.equationColors;
    bindListEditor(status.querySelector(".dim2-equ-list"), y_funcs, function (s, e) { var c = colors[(y_funcs.length - 1) % colors.length]; e.style.borderColor = e.style.borderColor || c; return [s, c, dim2Cfg.newFunction(s)]; }, function (a) { return a[0]; });
    addBindOp(dim2, document.documentElement, ["width", "height"], function (e, e1) {
        wh[0] = e1.clientWidth;
        wh[1] = e1.clientHeight;
        var _a = __read(wh, 2), w = _a[0], h = _a[1];
        step_view = Math.max(w, h) / dim2Cfg.scrollStep;
        ys = Array(w);
        withAttrs({ display: "block", width: px(w), height: px(h) })(e);
        deltaX.setAttribute("max", "" + w / dim2Cfg.deltaX_MaxWDiv);
        e.redraw();
    });
    var movePadRight = function (e, vp) {
        e.style.left = px(wh[0] - e.offsetWidth + vp[0]);
        e.style.top = px(wh[1] - e.offsetHeight + vp[1]);
    };
    movePadRight(status, [-10, -20]);
    document.querySelectorAll(".draggable").forEach(function (e) { return makeDraggable(e, function (e) { return e.parentElement; }); });
});
