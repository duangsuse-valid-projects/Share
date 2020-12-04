#include <sys/socket.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <errno.h>
#include <netinet/in.h>
#include <stdbool.h>

#define DT_SERVE 1
#define N_BEST_CONN 1

static inline int notM1(int res, char* msg) {
  if (res == -1)  { fprintf(stderr, "failed when call "); perror(msg); exit(EXIT_FAILURE); }
  return res;
}
int bindOn(short port) {
  int sdBind = notM1(socket(/*domain;not AF_UNIX*/AF_INET, SOCK_STREAM, /*auto-protocol*/0), "socket");
  struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_addr.s_addr = INADDR_ANY/*all IPs*/,
    .sin_port = htons(port)/*to-network byte ord*/
  };
  notM1(bind(sdBind, (struct sockaddr*)&addr, sizeof(addr)), "bind");
  return sdBind;
}

char* growBufferAtLeast(size_t n1, char* buf, size_t* nBuf) {
  const bool isOnce = (n1 == -1);
  if (!isOnce && *nBuf >= n1) return buf;
  int n = *nBuf; do { n = (n<1024)? 4*n : 2*n; } while (!isOnce && n < n1);
  char* newBuf = realloc(buf, n); *nBuf = n;
  return newBuf;
}

static int sdBind;
void acceptOnce() { sdBind = accept(sdBind, (struct sockaddr*)/*&reqAddr*/NULL, 0); if (sdBind>0) printf("accept\n"); }
void _onExit() { printf("\nBye-bye.\n"); notM1(shutdown(sdBind, SHUT_RDWR), "socket shutdown"); }
void _exit0(int sig) { exit(0); }
// bind: '+'buf (EOF), '-' >buf
// stdio: '+'sizeof(buf)':'buf, '-' <buf '\x04'(EOT)
void serveOn(short port) {
  const size_t N = 1;
  char* bufIn; char* bufOut;
  size_t nBufIn, nBufOut, iRead, iWrite;
  printf("port %d...", port);
  //struct sockaddr_in reqAddr; memset(&reqAddr, 0, sizeof(reqAddr));
  sdBind = bindOn(port); listen(sdBind, N_BEST_CONN); 
  const char* state = "reqsign";
  char lastStdin;
  printf("bound\n");
  acceptOnce();

  bufIn = malloc(N), bufOut = malloc(N);
  nBufIn = N, nBufOut = N;
  iRead = 0, iWrite = 0;
  ssize_t nRecv, nSend; while (true) {
    nRecv = recvfrom(sdBind, bufIn+iRead, nBufIn-iRead, MSG_PEEK|MSG_WAITALL, /*reqAddr*/NULL, 0);
    if (nRecv == -1) {
      if (errno == ENOTCONN || errno == EBADF) { sleep(DT_SERVE); acceptOnce(); }
      else { perror("recvfrom"); continue; }
    }
    iRead += nRecv;
    if (state == "+buf") {
      if (nRecv == 0) { fprintf(stdout, "+%d:", iRead+1); fwrite(bufIn, sizeof(char), iRead+1, stdout); iRead = 0; acceptOnce(); }
      else if ((nBufIn-iRead) == 0) { bufIn = growBufferAtLeast(-1, bufIn, &nBufIn); printf("%s", bufIn); }
    }
    else if (state == "reqsign") {
      if (nRecv == 0) { continue; }
      char fst = bufIn[0];
      if (fst == '+') { state = "+buf"; }
      else if (fst == '-') {
        while ((lastStdin = getc(stdin)) != '\x04') {
          bufOut = growBufferAtLeast(iWrite+1, bufOut, &nBufOut); bufOut[iWrite] = lastStdin; iWrite++;
        }
        nSend = sendto(sdBind, bufOut, iWrite+1, MSG_CONFIRM, /*reqAddr*/NULL, 0);
        iWrite = 0;
        if (nSend == -1) { perror("sendto"); continue; }
      }
    }
  }
  free(bufIn); free(bufOut);
}
int main(int argc, char** argv) {
  ++argv, --argc;
  if (argc > 1) { return 1; }
  signal(SIGINT, _exit0); signal(SIGQUIT, _exit0);
  notM1(atexit(_onExit), "atexit");
  serveOn((argc == 1)? atoi(argv[0]) : 12345);
  return 0;
}
