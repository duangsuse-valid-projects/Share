#include <curses.h>
#include <unistd.h> //usleep
#include <stdlib.h> //malloc,rand
#include <time.h> //time
#include <string.h>

bool isZeroOr(int n, int x) { return (x % n) == 0; }
char** reallocStrsFirstCharTest(bool (*p)(char), int argc, char** argv) {
  size_t sz = sizeof(char*) * argc;
  char** buf = malloc(sz);
  memcpy(buf, argv, sz);
  for (int i=0; i<argc; i++) {
    if (!p(buf[i][0])) { continue; }
    buf[i] = malloc(strlen(argv[i])+1); strcpy(buf[i], argv[i]);
  }
  return buf;
}
int coerceInbounds(int first, int last, int n) {
  return (n < first)? first : (n > last)? last : n;
}
void swapInt(int* a, int* b) {
  int oldA=*a; *a=*b; *b=oldA;
}

const int
  NO_WALLS=0x1,
  NO_LENDEC=0x2,
  USE_TRANSWALL = 0x4,
  USE_AI_L2=0x8,
  NO_RESET=0x10;
const int SNK_AI = 0x1;
const int ARY_FLAG[] = {-1, 0x1, 0x2, 0x4, 0x8, 0x10, -1, -1};
char* TEXT_MENU_PAUSE[] = {"resume game", "-walls (require reset&bug)",
  "-len decrement", "+transport wall", "+AI level 2", "+no reset",
  "one more fruit", "reverse snake", "add AI player"};
const int nTextMenuPause = 9;

bool isPosNegSign(char c) {  return c=='+' || c=='-'; }
// Game object
int w, h, nM, nBlk, dCycle=1;
typedef int* map2D;
typedef struct SnakeST {
  map2D cells; int iHead, iTail;
  int p, d; int flags;
  struct SnakeST* prev;
}* Snake;
map2D m;
useconds_t delayUsec;

Snake snakez = NULL;
void snakeInit(Snake self) {
  self->iHead = 0, self->iTail = 0;
  self->d = 1;
  self->cells = malloc(sizeof(int)*nM);
}
void snakeAdd(Snake self) {
  self->prev = snakez; snakez = self;
}
void snakeFree(Snake self) { free(self->cells); }

char** textMenuPause; // mutable
void init(int m_w, int m_h, int dt) {
  w=m_w; h=m_h;
  nM = w*h; delayUsec = dt*1000;
  m = malloc(sizeof(int)*nM);
  textMenuPause = reallocStrsFirstCharTest(isPosNegSign, nTextMenuPause, TEXT_MENU_PAUSE);
}

#define inlined static inline
inlined int pYX(int y, int x) { return y*w+x; }
inlined void yxP(int p, int* y, int* x) { *y=p/w, *x=p%w; }
inlined int cycledInc(int* p) { *p = (*p==-1)? nM-1 : (*p+dCycle) % nM; return *p; }

int dialogAskChoose(char* title, int argc, char** argv, int pad) {
  int hh=h/2, hw=w*nBlk/2;
  WINDOW* wMenu = newwin(hh, hw, hh-hh/2, hw-hw/2);
  int highlight = 0;
  keypad(wMenu, true);
  mvwprintw(wMenu, 0, 0, title); wrefresh(wMenu);
  int y=pad;
  int ch; while ((ch = wgetch(wMenu)) != '\n') {
    highlight += (ch==KEY_UP)? -1 : (ch==KEY_DOWN)? +1 : 0;
    highlight = coerceInbounds(0, argc -1, highlight);
    box(wMenu, 0, 0);
    for (int i=0; i<argc; i++) {
      wattron(wMenu, (highlight == i)? A_REVERSE : 0);
      mvwprintw(wMenu, y, pad, "%s", argv[i]); wattroff(wMenu, A_REVERSE);
      y++;
    }
	wrefresh(wMenu);
    y = pad;
  }
  endwin();
  return highlight;
}
int curUse(int op(WINDOW*, bool)) { return op(stdscr, true); }

void putWall() {
  int y, x;
  for (int i=0; i<nM; i++) { yxP(i, &y, &x); m[i] = (isZeroOr(w-1, x) || isZeroOr(h-1, y))? 3 : 0; }
}
void putCell(Snake snk) {
  snk->cells[cycledInc(&snk->iHead)] = snk->p; m[snk->p] = 1;
}
int randP() { int pA; do { pA = rand()%nM; } while (m[pA] != 0); return pA; }
void putFruit() { m[randP()] = 2; }
#define handleDirNeg(dv, keyP, keyN) \
  else if (ch == keyP && snk->d != dv) snk->d = -dv; \
  else if (ch == keyN && snk->d != -dv) snk->d = dv;
typedef enum { updOk=0, updRegame, updDie } UpdateRes;
typedef char* mutCstr;
typedef const char* cstr;
int /*act*/no=0; //bad, no idea to refactor in C99.
inlined UpdateRes handleUpdate(int ch, int* flags, Snake snk) {
  int y, x;
  bool noDec=(*flags&NO_LENDEC), useTWall=(*flags&USE_TRANSWALL);
  if (ch == ERR) {}
  handleDirNeg(w, KEY_UP, KEY_DOWN)
  handleDirNeg(1, KEY_LEFT, KEY_RIGHT)
  else if (ch == 'p') {
    no = dialogAskChoose("Paused", nTextMenuPause, textMenuPause, 2);
rehandle:
    if (no == 0) return updOk;
    else if (no == 6) {
      putFruit(); if (!(*flags&NO_RESET)) { no = 5/*no-reset*/; goto rehandle; } 
    } else if (no == 7) {
      swapInt(&snk->iHead, &snk->iTail); snk->d = -snk->d; dCycle = -dCycle;
      snk->iHead-=dCycle;snk->iTail-=dCycle;
      snk->p+=snk->d*abs(snk->iTail-snk->iHead); return updOk; // NOTE: not tested
    } else if (no == 8) {
      Snake snk1 = malloc(sizeof(struct SnakeST));
      snk->p = randP(); snk->flags = SNK_AI;
      snakeInit(snk1); snakeAdd(snk1);
      putCell(snk1);
      return updOk;
    } else {
      *flags = *flags ^ ARY_FLAG[no]; // switcher.
      char* ptrT = textMenuPause[no];
      ptrT[0] = (ptrT[0] == '+')? '-'  : '+';
    }
    if (*flags&NO_WALLS) memset(m, 0, sizeof(int)*nM);
    return updRegame;
  } else if (ch == KEY_F(2)) { goto rehandle; }
  snk->p += snk->d; // input done.
  if (m[snk->p] == 1) { return updDie; } // die eat self
  if (m[snk->p] == 3) {
    if (!useTWall) { return updDie; } // die on wall
    yxP(snk->p, &y,&x);
    int hm=h-1, wm=w-1;
    if (isZeroOr(hm, y)) snk->p=pYX((y==0)? hm-1 : 1,x);
    else if (isZeroOr(wm, x)) snk->p=pYX(y,(x==0)? wm-1 : 1);
  }
  if (m[snk->p] == 2) { putFruit(); }
  else/*=0*/ { if (!noDec) m[snk->cells[cycledInc(&snk->iTail)]] = 0; }
  putCell(snk);
  return updOk;
}
#define MESG_ROUND_N 8
#define setMessage(m) message = m; dtMessage = MESG_ROUND_N
void game(cstr style[], int flags) {
  noecho(); curUse(nodelay); curUse(keypad); cbreak();
  struct SnakeST msnk;
  snakeInit(&msnk); snakeAdd(&msnk);
  Snake snk = snakez;
  int ch, y,x;
  cstr message=NULL; int dtMessage = 0;
regame:
  if (!(flags&NO_RESET)) {
    if (!(flags&NO_WALLS)) putWall();
    putFruit();
    msnk.p = pYX(h/2, w/2); putCell(&msnk);
  }
  while ((ch = getch()) != 'q') {
    do {
      UpdateRes res = handleUpdate(ch, &flags, snk);
      if (res == updRegame) goto regame;
      else if (res == updDie) {
        if (snk == &msnk) goto gameover;
        setMessage("A snake just died");
        do { m[snk->cells[cycledInc(&snk->iTail)]] = 0; } while (snk->iTail != snk->iHead);
        snk->p = randP(); //respawn
      }
    } while ((snk = snk->prev) != NULL);
    snk = snakez;
    for (int i=0; i<nM; i++) { yxP(i, &y,&x); mvprintw(y, x*nBlk, style[m[i]]); }
    if (message != NULL) { mvprintw(w/3, h-h/4, "%s", message); }
    if (dtMessage == 0) { message = NULL; } else { dtMessage--; }
    refresh();
    usleep(delayUsec);
  } //^ main loop
gameover:
  snk = snakez; do { snakeFree(snk); } while ((snk = snk->prev) != NULL);
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
  init(ienvOr(30, "ncol"), ienvOr(35, "nrow"), ienvOr(100, "dt_ms")); game(deftStyle, fl);
  nodelay(stdscr, false); getch();
  return endwin();
}
