#include <Windows.h>
#include <conio.h>
//typedef struct {int x, y;} COORD;
#define _GNU_SOURCE
#include <stdio.h> //asprintf
#include <stdlib.h> //rand
#include <time.h>
#include <limits.h>

#define w 50
#define h 40
#define speed 100
const char *sNone="  ", *sBody="[]", *sFruit="()";
const int nM=w*h, nBlk=2; int *m;

HANDLE hStdout = GetStdHandle(STD_OUTPUT_HANDLE);
void printp(int p, const char* s) {
  COORD cd = {p%w*nBlk, p/w};
  SetConsoleCursorPosition(hStdout, cd);
  printf("%s", s);
}
int randP() { int pt; do { pt = rand()%nM; } while (m[pt]!=0); return pt; }
#define isZeroOr(n, x) ((n%x) == 0)

int main(void) {
  srand(time(NULL));
  m = malloc(nM);
  char* cmd; asprintf(&cmd, "mode con cols=%d lines=%d", w*nBlk, 1+h); system(cmd);
  for (int i=0; i<nM; i++) m[i] = (isZeroOr(h-1, i/w) || isZeroOr(w-1, i%w))? 1 : 0;
  int p=(h/2)*w + w/2, d=1, nLen=1, pA=randP();
  unsigned t0 = time(NULL);
  char ch; while (!kbhit() || (ch=getch()) != 'q') {
    d =
      (ch=='a')? -1 :
      (ch=='d')?+1 :
      (ch=='w')? -w :
      (ch=='s')? +w : d;
    p+=d; if (m[p]==1) break;
    m[p] = nLen+1/*decred later*/;
    if (p==pA) { nLen++; pA = randP(); continue; }
    int oldMpA = m[pA]; m[pA] = INT_MAX-1;
    for (int i=0; i<nM; i++) { m[i]--; printp(i, (m[i]<=0)? sNone : (m[p]!=INT_MAX-1-1)? sBody : sFruit); }
    m[pA] = oldMpA;
    unsigned t1 = time(NULL);
    Sleep((t1-t0)/speed); t0 = t1;
  }
}
