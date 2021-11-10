%.h:Makefile; echo|cpp -P -dD -nostdinc -undef $D|tail -n+6 >$@; echo $I|sed -E 's/(\S+)/\n#include<\0.h>/g' >>$@
_.h:I=string stdio stdlib unistd elf  dlfcn sys/ptrace sys/user
_.h:D=-DT=typedef -Dvar=__auto_type -DgccLib=__attribute__ -DNO=NULL -D'w(m,...)=w_(m NL __VA_ARGS__)' \
  -Dw_=printf -D"Rep(n)=for(i=0;i<n;i++)"  -D"E(k)=Elf64_##k" -D"EF(k)=ELF64_##k"

nmhok: rwx.x nm.c _.h; $C -T$+ ;sstrip $@
rwx.x:; sed -E 's/(DATA_SEGMENT_ALIGN).*/\1(1,1);/' /lib/ldscripts/elf_x86_64.xsc >$@

a: nm.c _.h; $C -g $+
C=cc -o $@ $(CFL)
CFL=-nostdlib -shared -fPIC -ldl -Wl,--build-id=none -fno-stack-protector -fno-asynchronous-unwind-tables -O3