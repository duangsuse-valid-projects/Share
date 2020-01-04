function *nextSiblings(e) { for (let c = e; c!=null; c=c.nextSibling) yield c; }
function *takeWhile(p, xs) { for (let x of xs) if (p(x)) { yield x; } else break; }
function negate(p) { return x => !p(x); }

const sectionEnd = it => it.classList!=null&&it.classList.contains("literateEnd");
function filterCode(begin_e, p = e => e.classList.contains("language-kotlin")) {
  let neighbors = nextSiblings(begin_e);
  let section = takeWhile(negate(sectionEnd), neighbors);
  return [...section].filter(e => e.classList!=null&&p(e)).map(e => e.innerText).join("");
}

function createCodeElement(text) {
  let pre = document.createElement("pre");
  let code = document.createElement("code"); code.textContent = text;
  pre.appendChild(code); return pre;
}
function enableCodeFilter(begin_e) {
  let end_e = [...nextSiblings(begin_e)].find(sectionEnd);
  let codeDiv = document.createElement("div"); codeDiv.innerHTML = `<button>Kotlin Code</button>`; codeDiv.classList.add("playground");
  begin_e.parentElement.insertBefore(codeDiv, end_e);
  let btn = codeDiv.children[0];
  btn.onclick = () => { codeDiv.appendChild(createCodeElement(filterCode(begin_e))); btn.remove(); KotlinPlayground(codeDiv); };
}

document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".literateBegin").forEach(enableCodeFilter));
