#define <Windows.h>
#define <conio.h>

#define _GNU_SOURCE
#include <stdio.h> //asprintf
#include <time.h>
#ifdef USE_VEC
#  include <vector>
#else
#  include <queue>
#endif
// by GitHub: duangsuse

HANDLE hStdout = GetStdHandle(STD_OUTPUT_HANDLE);
void gotoYX(int y, int x) {
  COORD cd = {x, y};
  SetConsoleCursorPosition(hStdout, cd);
}

#define w 50
#define h 40
#define speed 100
enum Cell { cNone=0, cBody, cFruit };
const int nM = (w*h); Cell m[nM] = {cNone};

#ifdef USE_VEC
std::vector<int> que;
#else
std::queue<int> que;
#endif
const char* style[3] = {"  ", "[]", "()"}; int nBlk=2;

bool isZeroOr(int n, int x) { return (x%n) == 0; }
int randP() { int pt; do { pt = rand()%nM; } while (m[pt]!=0); return pt; }
void printp(int p, const char* s) { gotoYX(p/w, p%w*nBlk); printf("%s", s); }

#ifdef USE_VEC
void queSnakeCell(int p) { m[p] = cBody; que.insert(que.begin(), p); }
#else
void queSnakeCell(int p) { m[p] = cBody; que.push(p); }
#endif
void showCell(int p) { printp(p, style[(int)m[p]]); }
#define handle(k, dv) (ch==k&&d!=-(dv))? dv
#define forCells(vI) for (int vI=0; vI<nM; vI++)
int main(void) {
  srand(time(NULL));
  char* cmd; asprintf(&cmd, "mode con cols=%d lines=%d", w*nBlk, 1+h); system(cmd);
  forCells(i) m[i] = (isZeroOr(h-1, i/w) || isZeroOr(w-1, i%w))? cBody : cNone;
  int p=(h/2)*w + w/2, d=1;
  unsigned t0 = time(NULL);
  queSnakeCell(p);
  m[randP()] = cFruit;
  char ch; while (!kbhit() || (ch=getch()) != 'q') {
    d =
      handle('a', -1) :
      handle('d', +1) :
      handle('w', -w) :
      handle('s', +w) : d;
    p+=d; if (m[p]==cBody) break;
    else if (m[p]==cFruit) { m[randP()] = cFruit; queSnakeCell(p); continue; }
#ifdef USE_VEC
    m[que.back()] = cNone; que.pop_back();
#else
    m[que.front()] = cNone; que.pop();
#endif
    forCells(i) showCell(i);
    unsigned t1 = time(NULL);
    Sleep((t1-t0)/speed); t0 = t1;
  }
  return 0;
}
