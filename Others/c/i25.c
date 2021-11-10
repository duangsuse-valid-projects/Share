//gcc -Dvar=__auto_type -Wno-implicit-int -DT=typedef -DNO=NULL -Dw=printf -DR_SYM=ELF64_R_SYM -ldl i25.c -shared -emain
#include<link.h>
#include<stdio.h>
T char*P; P cstr; T E(Word)uint; //ELF address, offset.
#define Rep(n) for(i=0;i<n;i++)

gnuHashN(uint* p){
  var *buk=p+4+2*p[2],nB=p[0],i, n=0;
  Rep(nB) if(buk[i]>n)n=buk[i];
  return n+p[1];
}
//DTag info: str=5 strsz=10 sym -sz(hashN) -ent=11 pltrel20==rela?jmprel=23 pltrel-sz -ent rel=17 -sz -ent rela=7 -sz -ent plt-got=3 hash=4|
void putRel(P dt[]){
  E(Rela)*x=dt[2]; if(x) {int i;Rep(dt[6]){ w("%d:%x ",R_SYM(x->r_info),x->r_offset);  x++;}}
}

P LoadSo_x86="\xe8\x07\0\0\0./nmhok_f\xbe\x01\0\xff\xd0\xcc";
const char _RTLD[] __attribute__((section(".interp")))="/lib/ld-2.33.so";

main(int n,cstr a[]){
  //若 nmhokrc 不存在，搜索 dlopen到 dlopen_pELF=0x 退出，库constructor在a 存在时启动Py；退出移除a。 每次扫描rc 并与maps相加, 注入text ，空a
  //参数 %d , ls . 注入(新)进程， ! c m 直接在当前进程加载
    exit(0);
}
