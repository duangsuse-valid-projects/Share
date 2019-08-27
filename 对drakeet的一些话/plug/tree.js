var contentTree = { verbose: true };

/* scoped */ (function() {
var _1to6 = '1,2,3,4,5,6'.split(',');
function isHeading(e) { var nm = e.tagName;
  return nm.length > 1 && nm[0] === 'H' && nm[1] in _1to6; }
function headingDepth(e) { return Number.parseInt(e.tagName[1]); } // why not regex?
function peek(xs) { return xs[xs.length -1]; }
function topItem2Stk(xs) { var top = xs.pop(); return (top instanceof Array? top : [top]); }
function deepest(xs, n){ n=n||0; var xx; for (xx = xs; xx.length >n && xx[n] instanceof Array; xx = xx[n]); return xx; }

function parseHeadingTree(root) {
  var resultstk = [[{tagName:'H1', innerText:'GraphRoot'}]], depthstk = [1];
  var leaf = peek.curry1(resultstk),
      append = function(e) { leaf().push(e); };
  function deduceToLevelBase(lev) {
    var deducecnt = (depthstk.length-1) - depthstk.findIndex(function(x){ return x<lev; });
    if(contentTree.verbose) console.log('<', deducecnt, ' of ', lev, depthstk);
    for (deducecnt-=1; deducecnt !==0; --deducecnt) { resultstk.pop(); depthstk.pop(); }
    depthstk.push(lev); var sub = []; leaf().push(sub); resultstk.push(sub); }
  function closeUntilRoot() {
    var layer = peek(resultstk);
    while (layer instanceof Array &&
      (layer.length === 0 ||
      headingDepth(deepest(layer)[0]) !== 1) ) {
    resultstk.pop();
    layer = peek(resultstk); } } // for top <h1>

  foreach(root.children) (function(elem) {
    if (!isHeading(elem)) throw nextIter;
    var depth = headingDepth(elem),
        lastdept = peek(depthstk);
    if(contentTree.verbose) console.log(depthstk, elem, resultstk);
    if (depth > lastdept) {
      depthstk.push(depth); var parent;
      append(parent = topItem2Stk(leaf()));
      var subtree = []; parent.push(subtree);
      resultstk.push(subtree);
      if(contentTree.verbose) console.log('>', depth-lastdept, elem, parent, subtree); }
    else if (depth < lastdept) {
      deduceToLevelBase(depth); }
    append(elem);
  });
  closeUntilRoot();
  return peek(resultstk);
} contentTree.parseTreeFast = parseHeadingTree;

function descentParseHeadingTree(hlist, idx, level) {
  var layer = []; if(contentTree.verbose) console.log('>', level, '@', idx);
  var count = 0; if (idx >= hlist.length) { console.log('0<'); return [0, layer]; }
  for (var i = idx; i !== hlist.length; ++i, ++count) {
      var elem = hlist[i], nextdept = headingDepth(elem);
      console.log(level, nextdept, elem);
    if (nextdept > level) {
      var child = descentParseHeadingTree(hlist, i, nextdept);
      layer.push(child[1]); i += child[0];
      if (i >= hlist.length) { console.log('?<', i); return [count, layer]; }
    } else if (nextdept < level) {
      if(contentTree.verbose) console.log('<', level, '@', idx);
      return [count-1, layer]; // ignore this `peek` read!
    } else if (nextdept === level) {
      layer.push(elem);
    }
  }
  return [count, layer];
}
function parseHeadingTreeRecurse(root, idx) {
  if (!is.natural(idx)) idx = 0;
  var result = descentParseHeadingTree(collect(filter(isHeading, root)), idx, 1);
  return result[1].slice(0, result[1].length - (result[0]-1)); // cancel tail read (may occur beacuse index overflow)
} contentTree.parseTree = parseHeadingTreeRecurse;
})(); // end scope

function TreeView(div) {
  this.tree = document.createElement('details');
  div.appendChild(this.tree);
}
TreeView.render = function(tree, f) {
  if (!is.fun(f)) f = function (t) { return document.createTextNode(t); };
  var part; if (tree instanceof Array) { part = document.createElement('ul');
    foreach(tree) (function(x) { part.appendChild(TreeView.render(x, f)); }); }
  else { part = document.createElement('li'); var rendered = f(tree); part.appendChild(rendered); }
  return part;
};
TreeView.prototype.update = function(tree) {
  var _rend = function(node) {
    var v=document.createElement('a'); var name = node.innerText;
    v.innerText = name; v.href = '#'+node.id;
    return v; };
  var render = TreeView.render(tree.slice(1, tree.length), _rend);
  if (this.tree.children.length >1) for (var n=0; n!=2; ++n) this.tree.removeChild(this.tree.children[0]);
  this.tree.appendChild(render); var summ = document.createElement('summary');
  summ.innerText = '¶ ' + tree[0].innerText; summ.classList.add('toc');
  this.tree.appendChild(summ);
};
