function NightButton(btn) { this.e = btn; this.serif = false; }
NightButton.flag = new hflag('night');
NightButton.fserif = new hflag('serif');
NightButton.classesOn = new hclasses(['merge']);
NightButton.div = document.body;
NightButton.prototype.register = function()  { this.e.onclick = bound(this, 'clicked'); };
NightButton.prototype.clicked = function() {
  NightButton.classesOn.switch(this.e);
  NightButton.flag.switch(NightButton.div);
  if(this.serif) NightButton.fserif.switch(NightButton.div);
  this.serif = !this.serif; //时序
};
