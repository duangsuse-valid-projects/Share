var night = { name: 'night', serifName: 'serifd', st: namedStorage('night.') };
night.begin = night.st('begin', 12+8, parseInt); night.end = night.st('end', 7, parseInt);
night.deftNight = night.st('defaultDepth', 3, parseInt);
night.blackFrom = night.st('blackFrom', 0x29, parseInt);
night.whiteFrom = night.st('whiteFrom', 0xd3, parseInt);
night.alogrithm = night.st('depthAlgor', 'bd');
night.algorithmCoeff = night.st('graidentLevel', 5, parseInt);
night.autoNight = night.st('autoNight', true, JSON.parse);
night.autoUpdate = night.st('nightUpdates', true, JSON.parse);
night.sty = document.body.style;

night.depthCalculators = {}; // 艰难 复用...
function simpleCalculateAlgorithm(f) {
  return function simpleXX(h, b, e) {
    return night.algorithmCoeff* ((h >= b)? (h-b) : f(b, e, h));
  }; }
night.depthCalculators.sd = simpleCalculateAlgorithm(function sd(b,e,h){ return e-h; }); // 差量算法
night.depthCalculators.sdr = simpleCalculateAlgorithm(function sdr(b,e,h){ return (23-b)+h; }); // 叠加白昼时间算法
night.depthCalculators.sdb = simpleCalculateAlgorithm(function sdb(b,e,h){ return (23-b)+(e-h); }); // 差量叠加算法
night.depthCalculators.excited = function(h, b, e) { return Math.abs(h - b); }; // 突变算法
night.depthCalculators.bd = function balancedDepth(h, b, e) { // 平衡数量级算法
  var db = Math.abs(23 - b), de = Math.abs(0 - e);
  var ratioeb = de / db;
  return night.algorithmCoeff* ((h >= b)? ratioeb/ ((h-b) || 1) : (e-h)*ratioeb);
};
night.calculateDepth = night.depthCalculators[night.alogrithm] || night.depthCalculators.bd;
/* scoped */ (function() {
function rgbGrayscale(n) {
  n = Math.min(0xff, Math.floor(n));
  return '#' + hex(grayscale(n), 3*2); }

var rgbGrayscaleLog = rgbGrayscale.also(console.log.by(add.curry1('Using color ')));

night.bannerDiv = function bannerDiv() {
  var fst = cssSingle('body .container-lg');
  if (fst) fst = fst.children[0]; else return null;
  return (is.empty(fst.id) && fst.tagName === 'H1')? fst : null; 
};

function hours() { return new Date().getHours(); }
night.hours = hours;
function deepNight(n) {
  hsetflag(document.body, night.name);
  night.sty.color = rgbGrayscaleLog(night.whiteFrom + n);
  night.sty.backgroundColor = rgbGrayscaleLog(night.blackFrom - n);
}
night.forceNight = deepNight;
function deepDay() {
  hclrflag(document.body, night.name);
  singleshotAnim(document.body, 'dayed');
  night.sty.color = night.sty.backgroundColor = ''; }
night.forceDay = deepDay;

function nightSerif() { var body = document.body;
  if (is.any(hflag(body, night.serifName))) { body.classList.remove('serif'); hclrflag(body, night.serifName); }
  else { body.classList.add('serif'); hsetflag(body, night.serifName); } }
night.serify = nightSerif;

night.btnMoon = function btnMoon(banner) {
  if (is.null(banner) || is.empty(banner.children)) return;
  var moon = document.createElement('small');
  moon.innerText = '◑'; moon.style.cssFloat = 'right'; moon.style.fontSize = '22px';
  happend(banner.children[0], moon); var count = 1; // first click=switch, not serif swi
  moon.onclick = function() {
    if (is.any(hflag(document.body, night.name))) deepDay(); else deepNight(night.deftNight);
    var shouldserif = count %2 ==0; console.log('Night: serif count='+count+
      (shouldserif? '[changed]':'[unchanged]'));
    if (shouldserif) nightSerif();
      count += 1; };
};

function nightDepthChangeTime(d) {
  var date = d || new Date();
  var mins = date.getMinutes(), secs = date.getSeconds(), msecs = date.getMilliseconds();
  return (60-mins)*60*1000 + (60-secs)*1000 + (1000-msecs);
} night.nextHourDelay = nightDepthChangeTime;

function dayNightTime() {
  var untilChange = 0, hr = hours();
  if (hr > night.end && hr <= night.begin) untilChange = night.begin - hr;
  return (untilChange*60*60*1000) + nightDepthChangeTime();
} night.nextChangeDelay = dayNightTime;

night.daynight = function daynight() {
  var hourz = night.hours(), beg = night.begin, end = night.end;
  var dlt; if (night.autoNight) { dlt = dayNightTime(); delay(dlt, daynight); }
  if (hourz < beg && hourz > end) { if(is.natural(dlt)) console.log("Night mode scheduled: "+(dlt/60/60/1000)+"hrs"); return; } // day
  var depth = night.calculateDepth(hourz, beg, end); // or (23-beg)+hourz?
  deepNight(depth); console.log("Night mode: depth="+depth+" :: h"+hourz+" ("+beg+", "+end+")");
  if (night.autoUpdate) { var dpt = nightDepthChangeTime(); delay(dpt, daynight);
  console.log("Night mode change schedule update="+(dpt/60/1000)+"mins"); }
};

night.enable = function(ban) {
  console.log("Night mode plugin initialized using ", {range: [[night.begin, 23], [0, night.end]],
    userNight: night.deftNight, black0: night.blackFrom, white0: night.whiteFrom, stepCoeff: night.algorithmCoeff,
    alogrithms: night.depthCalculators, alogrithm: night.calculateDepth,
    autoTimer: [night.autoNight, night.autoUpdate] });
  night.btnMoon(ban || night.bannerDiv()); night.daynight(); };
})(); // end scoped
