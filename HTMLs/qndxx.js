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
    _launchBr: document.createElement("br") //unique // TODO replace with null
};
function addMakeUpdater(e_src, op) {
    e_src.addEventListener(makeTagConfig.eventNames[e_src.tagName] || "change", op);
}
function getMakeGroup(name) {
    var gs = makeTagConfig.groups;
    if (!(name in gs))
        gs[name] = [];
    return gs[name];
}
function addMakeOperation(dst, srcs, op) {
    var isGroup = function (x) { return typeof x === "string"; };
    var addUpdater = function (e, op) {
        e.addEventListener(makeTagConfig.eventNames[e.tagName] || "change", op);
    };
    var esrcs = srcs; //lazy
    var groups = null; //lazy
    var defaultUpdate = function (ev) {
        groups === null || groups === void 0 ? void 0 : groups.forEach(launchMakeGroup);
        op(dst, esrcs);
    };
    var makeAntiGitter = function (ms) {
        var lastTimer;
        var refresh = defaultUpdate.bind(null, undefined);
        return function (ev) { clearTimeout(lastTimer); lastTimer = setTimeout(refresh, ms); };
    }; // unnecessary?...
    for (var _i = 0, srcs_1 = srcs; _i < srcs_1.length; _i++) {
        var src = srcs_1[_i];
        if (isGroup(src)) {
            if (esrcs === srcs) {
                esrcs = srcs.filter(function (it) { return !isGroup(it); });
                groups = [];
            } //lazied
            groups.push(src);
            continue;
        }
        src = src;
        var getAntiGitter = makeTagConfig.antiGitter[src.tagName];
        addMakeUpdater(src, (getAntiGitter == undefined) ? defaultUpdate : makeAntiGitter(getAntiGitter(src)));
    } // done
}
function addMakeOperationToGroup(name, dst, srcs, op) {
    var _a;
    (_a = getMakeGroup(name)).push.apply(_a, __spreadArrays([makeTagConfig._launchBr], srcs)); // makeGroup add
    var isRunning = false;
    var noRecur = function (ev) {
        if (isRunning)
            return; // since we have to "remake" one src in order to call actual op.
        isRunning = true;
        launchMakeGroup(name);
        isRunning = false;
    };
    for (var _i = 0, srcs_2 = srcs; _i < srcs_2.length; _i++) {
        var e = srcs_2[_i];
        addMakeUpdater(e, noRecur);
    } // makeGroup feat.
    return addMakeOperation(dst, srcs, op);
}
function addMakeAttributeOperationToGroup(name, dst, attr, value, src, op) {
    getMakeGroup(name).push(src);
    addMakeUpdater(src, function (ev) {
        if (dst.getAttribute(attr) == value)
            return;
        op(dst, src);
        dst.setAttribute(attr, value);
    });
}
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
function firstElementChildWith(attr, predicate, e0) {
    var e = e0.firstElementChild;
    while (e != null && !predicate(e.getAttribute(attr)))
        e = e.nextElementSibling;
    return e;
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
        e.addEventListener("change", function (ev) { var evt = ev.target; _this._sto[evt.id] = evt.value; });
    };
    ValuePresistence.prototype._registerOn = function (e0) { for (var _i = 0, _a = this._indices; _i < _a.length; _i++) {
        var i = _a[_i];
        this._registerOnItem(e0.children.item(i));
    } this._no++; };
    ValuePresistence.prototype.appendOneTo = function (e0) {
        var _this = this;
        var e = deepClone(this._eOriginal);
        e0.appendChild(e);
        this._registerOn(e);
        var btnDel = document.createElement("button");
        btnDel.classList.add("vp-delete");
        btnDel.onclick = function () { _this.removeOne(e); };
        e.appendChild(btnDel);
    };
    ValuePresistence.prototype.removeOne = function (e0) {
        var succ = null;
        for (var _i = 0, _a = this._indices; _i < _a.length; _i++) {
            var i = _a[_i];
            var e = e0.children.item(i);
            var sucId = e.id;
            while ((succ = helem(ValuePresistence.succ(sucId, 1))) != null) {
                sucId = succ.id;
                succ.id = ValuePresistence.succ(succ.id, -1);
                succ.dispatchEvent(new Event("change"));
                e = succ; //^ NOTE can't be reached with zipWithNext() / chunked(2) since IDs will (==)
            } //^ update them all!
            delete this._sto[sucId]; // change size.
            succ = null;
        }
        e0.remove();
        this._no--;
    };
    ValuePresistence.prototype.done = function () {
        var eO = this._eOriginal;
        var epO = eO.parentElement;
        this._registerOn(eO);
        var fstId = firstElementChildWith("id", function (it) { return it != null; }, eO).id; // TODO replace.
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
makeTagConfig.antiGitter["INPUT"] = (function (e) { return (e.type == "number" || e.type == "range") ? 200 : 0; });
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
    vp = new ValuePresistence(helem("list-config").getElementsByClassName("persist-cfg").item(0), [0 /*text*/, 2 /*X*/, 4 /*Y*/, 6 /*color*/, 8 /*size*/], localStorage);
    vp.on_done = mainLogic;
    vp.done();
});
function enableTextAdderOn(e, insert_panel /*popup*/) {
    if (insert_panel === void 0) { insert_panel = null; }
}
