/** An Iterator saving its last yield item,
 * for `takeWhile`-like functions "lookbehind" */
class SaveIterator<T> implements Iterator<T> {
  iter: Iterator<T>
  last: IteratorResult<T>
  constructor(iter: Iterator<T>) {
    this.iter = iter;
    this.last = iter.next();
  }
  next() {
    this.last = this.iter.next();
    return this.last;
  }
  get lastItem() {
    return this.last.value;
  }
}
class PeekConsume<T> {
  iter: Iterator<T>
  last: IteratorResult<T>
  constructor(iter: Iterator<T>) {
    this.iter = iter;
    this.last = iter.next()
  }
  *iterator() {
    if (this.last.done) return;
    yield this.last;
    this.last = this.iter.next()
  }
}

class PartialIterable<T> implements Iterable<T> {
  iter: Iterator<T>
  constructor(iter: Iterator<T>) { this.iter = iter; }
  [Symbol.iterator]() { return this.iter; }
}

type Rewrite<T> = (old:T) => T
type Predicate<T> = (item:T) => Boolean

function chainBy<T>(succ: Rewrite<T>): (init:T) => Iterable<T> {
  return function *(init) {
    for (let cur = init; succ(cur); cur = succ(cur)) yield cur;
  };
}
function *takeWhile<T>(p: Predicate<T>, xs: Iterable<T>) {
  for (let x of xs)
    if (p(x)) { yield x; }
    else break;
}
function negate<T>(p: Predicate<T>): Predicate<T>
  { return x => !p(x); }
function or<T>(p: Predicate<T>, q: Predicate<T>): Predicate<T>
  { return x => p(x) || q(x); }

function assignDOMAttribute(node: Element, attributes: Object) {
  for (let [name, value] of Object['entries'](attributes))
    node.setAttribute(name, value);
}
function createElementInitialText(node_type: any, text: string) {
  let node = document.createElement(node_type); node.textContent = text;
  return node;
}
////

const nextSiblings = chainBy((e:Element) => e.nextElementSibling);
const hasCSSClass = (css:string) => (e:Element) => e.classList?.contains(css) ?? false;

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
function filterCode(begin_e: Element): [string, Element] {
  const {literateBegin, literateEnd, literateCodeFilter} = literateKtConfig;
  let neighborsIter = new SaveIterator(nextSiblings(begin_e)[Symbol.iterator]());
  let neighbors = new PartialIterable(neighborsIter);
  let tags: Array<any> = [];
  neighborsIter.next(); //literateBegin
  const eoLiterateP = negate(or(literateEnd, literateBegin));
  const scanContent = () => tags.push(...takeWhile(eoLiterateP, neighbors));
  scanContent();
  do { // CodePart = (Content (IgnoreInnerLiterate Content)?)*? End
    if (literateBegin(neighborsIter.lastItem)) {
      [...takeWhile(negate(literateEnd), neighbors)];
      scanContent();
    }
  } while (!literateEnd(neighborsIter.lastItem));
  let codes = tags.filter(literateCodeFilter).map(e => e.innerText).join("");
  return [codes, neighborsIter.lastItem];
}

function createPreCodeElement(text: string) {
  let pre = document.createElement("pre");
  let code = createElementInitialText("code", text);
  pre.appendChild(code); return pre;
}
function createTextarea(text: string) {
  let textarea = createElementInitialText("textarea", text);
  return textarea;
}
function preetyShowList(xs: Array<String>, sep = ", ", last_sep = " and ") {
  const last = xs.length-1;
  if (xs.length == 0 || xs.length == 1) return xs.join(sep);
  else return xs.slice(0, last).join(sep) + last_sep + xs[last];
}

function enableCodeFilter(begin_e: Element) {
  let [codes, endDiv] = filterCode(begin_e);
  let pre = createPreCodeElement(codes);

  let dependencies: Array<string> = begin_e.getAttribute("depend")?.split(" ");
  let describe = `${begin_e.id? " for "+begin_e.id :""}${dependencies? " depends on "+preetyShowList(dependencies) :""}`;
  dependencies = dependencies?.map(id => filterCode(document.getElementById(id))[0]);

  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code${describe}</button>`; codeDiv.classList.add("playground");
  begin_e.parentElement.insertBefore(codeDiv, endDiv);

  let btn = codeDiv.children[0];
  let showKotlinSource = () => {
    let code = pre.children[0]; assignDOMAttribute(code, literateKtConfig.playgroundDefaults);
    if (dependencies != null) {
      let dependTa = createTextarea(dependencies.join("")); dependTa.classList.add("hidden-dependency");
      code.appendChild(dependTa);
    }
    codeDiv.appendChild(pre); btn.remove();
    schedule("KotlinPlayground", code);
  };
  btn.addEventListener("click", showKotlinSource);
}

let scheduleQueue: Array<Array<any>> = [];
function schedule(name: string, ...args: any) {
  let found = global[name];
  if (found != undefined) {
    while (scheduleQueue.length != 0)
      found(...scheduleQueue.shift());
    found(...args);
  }
  else scheduleQueue.push(args);
}

document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".literateBegin").forEach(enableCodeFilter));
