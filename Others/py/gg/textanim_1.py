text = """
我青年时代就读过：《西游记》《马可波罗游记》、左丘明《左传》、《我的故乡》、那楚克道尔吉、《吉檀迦利》《园丁集》《飞鸟集》《新月集》、泰戈尔、《三国演义》《水浒传》、老子、孔子、墨子、孟子、庄子、伏尔泰、孟德斯鸠、狄德罗、卢梭、圣西门、蒙田、傅立叶、拉封丹、萨特、司汤达、莫里哀、大仲马、雨果、巴尔扎克、福楼拜、乔治桑、莫泊桑、小仲马、冉阿让、罗曼罗兰、《羊脂球》、卡西莫多、席勒、歌德、海涅、莱布尼兹、黑格尔、康德、费尔巴哈、马克思、海德格尔、马尔库塞。

我还读过：托马斯·潘、《联邦党人文集》《常识》、梭罗、惠特曼、马克吐温、杰克伦敦、海明威《老人与海》、简奥斯汀、花兹 华斯、狄更斯、《猫》、《福尔摩斯》、卡尔马克思、弗里德里希·恩格斯、拜伦、雪莱、萧伯纳、培根、克伦威尔、约翰·洛克、托马斯·莫尔、亚当斯密、李约瑟、阿诺德·汤因比、《双城记》《雾都孤儿》《简·爱》《鲁滨孙漂流记》、汤显祖《牡丹亭》《南柯记》《紫钗记》《邯郸记》、莎士比亚、《威尼斯商人》《仲夏夜之梦》《罗密欧与朱丽叶》《第十二夜》《李尔王》《奥赛罗》《麦克白斯》，谢谢大家！
"""

def sortSplit(s, sep, op): return sep.join(sorted(s.split(sep), key=op))
from re import sub, split
#print(sub(r"：(.*?)[，。]", lambda m: sortSplit(m[1], "、", lambda s: 0 if s[0]=='《' else 1), text) )

text=sub(r"(?<=：)(.*?)(?=[，。])", lambda m: sortSplit(m[1], "、", lambda s:  -s.count('《')), text)
print(text)


from threading import Timer, Lock
class FixedRateTimer(Timer):
  def __init__(self, dt_ms, op):
    Timer.__init__(self, dt_ms, self._run)
    self._l = Lock()
    self._realfunc = op
  def _run(self):
    self.start(True)
    self._realfunc()
  def start(self, from_run=False):
    self._l.acquire()
    if from_run:
      super().start()
      self._l.release()
#^ just for fun rewrite? From SOf

def scheduleAtFixedRate(dt_ms, op):
  op()
  resched = scheduleAtFixedRate
  timer = Timer(dt_ms, resched, (dt_ms, op))

from androidhelper import Android; sl4a = Android()
from itertools import chain
flatMap = lambda op, xs: chain.from_iterable(map(op, xs))
from time import sleep, time
try:
  from Pillow import Image, ImageDraw, ImageFont
  DFONT = ImageFont.truetype("/system/fonts/DroidSans.ttf")
except ImportError: DFONT=None
class AnimTextMaker:
  def __init__(self, texts, font=DFONT):
    (w,h) = font.getsize(max(texts, key=len))
    self.img = Image.new("1", (w,h))
    self.draw = ImageDraw(self.img)
    self.frames = []
    self.font=font
  def start(self, dt):
    t0 = time()
    scheduleAtFixedRate(dt, lambda: self.frames.append(self.img))
    return t0
  def fresh(self, s): self.draw.text((0,0), s, self.fgColor, self.font)

for i in range(0, 3): print(3-i); sleep(1)
print("start")
#sleep(3)
#sl4a.ttsSpeak(text)
sb=[]
for s in flatMap(lambda ss: split("(《.*?》)",ss), split(r"[，、。]", text) ):
    if s=="": continue
    #input("")
    print(s, end=""); sb.append(s)
sl4a.setClipboard("\n".join(sb))