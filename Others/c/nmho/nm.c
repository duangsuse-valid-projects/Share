#include "_.h"
#pragma GCC diagnostic ignored "-Wimplicit-int"
#define SNP(...) ux N=100;char s[N]; snprintf(s,N,__VA_ARGS__) // why flex array allocates wrong?

T void sym; T char* Str;
T sym* P; T size_t ux;
T struct{P pf; Str fp; E(Phdr)*a; uint16_t n;} SoLoad;
#include<dlfcn.h>

#define ptrace bad
#  include<sys/ptrace.h>
#undef ptrace //and? https://stackoverflow.com/questions/319328/how-to-write-a-while-loop-with-the-c-preprocessor redefine_extname https://docs.oracle.com/cd/E57201_01/html/E57211/bjacu.html , cpplib dire https://github.com/gcc-mirror/gcc/blob/master/libcpp/macro.c#L3814  W_NONE -Wpedantic
#include<sys/user.h>
#include<sys/reg.h>
T int pid; T struct user_regs_struct RegVar;
ux ptrace(int op,pid, P p,ux v);
sym pswap(pid id,ux*p,ux*p0,ux sz){int i; ux v0;Rep(sz/sizeof(ux)){v0=ptrace(1,id,p+i,0); ptrace(4,id,p+i,p0[i]); p0[i]=v0; }  }
#define dbg(op) ptrace(PTRACE_##op,id,0,v);
toupper(int);
qstrPrefix(Str a, Str b){return strncmp(a,b, strlen(b))==0;}
Str env(Str k,Str v0){var v=getenv(k);return NO==v?v0:v;}
gnuHashN(int* p){
  int i,nB=p[0], n=0;
  var buk=p+4+2*p[2];
  Rep(nB) if(buk[i]>n)n=buk[i];
  return n+1;
}
sym dllMain();
#ifdef __x86_64
//rasm2 -B 'call 0xd;.asciz "./nmhok"; pop rdi; call rax'|python -c 'import sys,struct as S; m,c="L",sys.stdin.buffer.read();n=S.calcsize(m);nb=len(c)//n+1;print(",".join(hex(x)for x in S.unpack(m*nb,c+(n-len(c)%n)*b"\xcc") ))'
ux shc[]={0x6e2f2e00000008e8,0xd0ff5f006b6f686d,0xcccccccccccccccc};
#define xr "%%r"
#else
ux shc[]={0x73647373,0x73647364,0x62616173,0x64617363,0x736a6f78,0x73736473,0xcccccc0a};
#define xr "%%e"
#endif
P libAddr(pid id,Str name){P p; FILE*f;
  SNP("/proc/%d/maps", id);
  if(NO == (f=fopen(s, "r")))goto ok;
  while(fgets(s,N, f)) { var ic=strrchr(s, '/');
    //7f7bf2fb9000-7f7bf2fdf000 r--p 00000000 00:1e 4141                       /usr/lib/libc-2.33.so
    if (ic &&qstrPrefix(ic+1,name) &&
        sscanf(s, "%p-%*p %*4s 00000000", &p) == 1)return p;
  }
  fclose(f);
  ok:return NO;
}
waitpid(pid,int*,int);
/*
export dlopen=138250 sysk=12,5p
setcap cap_sys_ptrace=p
setarch -R strace ./nmhok ls
cat sysk=0,2p
echo sysk=1,1p
cat /proc/`pidof python`/maps
gdb -arg ./a ls # looks like callee of brk#5 or munmap#0 can't call _dlopen, maybe we b __libc_start_main or __builtin_return_addr(N=5) ? singlestep/pokeCC
p (long)__libc_dlopen_mode( "./a",1)
p/x (ux)ptrace(1,id,(ux*)rv.rip+1,0)
x/3gx shc
@syscall frame x/s *(long*)$rsp
x/10i __libc_dlopen_mode+20
x/gx $rsp-8
*/
main(int n,Str a[]){
#define shift a++,n--
  w("%d %s %d",,getpid(),a[0],n);shift;
  if(n==0){dllMain();return 1;}
  if(a[0] [0]=='!'){shift;
    int i;Rep(n) {var fp=a[i]; if(fp[0]!='/'){SNP("lib%s.so",fp);fp=s;} dlopen(fp,RTLD_LAZY);}
    goto run;
  }
  ux zFn;sscanf(env("dlopen","0"),"%zx",&zFn); if(0==zFn)goto bad;
  pid id=atoi(a[0]); int i;
  ux v=0; RegVar rv;
  if(id!=0){dbg(ATTACH)v=1;}
  else if((id=fork())==0){dbg(TRACEME)execvp(a[0],a);}//no next

  // still we can support nb: cont=SINGLESTEP & fillback 0xCC ,but bitmask &~0xff|0xcc is seems :(
#define waits(e) waitpid(id,&i,0);if(WIFEXITED(i))exit(2);if(WIFSTOPPED(i) && WSTOPSIG(i)e)
  waits(!=(v?19:5))return 1;
  v=0x1;dbg(SETOPTIONS)//sig|=0x80
  int syk,nb; char _;var qv=3==sscanf(env("sysk","12,5"),"%d,%d%c", &syk,&nb,&_); //3rd enter-exit
  w("%d Fn=%zx wait Sys%d *%d",,id,zFn,syk,nb);
  if(syk==1000){if(v){v=0;dbg(CONT)} sleep(nb);kill(id,19);}else for(;;){v=0;dbg(SYSCALL) waits(& 0x80) {var sk=ptrace(PTRACE_PEEKUSER,id, (P)(ORIG_RAX*sizeof(ux)), 0);
    if(qv)w("%zd %d",, sk,nb); if(sk==syk)if(nb-- ==0)break;}//sorry
  }
  P pLibc=libAddr(id, "libc-"); w("libc=%p",,pLibc); // catch syscall brk; c 5; p (int)__libc_dlopen_mode("",2)
#define R(k) rv.r##k
#define swap pswap(id,pW, shc,sizeof(shc));
  v=(ux)&rv;dbg(GETREGS)
  P pW=(P)R(ip);
  ux ax=R(ax),di=R(di),si=R(si); R(ax)=(ux)(pLibc+zFn); R(si)=RTLD_LAZY; dbg(SETREGS) //keep returned syscall(least ax)
  w("ip %p ax0 %zx",,pW,ax);swap
  v=0;dbg(CONT)
  waits(==5){swap R(ax)=ax,R(di)=di,R(si)=si; v=(ux)&rv;dbg(SETREGS)}else {v=&rv;dbg(GETREGS)w("!");}
  v=0;return dbg(DETACH)

  bad:w("find&set dlopen=, or sudo");
  run:dllMain();
}//ref https://linux.cn/article-9942-1.html , https://blog.rchapman.org/posts/Linux_System_Call_Table_for_x86_64/ ;SIGCONT=18 ,exit_group=all threads , https://wizardforcel.gitbooks.io/100-gdb-tips/content/catch-syscall.html
//https://www.cnblogs.com/youxin/p/8833877.html , ulimit -S -c && coredumpctl debug ID
sym wSym(E(Sym)*s,P ds, int n){
  if(NO==s||NO==ds)return;
  int i;Rep(n) {
    var ik=s->st_info;
    var sb=ELF32_ST_BIND(ik);
    Str st="uvfscot";
    var t=st[ELF32_ST_TYPE(ik)];
    if(sb==0)printf("_%c",t); else if(sb<=2) printf("%c",(sb==1)?t:toupper(t)); else printf("%d!%c",sb,t);
    s->st_shndx!=0x10? w(" %zx %s %zx;%x",,s->st_size,(Str)ds+s->st_name, s->st_value, s->st_shndx) :
    w(" %zx %s %zx",,s->st_size,(Str)ds+s->st_name, s->st_value); s++;
  }
  w("--");
}
gccLib((constructor))sym dllMain(){
  var rc=fopen(My"rc", "a+");
}
#pragma GCC optimize 1
const char _RTLD[] gccLib((section(".interp")))="/lib/ld-2.33.so";
gccLib((force_align_arg_pointer)) _start(){Str* sp;//did push bp;bp=sp
  asm("mov "xr"bp,%0" : "=r"(sp));sp+=1;
  exit(main(*(int*)sp, sp+1));
}