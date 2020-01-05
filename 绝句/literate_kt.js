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

function nextBy(succ) {
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
////

const nextSiblings = nextBy(e => e.nextSibling);
const hasCSSClass = css => e => e.classList!=null&&e.classList.contains(css);
const
  literateBegin = hasCSSClass("literateBegin"),
  literateEnd = hasCSSClass("literateEnd");

// [codes, endDiv]
function filterCode(begin_e, p = hasCSSClass("language-kotlin")) {
  let neighbors = new SaveIterator(nextSiblings(begin_e));
  let sections = [];
  neighbors.next(); //literateBegin
  let scanContent = () => sections.push(...takeWhile(negate(or(literateEnd, literateBegin)), neighbors));
  scanContent();
  do { // CodePart = (Content (IgnoreInnerLiterate Content)?)*? End
    if (literateBegin(neighbors.lastItem)) {
      [...takeWhile(negate(literateEnd), neighbors)];
      scanContent();
    }
  } while (!literateEnd(neighbors.lastItem));
  return [sections.filter(p).map(e => e.innerText).join(""), neighbors.lastItem];
}

function configKotlinPlayground(code) {
  assignDOMAttribute(code, {
    "indent": 2,
    "auto-indent": true,
    "data-autocomplete": true,
    "highlight-on-fly": true,
    "match-brackets": true
  });
}
function createPreCodeElement(text) {
  let pre = document.createElement("pre");
  let code = document.createElement("code"); code.textContent = text;
  pre.appendChild(code); return pre;
}
function createTextarea(text) {
  let textarea = document.createElement("textarea"); textarea.textContent = text;
  return textarea;
}
function enableCodeFilter(begin_e) {
  let [codes, endDiv] = filterCode(begin_e);
  let pre = createPreCodeElement(codes);
  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code</button>`; codeDiv.classList.add("playground");
  begin_e.parentElement.insertBefore(codeDiv, endDiv);

  let dependencies = begin_e.getAttribute("depend"); if (dependencies!=null) dependencies = dependencies.split(" ").map(id => filterCode(document.getElementById(id))[0]);
  let btn = codeDiv.firstChild;

  btn.onclick = () => {
    let code = pre.firstChild; configKotlinPlayground(code);
    if (dependencies!=null) {
      let dependTa = createTextarea(dependencies.join("")); dependTa.classList.add("hidden-dependency");
      code.appendChild(dependTa);
    }
    codeDiv.appendChild(pre); btn.remove();
    schedule("KotlinPlayground", code);
  };
}
function schedule(name, e) {
  let found = this[name];
  if (found!=undefined) {
    while (schedule.queue.length!=0)
      found(schedule.queue.shift());
    found(e);
  }
  else schedule.queue.push(e);
}
schedule.queue = [];

document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".literateBegin").forEach(enableCodeFilter));
