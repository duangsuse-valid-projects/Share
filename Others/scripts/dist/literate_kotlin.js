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
define(["require", "exports", "./dom", "./dom", "./read", "./read", "./read"], function (require, exports, dom_1, dom_2, read_1, read_2, read_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.literateKtConfig = {
        literateBegin: dom_1.hasCSSClass("literateBegin"),
        literateEnd: dom_1.hasCSSClass("literateEnd"),
        literateCodeFilter: dom_1.hasCSSClass("language-kotlin"),
        playgroundDefaults: {
            "indent": 2,
            "auto-indent": true,
            "data-autocomplete": true,
            "highlight-on-fly": true,
            "match-brackets": true
        }
    };
    var literateKtMagics = {
        dependAttribute: "depend",
        hiddenDependencyClass: "hidden-dependency",
        playgroundClass: "playground",
        dependSeprator: " ",
        KotlinPlaygroundGlobalId: "KotlinPlayground"
    };
    function read(p, s) {
        if (p(s.peek))
            s.next();
        else
            throw Error("Expecting " + p + " for " + s);
    }
    /** Returns [codes, endDiv] */
    function filterCode(begin_e) {
        var literateBegin = exports.literateKtConfig.literateBegin, literateEnd = exports.literateKtConfig.literateEnd, literateCodeFilter = exports.literateKtConfig.literateCodeFilter;
        var literatePart = read_3.negate(read_3.or(literateEnd, literateBegin));
        var tags = [];
        var scanContent = function () { return tags.push.apply(tags, __spread(read_2.peekWhile(literatePart, neighbors))); };
        var neighbors = new read_1.Peek(read_1.iterator(dom_1.nextSiblings(begin_e)));
        read(literateBegin, neighbors);
        do { // CodePart = (Content (IgnoreInnerLiterate Content)?)*? End
            scanContent();
            if (literateBegin(neighbors.peek)) {
                __spread(read_2.peekWhile(read_3.negate(literateEnd), neighbors));
                read(literateEnd, neighbors);
            }
        } while (!literateEnd(neighbors.peek));
        var endDiv = neighbors.peek;
        read(literateEnd, neighbors);
        var codes = tags.filter(literateCodeFilter).map(function (e) { return e.innerText; }).join("");
        return [codes, endDiv];
    }
    exports.filterCode = filterCode;
    function enableCodeFilter(begin_e) {
        var playgroundDefaults = exports.literateKtConfig.playgroundDefaults;
        var playground = literateKtMagics.playgroundClass, hiddenDependency = literateKtMagics.hiddenDependencyClass, KotlinPlayground = literateKtMagics.KotlinPlaygroundGlobalId;
        var _a = __read(filterCode(begin_e), 2), codeTexts = _a[0], endDiv = _a[1];
        var _b = __read(dependenciesAndDescribe(begin_e), 2), dependencies = _b[0], describe = _b[1];
        var codeDiv = document.createElement("div");
        codeDiv.innerHTML = "<button>Kotlin Code" + describe + "</button>";
        codeDiv.classList.add(playground);
        begin_e.parentElement.insertBefore(codeDiv, endDiv);
        var showCodeBtn = codeDiv.firstElementChild;
        var showKotlinSource = function () {
            var preCode = dom_2.createPreCodeElement(codeTexts);
            var code = preCode.firstElementChild;
            dom_2.assignElementAttribute(code, playgroundDefaults);
            if (dependencies != null) {
                var dependTa = dom_2.createTextarea(dependencies.join(""));
                dependTa.classList.add(hiddenDependency);
                code.appendChild(dependTa);
            }
            codeDiv.appendChild(preCode); //ok
            showCodeBtn.remove();
            dom_1.schedule(KotlinPlayground, code);
        };
        showCodeBtn.addEventListener("click", showKotlinSource);
    }
    exports.enableCodeFilter = enableCodeFilter;
    function dependenciesAndDescribe(e) {
        var _a, _b;
        var depend = literateKtMagics.dependAttribute, dependSeprator = literateKtMagics.dependSeprator;
        var dependencies = (_a = e.getAttribute(depend)) === null || _a === void 0 ? void 0 : _a.split(dependSeprator);
        var describe = "" + (e.id ? " for " + e.id : "") + (dependencies ? " depends on " + dom_1.preetyShowList(dependencies) : "");
        dependencies = (_b = dependencies) === null || _b === void 0 ? void 0 : _b.map(function (id) { return filterCode(document.getElementById(id))[0]; });
        return [dependencies, describe];
    }
    function enable() {
        document.querySelectorAll('.literateBegin').forEach(enableCodeFilter);
    }
    exports.enable = enable;
});
