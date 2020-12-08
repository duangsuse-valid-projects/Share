#include <sys/socket.h>
#include <netinet/in.h>

#include <stdlib.h> //malloc,realloc
#include <errno.h> //errno,perror
#include <stdio.h> //getc,fprintf,fwrite
#include <signal.h> //signal,SIGINT,SIGQUIT

#define notM1(res, callee) _notM1(res, __FUNC__, callee)
static inline int _notM1(int res, char* func, char* callee) {
  if (res == -1) { fprintf(stderr, "failed in %s(), call to ", func); perror(callee)/*callee: strerror*/; }
}

typedef struct {
  char* ptr; size_t size;
} Buffer;
void bufferNew(Buffer* buf, size_t size) { buf->size = size; buf->ptr = malloc(size); }
void bufferFree(Buffer* bufs, ...) {
  va_list ap;
  va_start(ap, bufs);
  while (bufs !=  NULL) { free(bufs->ptr); bufs = va_arg(ap, Buffer*); }
  va_end(ap);
}

#define N_BEST_CONN 1
#define REALLOC_GROW(n) (n*2)
