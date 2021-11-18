;https://blog.csdn.net/false_mask/article/details/83212180
DA_DR		EQU	90h	; 存在的只读数据段类型值
DA_DRW		EQU	92h	; 存在的可读写数据段属性值
DA_DRWA		EQU	93h	; 存在的已访问可读写数据段类型值
DA_C		EQU	98h	; 存在的只执行代码段属性值
DA_CR		EQU	9Ah	; 存在的可执行可读代码段属性值
DA_CCO		EQU	9Ch	; 存在的只执行一致代码段属性值
DA_CCOR		EQU	9Eh	; 存在的可执行可读一致代码段属性值
DA_32 equ 0b100
; 宏 ------------------------------------------------------------------------------------------------------
;
; 描述符
; usage: Descriptor Base, Limit, Attr
;        Base:  dd
;        Limit: dd (low 20 bits available)
;        Attr:  dw (lower 4 bits of higher byte are always 0)
%macro Descriptor 3
	dw	%2 & 0FFFFh				; 段界限 1				(2 字节)
	dw	%1 & 0FFFFh				; 段基址 1				(2 字节)
	db	(%1 >> 16) & 0FFh			; 段基址 2				(1 字节)
	dw	((%2 >> 8) & 0F00h) | (%3 & 0F0FFh)	; 属性 1 + 段界限 2 + 属性 2		(2 字节)
	db	(%1 >> 24) & 0FFh			; 段基址 3				(1 字节)
%endmacro


org 0x7C00
jmp _main_16

[SECTION .gdt]
DESC_GDT: Descriptor 0, 0, 0   ;该描述符仅用来计算下面三个描述符的地址
DESC_VIDEO: Descriptor 0xB8000, 0xFFFF, DA_DRW
DESC_DATA: Descriptor 0, STRING_LEN - 1, DA_DR
DESC_CODE: Descriptor 0, CODE32_LEN - 1, DA_C; + DA_32

GdtLen equ $ - DESC_GDT
GdtPtr dw GdtLen
       dd 0

DataSelector equ DESC_DATA - DESC_GDT
CodeSelector equ DESC_CODE - DESC_GDT
VideoSelector equ DESC_VIDEO - DESC_GDT

[SECTION .s16]
[BITS 16]
_main_16:
	; 初始化DS/ES/SS/SP寄存器
	mov ax, cs
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov sp, 0x7C00
 	; 初始化段描述符
	call near _init_desc

	; 初始化GDT基址
	xor eax, eax
    mov ax, ds
    shl eax, 4
    add eax, DESC_GDT
    mov dword [GdtPtr + 2], eax

	lgdt [GdtPtr]

	cli
	in al, 0x92
    or al, 00000010b
    out 0x92, al

	mov eax, cr0
	or eax, 1
	mov cr0, eax
	; 跳转到代码段
	jmp dword CodeSelector:0

_init_desc:
	xor eax, eax
	mov ax, cs
	shl eax, 4
	add eax, _main_32

	mov di, DESC_CODE
	call near _init_desc_base_address

	xor eax, eax
	mov ax, cs
	shl eax, 4
	add eax, STRING

	mov di, DESC_DATA
	call near _init_desc_base_address
	ret


_init_desc_base_address:
	mov word [di + 2], ax
	shr eax, 16
	mov byte [di + 4], al
    mov byte [di + 7], ah
	ret

[SECTION .s32]
[BITS 32]
_main_32:
    mov ax, VideoSelector
    mov gs, ax
    mov esi, 0xA0

    mov ax, DataSelector
    mov ds, ax
    mov edi, 0

    mov ecx, STRING_LEN

    print_loop:
        mov al, ds:[edi]
        mov ah, 0xC
        mov word gs:[esi], ax
        add esi, 2
        inc edi
        loop print_loop

    jmp $

CODE32_LEN equ $ - _main_32

[SECTION .s32]
[BITS 32]
STRING: db 'Hello, world'
STRING_LEN equ $ - STRING

; dd if=hel of=boot.img bs=512 count=1;dd if=/dev/zero of=/tmp/empty.img bs=512 count=2880;dd if=/tmp/empty.img of=boot.img skip=1 seek=1 bs=512 count=2879
