#!/bin/env python3
# -*- coding: utf-8 -*-

from typing import Callable, Union, Optional, Iterator, Tuple, Dict
from re import compile, Pattern, Match

# '(', ')', [^\s\d\(\),]+, \d+, ','

TABLE = {
  compile(r"[^\s\d\(\),]+"): "name",
  compile(r"\d+"): "digits"
}
for sym in "(),": TABLE[sym] = "punctation"

def let(transform, self):
  return transform(self) if self != None else None

class Lexer:
  def __init__(self, table: Dict[Union[str, Pattern], str]):
    self.table = { self.makeTaker(pat):tag for (pat, tag) in table.items() }
  def makeTaker(self, pat) -> Callable[[str], Optional[int]]:
    if isinstance(pat, str): return lambda it: (len(pat) if it.startswith(pat) else None)
    elif isinstance(pat, Pattern): return lambda it: let(lambda m: m.end() - m.start(), pat.match(it))
    else: raise ValueError(f"cannot make taker for {type(pat)}")
  def onError(self, text, index):
    raise SyntaxError(f"lexical analysis failed at `{text[index:10]}'...@{index}")

  def tokenize(self, text: str) -> Iterator[Tuple[str, str]]:
    index = 0
    while index != len(text):
      trying_index = index
      for (take, tag) in self.table.items():
        length = take(text[index:])
        if length != None:
          yield (text[index:index+length], tag)
          index += length
      if index == trying_index: self.onError(text, index)

class CallAST: pass
class Call(CallAST):
  def __init__(self, callee, params):
    self.callee, self.params = callee, params
  def __repr__(self): return f"Call({repr(self.callee)}, {repr(self.params)})"
class Const(CallAST):
  def __init__(self, v):
    self.value = self.mapValue(v)
  def __repr__(self): return f"Const({repr(self.value)})"
  PRE_DEFS = { "True": True, "False": False, "None": None }
  def mapValue(self, v):
    if isinstance(v, str): return Const.PRE_DEFS.get(v) or v
    return v

# Expr = name '(' Expr {',' Expr}? ')' | name | digits
# predefined names: True, False, None

class NonlocalReturn(Exception):
  def __init__(self, value):
    self.value = value

tokenize = Lexer(TABLE).tokenize

def parse(tokens: Iterator[Tuple[str, str]]) -> CallAST:
  def toplevel(s) -> CallAST:
    (part, tag) = next(s)
    if tag == "name":
      return disambigNameCall(s, part)
    elif tag == "digits":
      return readDigits(part)
    elif tag == "punctation":
      if part == ")": raise NonlocalReturn(None)
    else:
      raise SyntaxError(f"don't know what {part} (a {tag}) means")
  def disambigNameCall(s, name) -> CallAST:
    try: (part, tag) = next(s)
    except StopIteration: return readName(name)
    if tag != "punctation": raise SyntaxError(f"no way making `1 2 3' like lists")
    if part == "(": return readRestCall(s, name)
    elif part == ",": raise NonlocalReturn(readName(name)) #emmm, another type?
    else: raise SyntaxError("name/call")
  def readName(name) -> Const: return Const(name)
  def readDigits(digits) -> Const: return Const(int(digits))
  def readRestCall(s, callee) -> Call:
    params = []
    while True:
      try: params.append(toplevel(s)) #瞎写，胡乱转移控制流
      except NonlocalReturn as r:
        if r.value != None: params.append(r.value)
        else: return Call(callee, [it for it in params if it!=None])
    raise SyntaxError(f"unterminated call()")
  return toplevel(tokens)
