var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var makeTagConfig = {
    eventNames: { IMG: "load" },
    antiGitter: { TEXTAREA: function (e) { return 300; } /*ms*/ },
    groups: {},
    _launchBr: document.createElement("br") //unique
};
function addMakeOperation(dst, srcs, op) {
    var isGroup = function (x) { return typeof x === "string"; };
    var addUpdater = function (e, op) {
        e.addEventListener(makeTagConfig.eventNames[e.tagName] || "change", op);
    };
    var esrcs = srcs; //lazy
    var defaultUpdate = function (ev) { op(dst, esrcs); };
    var makeAntiGitter = function (ms) {
        var lastTimer;
        return function (ev) { clearTimeout(lastTimer); lastTimer = setTimeout(op.bind(null, dst, esrcs), ms); };
    }; // unnecessary?...
    for (var _i = 0, srcs_1 = srcs; _i < srcs_1.length; _i++) {
        var src = srcs_1[_i];
        if (isGroup(src)) {
            if (esrcs === srcs) {
                esrcs = srcs.filter(function (it) { return !isGroup(it); });
            } //lazied
            var name_1 = src;
            var update = launchMakeGroup.bind(null, name_1);
            for (var _a = 0, _b = makeTagConfig.groups[name_1]; _a < _b.length; _a++) {
                var e = _b[_a];
                if (e !== makeTagConfig._launchBr) {
                    addUpdater(e, update);
                } // makeGroup feat.
            }
            ;
            continue;
        }
        src = src;
        var getAntiGitter = makeTagConfig.antiGitter[src.tagName];
        addUpdater(src, (getAntiGitter == undefined) ? defaultUpdate : makeAntiGitter(getAntiGitter(src)));
    } // done
}
function addMakeOperationToGroup(name, dst, srcs, op) {
    var _a;
    var gs = makeTagConfig.groups;
    if (!(name in gs))
        gs[name] = [];
    (_a = gs[name]).push.apply(_a, __spreadArrays([makeTagConfig._launchBr], srcs)); // makeGroup add
    return addMakeOperation(dst, srcs, op);
}
function addMakeAttributeOperationToGroup(name, dst, attr, value, src, op) { }
function launchMakeGroup(name) {
    var es = makeTagConfig.groups[name];
    for (var i = 0; i < es.length; i++) {
        if (es[i] === makeTagConfig._launchBr) {
            invalidateRemake(es[i + 1]);
            i++;
        }
    }
}
function invalidateRemake(e_src) {
    e_src.dispatchEvent(new Event(makeTagConfig.eventNames[e_src.tagName] || "change"));
}
function callDOMReader(input, reader_code, on_done) {
    var _a = reader_code.split('.'), name = _a[0], op_name = _a[1];
    var reader = new (Function.prototype.bind.apply(window[name], [null]));
    reader[op_name].apply(reader, [input]);
    reader.onload = function () { on_done(reader.result); };
}
function deepClone(node) {
    var childs = node.childNodes;
    if (childs.length == 0)
        return node.cloneNode();
    var copy = node.cloneNode();
    for (var i = 0; i < childs.length; i++) {
        var child = childs.item(i);
        copy.appendChild(deepClone(child));
    }
    return copy;
}
/** Make a tabular element presistent on its all input fields */
var ValuePresistence = /** @class */ (function () {
    function ValuePresistence(e0, indices, storage) {
        this._eOriginal = e0;
        this._indices = indices;
        this._sto = storage;
        this._no = 0;
    }
    ValuePresistence.prototype._registerOnItem = function (e) {
        var _this = this;
        if (e.id == undefined)
            throw Error("presistent <input> " + e + " w/o const id");
        if (this._no != 0 && e.id in this._sto) {
            e.id = ValuePresistence.succ(e.id, this._no);
        }
        var load = function () { e.value = _this._sto[e.id] || e.value; };
        e.addEventListener("load", load);
        load(); // fuzzy
        e.onchange = function (ev) { var evt = ev.target; _this._sto[evt.id] = evt.value; };
    };
    ValuePresistence.prototype._registerOn = function (e0) { for (var _i = 0, _a = this._indices; _i < _a.length; _i++) {
        var i = _a[_i];
        this._registerOnItem(e0.children.item(i));
    } this._no++; };
    ValuePresistence.prototype.appendOneTo = function (e0) {
        var e = deepClone(this._eOriginal);
        e0.appendChild(e);
        this._registerOn(e);
    };
    ValuePresistence.prototype.done = function () {
        var eO = this._eOriginal;
        var epO = eO.parentElement;
        this._registerOn(eO);
        var fstId = eO.firstElementChild.id;
        for (var no = 1; "" + fstId + no in this._sto; no++) {
            this.appendOneTo(epO); // must be separated, since we provide appendOneTo
        }
        if (typeof this.on_done === "function")
            this.on_done();
    };
    ValuePresistence.succ = function (numed_str, dist) {
        var ma = ValuePresistence.RE_SUCC.exec(numed_str);
        if (ma == null)
            return "" + numed_str + dist;
        var m = ma[0], prefix = ma[1], ns = ma[2];
        return "" + prefix + (parseInt(ns) + dist);
    };
    ValuePresistence.RE_SUCC = /^(\D*)(\d+)$/;
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
function aryQuerySelector(css, e) { return Array.prototype.slice.call(e.querySelectorAll(css)); }
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
makeTagConfig.antiGitter["INPUT"] = (function (e) { return (e.type == "number" || e.type == "slider") ? 200 : 0; });
var vp;
function mainLogic() {
    var fileImg = helem("file-img"), imgLoaded = helem("img-loaded"), ePaint = helem("paint"), imgOut = helem("img-out"), listConfig = helem("list-config");
    var canvas = ePaint.getContext("2d");
    var updateXY = function (ev) {
        var img = ev.target;
        forEachChunked(2, aryQuerySelector("input[type=\"range\"]", listConfig), function (sXY) {
            var sX = sXY[0], sY = sXY[1];
            sX.max = String(img.width);
            sY.max = String(img.height);
            sXY.forEach(function (it) { return it.dispatchEvent(new Event("load")); });
            sY.dispatchEvent(new Event("change"));
        });
    };
    addMakeOperation(imgLoaded, [fileImg], function (dst, srcs) {
        dst.addEventListener("load", updateXY);
        callDOMReader(srcs[0].files[0], "FileReader.readAsDataURL", function (durl) { dst.src = durl; });
    }); // MAKE#1 imgLoaded
    var esConfig = aryQuerySelector("input, textarea", listConfig);
    forEachChunked(2 /*XY*/ + 3, esConfig, function (es) {
        var srcs = __spreadArrays(es, [imgLoaded]); //dytype!
        addMakeOperation(imgOut, srcs, function (img, _a) {
            var eText = _a[0], sX = _a[1], sY = _a[2], eColor = _a[3], eSize = _a[4], img0 = _a[5];
            if (img0.src == "")
                return;
            ePaint.width = img0.width;
            ePaint.height = img0.height;
            canvas.drawImage(img0, 0, 0);
            canvas.font = eSize.value + "px sans";
            canvas.fillStyle = eColor.value;
            drawTextOn(canvas, eText.value, sX.valueAsNumber, sY.valueAsNumber);
            img.src = ePaint.toDataURL("image/png"); // TODO extract to make group dst.
        }); // MAKE#2 imgOut
    });
}
document.addEventListener("DOMContentLoaded", function () {
    vp = new ValuePresistence(helem("list-config").getElementsByClassName("persist-cfg").item(0), [0 /*text*/, 2 /*color*/, 4 /*size*/], localStorage);
    vp.on_done = mainLogic;
    vp.done();
});
function enableTextAdderOn(e, insert_panel /*popup*/) {
    if (insert_panel === void 0) { insert_panel = null; }
}
