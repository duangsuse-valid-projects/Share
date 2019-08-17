function getOrInitItem(name, repval) {
  var x; if (x = localStorage.getItem(name)) return x;
  localStorage.setItem(name, repval);
  return repval;
}

var night = { begin: getOrInitItem('nightBegin', 12+9); end: getOrInitItem('nightEnd', 7)  }

function hours() { return new Date().getHours(); }
function deepNight(n) {
  hsetflag(document.body, 'night');
}
function daynight() {
  var hourz = hours(), beg = Number(night.begin), end = Number(night.end);
  if (hourz < beg && hourz > end) return; // day
  var depth = (hourz > beg)? (hourz-beg) : (end-hourz);
  deepNight(depth);
}
