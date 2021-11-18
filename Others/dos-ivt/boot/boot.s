use16;org 0x7c00
ax=0
move=ax ds es ss//segment regs
sp=0x7bfe
; BIOS
ah=2;bx=0x7e00;al=24 //read 12K
ch=0;dh=0;cl=2 //diskpos CHS
int 0x13
jc err
cli//no interrupt,set systables
lgdt pgdt;lidt idt
eax=cr0; or eax,1; cr0=eax
jmp 0x8:boot // far jmp cs:

err:
si=msg
.lop:
lodsb //al=*si+=df?1:-1
or al,al;jz .die
ah=0xe;int 0x10
jmp .lop
.die:
jmp $
msg db "no disk read\0"

boot:
use32
eax=0x10
move=eax ds es ss fs gs
esp=0x7bfc
call 0x7e00 ;rustc -O --target i686-unknown-linux-gnu --crate-type lib -o $@ --emit obj -C relocation-model=static $<



idt:dw 0;dd 0 // DOS need this. ah=2; dl='c' int 0x21
pgdt:dw (gdt - gdt) + 1;dd gdt

//ah=high eax, 小端字节序，右侧字节 0xf0>>8
//内存寻址:段管理 Ring0 ，在OS空间割user Ring级还要有一次(7=nul+2+video+2+taskstate=tss/x64 项), 后固定
//lgdt带长指针。 单项 lim,base_low u16; base_mid,access,attr|fl,base_hi u8 需码位如 (u8)fl<<4 &0xF0
//access PrivL:2=内核态 00 用户态 11 ， (1+Limit)*(Fl.Gr?4K:1B)=3G
gdt:
    dq 0
    ; code entry
    dw 0xffff       ; limit 0:15
    dw 0x0000       ; base 0:15
    db 0x00         ; base 16:23
    db 0b10011010   ; access byte - code
    db 0x4f         ; flags/(limit 16:19). flag is set to 32 bit protected mode
    db 0x00         ; base 24:31
    ; data entry
    dw 0xffff       ; limit 0:15
    dw 0x0000       ; base 0:15
    db 0x00         ; base 16:23
    db 0b10010010   ; access byte - data
    db 0x4f         ; flags/(limit 16:19). flag is set to 32 bit protected mode
    db 0x00         ; base 24:31
gdt1:
times 510- ($-$$)db 0
db "\x55\xaa"

;ld -m elf_i386&cat code; qemu -drive file=os.img,if=floppy,format=raw

ENTRY(main)
OUTPUT_FORMAT(binary)
MEMORY{ram:org=0x7e00, l=12K}
SECTIONS{.=0x7e00; .text:{*(.text)} >ram
/DISCARD/:{*(.comment)} }

//https://gitlab.com/yuanhang3260/scroll/-/blob/dev/src/mem/gdt.h gdt_load.S
//https://blog.csdn.net/abc123lzf/article/details/109289567
//https://segmentfault.com/a/1190000040187304 navi
//https://github.com/Techcrafter/TAKEWAKE-Reloaded (asm bins)
