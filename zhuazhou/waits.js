'use strict';
function identity(x) {return x;}
function bound(o, k) { return o[k].bind(o); }
function undefq(ref) { return ref === undefined; }
function objsetOf() { var dict = Object();
  for (ak in arguments) dict[arguments[ak]] = undefined;
  return dict;
}

var helem = bound(document, 'getElementById');
var cssSelect = bound(document, 'querySelectorAll');
var cssSingle = bound(document, 'querySelector');

function hflag(f) { this.flag = f; }
hflag.prototype.get = function(e) {return e.getAttribute(this.flag);};
hflag.prototype.notNull = function(e) {return this.get(e) !== null};
hflag.prototype.set = function(e, v) {return e.setAttribute(this.flag, v);};
hflag.prototype.setFlag = function(e) {return this.set(e, '');};
hflag.prototype.del = function(e) {return e.removeAttribute(this.flag);};
hflag.prototype.switch = function(e) { if (this.notNull(e)) this.del(e); else this.setFlag(e); }

function _isLoaded(rs) {
  return undefq(rs) || rs in objsetOf('loaded', 'complete'); }

function waits(nd, f) {
  if (nd === document.body)
    { bound(document, 'addEventListener')('DOMContentLoaded', f); }
  else nd.onload = nd.onreadystatechange = function () {
    if (_isLoaded(this.readystate)) f(); };
}

var clone = {
  sized: function(xs) {
    var new_xs = [];
    for (var i=0; i<xs.length; ++i) new_xs.push(xs[i]);
    return new_xs;
  }
};


function enableOn(name, wid) {
  var inst = new wid(helem(name)); inst.register();
  return inst;
}
