#define T typedef
#define var __auto_type
#define gccLib __attribute__
#define NO NULL
#define w(m,...) printf(m"\n" __VA_ARGS__)
#define Rep(n) for(i=0;i<n;i++)
#define E(k) Elf64_ ##k
#define iSym ELF64_R_SYM
#define My "nmhok"

#include<elf.h> 
#include<string.h> 
#include<stdio.h> 
#include<stdlib.h> 
#include<unistd.h>
