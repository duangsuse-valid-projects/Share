from base64 import b64decode
from sys import stdout
from re import sub

text=sub("[\\s]*","",input())
def prints(s,i,vp=10): print("".join(s[i-vp:i+vp])) #行列号只需计前部分 \n 数和第一个的位置
try: stdout.buffer.write(b64decode(text))
except ValueError as ex: prints(text, ex.__context__.args[2])

#寻找 ex.cause 属性的方法
if False:
  def getExc(op):
    try: op()
    except Exception as ex: return ex
  def err():
    try: raise ""
    except: raise ValueError()
  def d(o):return {k:getattr(o,k) for k in dir(o)}
  print(d(getExc(err)))

#encode 的方法
if False:
  from base64 import b64encode
  from sys import argv,stdout
  byte = open(argv[1],"rb").read() if len(argv)==2 else ("\n".join(iter(lambda: input(), "EOF"))).encode()
  stdout.buffer.write(b64encode(byte))
  input()
