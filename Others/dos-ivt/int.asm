bits 16
.data
Msg:db "Helllo\0"
.code
mov ah,2
mov dl,'C' ;putc
int 21h
movzx   cx, ds:[80h]    ; size of parameter string
        mov     ah, 40h                 ; write
        mov     bx, 1                   ; ... to standard output
        mov     dx, 81h                 ; ... argv string
        int     21h                     ; ... by calling DOS
;mov ax,https://zhuanlan.zhihu.com/p/147696502 data
;https://blog.csdn.net/jadeshu/article/details/89159196 NASM
;http://arthurchiao.art/blog/x86-asm-guide-zh/
;https://blog.csdn.net/richievoe/article/details/39121653 x86masm
mov ax,[ds:0] ;为啥需要 data 节地址.. 首项的不就行 草
mov ds,ax ;no assume ds:data ..dsend
lea dx,Msg ; load offset
mov ah,9
int 21h
        mov     ah, 4ch;exit, not ABORT
        int     21h


	mov 	ax, strHello                      ; es:bp指向要显示的字符串
	mov 	bp, ax
	mov 	ah, 0x13                          ; ah为0x13,调用13号中断
	mov 	bl, 0x0A                           ;  绿色
	mov 	cx, nHelo

	int 	10h                               ; BIOS 10H中断

	mov		ax, 4c00h ;;ah=4c
strHello		db		'hello, world'
nHelo equ		$ - strHello


kbdval db 0x60
pic db 0x20
sys db 0x21
DOS_displaychar db 0x02 ;STD_CON_OUT tail https://github.com/Microsoft/MS-DOS/blob/master/v2.0/source/SYSCALL.txt#L1543
ivt_kbd db 4*9


_entry:
  mov ah,4ch
  int sys
  cli
  mov word [ivt_kbd], kbdInt
  mov word [ivt_kbd+2], 0
  sti

  mov al, 'D'
  call putc_al
  mov al, 'o'
  call putc_al
  mov al, 'n'; call putc_al
  mov al, 'e'; call putc_al

;https://cs.lmu.edu/~ray/notes/x86assembly/
mainloop:
  hlt ; wait next interrupt
  jmp mainloop

kbdInt:
  push eax
  in al, kbdval ;端口60hex
  call putc_al

  mov al, pic
  out pic, al ;写端口. 原因忘了

  pop eax
  iret

putc_al:
  mov ah, DOS_displaychar
  mov dl, al
  int sys
  ret
