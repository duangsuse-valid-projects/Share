import cv2, numpy as np
import time,os,sys; now=time.time

grays = [*(" .-:=*+%@#" if 0 else " .-~:;!=*%$@#")]
def ascii(img, wh=np.int32(os.popen('stty size', 'r').read().split()[::-1])  ):
  a=cv2.cvtColor(cv2.resize(img, wh) , cv2.COLOR_BGR2GRAY)
  b=asci[ np.int32(a)*len(asci)//256 ]
  return np.array([''.join(y) for y in b])

doDiff=0
match os.environ.get('cp'):
  case None:pass
  case "sq":
    import quadtree
  case "tri":
    from scipy.spatial import Delaunay,Voronoi
  case "dot":
    import circlify
  case _: grays=[f'\x1B[{c}m ' for c in [40,100,47,37,107] ]; doDiff=1
def lineANSI():
  a=iter(lambda:'',0)
  while True:
    b=yield
    for i in (np.where(a!=b)[0] if doDiff else range(b.size)): sys.stdout.write("\x1B[%d;0H%s" % (i,b[i]))
    a=b

asci=np.array(grays)

def mpread(fp):
  cap,ok,f = cv2.VideoCapture(fp), True, None
  fps = 1/cap.get(cv2.CAP_PROP_FPS)
  @task
  def seek():
    t,t0=0,0; nonlocal f
    for x in os.popen('ffplay 2>&1 %s' %(repr(fp),) ):
      try:
        t=float(x.strip().split(' ',1)[0]); (t0:=t,f:=lambda:cap.set(cv2.CAP_PROP_POS_MSEC, t*1000) ) if abs(t-t0)>11 else ()
      except:pass
  try:
    while ok:
      t0=now()
      if f:f();f=None
      ok,img=cap.read()
      yield img; t=now()
      while now()<t+(fps-(t-t0)):pass
  except:pass

from scipy.spatial import KDTree

def kd(d,f):
  K=[];D=KDTree(np.array([K.append(k)or f(v) for k,v in d.items()] ))
  return lambda v: K[D.query(v)[1]]

def caca(ch):
  f=lambda v:np.uint8([int(v[i:i+2],16) for i in range(1,7,2)])
  return kd(ch,f),{k:f(v)for k,v in ch.items()}

mockTTY=lambda g, wh,f :\
  cv2.resize(f(cv2.resize(g,wh)), g.shape[:-1][::-1])

colorANSI = caca({
  30: '#000000',
  31: '#800000',
  32: '#008000',
  33: '#808000',
  34: '#000080',
  35: '#800080',
  36: '#008080',
  37: '#c0c0c0',
  90: '#555555',
  91: '#ff5555',
  92: '#55ff55',
  93: '#ffff55',
  94: '#5555ff',
  95: '#ff55ff',
  96: '#55ffff',
  97: '#ffffff'
})

import json,shlex
def gjs(s):
  js=lambda s :\
   os.popen(f'dbus-send --session --print-reply /org/gnome/Shell --dest=org.gnome.Shell org.gnome.Shell.Eval {shlex.quote("string:"+s)}|tail -n+3').read() [11:-2]
  def bad():raise SyntaxError(v)
  k=f"this.${time.time_ns()}"
  if( v:=js("(async()=>{"+s+"}"+f")().then(r=>{k}=r||null).catch(e=>{k}=e+'')")) !='{}':bad()
  while ''==(v:=js(k)): time.sleep(.1)
  try:js("delete "+k); return json.loads(v or 'null')
  except:bad()

def ffread(v,w,h):
  with os.popen(f'ffmpeg -s {w}x{h} {v} -c:v rawvideo -pix_fmt bgr24 -loglevel quiet -f image2pipe -') as p:
    while (b:=p.buffer.read(w*h*3)): yield np.frombuffer(b, np.uint8).reshape(h,w,3)

def ffrec(f):
  wi=win('REC'); x,y,w,h=wi.cropScr()
  for x in ffread(f'-f x11grab -i :0+{x},{y}' if os.name!='nt' else f'-f gdigrab -i desktop -offset_x {x} -offset_y {y}',w,h):
    wi.imshow(f(x));cv2.waitKey(1)

class win:
  def __init__(o,k,chk=cv2.WINDOW_NORMAL):o.k=k; cv2.namedWindow(k,chk)
  def off(o): cv2.destroyWindow(o.k)
  __getattr__=lambda o,k:o.__dict__.get(k) or (lambda*a:getattr(cv2,k)(o.k,*a))
  __setitem__=lambda o,k,v: cv2.setWindowProperty(o.k,k,v)
  def cropScr(w):
    try:
      r=gjs('''
      let ucall=(o,k, f)=>new Promise(ok=>{f=o[k];if(!f.did){f=f.bind(o);o[k]=(...a)=>(o[k].did(a),f(...a))} o[k].did=ok})

      var o=Main.screenshotUI,r
      o.open(); await ucall(o,'close'); r=o._getSelectedGeometry()
      return r[3]?r: globalThis.eval(`
        with(o._windowSelectors[0].windows().find(x=>x.checked).boundingBox){[x,y,width,height] }  `)
      ''')
    except:
      from PIL import ImageGrab
      w[cv2.WND_PROP_FULLSCREEN]=1
      r=w.selectROI(np.array(ImageGrab.grab()));w.off()
    return r

if 0:
  @ffrec
  def f(x):
    A,B=colorANSI
    return mockTTY(x,(30,24),lambda x:  np.apply_along_axis(lambda x:B[A(x)], 2,x) )

import threading
task=lambda f: threading.Thread(target=f).start()

_,s=sys.argv
try:
  print(*ascii(cv2.imread(s)),"\x1B[0m", sep="\n")
except:
  io=lineANSI(); next(io)
  for x in mpread(s): io.send(ascii(x))
