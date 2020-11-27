var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var makeTagConfig = {
    eventNames: { IMG: "load" },
    antiGitter: { TEXTAREA: function (e) { return 300; } /*ms*/ }
};
function addMakeOperation(dst, srcs, op) {
    var defaultUpdate = function (ev) { op(dst, srcs); };
    var makeAntiGitter = function (ms) {
        var lastTimer;
        return function (ev) { clearTimeout(lastTimer); lastTimer = setTimeout(op.bind(null, dst, srcs), ms); };
    }; // unnecessary?...
    for (var _i = 0, srcs_1 = srcs; _i < srcs_1.length; _i++) {
        var src = srcs_1[_i];
        var getAntiGitter = makeTagConfig.antiGitter[src.tagName];
        var update = (getAntiGitter == undefined) ? defaultUpdate : makeAntiGitter(getAntiGitter(src));
        src.addEventListener(makeTagConfig.eventNames[src.tagName] || "change", update);
    } // done
}
function callDOMReader(input, reader_code, on_done) {
    var _a = reader_code.split('.'), name = _a[0], op_name = _a[1];
    var reader = new (Function.prototype.bind.apply(window[name], [null]));
    reader[op_name].apply(reader, [input]);
    reader.onload = function () { on_done(reader.result); };
}
var ValuePresistence = /** @class */ (function () {
    function ValuePresistence() {
    }
    ValuePresistence.prototype.add = function (e) {
        if (e.id == undefined)
            throw Error("presistent <input> " + e + " w/o const id");
        e.value = localStorage[e.id] || e.value;
        e.onchange = function (ev) { var evt = ev.target; localStorage[evt.id] = evt.value; };
    };
    ValuePresistence.prototype.done = function () { if (typeof this.on_done === "function")
        this.on_done(); };
    return ValuePresistence;
}());
function createCycleSeq(xs) {
    var i = 0;
    var n = xs.length;
    return function () { var oldI = i; i = (i + 1) % n; return xs[oldI]; };
}
function forEachChunked(n, xs, op) {
    if (xs.length % n != 0)
        throw Error(xs + "'s length " + xs.length + " can't be chunked " + n);
    var res = [];
    for (var i = 0; i < xs.length; i += n) {
        for (var j = 0; j < n; j++) {
            res.push(xs[i + j]);
        }
        op(res);
        res.splice(0, res.length);
    }
}
// == Begin app part ==
function helem(id) { return document.getElementById(id); }
function drawTextOn(ctx, text, x, y) {
    var font = ctx.font;
    var hText = parseInt(font.substr(0, font.indexOf('p'))); //parse!
    var dyText = 0;
    for (var _i = 0, _a = text.split('\n'); _i < _a.length; _i++) {
        var line = _a[_i];
        ctx.fillText(line, x, y + dyText);
        dyText += hText;
    } // bad DOM canvas API...
}
makeTagConfig.eventNames["TEXTAREA"] = "input";
makeTagConfig.antiGitter["INPUT"] = (function (e) { return (e.type == "number") ? 200 : 0; });
document.addEventListener("DOMContentLoaded", function () {
    var fileImg = helem("file-img"), imgLoaded = helem("img-loaded"), ePaint = helem("paint"), imgOut = helem("img-out");
    var vp = new ValuePresistence();
    var add = function (id) { return vp.add(helem(id)); };
    add("text");
    add("text-color");
    add("text-size");
    vp.done();
    var canvas = ePaint.getContext("2d");
    var sXY = ["w", "h"].map(function (c) { return helem("slider-img-" + c); });
    var setXY_ = function (no, n) { sXY[no].max = String(n); };
    var updateXY = function (ev) { var img = ev.target; setXY_(0, img.width); setXY_(1, img.height); };
    addMakeOperation(imgLoaded, [fileImg], function (dst, srcs) {
        dst.addEventListener("load", updateXY); // TODO make XY text -- 1:1
        callDOMReader(srcs[0].files[0], "FileReader.readAsDataURL", function (durl) { dst.src = durl; });
    }); // MAKE#1 imgLoaded
    var esConfig = Array.prototype.slice.call(helem("pan-config").querySelectorAll("input, textarea"));
    forEachChunked(3, esConfig, function (es) {
        var srcs = __spreadArrays(es, [imgLoaded], sXY); //dytype!
        addMakeOperation(imgOut, srcs, function (img, _a) {
            var eText = _a[0], eColor = _a[1], eSize = _a[2], img0 = _a[3], sX = _a[4], sY = _a[5];
            if (img0.src == "")
                return;
            ePaint.width = img0.width;
            ePaint.height = img0.height;
            canvas.drawImage(img0, 0, 0);
            canvas.font = eSize.value + "px sans";
            canvas.fillStyle = eColor.value;
            drawTextOn(canvas, eText.value, parseInt(sX.value), parseInt(sY.value));
            img.src = ePaint.toDataURL("image/png"); // TODO extract to make group dst.
        }); // MAKE#2 imgOut
    });
});
function enableTextAdderOn(e, insert_panel /*popup*/) {
    if (insert_panel === void 0) { insert_panel = null; }
}
