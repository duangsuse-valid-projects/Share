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
