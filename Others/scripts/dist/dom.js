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
define(["require", "exports", "./read"], function (require, exports, read_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nextSiblings = read_1.chainBy(function (e) { return e.nextElementSibling; });
    function hasCSSClass(css) {
        return function (e) { var _a, _b; return _b = (_a = e.classList) === null || _a === void 0 ? void 0 : _a.contains(css), (_b !== null && _b !== void 0 ? _b : false); };
    }
    exports.hasCSSClass = hasCSSClass;
    function assignElementAttribute(node, attributes) {
        var e_1, _a;
        try {
            for (var _b = __values(Object['entries'](attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), name_1 = _d[0], value = _d[1];
                node.setAttribute(name_1, value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    exports.assignElementAttribute = assignElementAttribute;
    function createElementWithText(node_type, text) {
        var node = document.createElement(node_type);
        node.textContent = text;
        return node;
    }
    exports.createElementWithText = createElementWithText;
    function createTextarea(text) {
        var textarea = createElementWithText("textarea", text);
        return textarea;
    }
    exports.createTextarea = createTextarea;
    function createPreCodeElement(text) {
        var pre = document.createElement("pre");
        var code = createElementWithText("code", text);
        pre.appendChild(code);
        return pre;
    }
    exports.createPreCodeElement = createPreCodeElement;
    var scheduleQueue = [];
    var schedulePlace = window;
    function schedule(name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var found = schedulePlace[name];
        if (found != undefined) {
            while (scheduleQueue.length != 0)
                found.apply(void 0, __spread(scheduleQueue.shift()));
            found.apply(void 0, __spread(args));
        }
        else
            scheduleQueue.push(args);
    }
    exports.schedule = schedule;
    function preetyShowList(xs, sep, last_sep) {
        if (sep === void 0) { sep = ", "; }
        if (last_sep === void 0) { last_sep = " and "; }
        var last = xs.length - 1;
        if (xs.length == 0 || xs.length == 1)
            return xs.join(sep);
        else
            return xs.slice(0, last).join(sep) + last_sep + xs[last];
    }
    exports.preetyShowList = preetyShowList;
    /** Use document.body to refer whole DOM content */
    function waitsElement(e, op) {
        var isLoaded = function (rs) { return rs == 'complete'; };
        if (e === document.body) {
            if (isLoaded(document.readyState))
                return op();
            else
                document.addEventListener('DOMContentLoaded', op);
        }
        else {
            e.addEventListener('load', op);
        }
    }
    exports.waitsElement = waitsElement;
});
