#!/bin/env python3
# -*- coding: utf-8 -*-

from typing import Callable, Union, Optional, Iterator, Tuple, Dict
from re import compile, Pattern, Match

# '(', ')', [^\s\d\(\),]+, \d+, ','

# Expr = name '(' Expr {',' Expr}? ')' | name | digits
# predefined names: True, False, None

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
class Const(CallAST):
  def __init__(self, v):
    self.value = self.mapValue(v)
  PRE_DEFS = { "True": True, "False": False, "None": None }
  def mapValue(self, v):
    if isinstance(v, str): return Const.PRE_DEFS.get(v) or v
    return v

def parse(tokens: Iterator[Tuple[str, str]]) -> CallAST:
  state = "initial"
  res = None
  call_params = []
  for (part, tag) in tokens:
    if tag == "name":
      state = "name/call"
      continue
  
    elif tag == "digits":
      res = Const(int(part))

    elif tag == "punctation":
      if part == "(":
        if state == "name/call":
          state = "call"
          continue
      elif part == ")":
        if state == "call":
          state = "initial"
          #res = Call() #最后发现 callee 的名字都没存，只是简单弄了个 res 根本不足应付扫到后面的各种数据依赖
          continue
      elif part == ",":
        if state == "call": continue

    if state == "name/call":
      res = Const(part)
      state = "initial"
    elif state == "call":
      call_params.append(res)
    else:
      return res
