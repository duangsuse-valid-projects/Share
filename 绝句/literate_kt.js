function nextBy(succ) {
  return function *(init) {
    for (let cur = init; succ(cur); cur = succ(cur)) yield cur;
  };
}
function *takeWhile(p, xs) { for (let x of xs) if (p(x)) { yield x; } else break; }
function negate(p) { return x => !p(x); }

function assignDOMAttribute(node, attributes) {
  for (let [name, value] of Object.entries(attributes))
    node.setAttribute(name, value.toString());
}

nextSiblings = nextBy(x => x.nextSibling);
const sectionEnd = it => it.classList!=null&&it.classList.contains("literateEnd");
function filterCode(begin_e, p = e => e.classList.contains("language-kotlin")) {
  let neighbors = nextSiblings(begin_e);
  let section = takeWhile(negate(sectionEnd), neighbors);
  return [...section].filter(e => e.classList!=null&&p(e)).map(e => e.innerText).join("");
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
  let end_e = [...nextSiblings(begin_e)].find(sectionEnd);
  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code</button>`; codeDiv.classList.add("playground");
  begin_e.parentElement.insertBefore(codeDiv, end_e);
  let dependencyDivs = begin_e.getAttribute("depend"); if (dependencyDivs!=null) dependencyDivs = dependencyDivs.split(" ").map(id => filterCode(document.getElementById(id)));
  let btn = codeDiv.children[0];
  btn.onclick = () => {
    let pre = createPreCodeElement(filterCode(begin_e)); configKotlinPlayground(pre);
    if (dependencyDivs!=null) {
      let dependTa = createTextarea(dependencyDivs.join(""));
      dependTa.classList.add("hidden-dependency"); pre.firstChild.appendChild(dependTa);
    }
    codeDiv.appendChild(pre); btn.remove(); KotlinPlayground(codeDiv);
  };
}

document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".literateBegin").forEach(enableCodeFilter));
