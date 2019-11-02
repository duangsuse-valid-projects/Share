var articleSplit = {
  execute: function(nd) {
    var article = helem(articleSplit.elementId);
    var beg = articleSplit.hfind(nd, articleSplit.isBeg),
      end = articleSplit.hfind(nd, articleSplit.isEnd);
    var childs = clone.sized(nd.children);
    for (var i=beg+1; i<end; ++i)
      { article.appendChild(childs[i]); }
  },
  hfind: function(nd, p) {
    for (var i=0; i<nd.children.length; ++i) {
      var elem = nd.children[i];
      if(p(elem)) return i;
    }
    return undefined;
  },
  isBeg: bound(new hflag('articleBegin'), 'notNull'),
  isEnd: bound(new hflag('articleEnd'), 'notNull'),
  elementId: 'main-article'
}
