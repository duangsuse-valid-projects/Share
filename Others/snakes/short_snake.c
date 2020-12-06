#include <curses.h> //mvprintw
#include <stdlib.h> //malloc,rand
#include <unistd.h> //usleep
#include <time.h> //time
#include <string.h> //realloc,memcpy

// comparing to pt_snake, this one have no Time.delta-based speed, and no printYX(p, s)
// it makes use of ncurses mvprintw(y, x, s)
// but, this one has a pause menu to switch game/snake flags, with dynamic item text.
#define KEY_PAUSE 'p'
#define KEY_QUIT 'q'
#define DIV_PAD_MESSAGE 4
#define PAD_MENU 2
#define inlined static inline

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
void freeStrsFirstCharTest(bool (*p)(char), int argc, char** argv) {
  for (int i=0; i<argc; i++) if (p(argv[i][0])) free(argv[i]);
}

int coerceInbounds(int first, int last, int n) {
  return (n < first)? first : (n > last)? last : n;
}
inlined void swapInt(int* a, int* b) {
  int oldA=*a; *a=*b; *b=oldA;
}
inlined bool isZeroOr(int n, int x) { return (x % n) == 0; }

typedef char* mutCstr;
typedef const char* cstr;
int asprintf(char **strp, const char *fmt, ...); //stdio.h

const int
  NO_WALLS=0x1,
  USE_AI_L2=0x10,
  NO_RESET=0x20,
  USE_DELAY=0x40;
const int SNK_PAUSE=0x1, SNK_AI=0x2, SNK_NO_LENDEC=0x4, SNK_TRANSWALL=0x8;
const int ARY_FLAG[] = {-1, 0x20, 0x4, 0x8, 0x1, 0x1, /*1more,rev*/-1, -1, 0x10, -1, -1, -1, -1};
char* TEXT_MENU_PAUSE[] = {"|> resume game", "+no reset",
  "-?len decrement", "+?transport wall", "+?pause snake", "-walls (adds reset&bug)",
  "one more fruit", "reverse snake", "+AI level 2", "add AI player", "add Human player", "switch delay", "view next..."};
const int nTextMenuPause = sizeof(TEXT_MENU_PAUSE)/sizeof(char*);

bool isPosNegSign(char c) {  return c=='+' || c=='-'; }
// Game object
int w, h, nM, nBlk;
typedef int* map2D;
typedef struct SnakeST {
  map2D cells; int iHead, iTail, dCycle; // snake body FIFO queue
  int p, d; int flags, nLifes; // pos, "dir"ection, state...
  char* name;
  struct SnakeST* prev;
}* Snake;
map2D m; Snake snakez = NULL;
useconds_t delayUsec;

inlined int pYX(int y, int x) { return y*w+x; } // axis representation.
inlined void yxP(int p, int* y, int* x) { *y=p/w, *x=p%w; }
inlined int cycledInc(int* p, int dCycle) { *p = (*p==0&&dCycle==-1)? nM-1 : (*p+dCycle) % nM; return *p; }

int nSnakeLifes, nAISnake;
void snakeInit(Snake self) {
  self->iHead = 0, self->iTail = 0, self->dCycle = 1;
  self->d = 1; self->flags = 0; self->nLifes = nSnakeLifes;
  self->cells = malloc(sizeof(int)*nM);
}
void snakeFree(Snake self) { free(self->name); free(self->cells); }

char** textMenuPause; // mutable
void init(int m_w, int m_h, int dt) {
  w=m_w; h=m_h;
  nM = w*h; delayUsec = dt*1000;
  m = malloc(sizeof(int)*nM);
  textMenuPause = reallocStrsFirstCharTest(isPosNegSign, nTextMenuPause, TEXT_MENU_PAUSE);
  nAISnake = 0;
}

int dialogAskChoose(char* title, int argc, char** argv, int pad) {
  int hh=h/2, hw=w*nBlk/2;
  WINDOW* wMenu = newwin(hh, hw, hh-hh/2, hw-hw/2);
  int highlight = 0;
  keypad(wMenu, true);
  mvwprintw(wMenu, 0, 0, title); wrefresh(wMenu); //title
  int y=pad;
  int ch; while ((ch = wgetch(wMenu)) != '\n') {
    highlight += (ch==KEY_UP)? -1 : (ch==KEY_DOWN)? +1 : 0;
    highlight = coerceInbounds(0, argc -1, highlight);
    box(wMenu, 0, 0);
    for (int i=0; i<argc; i++) {
      wattron(wMenu, (highlight == i)? A_REVERSE : 0);
      mvwprintw(wMenu, y, pad, "%s", argv[i]); wattroff(wMenu, A_REVERSE); // repaint highlight&all
      y++;
    }
    wrefresh(wMenu);
    y = pad;
  }
  endwin();
  return highlight;
}
int curUse(int op(WINDOW*, bool)) { return op(stdscr, true); }

inlined int snakePtrInc(Snake self, int position)/*cyclic ring buffer*/ { return cycledInc((position==0)? &self->iHead : &self->iTail, self->dCycle); }
int snakeLen(Snake self) { return (self->iTail - self->iHead)*self->dCycle; }
inlined bool snakeIsEmpty(Snake self) { return self->iTail == self->iHead; }

int randP() { int pA; do { pA = rand()%nM; } while (m[pA] != 0); return pA; }
int dirPCmp(int p0, int p1) { // how can p1 reach p0?
  int d = p0 - p1;
  if (abs(d) == 1) return d;
  else return (d < 0)?  -w : w; // NOTE: not tested
}
void putWall() {
  int y, x;
  for (int i=0; i<nM; i++) { yxP(i, &y, &x); m[i] = (isZeroOr(w-1, x) || isZeroOr(h-1, y))? 3 : 0; }
}
void putFruit() { m[randP()] = 2; }
inlined void putCell(Snake snk) {
  snk->cells[snakePtrInc(snk, 0)] = snk->p; m[snk->p] = 1;
}
inlined void snakeDec(Snake self) {
  m[self->cells[snakePtrInc(self, 1)]] = 0;
}
void snakeAdd(Snake self) {
  self->prev = snakez; snakez = self;
  putCell(self); // initinal len=0, or m[cells[iTail/*]==0*/]
}

#define handleDirNeg(dv, keyP, keyN) \
  else if (ch == keyP && snk->d != dv) snk->d = -dv; \
  else if (ch == keyN && snk->d != -dv) snk->d = dv;
typedef enum { updOk=0, updRegame, updDie } UpdateRes;
int /*act*/act=0; //bad, no idea to refactor in C99.
inlined UpdateRes handleUpdate(int ch, int* flags, Snake snk) {
  int y, x;
  bool noDec=(snk->flags&SNK_NO_LENDEC), useTWall=(snk->flags&SNK_TRANSWALL);
  if (ch == ERR) {}
  handleDirNeg(w, KEY_UP, KEY_DOWN)
  handleDirNeg(1, KEY_LEFT, KEY_RIGHT)
  else if (ch == KEY_PAUSE) {
    char* sTitle; Snake snk1; // add-player
retoast:
    for (int i=0; i<nTextMenuPause; i++) { // snake menu optoins
      char* ptrT = textMenuPause[i];
      if (ptrT[1] != '?') continue;
      bool pd/*isActive*/ = (snk->flags&ARY_FLAG[i]);
      ptrT[0] = ((TEXT_MENU_PAUSE[i][0] == '-')? !pd : pd)? '-' : '+';
    }
    asprintf(&sTitle, "Paused on \"%s\" (%d) ;0x%x", snk->name, snk->nLifes, snk->flags);
    act = dialogAskChoose(sTitle, nTextMenuPause, textMenuPause, PAD_MENU);
    free(sTitle);
rehandle:
    if (act == 0) return updOk;
    else if (ARY_FLAG[act] == -1) switch (act) { // menu actions
    case 6:
      putFruit(); if (!(*flags&NO_RESET)) { act = 1/*no-reset*/; goto rehandle; } 
      break;
    case 7:
      snk->p = snk->cells[snakePtrInc(snk, 1)];
      int negD = (snakeLen(snk) == 1)?  -snk->d : dirPCmp(snk->p, snk->cells[snk->iTail+snk->dCycle/*newP*/]);
      putCell(snk); snk->d = negD;
      swapInt(&snk->iHead, &snk->iTail); snk->dCycle = -snk->dCycle;
      return updOk; // NOTE: not tested
    case 9:
      snk1 = malloc(sizeof(struct SnakeST));
      snakeInit(snk1);
      snk1->p = randP(); snk1->flags |= SNK_AI;
      nAISnake++;
      char* sName; asprintf(&sName, "AI#%d", nAISnake);
      snk1->name = sName;
      snakeAdd(snk1);
      return updRegame;
    case 10:
      return updOk;
    case 11:
      *flags ^= USE_DELAY;
      nodelay(stdscr, !(*flags&USE_DELAY));
      return updOk;
    case 12:
      snk = (snk->prev != NULL)? snk->prev : snakez;
      goto retoast;
    } else {
      char* ptrT = textMenuPause[act]; // switcher.
      int fl = ARY_FLAG[act];
      int oldFlags = snk->flags;
      if (ptrT[1] == '?') { snk->flags ^= fl; }
      else { *flags = *flags ^ fl; ptrT[0] = (ptrT[0] == '+')? '-'  : '+'; }
      if (*flags&NO_WALLS) memset(m, 0, sizeof(int)*nM); //v flag on-update
      if ((oldFlags&SNK_PAUSE) && (snk->flags&~SNK_PAUSE) && snakeIsEmpty(snk)) { snk->p = randP(); putCell(snk); } // relive logic
    }
    return updRegame;
  } else if (ch == KEY_F(2)) { goto rehandle; } //key 'p'
  snk->p += snk->d; // input done.
  if (m[snk->p] == 1) { return updDie; } // die eat self
  if (m[snk->p] == 3) {
    if (!useTWall) { return updDie; } // die on wall
    yxP(snk->p, &y,&x);
    int hm=h-1, wm=w-1;
    if (isZeroOr(hm, y)) snk->p=pYX((y==0)? hm-1 : 1, x);
    else if (isZeroOr(wm, x)) snk->p=pYX(y, (x==0)? wm-1 : 1);
  }
  if (m[snk->p] == 2) { putFruit(); }
  else/*=0*/ { if (!noDec) snakeDec(snk); }
  putCell(snk);
  return updOk;
}
#undef handleDirNeg

cstr envOr(cstr s, mutCstr name) {
  cstr res = getenv(name);
  return (res != NULL)? res : s;
}
int ienvOr(int n, mutCstr name) {
  cstr res = getenv(name);
  if (res == NULL) return n;
  mutCstr ptrEnd;
  int parsed = strtol(res, &ptrEnd, 10);
  return (ptrEnd != res)?  parsed : n;
}

#define NO_MORE (nUpdated == 0 && snk->prev == NULL)
#define freeMsg() if (message != NULL) free(message)
void game(cstr style[], int flags) {
  noecho(); curUse(nodelay); curUse(keypad); cbreak(); 
  int ntMessage = ienvOr(24, "ntMessage");
  char* message=NULL; int dtMessage = ntMessage;
  int pMid = pYX(h/2, w/2);
  struct SnakeST msnk;
  msnk.p = pMid;
  char* sName; asprintf(&sName, "%s", envOr("Python", "mainSnakeName"));
  msnk.name = sName;
  snakeInit(&msnk); snakeAdd(&msnk); // let me clarify: Python is NOT a snake!
  Snake snk = snakez;
  int ch, y,x, nUpdated;
regame:
  if (!(flags&NO_RESET)) {
    if (!(flags&NO_WALLS)) putWall();
    putFruit();
    msnk.p = pMid;
  }
  while ((ch = getch()) != KEY_QUIT) {
    UpdateRes res; nUpdated = 0;
    do { // snakes update loop
      if (!(snk->flags&SNK_PAUSE)) {
        res = handleUpdate(ch, &flags, snk); nUpdated++;
        if (ch == KEY_PAUSE) ch = ' '/*ignore 'p' for rest*/;
      } else if (NO_MORE) {
        if (snk == &msnk && msnk.nLifes != 0) { msnk.flags &= ~SNK_PAUSE; freeMsg(); asprintf(&message, "main snake %s reentered", msnk.name); } // auto resume logic
        else goto gameover;
      } else { res = updOk; }
      if (res == updRegame) goto regame; //<v handle one snake upd res
      else if (res == updDie) {
        if (NO_MORE) goto gameover;
        freeMsg(); asprintf(&message, "A snake \"%s\" just died (%d)", snk->name, snk->nLifes); // lifes.
        do { snakeDec(snk); } while (!snakeIsEmpty(snk));
        if (snk->nLifes != 0) {
          snk->nLifes -= 1;
          snk->p = randP(); putCell(snk); //respawn
        } else { snk->flags |= SNK_PAUSE; }
      }
    } while ((snk = snk->prev) != NULL);
    snk = snakez;
    for (int i=0; i<nM; i++) { yxP(i, &y,&x); mvprintw(y, x*nBlk, style[m[i]]); } //< repaint
    if (message != NULL) {
        mvprintw(h/DIV_PAD_MESSAGE, w-w/DIV_PAD_MESSAGE, "%s", message);
        if (dtMessage == 0) { free(message); message = NULL; dtMessage = ntMessage; } else { dtMessage--; }
    } //< msg
    refresh();
    usleep(delayUsec);
  } //^ main loop
gameover:
  freeMsg();
  snk = snakez; while (snk->prev != NULL) { Snake prev = snk->prev; snakeFree(snk); free(snk); snk = prev; }
  snakeFree(&msnk);
}
#undef NO_MORE
#undef freeMsg

#include <locale.h>
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
  int fl = 0; envBool(&fl, "noWalls", NO_WALLS); envBool(&fl, "useAI2", USE_AI_L2);
  nSnakeLifes = ienvOr(3, "nSnakeLifes"); //v init libs&game
  initscr(); curs_set(0/*invisible*/);
  init(ienvOr(30, "ncol"), ienvOr(35, "nrow"), ienvOr(100, "dt_ms")); game(deftStyle, fl);
  freeStrsFirstCharTest(isPosNegSign, nTextMenuPause, textMenuPause); free(m);
  nodelay(stdscr, false); getch(); // NOTE: use vertical-dt_ms?
  return endwin();
}
