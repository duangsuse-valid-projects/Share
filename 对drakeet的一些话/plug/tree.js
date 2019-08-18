var contentTree = {
  headerDept: function htmlHeaderDepth(tagName) {
    var mn = tagName.match(/^[hH](1|2|3|4|5|6)$/);
    if (is.none(mn)) return undefined;
    var n = Number(mn[1]);
    return n; },
  headerMixN: function makeHtmlHeaderMixture(k) {
    return function htmlHeaderMixed(tagName) {
      var n = contentTree.headerDept(tagName);
      return contentTree.valid(n+k)? 'H'+(n+k).toString() : undefined; }; },
  valid: function headingValid(n) { return n > 0 && n <= 6; },
  tagNames: "H1 H2 H3 H4 H5 H6",
  lessThan: function (a, b) { return contentTree.headerDept(a) < contentTree.headerDept(b); }
};
contentTree.succ = contentTree.headerMixN(+1);
contentTree.pred = contentTree.headerMixN(-1);
contentTree.tagNames += ' ' + contentTree.tagNames.toLowerCase();
contentTree.tagNames = contentTree.tagNames.split(' ');

function deep(xs) {
  var acc; for (acc = xs; (acc.length > 0) &&
    is.number(acc[acc.length-1].length); acc = acc[acc.length-1]);
  return acc; }
function treeParse(root) {
  var childs = root.children,
    tree = [], depths = [1], final = [];
  foreach(childs) (function (e) {
    var tagName = e.tagName;
    if (!contentTree.tagNames.includes(tagName)) return;
    var depth = contentTree.headerDept(tagName);
    var d0 = depths.pop();
    var subtree = [];
    if (depth > d0) {
      depths.push(d0); depths.push(depth);
      deep(tree).push(subtree); }
    else if (depth < d0) {
      if (d0 - depth === 1) depths.push(depth); // 处理递增项目
      if (depths[depths.length-1] === depths[depths.length-2]) depths.pop(); // 合并相邻项目
      final.push(tree.shift());
      tree.push(subtree); }
    else { depths.push(d0); }
    console.log(depths, e, d0,depth);
    deep(tree).push(e);
  });
  for (x=2; x!=0; --x) final.push(tree.shift());
  return final;
}

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
  if (this.tree.children.length >1) this.tree.removeChild(this.tree.children[0]);
  this.tree.appendChild(render); var summ = document.createElement('summary');
  summ.innerText = '📚 ' + tree[0].innerText; summ.classList.add('toc');
  this.tree.appendChild(summ);
};
