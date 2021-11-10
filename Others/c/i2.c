#include <string.h> 
#include <sys/mman.h> 
#include <elf.h> 
#include <stdio.h> 
#include <sys/types.h> 
#include <sys/stat.h> 
#include <unistd.h> 
#include <fcntl.h> 

#define cf(v_fail,f,...) if((f(__VA_ARGS__))==v_fail){perror(#f);goto cleanup;}

int main(int argc, char **argv) { // list soname dynstr<-DT_NEEDED
    const char *fb = NULL; 
    int fd; struct stat fi = {0}; 

    if (argc != 2) { 
     printf("Missing arg\n"); 
     return 0; 
    } 

    // open the file in readonly mode 
    cf(-1, fd=open,argv[1],O_RDONLY)
    // get the file size 
    cf(-1, fstat,fd, &fi)
    // put the file in memory 
    cf(MAP_FAILED,fb=mmap,NULL, fi.st_size, PROT_READ, MAP_PRIVATE, fd, 0)

    Elf64_Ehdr *eh = (Elf64_Ehdr *)fb; 
    // looking for the PT_DYNAMIC segment 
    for (int i = 0; i < eh->e_phnum; i++) { 
     Elf64_Phdr *ph = (Elf64_Phdr *)((char *)fb + (eh->e_phoff + eh->e_phentsize * i)); 
     const char *strtab = NULL; 
     if (ph->p_type == PT_DYNAMIC) { 
      const Elf64_Dyn *dtag_table = (const Elf64_Dyn *)(fb + ph->p_offset); 

      // looking for the string table dtag==DT_ STRTAB~NULL
      for (int j = 0; 1; j++) { 
       // the end of the dtag table is marked by DT_NULL 
       if (dtag_table[j].d_tag == DT_NULL) { 
        break; 
       } 

       if (dtag_table[j].d_tag == DT_STRTAB) { 
        strtab = (const char *)(dtag_table[j].d_un.d_ptr +fb);// fix PIE baddr: $where_mmaped - $load_addr, PT_LOAD[0]. p_vaddr;for x86_64 e.g. 0x400000
        printf("string table addr: %p\n", strtab); 
       } 
      } 

      // no string table ? we're stuck, bail out 
      if (strtab == NULL) { 
       printf("no strtab, abort\n"); 
       break; 
      } 

      // now, i print shared libraries 
      for (int j = 0; 1; j++) { 
       // the end of the dtag table is marked by DT_NULL 
       if (dtag_table[j].d_tag == DT_NULL) { 
        break; 
       } 

       if (dtag_table[j].d_tag == DT_NEEDED) { 
        printf("too long: %d\n", &strtab[dtag_table[j].d_un.d_val] >= fb + fi.st_size); 
        printf("string offset in strtab: %lu\n", dtag_table[j].d_un.d_val); 
        printf("string from strtab: %s\n", &strtab[dtag_table[j].d_un.d_val]); 
       } 
      } 

      // only go through the PT_DYNAMIC segment we found, 
      // other segments dont matter 
      break; 
     } 
    } 

    // cleanup memory 
    cleanup: 
    if (fd != -1) { 
     close(fd); 
    } 
    if (fb != MAP_FAILED) { 
     munmap((void *)fb, fi.st_size); 
    } 

    return 0; 
} 
