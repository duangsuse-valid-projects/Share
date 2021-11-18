;BIOS-signal kbdque int 9<-#60h, poll ah=0 int 16 fl.I=1
;9 ringbuffer i=0,n=15 ;https://blog.csdn.net/ZCMUCZX/article/details/80462394
a:
mov ah,0
int 16h
cmp al,'r'
je red
jmp sret


red:mov ah,4h
green: ;use shl?
blue:
mov bx,0xb800 ;span0
mov es,bx
mov bx,1
mov cx,2000
s:and byte [es:bx],0xf8
or [es:bx],ah
add bx,2
loop s;cx
sret:
mov ax,4c00h
int 21h
