String.prototype.splitCond=function(sep,op1,op2,limit){ limit=limit||0;
	let iSep=this.indexOf(sep), ss0=this.slice(0,iSep),ss1=this.slice(iSep+1);
	return (iSep==-1)? op1(this) : (limit==2)? op2(ss0,ss1) : op2(ss0, ...ss1.split(sep,limit-1))
}
function emetAttr(e,s_attrs) { // TODO support JSON str
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
			let name=s.slice(0,iK); // support # tags and div omit.
			if (s[0]=="#") {
				let part = s.substr(1).split(":",2);
				e = document["create"+emet.specialTag[part[0]]].call(document,part[1]||"");
				return;
			} else if(name=="") name="div";
			e = (!!emet.ns)? document.createElementNS(emet.ns,name) : document.createElement(name); // tagName first.
		} else {
			if (typeof vK1=="string")e[vK1] = s.slice(iK1,iK); // sets-prop cond.
		}
		if(typeof v!="string") { // this cond can't be merged
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
emet.ns=null;
emet.specialTag={text:"TextNode",cmt:"Comment",cdata:"CDATASection",frag:"DocumentFragment",preproc:"ProcessingInstruction",attr:"Attribute"};

// 下版分支支持 ,+ 操作符所需的 splitCond 子串末引解析，和能做 text/elem foreach${} 宏的模板系统一道带$变量
