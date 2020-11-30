#include <curses.h>
#include <unistd.h> //usleep
#include <stdlib.h> //malloc,rand
#include <time.h> //time

int w, h, nM, nBlk;
typedef int* map2D;
map2D m, que;
int p, iHead=0, iTail=0;
useconds_t delayUsec;
void init(int m_w, int m_h, int dt) {
  w=m_w; h=m_h;
  nM = w*h; delayUsec = dt*1000;
  map2D* maps[] = {&m, &que};
  for (int i=0; i<2; i++) *maps[i] = malloc(sizeof(int)*nM);
}

const int
  NO_WALLS=0x1,
  NO_LENDEC=0x2,
  USE_TRANSWALL = 0x4,
  USE_AI_L2=0x8;

#define inlined static inline
inlined int pYX(int y, int x) { return y*w+x; }
inlined void yxP(int p, int* y, int* x) { *y=p/w, *x=p%w; }
inlined int cycledInc(int* p) { *p = (*p+1) % nM; return *p; }
bool isZeroOr(int n, int x) { return (x % n) == 0; }

int curUse(int op(WINDOW*, bool)) { return op(stdscr, true); }
void putWall() {
  int y, x;
  for (int i=0; i<nM; i++) { yxP(i, &y, &x); m[i] = (isZeroOr(w-1, x) || isZeroOr(h-1, y))? 3 : 0; }
}
void putCell() {
  que[cycledInc(&iHead)] = p; m[p] = 1;
}
void putFruit() {
  int pA; do { pA = rand()%nM; } while (m[pA] != 0);
  m[pA] = 2;
}
#define handleDirNeg(dv, keyP, keyN) \
  else if (ch == keyP && d != dv) d = -dv; \
  else if (ch == keyN && d != -dv) d = dv;
typedef char* mutCstr;
typedef const char* cstr;
void game(cstr style[], int flags) {
  noecho(); curUse(nodelay); curUse(keypad);
  iHead=0, iTail=0;
  int ch, y, x, d=1;
  if (!(flags&NO_WALLS)) putWall();
  bool noDec = (flags&NO_LENDEC), useTWall = (flags&USE_TRANSWALL);
  putFruit();
  p = pYX(h/2, w/2); putCell();
  while ((ch = getch()) != 'q') {
    if (ch == ERR) {}
    handleDirNeg(w, KEY_UP, KEY_DOWN)
    handleDirNeg(1, KEY_LEFT, KEY_RIGHT)
    p += d; // input done.
    if (m[p] == 1) { break; } // die eat self
    if (m[p] == 3) {
      if (!useTWall) { break; } // die on wall
      yxP(p, &y,&x);
      int hm=h-1, wm=w-1;
      if (isZeroOr(hm, y)) p=pYX((y==0)? hm-1 : 1,x);
      else if (isZeroOr(wm, x)) p=pYX(y,(x==0)? wm-1 : 1);
    }
    if (m[p] == 2) { putFruit(); }
    else/*=0*/ { if (!noDec) m[que[cycledInc(&iTail)]] = 0; }
    putCell();
    for (int i=0; i<nM; i++) { yxP(i, &y,&x); mvprintw(y, x*nBlk, style[m[i]]); }
    refresh();
    usleep(delayUsec);
  } //^ main loop
}
#include <string.h>
#include <locale.h>
int ienvOr(int n, mutCstr name) {
  cstr res = getenv(name);
  if (res == NULL) return n;
  mutCstr ptrEnd;
  int parsed = strtol(res, &ptrEnd, 10);
  return (ptrEnd != res)?  parsed : n;
}
cstr envOr(cstr s, mutCstr name) {
  cstr res = getenv(name);
  return (res != NULL)? res : s;
}
void envBool(int* flags, mutCstr name, int flag) {
  cstr res = getenv(name);
  bool use = (res != NULL)? (strcmp(res, "no") != 0) : false;
  if (use) *flags = *flags | flag;
}
int main(void) {
  setlocale(LC_ALL, ""); //non-ISO chars
  srand(time(NULL));
  cstr deftStyle[] = {envOr("  ", "sNone"), envOr("[]", "sBody"), envOr("()", "sFruit"), envOr("{}", "sWall")};
  nBlk = strlen(deftStyle[0]);
  initscr(); curs_set(0/*invisible*/);
  int fl = 0; envBool(&fl, "noWalls", NO_WALLS); envBool(&fl, "useAI2", USE_AI_L2);
  envBool(&fl, "noDecSnake", NO_LENDEC); envBool(&fl, "useTranspWall", USE_TRANSWALL);
  init(ienvOr(30, "ncol"), ienvOr(24, "nrow"), ienvOr(100, "dt_ms")); game(deftStyle, fl);
  nodelay(stdscr, false); getch();
  return endwin();
}
