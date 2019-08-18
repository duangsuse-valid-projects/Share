'use strict';

function showTemplate(attr, init) {
  var templates = cssSelect('template[' + attr + '=""]');
  templates.forEach(function(x) {
    var mixed = hmerges(x.content);
    if (typeof init =='function') { mixed = init(mixed); }
    hprepend(x, mixed);
  });
}

var createAnchor = bound(document, 'createElement').curry1('a');
function addCSSClass(cl) {
  return function(e){
    if (e.classList)
      { e.classList.add(cl); return e; }
    else {
      var anc = createAnchor();
      anc.appendChild(e);
      anc.classList.add(cl);
      return anc; } };
}

function removeElements(cs) { cs.lets(cssSelect).each(docall('remove')); }

function showNSFW() { showTemplate('nsfw', addCSSClass('nsfw')); }
