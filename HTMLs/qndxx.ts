var makeTagConfig = {
  eventNames: {IMG: "load"},
  antiGitter: {TEXTAREA: (e:HTMLElement) => 300/*ms*/}
};
function addMakeOperation<A, B extends HTMLElement>(dst: A, srcs: B[], op: (dst:A, srcs:B[])=>void) {
  const defaultUpdate = (ev:Event) => { op(dst, srcs); };
  const makeAntiGitter = (ms:number) => {
    var lastTimer: number;
    return (ev:Event) => { clearTimeout(lastTimer); lastTimer = setTimeout(op.bind(null, dst, srcs), ms); };
  }; // unnecessary?...
  for (let src of srcs) {
    let getAntiGitter = makeTagConfig.antiGitter[src.tagName];
    let update = (getAntiGitter == undefined)? defaultUpdate : makeAntiGitter(getAntiGitter(src));
    src.addEventListener(makeTagConfig.eventNames[src.tagName] || "change", update);
  } // done
}

function callDOMReader(input, reader_code, on_done) {
  let [name, op_name] = reader_code.split('.');
  let reader = new (Function.prototype.bind.apply(window[name], [null]) as ()=>void);
  reader[op_name].apply(reader, [input]);
  reader.onload = () => { on_done(reader.result); };
}

class ValuePresistence {
  on_done: ()=>void;
  constructor() {}
  add(e: HTMLInputElement) {
    if (e.id == undefined) throw Error(`presistent <input> ${e} w/o const id`);
    e.value = localStorage[e.id] || e.value;
    e.onchange = (ev:Event) => { let evt = (ev.target as HTMLInputElement); localStorage[evt.id] = evt.value; };
  }
  done() { if (typeof this.on_done === "function") this.on_done(); }
}

function createCycleSeq<T>(xs: T[]) {
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
makeTagConfig.antiGitter["INPUT"] = ((e:HTMLInputElement) => (e.type == "number")? 200 : 0);

document.addEventListener("DOMContentLoaded", () => {
  const
  fileImg = helem<HTMLInputElement>("file-img"),
  imgLoaded = helem<HTMLImageElement>("img-loaded"),
  ePaint = helem<HTMLCanvasElement>("paint"),
  imgOut = helem<HTMLImageElement>("img-out");

  let vp = new ValuePresistence();
  const add = (id:string) => vp.add(helem<HTMLInputElement>(id));
  add("text"); add("text-color"); add("text-size");
  vp.done();

  let canvas = ePaint.getContext("2d");
  let sXY = ["w", "h"].map(c => helem<HTMLInputElement>("slider-img-"+c));
  const setXY_ = (no:number, n:number) => { sXY[no].max = String(n); };
  const updateXY = (ev:Event) => { let img = ev.target as HTMLImageElement; setXY_(0, img.width); setXY_(1, img.height); };
  addMakeOperation(imgLoaded, [fileImg], (dst, srcs) => {
    dst.addEventListener("load", updateXY); // TODO make XY text -- 1:1
    callDOMReader(srcs[0].files[0], "FileReader.readAsDataURL", (durl) => { dst.src = durl; });
  }); // MAKE#1 imgLoaded

  let esConfig = Array.prototype.slice.call(helem<HTMLDivElement>("pan-config").querySelectorAll("input, textarea"));
  forEachChunked(3, esConfig, (es) => {
    let srcs = [...es, imgLoaded, ...sXY] as HTMLInputElement[]; //dytype!
    addMakeOperation(imgOut, srcs, (img, [eText, eColor, eSize, img0, sX, sY]) => {
      if (img0.src == "") return;
      ePaint.width = img0.width; ePaint.height = img0.height;
      canvas.drawImage(img0 as unknown as HTMLImageElement, 0, 0);
      canvas.font = `${eSize.value}px sans`; canvas.fillStyle = eColor.value;
      drawTextOn(canvas, eText.value, parseInt(sX.value), parseInt(sY.value));
      img.src = ePaint.toDataURL("image/png"); // TODO extract to make group dst.
    }); // MAKE#2 imgOut
  });
});

function enableTextAdderOn(e:HTMLElement, insert_panel:(e_pan:HTMLElement)=>void = null/*popup*/) {/*TODO*/}
