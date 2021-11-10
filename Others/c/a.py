import ctypes,sys,code,os
from ctypes.util import find_library
from itertools import takewhile

def rep(n,f,o):
    for _ in range(n):o=f(o)
    return o
class _T:
    def __getattribute__(self,k, n=0):
        if k[-1].isdigit(): n=int(k[-1]);k=k[:-1]
        t=getattr(ctypes,f"c_{k.replace('_','_p')}")
        return rep(n,ctypes.POINTER,t)
    def fResP(_,o):o.restype=ctypes.c_size_t #why not a,b=f("caca_", version=T.char_, Gdrivers=T.char_1)
    p=property(fset=fResP)

def S(tvs):
    class A(ctypes.Structure):
        _fields_ = [(k,getattr(T,t)) for(t,k) in map(lambda s:s.split(),tvs.split(";"))]
    return A

T=_T();F=ctypes.CFUNCTYPE;nul=None;addr=ctypes.byref
ctypes.c_sz=ctypes.c_size_t#no sign
def main(lib,*a):
    C=ctypes.CDLL(find_library(lib))
    buf=ctypes.create_string_buffer; sAt=ctypes.string_at
    def asT(t,v):return ctypes.cast(v,t)#然而默认 int32 截断指针才是segfault的原因,无需cast
    def isntV(v):return lambda x:x!=v
    def argv(ps,t=T.char_1):return list(takewhile(isntV(nul),ps )) #[x.value for x in takewhile(isntV(nul),  t(t._type_(ps)))] #ptr(content)
    def dargv(ss):
        a=(T.char_*len(ss))(); a[:]=[s.encode('utf-8')for s in ss]
        return a
    #x=C.caca_get_version()#C.caca_get_display_driver_list()
    #F(T.char_)(C.alpm_version)
    #C.alpm_version.restype=T.sz; sAt(C.alpm_version())
    #C.strchr.restype=T.char_; C.strchr(b"abc",ord('c'))
    if lib=="caca":
        T.p=(f:=C.caca_get_display_driver_list)
        av=argv(T.char_2( T.sz(f()) )[0]) #给的是指针组地址,故

    if lib=="dl" and len(a):
        ctypes.c_dle=S("sz ty;off; va;pa;sz;szM; align".replace(";",";sz ")) #usr/include/link.h linux/elf.h
        dls=S("char_ fp;void_ f0;char_ sk;void_ i")#;sz n;int bind;int ty
        ctypes.c_dl=S("void_ i0;char_ pname;dle1 ls;uint160 n")
        @F(T.int, T.dl1,T.sz,T.void_)
        def seen(o, n,u):
            c=o[0];print(os.fsdecode(c.pname),c.n)
            for i in range(0,c.n):
                a=c.ls[i]
                #if a is None:break 
                print(a.ty, a.va)
                s=dls();C.dladdr(c.i0+a.va,(s)) #failed
                print(f"{s.sk}\t{s.fp}\t{s.i}")#+{s.n} :{s.ty}
            return 0
        C.dl_iterate_phdr(seen, find_library(a[0]))

    if lib=="c":
        ctypes.c_linkMap=S("sz i;char_ k")
        ctypes.c_LElem=S("linkMap2 ls;uint n")
        linkTab=S("linkMap1 loaded;uint n; LElem1 list").in_dll(C, "_rtld_global")
        def read(o,n):
            lt,rn= (o.ls,o.n) if n==0 else (o,n); rn=range(rn)
            return [lt[i][0].k for i in rn] if n==0 else [lt[i].k for i in rn]
        av=read(linkTab.list[0], 0) #https://sourceware.org/git/?p=glibc.git;a=blob;f=sysdeps/generic/ldsodefs.h#l321
        bv=read(linkTab.loaded,linkTab.n) #除非 sizeof(linkMap) OK ,算了吧 见 include/link.h#l102

    if lib=="sh":
        libc = ctypes.CDLL("")
        f = libc.mprotect
        f.argtypes = [T.void_, T.sz, T.int]
        b=sys.stdin.buffer.read()
        c = ctypes.create_string_buffer(b if b[0]!=ord('b') else eval(b.decode()))
        pc = asT(F(T.void_),c) #strace -e trace=write python a.py sh ;gdb x/10i $rip-39
        #b"\x6a\x42\x58\xfe\xc4\x48\x99\x52\x48\xbf\x2f\x62\x69\x6e\x2f\x2f\x73\x68\x57\x54\x5e\x49\x89\xd0\x49\x89\xd2\x0f\x05"
        # 2e2f~0A cc0F "\x48\x8b\x3d\x03\x00\x00\x00\xeb\x0C\x2e\x2f\x6e\x6d\x68\x6f\x6f\x6b\x2e\x73\x6f\x0A\xbe\x01\x00\x00\x00\x48\x87\xf7\xb8\x01\x00\x00\x00\xba\x12\x00\x00\x00\x0F\x05\xC3"
        addr = asT(T.void_,pc).value
        pagesize = libc.getpagesize()
        addr_page = (addr // pagesize) * pagesize
        for page_start in range(addr_page, addr + len(c), pagesize):assert f(page_start, pagesize, 0x7) == 0
        pc()


    code.interact(local=locals())

main(*sys.argv[1:]) #结构,并存(共用),数组 和 bytecast,resize 看下; 我去原来F不是给py侧调的..难怪

'''
a=(T.int*5)();a[:]=range(5)
C.qsort(a,len(a),4,F(T.int, T.int1,T.int1)(lambda a,b:a[0]<b[0])) #no .value ~fun
list(a)

# .so dynsym list,use objdump -TC ;readelf -Ws ;nm -D
#nm -CDg=--demangle --dynamic --extern-only --defined-only
#objdump -h =header -g =debg

.text data rodata strtab sh(section header)strtab
'''

#此外，请用 cffi ,支持类WASM 的源码内联，以 cdef/dlopen/new, compile,verify(sources) 动词解析 C header
