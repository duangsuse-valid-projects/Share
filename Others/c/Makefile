%.h:; echo|cpp -P -undef -nostdinc -dD $F|tail -n+6 >$@
_.h: F=-DT=typedef -Dvar=__auto_type -DNO=NULL -D'w_(s,...)=printf(s __VA_ARGS__)' -D'w(s,...)=printf(s"\n" __VA_ARGS__)' -DgccLib=__attribute__ -D"Rep(n)=for(i=0;i<n;i++)" -D"E(k)=Elf64_##k" -D iSym=ELF64_R_SYM

CFL=-nostdlib -ldl  -shared -fPIC -O3 -Wl,--build-id=none -fno-stack-protector
nmhok: _.h nmh.c; cc -o $@ $+ ${CFL} -g
nmh: nmagic.x _.h nmh.c; cc -o $@ -Wl,-T,$+ ${CFL} -fno-asynchronous-unwind-tables; sstrip $@
nmagic.x:; sed -E 's/(DATA_SEGMENT_ALIGN).*/\1(1,1);/g' /lib/ldscripts/elf_x86_64.xsc >$@