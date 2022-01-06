# Lua 5.4 完全改了，删了 0xC 的 sizes(int,size_t,Instruction,Integer,Number) 的后两项…… 草
# Header 之前部分是 "\x1BLua" 53 00 "\25\147\r\n\26\n" ，之后是 (int)5678 和 (Number)370.5 和 1b 的 nUpvalues
#0x22 起始 name,lno,lno1,b_nParam,isVararg,b_maxStack
#0x2E (46) 就是全局程序体指令数组头的位置

if [ $(basename $PWD) != src ]; then
  curl -O http://www.lua.org/ftp/lua-5.3.6.tar.gz
  tar xf lua-* &&cd lua-*/src/
  make luac lua
  curl -O https://raw.githubusercontent.com/fengberd/xLuaDumper/master/xLuaDumper/opcode.lua
fi

cat>opcode_map.py <<EOF
import struct
def mask1(n): return sum([1<<i for i in range(n)]) 
ifmt="<I"; ifmtN=struct.calcsize(ifmt) # LE unsigned int
def readInt(f): return struct.unpack(ifmt, f.read(ifmtN))
# in Lua 5.4, nbit=7; ifmt="L"; 0x22-=2 (number/int size in Header)
def readOpcodes(f, nbit=6):
  mask = mask1(nbit)
  n = readInt(f)
  for _ in range(n): yield readInt(f)&mask
from sys import argv
def main(args=argv[1:]):
  def opcodes(fp): f=open(fp, "rb"); f.seek(0x22+12); return readOpcodes(f)
  (f, fOrig) = map(insnFile, args)
  print({op1:op for op1,op in zip(f, fOrig)})
EOF

./luac -s -o l0.luac opcode.lua

cat>shuf_opcode_h.py <<EOF
from re import sub, split
subsH = [
    '''/\*-*\n\s*name		args	description\s*-*\*/ => ''',
    "A B C k	R.* := {} => A B C k",
    "A Bx	if R.* ~= nil then { R.*=R.*; pc -= Bx } => A Bx",
    r'''(\w+),/\*((.|\n)*?)\*/ => /*\2*/\1,'''
]
def applyTransform(op, transf, s):
    acc = s
    for (a, b) in map(lambda ss: ss.split(" => "), transf): acc = op(a, b, acc)
    return acc
def insertAll(a, i, vs):
    rvs = list(vs); rvs.reverse()
    for v in rvs: a.insert(i, v)
def find(xs, p):
    for (i,x) in enumerate(xs):
        if p(x): return i

class separator:
    def __init__(self,re,sep): self.re,self.sep=re,sep
    def list(self,s): return split(self.re, s)
    def join(self,vs): return self.sep.join(vs)

def randomIndicesWithin(r, n):
    from random import shuffle, randint
    xs = [i for i in range(n) if not i in r]
    shuffle(xs); insertAll(xs, randint(0,len(xs)-1), r)
    return xs
def pre(fp, s):
    if fp.endswith("lopcodes.h"):
        s1 = applyTransform(sub, subsH, s)
        return sub(r'''/\*((.|\n)*?)\*/''', lambda m: "/*%s*/"%sub("[,}{]", "  ", m[1]), s1)
    return s

indices = []
comma = separator(",(?! )", ",")
def shufOpc(s):
    global indices
    xs = comma.list(s)
    print("".join(xs))
    if len(indices)==0:
        iAddNot = tuple(find(xs, lambda s: ssub in s) for ssub in ["OP_ADD", "OP_NOT"])
        indices = randomIndicesWithin(range(*iAddNot), len(xs))
    assert(len(xs) == len(indices) or xs[-1].strip()=="NULL")
    return comma.join(xs[i] for i in indices)
from sys import argv
def main(args=argv[1:]):
    for fp in args:
        re = "(?<=typedef enum ){((.|\n)*?)}" if fp.endswith("lopcodes.h") else "(?<== ){((.|\n)*?)}"
        #print(fp,re)
        with open(fp, "r+") as f:
            sf1 = sub(re, lambda m: "{ %s }"%shufOpc(m[1]), pre(fp, f.read()), 2)
            f.truncate(0); f.write(sf1)
main()
print(indices)
EOF

python shuf_*.py lopcodes.h lopcodes.c # 注意 tm.h 的 TM_OP 与 OP_ADD 的顺序未改好， metatable 会有问题，勉强能测试。

make luac
./luac -s -o l1.luac opcode.lua

python opcode_map.py l1.luac l0.luac
