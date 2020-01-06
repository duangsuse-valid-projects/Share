export class Peek<T> implements Iterator<T> {
  iter: Iterator<T>
  last: IteratorResult<T>
  constructor(iter: Iterator<T>) {
    this.iter = iter;
    this.last = iter.next()
  }
  get hasPeek() {
    return !this.last.done;
  }
  get peek() {
    return this.last.value;
  }
  next() {
    let oldLast = this.last;
    this.last = this.iter.next();
    return oldLast.value; //once more when iter has finished
  }
}
export class PartialIterable<T> implements Iterable<T> {
  iter: Iterator<T>
  constructor(iter: Iterator<T>) {
    this.iter = iter;
  }
  [Symbol.iterator]() {
    return this.iter;
  }
}
export function partialIterate<T>(iter: Iterator<T>): Iterable<T> {
  return new PartialIterable(iter);
}

type Rewrite<T> = (old:T) => T
export type Predicate<T> = (item:T) => Boolean

export function chainBy<T>(succ: Rewrite<T>): (init:T) => Iterable<T> {
  return function *(init) {
    for (let cur = init; succ(cur); cur = succ(cur)) yield cur;
  };
}
export function *peekWhile<T>(p: Predicate<T>, xs: Peek<T>) {
  while (xs.hasPeek && p(xs.peek))
    { yield xs.next(); }
}
export function iterator<T>(xs: Iterable<T>): Iterator<T> {
  return xs[Symbol.iterator]();
}

export function negate<T>(p: Predicate<T>): Predicate<T>
  { return x => !p(x); }
export function or<T>(p: Predicate<T>, q: Predicate<T>): Predicate<T>
  { return x => p(x) || q(x); }
export function and<T>(p: Predicate<T>, q: Predicate<T>): Predicate<T>
  { return x => p(x) && q(x); }
