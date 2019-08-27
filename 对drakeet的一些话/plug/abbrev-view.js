var abbrev_view = {};
/* scoped */ (function() {
var abbr_expand = 'abbrev';
function abbrevClick(nd) {
  nd.onclick = function () {
    var desc = document.createElement('sub').with(function(x) { x.classList.add('abbr-expanded'); x.innerText = "("+nd.title+")"; });
    if (is.any(hflag(nd, abbr_expand))) { hclrflag(nd, abbr_expand); nd.nextSibling.remove(); } // expand -> close
    else { hsetflag(nd, abbr_expand); happend(nd, hmerges(desc)); } }; // close -> expand
} abbrev_view.abbrevClick = abbrevClick;

function initAbbrevClick() { foreach(cssSelect('abbr')) (abbrevClick); }
abbrev_view.enable = initAbbrevClick;
})(); // end scoped