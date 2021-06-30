from os import getenv
def envOr(deft, name, op=str):
  v=getenv(name); return deft if v==None else op(v)
from threading import Timer
def scheduleAtFixedRate(dt_sec, op, ref_timer=None):
  rt = ref_timer; noInit = (rt == None)
  if noInit or rt[0].is_alive():
    if noInit: rt = [None] # not just shorthand!
    resched = scheduleAtFixedRate
    rt[0] = Timer(dt_sec, resched, (dt_sec, op, rt))
  op(); rt[0].start()
  return rt

from time import time, sleep
FONTSIZE = envOr(70, "FONTSZ", int)
DRAW_ANCHOR = envOr("la", "DANCHOR")
DRAW_CENTER = envOr("hv", "DCENTER")
try:
  from PIL import Image, ImageDraw, ImageFont
  DFONT = ImageFont.truetype(envOr("/system/fonts/NotoSansCJK-Regular.ttc", "FONT"), FONTSIZE)
except ImportError: DFONT = None
try: import imageio
except ImportError: pass
class TextAnimRecorder:
  def __init__(self, texts, font=DFONT, color=(envOr(0xFFFFFF,"COR_BG"), envOr(0x0,"COR_FG"))):
    #self.wh = font.getsize(max(texts, key=len))
    whs = list(map(font.getsize, texts))
    self.wh = tuple(max(map(lambda a: a[i], whs)) for i in (0,1))
    (self.bgColor, self.fgColor) = color
    self._textz = iter(texts); self._fno = 0
    self._timer = None; self.t0 = 0
    self.texts=texts; self.font=font

  def start(self, dt=1.0/20, sec_buf=envOr(4, "N_SEC_BUF", int)):
    self._dt = dt
    self._mkbuf = lambda: [None for _ in range(len(self.texts)*round(1.0/dt)*sec_buf)]
    self.frames = self._mkbuf()
    self.newImg() # 草，写错了，用 duration 算就不必启动定期任务... (不对,其实是不该有t0因为手机上执行太慢误差大)
    self.t0 = time()
    self._timer = scheduleAtFixedRate(dt, self._incFrame)
  def _incFrame(self): # 早知道用 fps 就避免 (t1-t0) 算进py执行时间的问题了，害得加了 list优化
    self.frames[self._fno] = self.img
    self._fno += 1 # instead of slow frs.append(img)
    if self._fno == len(self.frames): self.frames.extend(self._mkbuf())
  def finish(self, s):
    self._timer[0].cancel()
    frm = self.frames
    try: del frm[frm.index(None):]
    except ValueError: pass
    imageio.mimsave(s+".gif", frm, fps=1.0/self._dt) #duration=time()-self.t0
  def newImg(self):
    self.img = Image.new("RGB", self.wh, self.bgColor)
    self.draw = ImageDraw.Draw(self.img)
  def fresh(self):
    self.newImg()
    s = next(self._textz)
    if DRAW_CENTER == "hv": # the only way, PIL has no feature
      (w,h) = DFONT.getsize(s)
      (iw,ih) = self.wh
      xy = (iw/2-w/2, ih/2-h/2)
    else: xy = (0,0)
    self.draw.text(xy, s, self.fgColor, self.font, DRAW_ANCHOR)

if False: # timer sample
  fps = 60
  tm = scheduleAtFixedRate(1.0/fps, lambda: print("a"))
  sleep(1.5);
  for _ in range(2): print(tm[0].cancel()); sleep(0.1)

if False:
  from itertools import cycle, islice
  ta = TextAnimRecorder("Hello ImgProc world 你好！ 图像处理 世界 ".split(" ") )
  ta.start()
  for t in islice(cycle([0.3, 0.5, 0.3]), 0, 6 + 1):
    sleep(t); ta.fresh()
  ta.finish("hello")

if True:
  sDelim = envOr(".!", "DELIM")
  print("input texts, %r to finish" %sDelim)
  texts = list(iter(lambda: input("+"), sDelim))
  texts.append("done.") # to specify duration for last item.
  ta = TextAnimRecorder(texts)
  ta.start(1.0/int(input("fps?") or "30"))
  for s in texts:
    input(""); ta.fresh(); print(s, end="")
  ta.finish("textanim")