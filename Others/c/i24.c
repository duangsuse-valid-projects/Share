//gcc -DE=ElfW -Dvar=__auto_type -DT=typedef -ldl i24.c -shared -DDL="\"/lib/ld-linux-x86-64.so.2\"" -Wl,-emain,--build-id=none,-znoseparate-code -nostdlib

//从 rtld Phdr=dynamic 段获取 str,sym,strsz, needed* 段用于生成 strings;nm -D;ldd 列表,允许 dlopen注入，读 plt,rela.plt(jmprel),pltrelsz sym重定址，用于修改 .got.plt Hook. ELF基址也可/proc/self/maps取
//常见(PHdr=LOAD,off=0)[0].vaddr==0 , p0=so实址-vaddr+offset 即从LOAD0开始数 再算 p0+(PHdr=DYN).vaddr 。或许需 mman.h mprotect;clear_cache(p&M,+PAGE_SIZE) 参 https://zhuanlan.zhihu.com/p/31632620 , https://github.com/cntools/libsurvive/blob/master/redist/symbol_enumerator.c (以 PT_LOAD >p&<p+uint 搜dyn)
#include<link.h>
#include<stdio.h>
#define Rep(n) for(i=0;i<n;i++)
#define RepI while(i--)
static _atoi(){return 1;}

T char*cstr; T void*P; T E(Word) uint;
static P NO=0; static var w=printf;
T struct{P pf; cstr fp; E(Phdr)*a; uint16_t n;} SoLoad;
uint gnuHashN(uint* p){
  var nbit=1?2 :__WORDSIZE / (8 * sizeof (unsigned));
  uint i=p[0], max=0, *buk=p+4+ p[2]*nbit;
  RepI if(buk[i]>max)max=buk[i];
  return max+p[1]; //但其实，我们仍需测试 st_name==0 判断链终止，因为末链表项会被忽略?
}
uint relgot(P dt[],int idx){
  E(Rela)*x=dt[2]; if(x) {int i;Rep(dt[6]){if(ELF32_R_SYM(x->r_info) == idx&&x->r_addend==0)
  return x->r_offset; 
    x++;}}
  return 0;
}

static int onLib(SoLoad*po, P ud){SoLoad o=*po;
  P dt[6+2]={NO}; int dtk[]={DT_STRTAB,DT_SYMTAB,DT_PLTGOT,DT_JMPREL, DT_STRSZ,DT_PLTRELSZ/*?2 反正都是uint*/} ,i=0,n; //加rel.dyn  DTREL PLT_DT_,sz,ent
  //add needed_so, sz_SymEnt/hash.sysv[1], kind_PLTRel
  w("%s",o.fp);
  E(Dyn)*dyn;for(E(Phdr)x;i<o.n;i++)if((x=o.a[i]).p_type==PT_DYNAMIC)dyn=o.pf+x.p_vaddr; if(NO==dyn)goto ret;
  for(int k;(k=dyn->d_tag);dyn++){
    Rep(6)if(k==dtk[i]){dt[i]=(i<4?0:o.pf)+ dyn->d_un.d_ptr;goto ok;}
    var v=dyn->d_un.d_val;
    if(k==DT_NEEDED)w("l%d",v);//逆序遍历,dt[0]位置未拿
    if(k==DT_SYMENT)dt[6]=(P)v; if(k==DT_GNU_HASH)dt[7]=dyn->d_un.d_ptr; //(k==DT_HASH&&dt[7]==NO)? *(uint*)(v<o.pf?o.pf+v:v)+1
    if(k==DT_PLTREL&&v!=DT_RELA)w("!");
    ok:
  }
  if(dt[0]<o.pf)Rep(2)dt[i]=o.pf+(size_t)dt[i];
  w("\n");Rep(6)w("%lx ",dt[i]);var hN=dt[7];w("%d ",hN<o.pf? (n=hN) : (n=gnuHashN(hN)) );
  Rep(n) {
    var s=(E(Sym)*) (dt[1]+i*(long) dt[6]);//支持syment
    var ik=s->st_info;
    var sb=ELF32_ST_BIND(ik); // STB local global weak; PTdyn=2 DTstr sym=6 rela; needed=1 plt-relSz plt-got 
    var st=ELF32_ST_TYPE(ik); // STT no obj func sec,fp,common tls
    var sk=s->st_name? (cstr)dt[0]+s->st_name : "";
    var sn=s->st_size;
    cstr kb[]={"l","g","w"}, kt[]={"","v","f","sec","file","comm","tls"};
    if(sb>=3)break;//vDSO
    var rel=relgot(dt,i);
    w("\n%s%s %s %d %d %d",kb[sb],st<6?kt[st]:"?", sk,sn,s->st_shndx, rel);
    if(strcmp(sk,"atoi")==0&&rel) {
      var fn=(int(**)(cstr))(dt[2]+24+rel);//NULL, hashN实现不对?  text.e_entry-relsz.rel=got ?
      w("\n%lx !\n",fn); *fn=_atoi; // dt[2]+ 0x4040(atoi@got.plt)-0x4000(gotplt) , jump-ptrs@got[3] -va+off (SOF:60408641)
    }
  }
  ret:w("\n");return 0;
}
cstr Re(){return atoi("0")==0? "Hook Me!" : "Good";}

int main(int n,cstr a[]){
  int i;if(a)Rep(n)dlopen(a[i],RTLD_LAZY);
// void  _start(){
  dl_iterate_phdr(onLib,0);
  w("%s\n", Re());
  exit(0);
}//附: ELFhdr 后带 PH/SH(iShstr) 数组,作ld-linux, ld 动静态加载用. elf.h SHN_ 是节ID特殊值. symtab含dynsym. gnu.hash只包含nm -D符号。
//strtab 基本是给链接器, LOAD r sz==memsz 的 rodata 才是 strings. bss,eh_frame 是给 a[1000] 和C++bt 用的, fini_array是C++对fini的扩展

const char dl_loader[] __attribute__((section(".interp"))) = DL;

/*
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
ptrace(kop,pid,pW,pR)
peek/poke text data
cont step ; gset reg
adttach

di=fp; si=1 //RTLD_LAZY
ax=dl_open; *rip=0xccd0ff
waitpid(,0)[1]&WSTOPSIG ==5

malloc利用brk(p), sbrk(dp|0)设定堆终止

https://stackoverflow.com/questions/39785280/how-shared-library-finds-got-section
https://stackoverflow.com/questions/29694564/what-is-the-use-of-start-in-c : crt1.o argc@return_addr+int[7] argv, flush,atexit

.intel_syntax noprefix # gcc -c -nostartfiles dl.S
.Section .text
.global _start
fp: .asciz "./a.so"
_start:
    mov esi,1
    mov edi,offset flat:fp
    movq rax,offset flat:__libc_dlopen_mode
    call rax
    call _exit


Section .text ; nasm -felf64 dl.S;objdump -d dl.o
global _start

_start:
    mov rdi,[rel $+7+2] ;sizeof mov jmp
    jmp ob
    db './nmhook.so\n'
    ob:mov rsi,1
    xchg rdi,rsi
    mov rax,1
    mov rdx,5
    syscall
    ret
    ;call rax;int 3

_start:
    call shellcode
    db '/bin/sh'

shellcode: ; in x86 abcd si di bp , in x64 di si dc r89  asm/unistd
    pop rsi
    mov rdi,1
    mov rdx,7
    mov rax,1
    syscall ;write(1,return_addr,7)
    mov rax,60
    syscall ;exit

; ld -pie -pic or /lib/crti.o wont work, use gcc -nostartfiles dl.o to enable dlload
;nasm -felf64 dl.S;objdump -d dl.o;gcc -nostartfiles dl.o -static-pie
Section .got:
extern free
Section .text ; readelf -s libc.so|grep dlopen gets 0x138250
global _start ; /proc/self/mmap libc[0]=7ffff7dd8000 cat /proc/`pidof a.out`/maps run with setarch x86_64 -R

_start:
    mov rax,0x7ffff7dd8000+0x138250
    call shellcode
    db './nmhok'

shellcode:
    pop rdi
    mov rsi,1
    call rax
    int3
    
;see https://stackoverflow.com/questions/46203110/x86-assembly-data-in-the-text-section fails on mov[si+7],al ;but CFI is not setted up :(
\xe8\x07\0\0\0./nmhok_f\xbe\x01\0\xff\xd0\xcc
*/
