import {Predicate} from './read';
import {chainBy} from './read';

export const nextSiblings = chainBy((e:Element) => e.nextElementSibling);
export function hasCSSClass(css:string): Predicate<Element> {
  return (e:Element) => e.classList?.contains(css) ?? false;
}
export function assignElementAttribute(node: Element, attributes: Object) {
  for (let [name, value] of Object['entries'](attributes))
    node.setAttribute(name, value);
}

export function createElementWithText(node_type: any, text: string): Element {
  let node: Element = document.createElement(node_type);
  node.textContent = text; return node;
}
export function createTextarea(text: string) {
  let textarea = createElementWithText("textarea", text);
  return textarea;
}
export function createPreCodeElement(text: string) {
  let pre = document.createElement("pre");
  let code = createElementWithText("code", text);
  pre.appendChild(code); return pre;
}

const scheduleQueue: Array<Array<any>> = [];
const schedulePlace: any = (window as any);
export function schedule(name: string, ...args: any) {
  let found: Function = schedulePlace[name];
  if (found != undefined) {
    while (scheduleQueue.length != 0) found(...scheduleQueue.shift());
    found(...args);
  }
  else scheduleQueue.push(args);
}
export function preetyShowList(xs: Array<String>, sep = ", ", last_sep = " and ") {
  const last = xs.length-1;
  if (xs.length == 0 || xs.length == 1) return xs.join(sep);
  else return xs.slice(0, last).join(sep) + last_sep + xs[last];
}

function isLoaded(rs: string) {
  return rs === undefined ||
    rs === 'loaded' ||
    rs === 'complete'; }

type Action = () => any
export function waitsElement(e: Element, op: Action) {
  if (e === document.body) {
    document.addEventListener('DOMContentLoaded', op);
    return;
  } else {
    e.addEventListener('load', () => {
      if (isLoaded(this.readystate)) { op(); }
    });
  }
}
