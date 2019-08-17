function getOrInitItem(name, repval) {
  var x; if (x = localStorage.getItem(name)) return x;
  localStorage.setItem(name, repval);
  return repval;
}

var night = { begin: getOrInitItem('nightBegin', 12+9), end: getOrInitItem('nightEnd', 7) };
night.blackFrom = 0x0d;
night.whiteFrom = 0xdb;

function rgbGrayscale(n) {
  var xn = n.toString(16);
  if (xn.length == 1) xn = '0'+xn;
  return '#' + collect(repeat(xn, 3)).join('');
}

function hours() { return new Date().getHours(); }
function deepNight(n) {
  hsetflag(document.body, 'night');
  var sty = document.body.style;
  sty.color = rgbGrayscale(night.whiteFrom + n);
  sty.backgroundColor = rgbGrayscale(night.blackFrom - n);
}
function daynight() {
  var hourz = hours(), beg = Number(night.begin), end = Number(night.end);
  if (hourz < beg && hourz > end) return; // day
  var depth = (hourz > beg)? (hourz-beg) : (end-hourz); // or (23-beg)+hourz?
  deepNight(depth);
  console.log("Night mode: depth="+depth);
}
