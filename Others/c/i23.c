#include <assert.h>
#include <elf.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#define __USE_GNU
#include <link.h>


int altstrcmp(const char *s1, const char *s2)
{
    return 0;
    while (*s1 && *s2) {
        if (*s1 < *s2 - 1) {
            return -1;
        }
        if (*s1 > *s2 - 1) {
            return 1;
        }
        s1++;
        s2++;
    }
    if (*s1) {
        return 1;
    }
    if (*s2) {
        return -1;
    }
    return 0;
}

typedef int (**strcmpptr) (const char *, const char *);
typedef enum {
    DI_SYMTAB, DI_SYMENT, DI_STRTAB, DI_STRSZ, DI_PLTRELSZ, DI_PLTREL,
    DI_JMPREL, DI_SIZE
} dynindex;

uint16_t find_sym_index(const char * const target,
                      const Elf64_Sym * const symtab, const size_t num_symbols,
                      const char * const strtab, const size_t strsz)
{
    const Elf64_Sym *cursym;
    for (cursym = symtab;
         cursym < symtab + num_symbols;
         cursym += 1) {
        assert(cursym->st_name <= strsz);
        if (strcmp(strtab + cursym->st_name, target) == 0) {
            break;
        }
    }
    // Not found == num_symbols, found == index
    return cursym - symtab;
}

strcmpptr find_rela_addr(const uint16_t sym_index,
        const Elf64_Rela * const rela, const size_t relasz)
{
    for (const Elf64_Rela * currel = rela;
         (void *)currel < (void *)rela + relasz;
         currel += 1) {
        printf("SYM index: %d\n", ELF64_R_SYM(currel->r_info));
        if (ELF64_R_SYM(currel->r_info) == sym_index) {
            // XXX If this addend isn't 0 then the .got.plt is structured in a
            // way I don't understand, fail and alert me so I can investigate.
            assert(currel->r_addend == 0);
            return (strcmpptr) currel->r_offset;
        }
    }
    return NULL;
}

// Because the PHDR member isn't in the relocatable object
strcmpptr getgot(const void * const phdr, ptrdiff_t base_offset)
{
    // Initialise the curhdr structure to something other than the terminating
    // PT_NULL header.
    Elf64_Phdr curhdr = {0};
    // Just anything not PT_NULL or PT_DYNAMIC
    curhdr.p_type = PT_PHDR;

    for (Elf64_Phdr *hdrptr = (Elf64_Phdr *)phdr;
         curhdr.p_type != PT_NULL && curhdr.p_type != PT_DYNAMIC;
         hdrptr += 1 , curhdr = *hdrptr) {
        // Iterate through each program header.
    }
    if (curhdr.p_type != PT_DYNAMIC) {
        return NULL;
    }

    // // The printf below and after parsing the DYNAMIC array are there to see
    // // if the size of the DYNAMIC segment can be used instead of looking for
    // // the DT_NULL terminator.
    // // Turns out the size is greater than just the _DYNAMIC arrey.
    // ptrdiff_t dynsize = curhdr.p_memsz;
    // printf("Size of dynamic segment is: %p\n", dynsize);

    Elf64_Dyn dyntag = {0};
    // Just something that isn't the DT_NULL terminator.
    dyntag.d_tag = DT_NEEDED;

    bool foundtags[DI_SIZE] = { false };
    Elf64_Dyn tagarray[DI_SIZE] = { {0} };

    Elf64_Dyn *dynptr;
    for (dynptr = (Elf64_Dyn *)(base_offset+ curhdr.p_vaddr);
         dyntag.d_tag != DT_NULL;
         dynptr += 1, dyntag = *dynptr) { // added base
        dynindex tag_type = DI_SIZE;
        // printf("tag: %d\n", dyntag.d_tag);
        switch (dyntag.d_tag) {
            case DT_SYMTAB:     tag_type = DI_SYMTAB; break;
            case DT_SYMENT:     tag_type = DI_SYMENT; break;
            case DT_STRTAB:     tag_type = DI_STRTAB; break;
            case DT_STRSZ:      tag_type = DI_STRSZ; break;
            case DT_PLTRELSZ:   tag_type = DI_PLTRELSZ; break;
            case DT_PLTREL:     tag_type = DI_PLTREL; break;
            case DT_JMPREL:     tag_type = DI_JMPREL; break;
            default: break;
        }
        if (tag_type != DI_SIZE) {
            assert(foundtags[tag_type] == false);
            foundtags[tag_type] = true;
            tagarray[tag_type] = dyntag;
        }
    }
    printf("Dynptr - dynbase = %x\n", (uintptr_t)dynptr - (uintptr_t)curhdr.p_vaddr);
    // printf("sizeof(Elf64_Dyn) = %u\n", sizeof(Elf64_Dyn));

    assert(foundtags[DI_SYMTAB]);
    assert(foundtags[DI_SYMENT]);
    assert(foundtags[DI_STRTAB]);
    assert(foundtags[DI_STRSZ]);
    const uint16_t strcmp_strindx = find_sym_index("strcmp",
            (Elf64_Sym *)(tagarray[DI_SYMTAB].d_un.d_ptr + 0),
            tagarray[DI_SYMENT].d_un.d_val,
            (char *)(tagarray[DI_STRTAB].d_un.d_ptr + 0),
            tagarray[DI_STRSZ].d_un.d_val);
    if (strcmp_strindx >= (tagarray[DI_SYMENT].d_un.d_val)) {
        return NULL;
    }

    // Find strcmp() .got.plt entry using the relocations array.
    assert(foundtags[DI_PLTREL]);
    if (tagarray[DI_PLTREL].d_un.d_val == DT_RELA) {
        return 0x4000+find_rela_addr(strcmp_strindx, //readelf -S a.out |grep got
                (Elf64_Rela *)(tagarray[DI_JMPREL].d_un.d_ptr + 0),
                tagarray[DI_PLTRELSZ].d_un.d_val); //https://systemoverlord.com/2017/03/19/got-and-plt-for-pwning.html
    } else if (tagarray[DI_PLTREL].d_un.d_val == DT_REL) {
        fprintf(stderr, "That's strange ... have a look here\n");
        return NULL;
        // Haven't bothered implementing the below because my compiler
        // doesn't use REL relocations on this test program.
        // Would do essentially the same as find_rela_addr() but using
        // Elf64_Rel structures.
    } else {
        // XXX Was not sure what values represent what, but it appears to be
        // DT_REL{,A} See DT_PLTREL in man elf for the statement:
        // "Type of relocation entry to which the PLT refers (Rela or Rel)".
        // It doesn't actually say what values are stored to indicate which
        // type.
        fprintf(stderr, "d_val member of DT_PLTREL is not DT_ tag.\nIs %lu\n",
                tagarray[DI_PLTREL].d_un.d_val);
        return NULL;
    }
}

int check_password(const char* password)
{
    if (strcmp("etmrhdr ", password) == 0) {
        return 1;
    }
    return 0;
}

struct callback_data {
    uintptr_t addr;
    void *phdr;
};

int get_object_phdr(struct dl_phdr_info *info, size_t size, void *data)
{
    struct callback_data *c = (struct callback_data *)data;
    if (info->dlpi_name[0] == '\0') {
        c->phdr = info->dlpi_phdr;
        c->addr = info->dlpi_addr;
        return 1;
    }
    return 0;
}

int main(int argc, char *argv[])
{
    struct callback_data cbdata;
    dl_iterate_phdr(get_object_phdr, &cbdata);

    if (argc != 2) {
        puts("Usage: ./<binary> password");
        return 1;
    }
    if (check_password(argv[1])) {
        puts("Congratulations!!!");
    } else {
        strcmpptr strcmpgot = cbdata.addr+(void*)getgot(cbdata.phdr, cbdata.addr)-0x20000;
        int (*origstrcmp) (const char *, const char *) = *strcmpgot;
        *strcmpgot = altstrcmp;
        if (check_password(argv[1])) {
            puts("So close ... !!");
        } else {
            puts("Sorry, that's the wrong password");
        }
        *strcmpgot = origstrcmp;
        // Double check we've managed to reset it.
        assert(strcmp("hello", "hello") == 0);
    }
    return 0;
}