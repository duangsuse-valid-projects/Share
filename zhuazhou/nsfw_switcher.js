function NsfwButton(btn) { this.e = btn; this.nsfwed = false; }
NsfwButton.prototype.register = function() {
  this.e.onclick = bound(this, 'clicked');
};
NsfwButton.prototype.clicked = function() {
  if (this.nsfwed) NsfwButton.hideNsfw(); else NsfwButton.showNsfw();
  this.nsfwed = !this.nsfwed;
  this.update();
};
NsfwButton.prototype.update = function()
  { this.e.innerText = !this.nsfwed? NsfwButtonKst.show : NsfwButtonKst.hide; };

NsfwButton.elems = function() { return cssSelect(NsfwButtonKst.css); };
NsfwButton.hideNsfw = function() { this.elems().forEach(function(e) { NsfwButtonKst.fhide.setFlag(e) }) };
NsfwButton.showNsfw = function() { this.elems().forEach(function(e) { NsfwButtonKst.fhide.del(e) }) };

var NsfwButtonKst = { show: '显示 NSFW', hide: '隐藏 NSFW', css: '*[nsfw=""]', fhide: new hflag('hidden') };
