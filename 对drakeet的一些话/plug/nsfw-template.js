var nsfw_template = {};
/* scoped */(function() {
function showTemplate(attr, init) {
  var templates = cssSelect('template[' + attr + '=""]');
  templates.forEach(function(x) {
    var mixed = hmerges(x.content);
    if (typeof init =='function') { mixed = init(mixed); }
    hprepend(x, mixed);
  });
} nsfw_template.showTemplate = showTemplate;

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
} nsfw_template.cssClassAdder = addCSSClass;

function removeElements(cs) { cs.lets(cssSelect).each(docall('remove')); }
nsfw_template.removeElems = removeElements;

function showNSFW() { showTemplate('nsfw', addCSSClass('nsfw')); }
nsfw_template.enable = showNSFW;
})(); // end scoped