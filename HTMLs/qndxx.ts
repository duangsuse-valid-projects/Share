var makeTagConfig: {
  eventNames: {[tag:string]: string},
  antiGitter: {[tag:string]: (e:HTMLElement) => number},
  groups: {[k:string]: HTMLElement[]},
  _launchBr: HTMLElement
} = {
  eventNames: {IMG: "load"},
  antiGitter: {TEXTAREA: e => 300/*ms*/},
  groups: {},
  _launchBr: document.createElement("br") //unique // TODO replace with null
};

function addMakeUpdater(e_src: HTMLElement, op: (ev:Event)=>void) {
  e_src.addEventListener(makeTagConfig.eventNames[e_src.tagName] || "change", op);
}
function getMakeGroup(name: string) {
  let gs = makeTagConfig.groups;
  if (!(name in gs)) gs[name] = [];
  return gs[name];
}
function addMakeOperation<A, B extends HTMLElement>(dst: A, srcs: (B|string)[], op: (dst:A, srcs:B[])=>void) {
  const isGroup = (x: (B|string)) => typeof x === "string";
  const addUpdater = (e: HTMLElement, op: (ev:Event)=>void) => {
    e.addEventListener(makeTagConfig.eventNames[e.tagName] || "change", op);
  };
  let esrcs = srcs as B[]; //lazy
  let groups: string[] = null; //lazy
  const defaultUpdate = (ev:Event) => {
    groups?.forEach(launchMakeGroup); op(dst, esrcs);
  };
  const makeAntiGitter = (ms:number) => {
    var lastTimer: number;
    const refresh = defaultUpdate.bind(null, undefined);
    return (ev:Event) => { clearTimeout(lastTimer); lastTimer = setTimeout(refresh, ms); };
  }; // unnecessary?...
  for (let src of srcs) {
    if (isGroup(src)) {
      if (esrcs === srcs) { esrcs = srcs.filter(it => !isGroup(it)) as B[]; groups = []; } //lazied
      groups.push(src as string);
      continue;
    }
    src = src as B;
    let getAntiGitter = makeTagConfig.antiGitter[src.tagName];
    addMakeUpdater(src, (getAntiGitter == undefined)? defaultUpdate : makeAntiGitter(getAntiGitter(src)) );
  } // done
}
function addMakeOperationToGroup<A, B extends HTMLElement>(name: string, dst: A, srcs: B[], op: (dst:A, srcs:B[])=>void) {
  getMakeGroup(name).push(makeTagConfig._launchBr, ...srcs); // makeGroup add
  var isRunning = false;
  const noRecur = (ev:Event) => {
    if (isRunning) return; // since we have to "remake" one src in order to call actual op.
    isRunning = true;
    launchMakeGroup(name);
    isRunning = false;
  };
  for (let e of srcs) { addMakeUpdater(e, noRecur); } // makeGroup feat.
  return addMakeOperation(dst, srcs, op);
}
function addMakeAttributeOperationToGroup<A extends HTMLElement, B extends HTMLElement>(name: string, dst: A, attr: string, value: string, src: B, op: (dst:A, src:B)=>void) {
  getMakeGroup(name).push(src);
  addMakeUpdater(src, (ev:Event) => {
    if (dst.getAttribute(attr) == value) return;
    op(dst, src);
    dst.setAttribute(attr, value);
  });
}
function launchMakeGroup(name: string) {
  let es = makeTagConfig.groups[name];
  for (let i=0; i<es.length; i++) {
    if (es[i] === makeTagConfig._launchBr) { invalidateRemake(es[i+1]); i++; }
  }
}
function invalidateRemake(e_src: HTMLElement) {
  e_src.dispatchEvent(new Event(makeTagConfig.eventNames[e_src.tagName] || "change"));
}

function callDOMReader(input, reader_code, on_done) {
  let [name, op_name] = reader_code.split('.');
  let reader = new (Function.prototype.bind.apply(window[name], [null]) as ()=>void);
  reader[op_name].apply(reader, [input]);
  reader.onload = () => { on_done(reader.result); };
}

function deepClone(node: Node) {
  let childs = node.childNodes;
  if (childs.length == 0) return node.cloneNode();
  let copy = node.cloneNode();
  for (let i=0; i<childs.length; i++) {
    let child = childs.item(i);
    copy.appendChild(deepClone(child));
  }
  return copy;
}

function firstElementChildWith(attr: string, predicate: (v:string)=>boolean, e0: Element) {
  var e = e0.firstElementChild;
  while (e != null && !predicate(e.getAttribute(attr)) ) e = e.nextElementSibling;
  return e;
}

/** Make a tabular element presistent on its all input fields */
class ValuePresistence {
  _eOriginal: Element; _indices: number[];
  _sto: Storage; _no: number;
  on_done: ()=>void;
  constructor(e0: Element, indices: number[], storage: Storage) { this._eOriginal = e0; this._indices = indices; this._sto = storage; this._no = 0; }
  _registerOnItem(e: HTMLInputElement) {
    if (e.id == undefined) throw Error(`presistent <input> ${e} w/o const id`);
    if (this._no != 0 && e.id in this._sto) { e.id = ValuePresistence.succ(e.id, this._no); }
    const load = () => { e.value = this._sto[e.id] || e.value; };
    e.addEventListener("load", load); load(); // fuzzy
    e.addEventListener("change", (ev:Event) => { let evt = (ev.target as HTMLInputElement); this._sto[evt.id] = evt.value; });
  }
  _registerOn(e0: Element) { for (let i of this._indices) { this._registerOnItem(e0.children.item(i) as HTMLInputElement); } this._no++; }
  appendOneTo(e0: Element) {
    let e = deepClone(this._eOriginal) as Element;
    e0.appendChild(e); this._registerOn(e);
    let btnDel = document.createElement("button");
    btnDel.classList.add("vp-delete");
    btnDel.onclick = () => { this.removeOne(e); };
    e.appendChild(btnDel);
  }
  removeOne(e0: Element) {
    var succ: Element = null;
    for (let i of this._indices) {
      let e = e0.children.item(i); let sucId = e.id;
      while ((succ = helem(ValuePresistence.succ(sucId, 1))) != null) {
        sucId = succ.id; succ.id = ValuePresistence.succ(succ.id, -1);
        succ.dispatchEvent(new Event("change"));
        e = succ; //^ NOTE can't be reached with zipWithNext() / chunked(2) since IDs will (==)
      } //^ update them all!
      delete this._sto[sucId]; // change size.
      succ = null;
    }
    e0.remove(); this._no--;
  }
  done() {
    let eO = this._eOriginal; let epO = eO.parentElement;
    this._registerOn(eO);
    let fstId = firstElementChildWith("id", it => it != null, eO).id; // TODO replace.
    for (let no = 1; `${fstId}${no}` in this._sto; no++) {
      this.appendOneTo(epO); // must be separated, since we provide appendOneTo
    }
    if (typeof this.on_done === "function") this.on_done();
 }
 static RE_SUCC = /^(\D*)(\d+)$/;
 static succ(numed_str: string, dist: number) { // unnecessary? // TODO remove
   let ma = ValuePresistence.RE_SUCC.exec(numed_str);
   if (ma == null) return `${numed_str}${dist}`;
   let [m, prefix, ns] = ma;
   return `${prefix}${parseInt(ns)+dist}`;
 }
}

function createCycleSeq<T>(xs: T[]) { // TODO remove
  var i = 0; var n = xs.length;
  return () => { let oldI = i; i = (i+1) % n; return xs[oldI]; };
}
function forEachChunked<T>(n: number, xs: T[], op:(xz:T[])=>void) {
  if (xs.length % n != 0) throw Error(`${xs}'s length ${xs.length} can't be chunked ${n}`);
  var res = [];
  for (var i=0; i<xs.length; i += n) { for (var j=0; j<n; j++) { res.push(xs[i+j]); } op(res); res.splice(0, res.length); }
}

// == Begin app part ==
function helem<T extends Element>(id:string) { return document.getElementById(id) as unknown as T; }
function aryQuerySelector<RH extends HTMLElement>(css: string, e: HTMLElement) { return Array.prototype.slice.call(e.querySelectorAll(css)) as RH[]; }

function drawTextOn(ctx:CanvasRenderingContext2D, text:string, x:number, y:number) {
  let font = ctx.font;
  let hText = parseInt(font.substr(0, font.indexOf('p'))); //parse!
  var dyText = 0;
  for (let line of text.split('\n')) {
    ctx.fillText(line, x, y+dyText);
    dyText += hText;
  } // bad DOM canvas API...
}

makeTagConfig.eventNames["TEXTAREA"] = "input";
makeTagConfig.antiGitter["INPUT"] = ((e:HTMLInputElement) => (e.type == "number" || e.type == "range")? 200 : 0);

var vp: ValuePresistence;
function mainLogic() {
  const
  fileImg = helem<HTMLInputElement>("file-img"),
  imgLoaded = helem<HTMLImageElement>("img-loaded"),
  ePaint = helem<HTMLCanvasElement>("paint"),
  imgOut = helem<HTMLImageElement>("img-out"),
  listConfig = helem<HTMLDivElement>("list-config");

  let canvas = ePaint.getContext("2d");
  const updateXY = (ev:Event) => {
    let img = ev.target as HTMLImageElement;
    forEachChunked(2, aryQuerySelector<HTMLInputElement>("input[type=\"range\"]", listConfig), (sXY) => {
      let [sX, sY] = sXY;
      sX.max = String(img.width);
      sY.max = String(img.height);
      sXY.forEach(it => it.dispatchEvent(new Event("load")));
      sY.dispatchEvent(new Event("change"));
    });
  };
  addMakeOperation(imgLoaded, [fileImg], (dst, srcs) => {
    dst.addEventListener("load", updateXY);
    callDOMReader(srcs[0].files[0], "FileReader.readAsDataURL", (durl) => { dst.src = durl; });
  }); // MAKE#1 imgLoaded

  let esConfig = aryQuerySelector("input, textarea", listConfig);
  forEachChunked(2/*XY*/+3, esConfig, (es) => {
    let srcs = [...es, imgLoaded] as HTMLInputElement[]; //dytype!
    addMakeOperation(imgOut, srcs, (img, [eText, sX, sY, eColor, eSize, img0]) => {
      if (img0.src == "") return;
      ePaint.width = img0.width; ePaint.height = img0.height;
      canvas.drawImage(img0 as unknown as HTMLImageElement, 0, 0);
      canvas.font = `${eSize.value}px sans`; canvas.fillStyle = eColor.value;
      drawTextOn(canvas, eText.value, sX.valueAsNumber, sY.valueAsNumber);
      img.src = ePaint.toDataURL("image/png"); // TODO extract to make group dst.
    }); // MAKE#2 imgOut
  });
}
document.addEventListener("DOMContentLoaded", () => {
  vp = new ValuePresistence(helem("list-config").getElementsByClassName("persist-cfg").item(0), [0/*text*/, 2/*X*/, 4/*Y*/, 6/*color*/, 8/*size*/], localStorage);
  vp.on_done = mainLogic;
  vp.done();
});

function enableTextAdderOn(e:HTMLElement, insert_panel:(e_pan:HTMLElement)=>void = null/*popup*/) {/*TODO*/}
