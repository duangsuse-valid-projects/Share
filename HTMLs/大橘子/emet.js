String.prototype.splitCond=function(sep,op1,op2,limit){ limit=limit||0;
	let iSep=this.indexOf(sep), ss0=this.slice(0,iSep),ss1=this.slice(iSep+1);
	return (iSep==-1)? op1(this) : (limit==2)? op2(ss0,ss1) : op2(ss0, ...ss1.split(sep,limit-1))
}
function emetAttr(e,s_attrs) {
  function setK(k,v) { v=v||"";
    if(k=="text") e.textContent=v; else e.setAttribute(k,v);
  }
	s_attrs.split(",").forEach(k=>k.splitCond("=", setK, setK, 2) )
}
function emet_(css_single) {
	let e, s=css_single;
	let iK1 = 0, vK1; // of last scanned marker
	function onMarker(iK,v) {
		if (iK1 == 0) {
			e = document.createElement(s.slice(0,iK)); // tagName first.
		} else {
			if (vK1 instanceof String)e[vK1] = s.slice(iK1,iK);
		}
		if(!(v instanceof String)) { // this cond can't be merged
			let iStop = s.indexOf(v[0], iK1);
			v[1](e,s.slice(iK+1, iStop));
		}
		iK1 = iK+1, vK1 = v; // fresh value.
	}
	for (let [k,v] of emet.ssyms) { let iK=s.indexOf(k,iK1); if(iK!=-1)onMarker(iK,v); }
	onMarker(s.length,["",(e,s)=>{s==""}/*yes*/]);
	return e
}
function emet(css) {
	return css.splitCond(" ", emet_, (...items)=>{
		let eTop = emet_(items[0]);
		return [eTop,items.slice(1).reduce((e0,code)=>e0.appendChild(emet_(code)), eTop)]
	})
}
emet.ssyms=Object.entries({".": "className", "#": "id", "[":["]",emetAttr]});
