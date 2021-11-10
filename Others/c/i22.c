#include<link.h>
#include<stdio.h>
#define E ElfW
#define w printf
typedef struct{void*pf; char*fp; E(Phdr)*ph;E(Half) n;} DLPI;
void*const NO=-1;

void psym(char*p[]){//name val sz
  E(Sym)*s=p[1];
  while(s->st_value){
    w("\n%s %x %d",p[0][s->st_name],s->st_value,s->st_size); s++;
  }
  w("\n");
}
int on_lib(DLPI* po, size_t sz, void *udata){DLPI o=*po; // Eh->phoff Ph==PT_DYN -> p0+p_off sh_off[i] tag=DT_STR/SHT_DYNSTR-> un.d_ptr sh_off
  int i; E(Dyn)*pDT=NO; char*pD[3]={NO};//str,sym
  w("%s ",o.fp);
  for(i=0;i<o.n;i++){if(o.ph[i].p_type==PT_LOAD)pD[2]=&o.ph[i]+o.ph[i].p_vaddr; if(o.ph[i].p_type==PT_DYNAMIC){if(0)pD[2]=o.ph[i].p_vaddr; pDT=o.pf+o.ph[i].p_offset;} }//nouse paddr
  w("%x %x %x %x\n",pD[2],pDT, o.pf, (int)pD[2]<<12+(int)pDT); //忘记是 %lx ，调试作废..
  if(pDT!=NO) {
    for(i=0;pDT[i].d_tag!=0;i++)switch(pDT[i].d_tag){
#define to(x) pD[x]=o.pf+pDT[i].d_un.d_ptr;break;case //没有DT_size
      case DT_STRTAB: to(0) DT_SYMTAB: to(1) DT_NEEDED:
      w(" %x", pD[0]+pDT[i].d_un.d_val);
    }
    for(i=2;i--;)if(pD[i]==NO)goto out;
    w(" %x\t%x %x\n",pDT,pD[0],pD[1]);psym(pD); //拿 r2 s section..dynstr 一看低位对，高位差大
  }
  out:puts("");return 0;
}
int main(){
  dl_iterate_phdr(on_lib,0);
}