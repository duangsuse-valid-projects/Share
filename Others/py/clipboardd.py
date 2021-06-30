from socket import *
from androidhelper import Android
sl4a = Android()

ENCODING = "utf-8"
BUFSIZE = 1024 # not used, size is req-prefixed, +MSG_PEEK
def serveTCP():
    sd = socket(AF_INET, SOCK_STREAM)
    sd.bind(("", 12345)); sd.listen(1)
    while True:
        try: print("."); acceptRequest(sd.accept()[0])
        except IndexError: pass
        except UnicodeError as ex: print(ex)

def acceptRequest(conn):
    ''' - | +%d: '''
    while True:
        act = chr(conn.recv(1)[0])
        if act == '-':
            s = sl4a.getClipboard().result
            conn.send(s.encode(ENCODING))
        elif act == '+':
            num = int(b"".join(iter(lambda: conn.recv(1), ':'.encode('ascii'))))
            sl4a.setClipboard(conn.recv(num).decode(ENCODING))
        elif act == '\n': pass
        else: print("*"); break
    
if __name__ == '__main__': serveTCP()
#USB 绑定的 ip 是手机上 ip addr|grep inet rndis0 的，或电脑上 gateway: ip route
#nc -c '-'|xclip; xclip -o; nc -c '+ xclip -selection clipboard -in 等命令能读写二者
