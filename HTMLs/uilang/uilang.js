function tokizer(re, input) {
  function es5() {
  var m = re.exec(input.substr(re.lastIndex, input.length));
    if (m!=null) re.lastIndex += m.length; else re.lastIndex = 0;
    return m;
  }
  try { var rey=RegExp(re, "y"); return function() { return rey.exec(input); } }
  catch (e) { return es5; }
}

function capitalize(s) { return (s=="")?"" : s[0].toUpperCase()+s.substr(1,s.length); }
function trimLeft(c, s) { return (s=="")?"" : (s[0] == c)? s.substr(1) : s; }
function trimRight(c, s) { return (s=="")?"" : (s[s.length-1] == c)? s.substr(0, s.length-1) : s; }

var TOK_UILANG = /\s*([^" ]+)|\s*("[^"]*")/;
var uilang = {};
function evalify(code, dest_cg) {
  var acc = uilang; if (dest_cg) dest_cg.push("uilang");
  var name = null; // canonical naming, first.
  var tokz = tokizer(TOK_UILANG, code);
  var tok; while ((tok=tokz()) != null) {
   if (tok[1]) { name = (name == null)? trimRight("s", tok[1]) : name + capitalize(tok[1]); }
   else {
     var arg1 = JSON.parse(tok[2]);
     acc = acc[name].apply(acc, [arg1]);
     if (dest_cg) dest_cg.push("."+name+"("+JSON.stringify(arg1)+")");
     name = null; }
  }
  return acc;
}
function evalify_cg(code) {
  var buf = [];
  evalify(code, buf);
  return buf.join("");
}

// UILang abstractions, w/o codegen
// clicking on {clickSelector} {behavior}s? class .?{class} on {targetSelector}
// E.g. clicking on "(.more)"( toggles class )"(visible)"( on )"(#popover)"

uilang.itselfs = ["target", "this", "it", "itself"];

function ClickOn(css) { this.selector = css; }
function ClassListOp(elem, op, name) { this.target = elem; this.op = op; this.classValue = trimLeft(".", name); }

ClassListOp.prototype.operateOn = function(e) {
  var cls = e.classList; var v = this.classValue;
  switch (this.op) {
    case "add": cls.add(v); break;
    case "remove": cls.remove(v); break;
    case "toggle": cls.toggle(v); break;
  }
}
ClassListOp.prototype.register = function(reg) {
  var css = this.target.selector;
  (css.indexOf(' ') == -1 && css[0] == '#')?
    reg(document.getElementById(css.substr(1))) :
      [].forEach.call(document.querySelectorAll(css), reg);
}
ClassListOp.prototype.on = function(dest_css) {
  var isEvTarget = uilang.itselfs.indexOf(dest_css) != -1;
  var clop = this;
  clop.register(function(e) {
    var elem = isEvTarget? e : document.querySelector(dest_css);
    e.addEventListener("click", function (ev) {
      if (ev.target.tagName == "A") ev.preventDefault();
      clop.operateOn(elem);
    }); });
}
ClassListOp.prototype.onDynamic = function(dest_css) {
  var isEvTarget = uilang.itselfs.indexOf(dest_css) != -1;
  var clop = this;
  clop.register(function(e) { e.addEventListener("click", function (ev) {
    if (ev.target.tagName == "A") ev.preventDefault();
    clop.operateOn(isEvTarget? ev.target : document.querySelector(dest_css));
    }); });
}

uilang.clickingOn = function(css) { return new ClickOn(css); }
function classListOp(op) { return function(name) { return new ClassListOp(this, op, name); } };

ClickOn.prototype.add = ClickOn.prototype.addClass = classListOp("add");
ClickOn.prototype.remove = ClickOn.prototype.removeClass = classListOp("remove");
ClickOn.prototype.toggle = ClickOn.prototype.toggleClass = classListOp("toggle");

function uilangInit() {
  var codeElements = document.getElementsByTagName("code");
  var i = codeElements.length;
  var codeBlock; while (i--) {
    var code = codeElements[i];
    if (code.textContent.indexOf("clicking on") != -1) { codeBlock = code; break; }
  }
  if (!codeBlock) return;
  codeBlock.parentNode.removeChild(codeBlock)
  var codes = codeBlock.textContent.trim().split("\n");
  if (window.COMPILED == undefined) { codes.forEach(function(s) { evalify(s); }); return; }
  var jsCode = [];
  codes.forEach(function(s) { jsCode.push(evalify_cg(s)); });
  var dest = document.createElement("script");
  dest.textContent = jsCode.join(";\n"); // silly
  document.head.appendChild(dest);
  var note = document.createElement("script");
  note.textContent = "COMPILED=true; //generated";
  document.head.insertBefore(note, document.head.firstChild);
}

if (window.COMPILED != true) document.addEventListener("DOMContentLoaded", uilangInit);
