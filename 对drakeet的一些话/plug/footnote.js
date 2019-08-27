var footnote = {
  subs: function footnoteSubs() { return cssSelect('sub[fnref=""]'); },
  defs: function footenoteDefs() { return collect(filter(
    function(x) { return x.id.startsWith('fn-'); }, cssSelect('a[id]'))); },
  subref: function subref(e) { return e.innerText; },
  defref: function(x) { return x.id.match(/^fn\-(.*)$/)[1]; } };

footnote.linkFootnotes = function linkFootnotes() {
  var subs = footnote.subs(), defs = footnote.defs();
  var subnames = collect(map(footnote.subref, subs)),
    defnames = collect(map(footnote.defref, defs));
  if (subs.length !== defs.length) {
    console.log('Footnote: ref length mismatch, set ∁dR='+ C(defnames, subnames) +' vs. ∁rD='+ C(subnames, defnames)); }
  console.log('Footnote: size='+subs.length+' refs: '+ subnames.join(', '));

  foreach(subs) (function(e) {
    var we = document.createElement('a'), fnid = footnote.subref(e);
    we.id = 'fnref-'+fnid; // me
    var we_href = we.href = '#fn-'+fnid; // desc
    we.classList.add('footref');
    var deff; try { deff = cssSingle(we_href); } catch (_){}
    if (!is.none(deff) && deff.tagName === 'A') {
      deff.href = '#'+we.id;
      deff.classList.add('footnote');
      deff.onclick = function() { singleshotAnim(we, 'footrefFoc'); we.focus(); };
    } else console.warn('Failed to xlink '+we.id+' to '+we.href);
    hprepend(e, we); we.appendChild(e); });
};

footnote.enable = footnote.linkFootnotes;
