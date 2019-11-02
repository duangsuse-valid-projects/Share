'use strict';

/**
 * ToC, Table of Contents，递归的文档 Heading 树插件
 * 提供 parse(div, lev = 0), render(gs, f=tocTree.renderf) 对外接口
 * 内部使用 parseRec(div, i0, lev), isHeading(e), headingDepth(e)
 * 内部辅助 asLI (list item), makeLink(t, href)
 * 
 * Sample:
 *   var p = tocTree.parse(document.body)
 *   document.body.appendChild(tocTree.render(p))
 * 
 *   tocTree.config.setSubtree = function(e) { e.classList.add('toc-subtree'); }; // ul tag
 *   tocTree.config.setItem = function(e) { e.classList.add('toc-entry'); }; // inner item
 */
var tocTree = {
  parse: function(div, lev) {return tocTree.parseRec(div, 0, lev || 0)[1][0];},
  parseRec: function(div, i0, lev) {
    var index = i0, layer = [];
    for (; index < div.children.length; ++index) {
      var elem = div.children[index];
      if (!tocTree.isHeading(elem)) continue;
      var depth = tocTree.headingDepth(elem);
      if (depth > lev) {
        var nextI_layer = tocTree.parseRec(div, index, depth);
        layer.push(nextI_layer[1]);
        index = nextI_layer[0]; --index; // don't skip [H1 ^H2 H1...]
      }
      else if (depth < lev) { break; }
      else /*==lev*/ { layer.push(elem); }
    }
    return [index, layer];
  },
  render: function(gs, renderf) { var elem;
    if (gs instanceof Array) { // tag subtree
      elem = document.createElement('ul');
      for (var i=0; i<gs.length; ++i)
        { elem.appendChild(tocTree.render(gs[i])); }
      tocTree.config.setSubtree(elem);
    } else { // tag H*
      elem = (renderf || tocTree.renderf)(gs);
      tocTree.config.setItem(elem);
      elem = tocTree.asLI(elem);
    }
    return elem;
  },
  renderf: function(e) {
    var title = e.textContent;
    return e.id? tocTree.makeLink(title, '#'+e.id) : document.createTextNode(title); },
  isHeading: function(e) {return e.tagName.length !== 0 && e.tagName[0] === 'H';},
  headingDepth: function(e) { return parseInt(e.tagName.match(/^H(\d+)$/)[1]); },
  makeLink: function(t, href) { var anchor = document.createElement('a');
    anchor.text = t; anchor.href = href;
    return anchor; },
  asLI: function(e) { var li = document.createElement('li');
    li.appendChild(e); return li; },
  config: {
    setSubtree: identity,
    setItem: identity
  }
};
