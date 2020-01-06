import { nextSiblings, hasCSSClass, preetyShowList, schedule } from './dom';
import { assignElementAttribute, createTextarea, createPreCodeElement } from './dom';
import { waitsElement } from './dom';

import {Peek, iterator} from './read';
import {peekWhile} from './read';
import {Predicate, negate, or} from './read';

export const literateKtConfig = {
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
const literateKtMagics = {
  dependAttribute: "depend",
  hiddenDependencyClass: "hidden-dependency",
  playgroundClass: "playground",
  dependSeprator: " ",
  KotlinPlaygroundGlobalId: "KotlinPlayground"
};

function read<T>(p: Predicate<T>, s: Peek<T>) {
  if (p(s.peek)) s.next();
  else throw Error(`Expecting ${p} for ${s}`);
}
/** Returns [codes, endDiv] */
export function filterCode(begin_e: Element): [string, Element] {
  const {literateBegin, literateEnd, literateCodeFilter} = literateKtConfig;
  const literatePart = negate(or(literateEnd, literateBegin));
  let tags: Array<any> = [];
  const scanContent = () => tags.push(...peekWhile(literatePart, neighbors));

  let neighbors = new Peek(iterator(nextSiblings(begin_e)));
  read(literateBegin, neighbors);
  do { // CodePart = (Content (IgnoreInnerLiterate Content)?)*? End
    scanContent();
    if (literateBegin(neighbors.peek)) {
      [...peekWhile(negate(literateEnd), neighbors)];
      read(literateEnd, neighbors);
    }
  } while (!literateEnd(neighbors.peek));
  let endDiv = neighbors.peek;
  read(literateEnd, neighbors);

  let codes = tags.filter(literateCodeFilter).map(e => e.innerText).join("");
  return [codes, endDiv];
}

export function enableCodeFilter(begin_e: Element) {
  const {playgroundDefaults} = literateKtConfig;
  const {playgroundClass: playground, hiddenDependencyClass: hiddenDependency,
    KotlinPlaygroundGlobalId: KotlinPlayground} = literateKtMagics;

  let [codeTexts, endDiv] = filterCode(begin_e);
  let [dependencies, describe] = dependenciesAndDescribe(begin_e);

  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code${describe}</button>`; codeDiv.classList.add(playground);
  begin_e.parentElement.insertBefore(codeDiv, endDiv);

  let showCodeBtn = codeDiv.firstElementChild;
  const showKotlinSource = () => { //[codeTexts, dependencies, codeDiv]
    let preCode = createPreCodeElement(codeTexts);
    let code = preCode.firstElementChild; assignElementAttribute(code, playgroundDefaults);
    if (dependencies != null) {
      let dependTa = createTextarea(dependencies.join("")); dependTa.classList.add(hiddenDependency);
      code.appendChild(dependTa);
    }
    codeDiv.appendChild(preCode); //ok
    showCodeBtn.remove();
    schedule(KotlinPlayground, code);
  };
  showCodeBtn.addEventListener("click", showKotlinSource);
}
function dependenciesAndDescribe(e: Element): [Array<string>, string] {
  const {dependAttribute: depend, dependSeprator} = literateKtMagics;

  let dependencies: Array<string> = e.getAttribute(depend)?.split(dependSeprator);
  let describe = `${e.id? " for "+e.id :""}${dependencies? " depends on "+preetyShowList(dependencies) :""}`;
  dependencies = dependencies?.map(id => filterCode(document.getElementById(id))[0]);

  return [dependencies, describe];
}

export function enable() {
  document.querySelectorAll('.literateBegin').forEach(enableCodeFilter)
}
