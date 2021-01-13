from re import compile

class DummyDB:
    def __init__(self, verb:str):
      self._verb = verb
      self._data = {}; self._no = 0
    def dbCreate(self, reco): print(f"{self._verb}{self._no}: {reco}"); self._data[self._no] = reco; self._no += 1; return self._no - 1
    def dbUpdate(self, id, reco): print(f"re{self._verb}{id} @{self._no - 1}: {reco}"); self._data[id] = reco

PostId = str
class MohuService:
  class Posts(DummyDB): # silly.
    def __init__(self): super().__init__("post")
    def create(self, title, text) -> PostId: return self.dbCreate((title, text))
    def read(self, id) -> str: return self._data[id]
    def update(self, id, title, text): self.dbUpdate(id, (title, text))
  def __init__(self): self.posts = MohuService.Posts()

mohu = MohuService()

RE_BRACE = compile("{([^}]*)}")
def formatWith(obj, stempl):
  return RE_BRACE.sub(lambda m: str(getattr(obj, m[1])), stempl)
def splitFooter(s):
  lines = s.split('\n') # optimize: 2-times rfind / rev regex
  return (''.join(lines[:-2]), '\n'+'\n'.join(lines[-2:])) #bad.
class LinkFooter:
  TEXT_LINK = """\n上一期：{prev}\n下一期：{next}"""
  RE_LINK = compile(RE_BRACE.sub("(\\\\S+)", TEXT_LINK)) # avoid \1 replace template.
  def __init__(self, s=TEXT_LINK):
    m = LinkFooter.RE_LINK.match(s)
    self.prev = m[1]; self.next = m[2]
  def __str__(self):
    return formatWith(self, LinkFooter.TEXT_LINK)

texts = """
通商宽衣
撒格尔王
红黄红黄
维我独尊
""".strip().split('\n')
textz = iter(texts)
def getNewText(): return next(textz)

def freshPost(last_id):
  text = getNewText()
  footer = LinkFooter(); footer.prev = last_id; footer.next = "还没钦定"
  post_id = mohu.posts.create(f"{text[:1]}{text[-1:]}的标题", f"{text}{footer}")
  (title0, text0) = mohu.posts.read(last_id) #v update last post
  (text0c, text0ft) = splitFooter(text0)
  footer0 = LinkFooter(text0ft); footer0.next = post_id
  mohu.posts.update(last_id, title0, f"{text0c}{footer0}")
  return post_id

from json import dumps
def main():
  footer0 = LinkFooter(); footer0.prev = "没有没有没有"
  lastPostId = mohu.posts.create("你好", f"我坏{footer0}")
  line = ""
  while line != "q":
    if line.startswith("="): lastPostId = int(s[1:])
    else:
      try: lastPostId = freshPost(lastPostId)
      except StopIteration: break
    line = input()
  print(dumps(mohu.posts._data, ensure_ascii=False, indent=2))
if __name__ == '__main__': main()
