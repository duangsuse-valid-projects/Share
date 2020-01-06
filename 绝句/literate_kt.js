// depreacted and reworte in TypeScript

/** An Iterator saving its last yield item, for takeWhile-like functions "lookbehind" */
class SaveIterator {
  constructor(s) {
    this.s = s[Symbol.iterator]();
    this.last = null;
  }
  next() {
    this.last = this.s.next();
    return this.last;
  }
  get lastItem() {
    return this.last.value;
  }
  [Symbol.iterator]() { return this; }
}

/** Give succ(lastItem) function, make a generator chain by initial item */
function chainBy(succ) {
  return function *(init) {
    for (let cur = init; succ(cur); cur = succ(cur)) yield cur;
  };
}
function *takeWhile(p, xs) {
  for (let x of xs)
    if (p(x)) { yield x; }
    else break;
}
function negate(p) { return x => !p(x); }
function or(p, q) { return x => p(x) || q(x); }

function assignDOMAttribute(node, attributes) {
  for (let [name, value] of Object.entries(attributes))
    node.setAttribute(name, value.toString());
}
function createElementInitialText(node_type, text) {
  let node = document.createElement(node_type); node.textContent = text;
  return node;
}
////

const nextSiblings = chainBy(e => e.nextSibling);
const hasCSSClass = css => e => e.classList!=null&&e.classList.contains(css);

const literateKtConfig = {
  literateBegin: hasCSSClass("literateBegin"),
  literateEnd: hasCSSClass("literateEnd"),
  literateCodeFilter: hasCSSClass("language-kotlin"),
  playgroundDefaults: {
    "indent": 2,
    "auto-indent": true,
    "data-autocomplete": true,
    "highlight-on-fly": true,
    "match-brackets": true
  }
};

/** Returns [codes, endDiv] */
function filterCode(begin_e) {
  const {literateBegin, literateEnd, literateCodeFilter} = literateKtConfig;
  let neighbors = new SaveIterator(nextSiblings(begin_e));
  let tags = [];
  neighbors.next(); //literateBegin
  const eoLiterateP = negate(or(literateEnd, literateBegin));
  const scanContent = () => tags.push(...takeWhile(eoLiterateP, neighbors));
  scanContent();
  do { // CodePart = (Content (IgnoreInnerLiterate Content)?)*? End
    if (literateBegin(neighbors.lastItem)) {
      [...takeWhile(negate(literateEnd), neighbors)];
      scanContent();
    }
  } while (!literateEnd(neighbors.lastItem));
  let codes = tags.filter(literateCodeFilter).map(e => e.innerText).join("");
  return [codes, neighbors.lastItem];
}

function createPreCodeElement(text) {
  let pre = document.createElement("pre");
  let code = createElementInitialText("code", text);
  pre.appendChild(code); return pre;
}
function createTextarea(text) {
  let textarea = createElementInitialText("textarea", text);
  return textarea;
}
function preetyShowList(xs, sep = ", ", last_sep = " and ") {
  const last = xs.length-1;
  if (xs.length == 0 || xs.length == 1) return xs.join(sep);
  else return xs.slice(0, last).join(sep) + last_sep + xs[last];
}
function enableCodeFilter(begin_e) {
  let [codes, endDiv] = filterCode(begin_e);
  let pre = createPreCodeElement(codes);

  let dependencies = begin_e.getAttribute("depend");
  if (dependencies!=null) dependencies = dependencies.split(" ");
  let describe = `${begin_e.id? " for "+begin_e.id:""}${dependencies? " depends on "+preetyShowList(dependencies) : ""}`;
  if (dependencies!=null) dependencies = dependencies.map(id => filterCode(document.getElementById(id))[0]);

  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code${describe}</button>`; codeDiv.classList.add("playground");
  begin_e.parentElement.insertBefore(codeDiv, endDiv);

  let btn = codeDiv.firstChild;
  btn.onclick = () => {
    let code = pre.firstChild; assignDOMAttribute(code, literateKtConfig.playgroundDefaults);
    if (dependencies!=null) {
      let dependTa = createTextarea(dependencies.join("")); dependTa.classList.add("hidden-dependency");
      code.appendChild(dependTa);
    }
    codeDiv.appendChild(pre); btn.remove();
    schedule("KotlinPlayground", code);
  };
}
function schedule(name, ...args) {
  let found = this[name];
  if (found!=undefined) {
    while (schedule.queue.length!=0)
      found(...schedule.queue.shift());
    found(...args);
  }
  else schedule.queue.push(args);
}
schedule.queue = [];

document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".literateBegin").forEach(enableCodeFilter));
