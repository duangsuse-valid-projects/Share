var abbr_expand = 'abbrev';
function abbrevClick(nd) {
  nd.onclick = function () {
    var desc = document.createElement('sub').with(function(x) { x.innerText = "("+nd.title+")"; });
    if (is.none(hflag(nd, abbr_expand))) { happend(nd, hmerges(desc)); hsetflag(nd, abbr_expand); }
    else { nd.nextSibling.remove(); hclrflag(nd, abbr_expand); }
  };
}

function initAbbrevClick() { foreach(cssSelect('abbr')) (abbrevClick); }
