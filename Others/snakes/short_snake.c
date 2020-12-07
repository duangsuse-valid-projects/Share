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
#define N_MAX_NAMECHAR 15
#define inlined static inline
#define panic(msg) do { endwin(); fprintf(stderr, "panic: %d %s: %s\n", __LINE__, __FUNCTION__, msg); exit(EXIT_FAILURE); } while (0)

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
  USE_DELAY=0x40,
  USE_SPEED2=0x80;
const int SNK_PAUSE=0x1, SNK_AI=0x2, SNK_NO_LENDEC=0x4, SNK_TRANSWALL=0x8;
const int ARY_FLAG[] = {-1, 0x20, 0x4, 0x8, 0x1, 0x1, /*1more,rev*/-1, -1, 0x10, 0x80, -1, -1, -1, -1, -1};
char* TEXT_MENU_PAUSE[] = {"|> resume game", "+no reset",
  "-?len decrement", "+?transport wall", "+?pause snake", "-walls (adds reset&bug)",
  "one more fruit", "reverse snake", "+AI level 2", "+extra speed", "add AI player", "add Human player", "switch delay", "view next..."};
const int nTextMenuPause = sizeof(TEXT_MENU_PAUSE)/sizeof(char*);

bool isPosNegSign(char c) {  return c=='+' || c=='-'; }
// Game object
int w, h, nM, nBlk;
typedef int* map2D;
typedef struct SnakeST {
  map2D cells; int iHead, iTail, dCycle; // snake body FIFO queue
  int p, d; int flags, nLifes, nScore; // pos, "dir"ection, state...
  char* name;
  int kU, kD, kL, kR; // key binds
  struct SnakeST* prev;
}* Snake;
map2D m; Snake snakez = NULL;
useconds_t delayUsec;
double speed2Ratio;

inlined int pYX(int y, int x) { return y*w+x; } // axis representation.
inlined void yxP(int p, int* y, int* x) { *y=p/w, *x=p%w; }
inlined int cycledInc(int* p, int dCycle) { *p = (*p==0&&dCycle==-1)? nM-1 : (*p+dCycle) % nM; return *p; }

int nSnakeLifes, nAISnake = 0;
void snakeInit(Snake self) {
  self->iHead = 0, self->iTail = 0, self->dCycle = 1;
  self->d = 1; self->flags = 0; self->nLifes = nSnakeLifes; self->nScore = 0;
  self->cells = malloc(sizeof(int)*nM);
}
void snakeFree(Snake self) { free(self->name); free(self->cells); }

#define PARAMS_SNAKE(h) h o->nScore, o->name, h o->nLifes, h o->flags, h o->p, h o->d
const char FMT_SNAKE[] = "%d %s (%d) ;0x%x %d %d"; // score, name, life, flags, p, d; dCycle/iHead/iTail is not for serialization
void snakeWrite(Snake self, FILE* fd) {
  Snake o = self;
  fprintf(fd, FMT_SNAKE, PARAMS_SNAKE());
  fprintf(fd, "\n");
}
void snakeRead(Snake self, FILE* fd) {
  Snake o = self;
  int nRecord = fscanf(fd, FMT_SNAKE, PARAMS_SNAKE(&));
  if (nRecord == EOF) { nRecord = 0; }
  const char sUnkSnk[] = "!!unknown";
  switch (nRecord) { //fallthru
    case 0: o->nScore = 0;
    case 1: sprintf(o->name, sUnkSnk); o->name[sizeof(sUnkSnk)] = '\0'; // anonymous snake
    case 2: o->nLifes = nSnakeLifes;
    case 3: o->flags = 0;
    case 4: o->p = 0;
    case 5: o->d = 0;
  }
  o->iHead = 0, o->iTail = 0, o->dCycle = 1;
  self->cells = malloc(sizeof(int)*nM);
  do {} while (!feof(fd) && fgetc(fd) != '\n');
}
#undef PARAMS_SNAKE

char** textMenuPause; // mutable
void init(int m_w, int m_h, int dt) {
  w=m_w; h=m_h;
  nM = w*h; delayUsec = dt*1000;
  m = malloc(sizeof(int)*nM);
  textMenuPause = reallocStrsFirstCharTest(isPosNegSign, nTextMenuPause, TEXT_MENU_PAUSE);
}

WINDOW* uiMenuWindow(char* title) {
  int hh=h/2, hw=w*nBlk/2;
  WINDOW* wMenu = newwin(hh, hw, hh-hh/2, hw-hw/2);
  keypad(wMenu, true);
  mvwprintw(wMenu, 0, 0, title); wrefresh(wMenu); //title
  return wMenu;
}

int dialogAskChoose(char* title, int argc, char** argv, int pad) {
  WINDOW* wMenu = uiMenuWindow(title);
  int highlight = 0;
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
void dialogAskKeys(char* title, int n, int* ks) {
  WINDOW* wMenu = uiMenuWindow(title);
  int iCh=0; int iliKs = n -1;
  nodelay(wMenu, false);
  int ch; while (iCh != n) {
    ch = wgetch(wMenu);
    ks[iCh] = ch;
    wprintw(wMenu, "You pressed %c (0x%x), %d key rest\n", ch, ch, iliKs-iCh);
    iCh++;
  }
  wprintw(wMenu, "OK, get ready."); wgetch(wMenu);
}
void dialogAskInput(char* title, int n, char* s) {
  WINDOW* wMenu = uiMenuWindow(title);
  int y, x; getyx(wMenu, y, x);
  y++;
  echo();
  int nScan; do { nScan = mvwscanw(wMenu, y, x, "%s\n", s); } while (nScan != 1);
  if (s[n] != '\0') panic("input too long"); // TODO: how to limit scan length?
  noecho();
}
int curUse(int op(WINDOW*, bool)) { return op(stdscr, true); }

int randP() { int pA; do { pA = rand()%nM; } while (m[pA] != 0); return pA; } // NOTE: a joke: may get stuck when your snake fills the map ;-)
int dirPCmp(int p0, int p1) { // how can p1 reach p0?
  int d = p0 - p1;
  if (abs(d) == 1) return d;
  else return (d < 0)?  -w : w; // NOTE: not tested
}

inlined int snakePtrInc(Snake self, int position)/*cyclic ring buffer*/ { return cycledInc((position==0)? &self->iHead : &self->iTail, self->dCycle); }
int snakeLen(Snake self) { return (self->iHead - self->iTail)*self->dCycle; }
inlined bool snakeIsEmpty(Snake self) { return self->iTail == self->iHead; }
int snakeTailDir(Snake self) { return (snakeLen(self) == 1)?  -self->d : dirPCmp(self->p, self->cells[self->iTail+self->dCycle/*newP*/]); }

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
FILE* fdMaxScores;
void snakeAdd(Snake self) {
  self->prev = snakez; snakez = self;
  putCell(self); // initinal len=0, or m[cells[iTail/*]==0*/]
  if (fdMaxScores != NULL) snakeWrite(self, fdMaxScores);
}

typedef enum { updOk=0, updRegame, updDie } UpdateRes;
int /*menu-action*/act=0; //bad, no idea to refactor in C99.
inlined UpdateRes handleUpdate(int ch, int* flags, Snake snk) {
  int y, x;
  bool noDec=(snk->flags&SNK_NO_LENDEC), useTWall=(snk->flags&SNK_TRANSWALL);
  if (ch == KEY_PAUSE) {
    char* sTitle; Snake snk1; char* sName; // add-player
retoast:
    for (int i=0; i<nTextMenuPause; i++) { // snake menu optoins
      char* ptrT = textMenuPause[i];
      if (ptrT[1] != '?') continue;
      bool pd/*isActive*/ = (snk->flags&ARY_FLAG[i]);
      ptrT[0] = ((TEXT_MENU_PAUSE[i][0] == '-')? !pd : pd)? '-' : '+';
    }
    asprintf(&sTitle, "Paused on %d \"%s\" (%d) ;0x%x", snk->nScore, snk->name, snk->nLifes, snk->flags);
    act = dialogAskChoose(sTitle, nTextMenuPause, textMenuPause, PAD_MENU);
    free(sTitle); // NOTE: this menu could be extracted (map its res updDie -> do nothing; else return res), but here, we keep it.
rehandle:
    if (act == 0) return updOk;
    else if (ARY_FLAG[act] == -1) switch (act) { // menu actions
    case 6:
      putFruit(); if (!(*flags&NO_RESET)) { act = 1/*no-reset*/; goto rehandle; } 
      break;
    case 7:
      snk->p = snk->cells[snakePtrInc(snk, 1)];
      putCell(snk); snk->d = snakeTailDir(snk); // reverse snake logic
      swapInt(&snk->iHead, &snk->iTail); snk->dCycle = -snk->dCycle;
      return updOk; // NOTE: not tested
    case 10:
      snk1 = malloc(sizeof(struct SnakeST));
      snakeInit(snk1);
      snk1->p = randP(); snk1->flags |= SNK_AI;
      snk1->kU = 'i', snk1->kD = 'k', snk1->kL = 'j', snk1->kR = 'l'; // ai force control.
      if (sName != NULL) sName = NULL;
      nAISnake++; asprintf(&sName, "AI#%d", nAISnake);
      snk1->name = sName;
      snakeAdd(snk1);
      return updRegame; // could be overridden (no-reset).
    case 11:
      snk1 = malloc(sizeof(struct SnakeST)); // I've already missed you C++
      snakeInit(snk1);
      snk1->p = randP();
      sName = malloc(N_MAX_NAMECHAR+1); sName[N_MAX_NAMECHAR] = 0;
      dialogAskInput("Please type your name\n", N_MAX_NAMECHAR, sName);
      int ks[4]; dialogAskKeys("Now select your move keys (Up,Down,Left,Right)\n", 4, ks);
      snk1->name = sName;
      snk1->kU = ks[0], snk1->kD = ks[1], snk1->kL = ks[2], snk1->kR = ks[3];
      snakeAdd(snk1);
      return updRegame;
    case 12:
      *flags ^= USE_DELAY;
      nodelay(stdscr, !(*flags&USE_DELAY));
      return updOk;
    case 13:
      snk = (snk->prev != NULL)? snk->prev : snakez;
      goto retoast;
    } else {
      char* ptrT = textMenuPause[act]; // switcher.
      int fl = ARY_FLAG[act];
      int oldFlags = *flags, oldSnkFlags = snk->flags;
      if (ptrT[1] == '?') { snk->flags ^= fl; }
      else { *flags = *flags ^ fl; ptrT[0] = (ptrT[0] == '+')? '-'  : '+'; }
      if (*flags&NO_WALLS) memset(m, 0, sizeof(int)*nM); //<v flag on-update
      if ((oldSnkFlags&SNK_PAUSE) && !(snk->flags&SNK_PAUSE) && snakeIsEmpty(snk)) { snk->p = randP(); putCell(snk); } // relive logic
      bool useSpeed2 = (*flags&USE_SPEED2);
      if (useSpeed2 != (oldFlags&USE_SPEED2)) { delayUsec = (useconds_t) delayUsec * (useSpeed2? 1.0/speed2Ratio : speed2Ratio); } // speed2 logic
    }
    return updRegame;
  } else if (ch == KEY_F(2)) { goto rehandle; } //key 'p'
  snk->p += snk->d; // input done.
  if (m[snk->p] == 1) { return updDie; } // die eat self
  if (m[snk->p] == 3) {
    if (!useTWall) { return updDie; } // die on wall
    yxP(snk->p, &y,&x);
    int hm=h-1, wm=w-1;
    if (isZeroOr(hm, y)) snk->p=pYX((y==0)? hm-1 : 1, x); // NOTE: snk->d is also avaliable for branch condition
    else if (isZeroOr(wm, x)) snk->p=pYX(y, (x==0)? wm-1 : 1);
  }
  if (m[snk->p] == 2) { putFruit(); }
  else/*=0*/ { if (!noDec) snakeDec(snk); }
  putCell(snk);
  return updOk;
}

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

Snake readSnakes(FILE* fp) { // Snake list I/O scanner
  Snake snk = NULL;
  do {
    Snake snk0 = snk; snk = malloc(sizeof(struct SnakeST));
    snk->name = malloc(N_MAX_NAMECHAR+1);
    snk->prev = snk0;
    snakeRead(snk, fp);
  } while (!feof(fp));
  return snk;
}
void freeSnakes(Snake snakes) {
  Snake snk = snakes;
  while (snk->prev != NULL) { Snake prev = snk->prev; snakeFree(snk); free(snk); snk = prev; }
}
#define handleDirNeg(dv, keyP, keyN) \
  else if (ch == keyP && snk->d != dv) snk->d = -dv; \
  else if (ch == keyN && snk->d != -dv) snk->d = dv;
#define NO_MORE (nUpdated == 0 && snk->prev == NULL)
#define freeMsg() if (message != NULL) free(message)
#define snakeForEach(snakes, name) for (Snake name = snakes; name != NULL; name = name->prev)
FILE* fdScores;
void game(cstr style[], int flags) {
  noecho(); curUse(nodelay); curUse(keypad); cbreak(); 
  int ntMessage = ienvOr(24, "ntMessage");
  char* message=NULL; int dtMessage = ntMessage;
  int pMid = pYX(h/2, w/2);
  char* sName; asprintf(&sName, "%s", envOr("Python", "mainSnakeName"));
  struct SnakeST msnk = {
    .p = pMid, .name = sName,
    .kU = KEY_UP, .kD = KEY_DOWN,
    .kL = KEY_LEFT, .kR = KEY_RIGHT
  };
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
        if (ch == ERR) {}
        handleDirNeg(w, snk->kU, snk->kD)
        handleDirNeg(1, snk->kL, snk->kR)
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
        snk->nScore += snakeLen(snk); // score logic
        do { snakeDec(snk); } while (!snakeIsEmpty(snk));
        if (snk->nLifes != 0) {
          snk->nLifes -= 1;
          snk->p = randP(); putCell(snk); //respawn
        } else {
          snk->flags |= SNK_PAUSE;
          if (fdScores != NULL) snakeWrite(snk, fdScores);
          if (fdMaxScores != NULL) {
            char* sEnv; asprintf(&sEnv, "snake_%s", snk->name);
            char* sOld = getenv(sEnv); if (sOld != NULL) free(sOld); //security:panic
            char* sScore; asprintf(&sScore, "%d", snk->nScore);
            setenv(sEnv, sScore, false); // NOTE: U can use hastable to prevent environ modification
            free(sEnv);
          }
        } //^ snake death.
      }
    } while ((snk = snk->prev) != NULL);
    snk = snakez;
    for (int i=0; i<nM; i++) { yxP(i, &y,&x); mvprintw(y, x*nBlk, style[m[i]]); } //< repaint
    if (message != NULL) {
        mvprintw(h/DIV_PAD_MESSAGE, w-w/DIV_PAD_MESSAGE, "%s", message);
        if (dtMessage == 0) { free(message); message = NULL; dtMessage = ntMessage; } else { dtMessage--; }
    } //< msg
    refresh();
    usleep(delayUsec); // NOTE: sleep((t1-t0)/speed); or s->p+=d*speed*dt; or if (t1-t0 > fpus) refreshGame(); is also OK
  } //^ main loop
gameover:
  freeMsg();
  fflush(fdScores); fclose(fdScores);
  // and, we can write hi-score
  Snake maxSnakez;
  if (fdMaxScores != NULL) {
    fseek(fdMaxScores, 0, SEEK_SET);
    maxSnakez = readSnakes(fdMaxScores);
    snakeForEach(maxSnakez, maxSnake) {
      char* sEnv1; asprintf(&sEnv1, "snake_%s", maxSnake->name);
      char* sInt = getenv(sEnv1); //defer
      free(sEnv1); // my gosh, alloc-free? what a mess!
      if (sInt == NULL) continue;
      int newScore = atoi(sInt);
      if (newScore > maxSnake->nScore) maxSnake->nScore = newScore;
    }
  }
  if (fdMaxScores != NULL) fclose(fdMaxScores);
  fdMaxScores = fopen("snakeMaxScore.txt", "w+"); //reopen
  if (fdMaxScores != NULL) {
    snakeForEach(maxSnakez, snkW) { snakeWrite(snkW, fdMaxScores); snakeFree(snkW); }
    Snake snkF = maxSnakez;
    while (snkF->prev != NULL) { Snake prev = snkF->prev; free(snkF); snkF = prev; } free(snkF);
  } else {
    snakeForEach(snakez, snkW) { snakeWrite(snkW, fdMaxScores); }
  }
  freeSnakes(snakez);
  snakeFree(&msnk);
}
#undef handleDirNeg
#undef NO_MORE
#undef freeMsg
#undef snakeForEach

#include <locale.h>
void envBool(int* flags, mutCstr name, int flag) {
  cstr res = getenv(name);
  bool use = (res != NULL)? (strcmp(res, "no") != 0) : false;
  if (use) *flags = *flags | flag;
}
void assignDefaultCoord() {
  int mxRow, mxCol=0; char* sNum;
  getmaxyx(stdscr, mxRow, mxCol); // FIXME: why ncol too big sometimes?
  struct { const char* name; int dval; } cfg[] = { {"nrow", mxRow}, {"ncol", mxCol} };
  for (int i=0; i<2; i++) {
    const char* res = getenv(cfg[i].name);
    if (res == NULL || strcmp(res, "?") != 0) continue;
    asprintf(&sNum, "%d", cfg[i].dval);
    setenv(cfg[i].name, sNum, true);
  }
}
int main(void) {
  setlocale(LC_ALL, ""); //non-ISO chars
  srand(time(NULL));
  cstr deftStyle[] = {envOr("  ", "sNone"), envOr("[]", "sBody"), envOr("()", "sFruit"), envOr("{}", "sWall")};
  nBlk = strlen(deftStyle[0]);
  int fl = 0; envBool(&fl, "noWalls", NO_WALLS); envBool(&fl, "useAI2", USE_AI_L2);
  nSnakeLifes = ienvOr(3, "nSnakeLifes"); //v init libs&game
  speed2Ratio = (double)ienvOr(200, "speed2Ratio") / 100;
  initscr(); curs_set(0/*invisible*/);
  assignDefaultCoord(); // nrow=? ncol=?
  fdScores = fopen("snakeScore.txt", "w+"), fdMaxScores = fopen("snakeMaxScore.txt", "r+");
  init(ienvOr(30, "ncol"), ienvOr(35, "nrow"), ienvOr(100, "dt_ms")); game(deftStyle, fl);
  freeStrsFirstCharTest(isPosNegSign, nTextMenuPause, textMenuPause); free(m);
  nodelay(stdscr, false); getch(); // NOTE: use vertical-dt_ms?
  fclose(fdMaxScores);
  return endwin();
}
