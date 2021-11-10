#include "_.h"
#pragma GCC diagnostic ignored "-Wimplicit-int"
T void sym; T char* Str;
T sym* P; T size_t ux;

sym dllMain();/*Find dlopen@libc addr use*/ T struct{P pf; Str fp; E(Phdr)*a; uint16_t n;} SoLoad;
T int pid;/*tamper,changeback@insnptr reg*/ T struct user_regs_struct RegVar;
#define F(flg,a,n,fmt,c0,c1,...) int i;if(wFl&(0b1<<flg)) Rep(n){var x=(a)[i]; c0 w(fmt,,__VA_ARGS__); c1}

#define D(op) ptrace(PTRACE_##op,id,0,0); //<^ F,D 2 ability!
waitpid(pid,int*,int);
#define DR(op) ptrace(PTRACE_##op##REGS,id,0,&rv);
sym pswap(pid id,ux*p, ux*p0,ux sz){int i;ux v0; Rep(sz/sizeof(ux)){v0=ptrace(1,id,p+i,0); ptrace(4,id,p+i,p0[i]); p0[i]=v0; }  }

toupper(int);
qstrPrefix(Str a, Str b){return strncmp(a,b, strlen(b))==0;}
gnuHashN(int* p){
  int i,nB=p[0], n=0;
  var buk=p+4+2*p[2];
  Rep(nB) if(buk[i]>n)n=buk[i];
  return n+1;
}
#define SNP(...) ux N=100;Str s=alloca(N); snprintf(&s[0],N,__VA_ARGS__)
#define okay goto ok;
P libAddr(pid id,Str name){FILE*f;
  SNP("/proc/%d/maps", id); if(NO==(f=fopen(s, "r")))okay
  //7ffff7a20000-7ffff7a46000 r--p 00000000 00:1e 4141                       /usr/lib/libc-2.33.so
  P p; while(fgets(s,N, f)) { var ic=strrchr(s, '/');
    if (ic &&qstrPrefix(ic+1,name) &&sscanf(s, "%p-%*p %*4s 00000000", &p) == 1)return p;
  }
  fclose(f);
  ok:return NO;
}
dl_iterate_phdr(int stop(SoLoad*,ux, P),P);
#ifdef __x86_64
ux shc[]={0x6e2f2e00000008e8,0xd0ff5f006b6f686d,0xcc};//rasm2 -B 'call 0xd;.asciz "./nmhok"; pop rdi; call rax;int3'|od -An -t x8|sed 's/ /,0x/g'
#define xr "%%r"
#define R(k) rv.r##k
#else
ux shc[]={0x000008e8,0x6e2f2e00,0x6b6f686d,0xd0ff5f00,0xcc};
#define xr "%%e"
#define R(k) rv.e##k
#endif


#define Z " %zx"
#define _Z "%zx"
#define NL
#define wNL w("\n");
#define forv(k,a) var _x=&a[0];for(var k=*_x;(k=*_x);_x++)
#define in(a,b,v) (a<=v&&v<b)
int wFl=0b0000; //Np=Sprs
rdFl(Str s,Str bit){int fl=0b0; forv(c,s){var f=strchr(bit,c); if(f)fl|=0b1<<(f-bit);} return fl;}

#include <pcre.h>
pcre*_re=NO; pcre_extra*_sd;
sym setRE(Str s){dlopen("libpcre.so",RTLD_LAZY|RTLD_GLOBAL);ux ign;P e=&ign; _re=pcre_compile(s,0, e,e, NULL);_sd=pcre_study(_re,0, e);}

sym wSym(E(Sym)*a,int n, Str ds){
#define V(k) x.st_##k
  if(NO==a||NO==ds)return;
  //type|WEAK F(3) ;sect?
  F(3,a,n, Z" %s"Z, var s=ds+V(name);{
    if(_re&&pcre_exec(_re,_sd, s,strlen(s),0,  0, NO,0)==-1)continue;
    var c=V(info);
    var t="uvfscot"[EF(ST_TYPE)(c)]; var b=EF(ST_BIND)(c);
    (b==0)? w_("_%c",t):
    (b<=2)? w_("%c",b==1?t:toupper(t) ):0;
  },{
    var at=V(shndx); at&&at!=16?w_(";%x\n",at):wNL
  },V(size),s,V(value)) //< see R-arg for F() 's!
}
#define V(k) x.r_##k
#define _(TY,a,c)sym wRe##a(P*dt,int k, ux p){\
  F(2,(TY*)dt[k],(ux)dt[k+7]/sizeof(TY), " %zd="_Z, var v=V(offset); v=v>p?v-p :-v; \
  ,c ,EF(R_SYM)(V(info)),v)}

_(E(Rela),la, var a=V(addend); if(a)w_("+%zx",a);)
_(E(Rel), l,) //<^ for fnaddr resolv&jmpfill
sym wRels(P*dt,P p){
  var got=dt[4]-p;
  w_("%p"Z, p,got);F(1,dt,14," %p",,, x);wNL//Np=p :dtk
  var t=(ux)dt[13];
  if(t&&t!=DT_RELA){w("!"); wRel(dt,2,got);} else for(var k0=2;k0<4;k0++)wRela(dt,k0,got);
  wNL
}


FILE* fi;
sym loadN(Str k,ux da[]){w_("env");
  forv(x,__environ){
    var kc=x[1];var sv=x+3;//Nx=
  if(x[0]=='N'){w_(" %s",x);
    if(kc=='p')wFl=rdFl(sv,"Sprs");
    else if(kc=='l')da[2]=(ux)sv;
    else{
    ux v;sscanf(sv,_Z,&v);
    forv(c,k)if(c==kc)da[_x-k]=v;}
#define X(_k) qstrPrefix(x,#_k)
  }if(X(PATH)||X(HOME)||X(PWD)){}else fprintf(fi,"%s\n",x);}
#undef X
}
static pid id;
_Bool dbgs(Str*a){int i;
#define W(e) waitpid(id,&i,0);if(WIFEXITED(i))exit(2);if(WIFSTOPPED(i) && WSTOPSIG(i)e)
  if(NO==a){W(==5)okay}
  else{id=atoi(a[0]);
  if(id!=0){D(ATTACH) W(!=19)okay} else
  if((id=fork())==0){D(TRACEME)execvp(a[0],a);} else {W(!=5)okay}} //like! LD_PRELOAD=./nmhok
return 1;ok:return 0;
#undef W
}
#include<signal.h>
int SIG=SIGCONT;
sym dochld(){
  if(id<getpid())kill(id,SIG);else{usleep(1000);kill(id,SIG);}
  sigset_t ds; sigfillset(&ds);sigprocmask(SIG_BLOCK, &ds, NO);
  waitpid(id,NO,0); //^keep(fork) stdIO fd open
}
#define NL "\n"
#define shift a++,n--
main(int n,Str a[]){__environ=a+n+1; //export Nf=138250 Nb=1098 # __libc_dlopen_mode _dl_start_user
  fi=fopen("nmhoki","w+");
  w("%d %s %d",,getpid(),a[0],n);shift;
  ux p[3]={0}; loadN("fbl",p);
  fclose(fi);

  var b=p[1];var bl=(Str)p[2];
  if(n==0)okay if(a[0] [0]=='!'){shift;
    int i;Rep(n) {var fp=a[i];_Bool q;if((q= fp[0]!='/')){SNP("lib%s.so",fp);fp=s;} if(dlopen(fp,RTLD_LAZY|(q?0:RTLD_GLOBAL))==NO)w_("\n%s",dlerror());} okay
  }
  if(p[0]==0){w("grep&set Nf=dlopen@, or sudo?"); return 1;}
  RegVar rv; ux cc=0xCC;//v inject& run code! A()W s C()W s
  if(!dbgs(a))return 2;
#define setp(p) pswap(id,p, &cc,sizeof(ux));
#define l(k) libAddr(id, k)
  P dl=l(bl?bl:"ld-");//must wait libc|syscall-retn
  if(b){var db=dl+b;setp(db)D(CONT);if(dbgs(0))return 3;setp(db)}
  P pc=l("libc-");w("\nlc=%p by ldl=%p",,pc,dl);
  kill(getppid(),SIG);
#undef l
  DR(GET) if(b)R(ip)-=1;//xCC
  P pW=(P)R(ip), pStk=(P)R(sp);
  ux ax=R(ax),di=R(di),si=R(si); //keep callee(least ax)
  R(ax)=(ux)(pc+p[0]);/*di*/R(si)=RTLD_LAZY;
  w("ip %p ax"Z,,pW,ax);
#define setshc pswap(id,pW, shc,sizeof(shc));
  DR(SET)setp(pStk)setshc
  D(CONT)
  if(dbgs(0)){DR(GET)w("!");}else{R(ax)=ax,R(di)=di,R(si)=si; DR(SET)setp(pStk)setshc}

  D(DETACH)dochld();return 0;
  ok:if(bl)setRE(bl); dllMain(); //b==0 works.. for non-libc-load child starts
}

wSo(SoLoad*po, ux nb,P ud){
#define V(k) x.p_##k
  var o=*po; E(Dyn)*dp;
  w("%s %d",, *o.fp=='\0'? "./":o.fp,o.n);

  F(0,o.a,o.n, "%c%x 0x"_Z Z  Z"+"_Z,
  char t='?';var va=V(vaddr); {
    uint k=V(type);if(k==PT_DYNAMIC)dp=o.pf+va;
    var k0=0x6474e550;//gnu
    t=in(0,8,k)?"0_DinsPT"[k]:in(k0,k0+4,k)?"Fsop"[k-k0] :t;
  },, t,V(flags), va,V(offset), V(filesz),V(memsz)-V(filesz)) else Rep(o.n){var x=o.a[i];if(V(type)==PT_DYNAMIC){dp=o.pf+V(vaddr);break;} }
  //search DTag: ignored -sz / -ent ,ver,count, rel*, &flags: sym,txtrel..
#define V(k) DT_##k//str sym jmp rela got; h; sjr-sz
  P dt[5+3+6]={NO}; int dtk[]={5,6,23,7,3, V(GNU_HASH),4,V(FLAGS_1), 10,2,8,V(SONAME),V(RPATH),V(PLTREL)};
  for(int k;(k=dp->d_tag);dp++){
    var v=(P)dp->d_un.d_ptr;
    if(k==DT_NEEDED)w("l%zd",,dp->d_un.d_val);
    else Rep(14)if(k==dtk[i])dt[i]=i>6||o.pf<v?v: o.pf+(ux)v;
  }

  wRels(dt,o.pf);
  P ht; int hN=(ht=dt[5])?gnuHashN(ht):0, hX=(ht=dt[6])? *((int16_t*)ht+2):0;
  w("|%d|%d",,hN,hX);
  wSym(dt[1],(hX>hN)?hX:hN, dt[0]);
  w("--");
  return 0;
}

#include<fcntl.h>
int _d0;sym setF(int fd,Str fp){
  if(fp){_d0=dup(1);dup2(open(fp,O_CREAT|O_WRONLY|O_TRUNC),fd);}
  else dup2(_d0,fd);
}
sym wHoka(){
  Str s=getenv("Np");if(s)wFl=rdFl(s,"Sprs");
  setF(1,"nmhoka");dl_iterate_phdr(wSo,NO);setF(1,0);
}
T P(*FN)();FN rc;
#include <pthread.h>
sym doRc(){
  {var l=dlopen("libpython3.so",RTLD_GLOBAL|RTLD_LAZY);rc=dlsym(l, "PyRun_SimpleString");}
  wHoka();
  pthread_t p;pthread_create(&p,NO,rc,"if 'main'in globals():main()"); // import threading start() won't live
}
sym noOp(){}
#include<execinfo.h>
ps(){//SO: C print call stack, gives backtrace(3)glibc,Boost,libunwind,dfwl impl; use addr2line c++filt gdb break;command to help
  ux N=256;P fn[N];
  N=backtrace(fn,N);
  backtrace_symbols_fd(fn,N, 2);puts("");
  return N;
}
gccLib((constructor))sym dllMain(){
  w("\nhello from %d",,getpid());
  if(fi)rc=(FN)noOp; else{var l=dlopen("libpython3.so",RTLD_LAZY);
  ((FN)dlsym(l,"Py_Initialize"))();rc=dlsym(l, "PyRun_SimpleString");}

  rc("from os import *;E=environ;from pathlib import Path as P\n"
  "P.r=property(lambda f:f.open('r+')if f.exists() else f.open('w+'))\n"
  "def rE():\n for ln in P('nmhoki').r:(k,v)=ln[:-1].split('=',maxsplit=1);E[k]=v");
  wHoka();
  rc("rE();exec((P.home()/'nmhok.py').r.read())");
  signal(SIG,doRc);
}

#pragma GCC optimize 1
gccLib((force_align_arg_pointer))_start(){Str* sp;
  asm("mov "xr"bp,%0" : "=r"(sp));sp+=1;//did push bp;bp=sp after call ip=fnaddr ,so *bp=oldBP  +1=retAddr
  exit(main(*(int*)sp, sp+1));
}
const char _RTLD[] gccLib((section(".interp")))="/lib/ld-2.33.so";
/*alias trax='strace "-etrace=!poll,recvmsg,writev,clock_gettime,gettimeofday,clock_nanosleep"'
trax cacafire; trax gtk-demo

python -c 'import ctypes as c;c.CDLL("./nmhok")'
Nb=41431 Nl=libX11 ./nmhok `pidof cacafire` #b XFlush+1 ,also expir with cat,tac,lua,node top,nano,xfce4-taskmanager
Nb=ef854 Nl=libc ./nmhok `pidof cat` */

/*alias C='gcc -o a -ldl -xc - <<<'; py=-lpython3.9
C '__attribute__((constructor))f(){Py_BytesMain(0,0);}' $py -shared -o a.so
C 'main(){dlopen("./a.so",1);}';./a
import gi
ImportError: /usr/lib/python3.9/site-packages/x/x.cpython-39-x86_64-linux-gnu.so:

C 'z(){Py_BytesMain(0);} main(){alarm(1);signal(14,z);while(1);}' $py;./a
#^but works! Looks like ptracee must NEEDED libpython3.x.so

cat >>$(tee dup.txt) 2>&1 ;cat|tee dup.txt
*/

/*Inject /bin/cat

Nl=^read$ Np=s ./nmhok
export Nf=138250 Nl=libc

for i in ;do cat </dev/zero& Nb=ef850 ./nmhok `pidof cat`

*/
