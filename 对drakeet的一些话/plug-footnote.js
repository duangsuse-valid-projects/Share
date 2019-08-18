var footnote = {
  subs: function footnoteSubs() { return cssSelect('sub[fnref=""]'); },
  defs: function footenoteDefs() { return collect(filter(
    function(x) { return x.id.startsWith('fn-'); }, cssSelect('a[id]'))); } };

function C(setA, setB) {
  var compleAB = []; foreach (setA) (function(x) {
    if (setB.includes(x)) return;
    compleAB.push(x);
  });
  return compleAB;
}

function linkFootnotes() {
  var subs = footnote.subs(), defs = footnote.defs();
  var subnames = collect(map(oget.curry1('innerText'), subs)),
    defnames = collect(map(function(x) { return x.id.match(/^fn\-(.*)$/)[1]; }, defs));
  if (subs.length !== defs.length) {
    console.log('Footnote: ref length mismatch, set C(d, r)='+ C(defnames, subnames) +' vs.C(r, d)='+ C(subnames, defnames));
  }
  console.log('Footnote: '+subs.length+' refs: '+ subnames.join(', '));

  foreach(subs) (function(e) {
    var we = document.createElement('a'),
      fnid = e.innerText;
    we.id = 'fnref-'+fnid; // me
    var we_href = we.href = '#fn-'+fnid; // desc
    we.classList.add('footref');
    var deff; try { deff = cssSingle(we_href); } catch (_){}
    if (!is.none(deff) && deff.tagName === 'A') {
      deff.href = '#'+we.id;
      deff.classList.add('footnote');
      deff.onclick = function() { singleShotAnim(we, 'footrefFoc'); };
    }
    else console.warn('Failed to xlink '+we.id+' to '+we.href);
    hprepend(e, we); we.appendChild(e); });
}
