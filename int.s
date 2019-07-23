bits 16

kbdval db 0x60
pic db 0x20
sys db 0x21
DOS_displaychar db 0x02
ivt_kbd db 9*4

_entry:
  cli
  mov word [ivt_kbd], kbdInt
  mov word [ivt_kbd+2], 0
  sti

  mov al, 'D'; call putc_al
  mov al, 'o'; call putc_al
  mov al, 'n'; call putc_al
  mov al, 'e'; call putc_al

mainloop:
  hlt ; wait next interrupt
  jmp mainloop

kbdInt:
  push eax
  in al, kbdval
  call putc_al

  mov al, pic
  out pic, al

  pop eax
  iret

putc_al:
  mov ah, DOS_displaychar
  mov dl, al
  call sys
  ret
