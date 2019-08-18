function getOrInitItem(name, repval) {
  var x; if (x = localStorage.getItem(name)) return x;
  localStorage.setItem(name, repval);
  return repval;
}

var night = { name: 'night', begin: getOrInitItem('nightBegin', 12+9), end: getOrInitItem('nightEnd', 7) };
night.blackFrom = 0x0d;
night.whiteFrom = 0xdb;

function rgbGrayscale(n) {
  var xn = n.toString(16);
  if (xn.length == 1) xn = '0'+xn;
  return '#' + collect(repeat(xn, 3)).join('');
}

function bannerDiv() {
  var fst = cssSingle('body .container-lg');
  if (fst) fst = fst.children[0]; else return null;
  return (is.empty(fst.id) && fst.tagName === 'H1')? fst : null; 
}

function btnMoon() {
  var banner = bannerDiv();
  if (is.null(banner) || is.empty(banner.children)) return;
  var moon = document.createElement('small');
  moon.innerText = '◑'; moon.style.cssFloat = 'right'; moon.style.fontSize = '22px';
  happend(banner.children[0], moon);
  moon.onclick = function() { if (is.empty(hflag(document.body, night.name))) deepDay(); else deepNight(3); };
}

function hours() { return new Date().getHours(); }
function deepNight(n) {
  hsetflag(document.body, night.name);
  var sty = document.body.style;
  sty.color = rgbGrayscale(night.whiteFrom + n);
  sty.backgroundColor = rgbGrayscale(night.blackFrom - n);
}
function deepDay() {
  singleShotAnim(document.body, 'dayed');
  hclrflag(document.body, night.name);
  var sty = document.body.style;
  sty.color = sty.backgroundColor = ''; }
function singleShotAnim(nd, name) {
  nd.classList.add(name);
  nd.onanimationend = function() { nd.classList.remove(name); };
}
function daynight() {
  var hourz = hours(), beg = Number(night.begin), end = Number(night.end);
  if (hourz < beg && hourz > end) return; // day
  var depth = (hourz > beg)? (hourz-beg) : (end-hourz); // or (23-beg)+hourz?
  deepNight(depth);
  console.log("Night mode: depth="+depth);
}
