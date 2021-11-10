//python -c '__import__("ctypes").CDLL("./nmhok")'
#include <stddef.h>
#pragma GCC diagnostic ignored "-Wimplicit-int"
#include "_.h"
#include<elf.h>
#include<stdio.h>
#include<string.h>
#define SNP var N=100;char s[N];
T void*P; T E(Word)uint; T char*Str;//ELF vaddr, pf-offset.？  int sz4, long(m32)=4
T struct{P pf; Str fp; E(Phdr)*a; uint16_t n;} SoLoad;

#include<sys/user.h>
#include<dlfcn.h>
T int pid; T struct user_regs_struct RegVar;
size_t ptrace(int op,pid, size_t p, P v); //note, sizeof res type
_ptOp[]={9,7, 1,4, 12,13, 16,17};//stop cont(1insn), rw, reg-rw, a detach
enum ptOp{Cont=0,PokeAt,Poke,DbgExit};
#define dbgr(pairEnd,op) ptrace(_ptOp[op*2+pairEnd], pid,p,v);
#define dbgr0(op) *((size_t*)v)=ptrace(_ptOp[op*2], pid,p,v);
#define dbgr1(op) ptrace(_ptOp[op*2+1], pid,p,*(size_t*)v);
toupper(int);

#include<stdlib.h>
#include<unistd.h>//exec,sig

gnuHashN(int* p){
  int i,nB=p[0], n=0;
  var buk=p+4+2*p[2];
  Rep(nB) if(buk[i]>n)n=buk[i];
  return n+1;//p[1]=n[ndx=UND]
}
qstrPrefix(Str b, Str a){return strncmp(a,b, strlen(b))==0;}
P libAddr(pid i,Str name){P p; FILE*f; SNP
  snprintf(s,N, "/proc/%d/maps", i);
  if (NO == (f= fopen(s, "r")))goto ok;
  while (fgets(s,N, f)) { var ic=strrchr(s, '/');
    //7f7bf2fb9000-7f7bf2fdf000 r--p 00000000 00:1e 4141                       /usr/lib/libc-2.33.so
    // w("%s",,s);
    if (ic &&qstrPrefix(name,ic+1) &&
        sscanf(s, "%p-%*p %*4s 00000000", &p) == 1)return p;
  }
  fclose(f);
  ok:return NO;
}
void wSym(E(Sym)*s,P ds, int n){int i;
  if(NO!=s&&NO!=ds) Rep(n) {
    var ik=s->st_info;
    var sb=ELF32_ST_BIND(ik);
    Str st="uvfscot";
    var t=st[ELF32_ST_TYPE(ik)];
    if(sb==0)w_("_%c",,t); else if(sb<=2) w_("%c",,(sb==1)?t:toupper(t)); else w_("%d!%c",,sb,t);
    s->st_shndx!=0x10? w(" %zx %s %zx;%x",,s->st_size,(Str)ds+s->st_name, s->st_value, s->st_shndx) :
    w(" %zx %s %zx",,s->st_size,(Str)ds+s->st_name, s->st_value); s++;
  }
  w("--");
}
onSo(SoLoad*po,size_t nb, P ud){SoLoad o=*po; E(Dyn)*dIt;
  w("%s %d",, o.fp,o.n);
  int i,n,k;Rep(o.n){
    var x=o.a[i];k=x.p_type; var va=x.p_vaddr;
    if(k==PT_DYNAMIC)dIt=o.pf+va;
    Str pt="0_DinsPT", pt1="Fsop";  char t='?'; // dyn, intrp note shl, phdr tls ehframe stack relro prop
    int k0=0x6474e550,kn=4;
    if(0<=k&&k<strlen(pt))t=pt[k]; else if(k0<=k&&k<k0+kn)t=pt1[k-k0];
    w("%c%x 0x%zx %zx %zx+%zx",,t,x.p_flags,va,x.p_offset, x.p_filesz,x.p_memsz-x.p_filesz);
  }
  if(NO==dIt)goto ok; //v str sym jmp rela got, ghash hash fl, strsz/jmpsz/relasz/so/rpath
  P dt[5+3+4]={NO}; int dtk[]={5,6,23,7,3, DT_GNU_HASH,4,DT_FLAGS_1, 10,2,8,DT_SONAME,DT_RPATH}; // -sz div -ent ,ver,count, rel* is ignored, &sym,txtrel flag.
  var szRel=sizeof(E(Rela));
  for(;(k=dIt->d_tag);dIt++){
    var va=dIt->d_un.d_ptr;
    var v=dIt->d_un.d_val;
    if(k==DT_NEEDED)w("l%zd",,v);
    else if(k==DT_PLTREL&&v!=DT_RELA){w("!"); szRel=sizeof(E(Rel));}
    else Rep(12)if(k==dtk[i])dt[i]=i>6||o.pf<(P)va?(P)va: o.pf+va;
  }
  var ht=dt[5]; var hN=ht?gnuHashN(ht):0; var hX=(ht=dt[6])? *((int16_t*)ht+2) : 0;
  var rgot=dt[4]-o.pf;
  w("%p %zx",,o.pf,rgot);Rep(12)w_("%p ",,dt[i]); w("");
  for(var k0=2;k0!=4;k0++)for(P p=dt[k0],p1=p+(size_t)dt[k0+7];p<p1;p+=szRel){var x=(E(Rela)*)p; var iv=x->r_info; uint v=x->r_offset,a=x->r_addend;w_(" %zd=%zx",, iSym(iv), v>rgot?v-rgot:-v);if(a)w_("+%x",,a); }w("");//no addend:(pc+1)+val=actual, actual+add-val=(pc+1)
  w("|%d|%d",,hN,hX);wSym(dt[1],dt[0],(hX>hN)?hX:hN);

ok:return 0;}
gccLib((constructor)) void dllMain() {
  w("dll"); //echo 'main(){dlopen("./nmhok",2);}'|gcc -xc -ldl -  //gcc  -emain -xc -no-pie -nostdlib -Wl,-n
  freopen("nmhoka","w+",stdout);
  w("--");dl_iterate_phdr(onSo, NO);
  var l=dlopen("libpython3.so", RTLD_LAZY);
  var init=(void(*)())dlsym(l,"Py_Initialize");
  var pyrc=(P(*)(Str))dlsym(l, "PyRun_SimpleString"); //var msg=fileno(fopen("nmhoki","w+"));tee(1,msg,INT_MAX,SPLICE_F_NONBLOCK);
  //Str s;w("%p %s",,(__environ=dlsym(0,"environ"))[0]);
  //freopen("nmhoka","w+",stdout);c freopen("/dev/tty","w",stdout); //dup/dup2(old,new)
  //P fn(P){rc("import threading as thr\nif 'main'in globals():thr.Thread(target=main,name='Hook').start()");}
  //sigset_t ds; sigfillset(&ds);sigprocmask(SIG_UNBLOCK, &ds, NO);  signal(SIGALRM,doRc);alarm(1);
}
FILE*f;int _f0;Str _m0; setF(Str fp,Str m){
  if(m){_f0=dup(fileno(f));_m0=m;freopen(fp,m, f);}
  else {fclose(f);*f=*fdopen(_f0,_m0);} //still we can't support write(by _FILENO)
}

// process_vm_writev(pid, ctypes.byref(local_iovec), 1, ctypes.byref(iovec(ctypes.c_void_p(address), size)), 1, 0)
// trap = (orig & ~0xff) | 0xcc;   ptrace(PTRACE_SETOPTIONS, child, 0, PTRACE_O_TRACESECCOMP | PTRACE_O_TRACEFORK | PTRACE_O_TRACECLONE);
// &no use /maps parse, mmap()rwxp or pyelftools.ELFFile.section_by_name.iter_sym ;see i2.md real!

// https://sourceware.org/git/?p=glibc.git;a=blob;f=elf/dl-object.c assert
//https://code.woboq.org/userspace/glibc/elf/rtld.c.html#1120
#ifdef __x86_64
  T uint64_t Word;//ptrace
  Word shc[]={0x6e2f2e00000008e8,0xbe665f006b6f686d,0xccccccccd0ff0002};
#define xr "%%r"
#else
  T uint32_t Word;
  Word shc[]={0x8e8,0x6e2f2e00,0x6b6f686d,0xbe665f00,0xd0ff0001,0xcccccccc};
#define xr "%%e"
#endif
// rasm2 -C 'call 0xd;.asciz "./nmhok"; pop rdi;mov si,1; call rax'
// c=b"\xe8\x08\0\0\0./nmhok\0_f\xbe\x01\0\xff\xd0"; mb=__import__('struct').unpack;[",".join(hex(x)for x in mb(fmt,c+b'\xcc'*pad)) for fmt,pad in [("L"*3,4) ,("I"*6,4)]] #S.unpack(m*n,c+ rem!=0? (n*nb-len(c))*b"\xcc")

//echo 'char*s="\xe8\x08\0\0\0./nmhok\0_f\xbe\x01\0\xff\xd0";main(){asm("mov $1,%rsi");(*(void(*)())s)();}'|gcc -nostdlib -Tnmagic.x -xc - #norax
//v extern F(); asm("call F") or (call%0: &F)(call%0:: &F) #need lval,no reloc_jmp_32
// echo 'char*s="\xe8\x08\0\0\0./nmhok\0_f\xbe\x01\0\xff\xd0";extern (*F)();main(){asm("mov rsi,2;mov rbx,%0"::""(F));asm("call s");}'|gcc -nostdlib -fPIC -Tnmagic.x -masm=intel -xc - -ldl -lc -DF=__libc_dlopen_mode;objdump -d

//echo 'extern (*F)();main(){char*s="./nmhok";asm("mov rdi,%1;mov rsi,1;call %0"::"g"(&F),""(s));}'|gcc -nostdlib -fPIC -Tnmagic.x -masm=intel -xc - -ldl -lc -DF=dlopen;objdump -d #noinit
// echo 'extern F();main(){F("./nmhok",1);} _init(){}'|gcc -nostdlib -fPIC /lib/crt1.o  -xc - -ldl -lc -DF=__libc_dlopen_mode;objdump -d

// char*s="./nmhok";asm("mov rdi,%1;mov si,1;call %0"::"g"(&F),""(s)); looks si=1 makes dlopen_mode=0b?..1 ,sometimes adds RTLD_OPENEXEC flag. We don't need to copy(no-entry ver) of ./nmhok or dohook@any-syscall eg.openat ...
// stra trace=openat,brk,munmap ./nmh 2>&1 : brk(!NULL) |munmap()

/*strace gcc -Dzint=size_t -D'dbg(op)=ptrace(PTRACE_##op,pid,0,v);' -D'dbgd(op,p,v)=ptrace(PTRACE_##op,pid,p,v)' `for k in types ptrace reg wait; do echo -include sys/$k.h; done` #-I/usr/include/sys bad sys/ptrace.h
main(int n,char**a){ zint pid;int v; pid=atoi(a[1]);
dbg(ATTACH) v=0x1;dbg(SETOPTIONS) v=0;
while(1){dbg(SYSCALL) waitpid(pid,&v,0);//enab-diff&wait
  if(WIFEXITED(v))exit(1);
  if(WIFSTOPPED(v) && WSTOPSIG(v)&0x80)printf("%zd() =%zx\n", dbgd(PEEKUSER, sizeof(zint)*ORIG_RAX, 0),dbgd(PEEKUSER, sizeof(zint)*RAX, 0));v=0;}//no dbg(CONT)
}

//alfonsobeato.net/c/modifying-system-call-arguments-with-ptrace/ github #L114 ,L58 alloca&open(rdi) LD_PRELOAD fakeroot-like
*/
main(int n,Str a[]){
#define shift a++,n--
  var id=getpid(); var pc=libAddr(id,"libc-");
  w("%d %s %d:%p",,n,a[0],id,pc);
  shift; SNP
  if(n!=0){
    if(a[0][0]=='!'){shift;
      int i;Rep(n) {var fp=a[i]; if(fp[0]!='/'){snprintf(s,N,"lib%s.so",fp);fp=s;} dlopen(fp,RTLD_LAZY);}
      goto run;
    }
    var pid=atoi(a[0]);
    var rc=fopen("nmhokrc", "a+");
    size_t i,p;P v; RegVar rv;
    if(pid==0 &&(pid=fork())==0)execvp(a[0],a);else {
       sleep(1);//wait dlinit
        w("%p",,libAddr(pid, "libc-"));
      dbgr(0,DbgExit) wait(&p);
      if(WIFSTOPPED(p) && WSTOPSIG(p) == 19) {
        size_t p_dlopen;if(fscanf(rc, "dlopen_pELF=%zx", &p_dlopen)==0)goto run;

        v=&rv;dbgr0(Poke)
        var ax0=rv.rax; rv.rax=(size_t)(libAddr(pid, "libc-")+p_dlopen); dbgr(1,Poke);
        var pW=rv.rip;//ins here
        var szW=sizeof(Word);
        w("%d ip=%llx f=%llx %llx",,pid,pW,rv.rax,ax0);
        //v=0;return dbgr(1,DbgExit)
        Rep(sizeof(shc)/szW) {
          Word v0; p=pW+i*szW;v=&v0; dbgr0(PokeAt)
          v=&shc[i]; dbgr1(PokeAt)
          shc[i]=v0;
        }
        v=0;dbgr(1,Cont) wait(&p); //wait SIGTRAP
        if(WIFSTOPPED(p) && WSTOPSIG(p) == 5) {
          Rep(sizeof(shc)/szW){p=pW+i*szW;v=&shc[i]; dbgr1(PokeAt)}
          v=0;dbgr(1,Cont)//v=signo
        } else w("!");
        rv.rax=ax0; v=&rv;dbgr(1,Poke)
      }
      v=0;
      return dbgr(1,DbgExit)
    }
  }
  run:
  dllMain();
}

#pragma GCC optimize 1
gccLib((force_align_arg_pointer)) _start(){Str* sp;
//push bp;bp=sp
asm("mov "xr"bp,%0" : "=r"(sp));sp+=1;
exit(main(*(int*)sp, sp+1));
}
const char _RTLD[] gccLib((section(".interp")))="/lib/ld-2.33.so";
