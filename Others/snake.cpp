//g++ snake.cpp -lncursesw
#include <unistd.h> //usleep
#include <stdlib.h> //rand
#include <time.h> //time
#include <cstring> //strlen
#include <locale.h> // setlocale

#ifndef USE_ANSI
#  include <curses.h>
#else
#  include <stdio.h>
#  include <termios.h>
#  include <sys/select.h>
int _getKey() {
  int c = -1;
  struct timeval tv = {0, 0};
  fd_set fs; FD_ZERO(&fs); FD_SET(0, &fs);
  select(/*n*/1, &fs, /*w*/nullptr, /*err*/nullptr, &tv);

  if (FD_ISSET(0, &fs)) { c = getchar(); }
  return c;
}
int getch() {
  int ch = _getKey();
  if (ch == '\x1b') {
    do { ch = _getKey(); } while (ch == -1); // FIXME: why blocks pressing arrow keys?
    if (ch == '[') return _getKey();
  }
  return ch;
}
#define KEY_UP 65//A
#define KEY_DOWN 66//B
#define KEY_LEFT 68//D
#define KEY_RIGHT 67//C
#define ERR (-1)
#endif

class BaseGameCli {
protected:
  typedef int* map2D; // I heart C++ <3
  typedef const char* cstr;
#ifdef USE_ANSI
  struct termios oldTerm;
#endif
  int w, h, nM, nBlk;
  useconds_t delay;
  map2D m, stk;
  void setupCurses() {
#ifndef USE_ANSI
    noecho(); nodelay(stdscr, true); keypad(stdscr, true);
    curs_set(0/*invisible*/);
#else
    FILE* fp=stdin;
    struct termios term;
    /* set the terminal to raw mode */
    tcgetattr(fileno(fp), &oldTerm);
    memcpy(&term, &oldTerm, sizeof(struct termios));
    term.c_lflag &= ~(ICANON | ECHO);
    term.c_cc[VTIME] = 0; term.c_cc[VMIN] = 0;
    tcsetattr(fileno(fp), TCSANOW, &term);
#endif
  }
  inline int pYX(int y, int x) { return y*w+x; }
#ifndef USE_ANSI
  inline void putStr(int p, cstr s) { mvaddstr(p/w, (p%w)*nBlk, s); }
#endif
  inline int cycledInc(int& i) { i = (i+1) % nM; return i; }
  BaseGameCli(int w, int h, int dt): w(w), h(h), delay(dt) {
    nM = w*h; m = new int[nM]; stk = new int[nM];
  }
}; //^ For non-OOP version: just move members to SnakeCli and inline constructor.
// For PP style: just discard "inline"

class SnakeCli: BaseGameCli {
private:
  int p, pA=0/*fruit*/, iHead/*2ptr-FIFO*/;
  cstr sNone, sWall, sBody, sFruit; // none=0; wall=1; snake=2

  void putWall() { for (int i=0; i<nM; i++) m[i] = (i/w)%(h-1) && (i%w)%(w-1)? 0 : 1;  }
  void putCell() { stk[cycledInc(iHead)] = p; m[p] = 2; }
  void giveFruit() { do { pA = rand()%nM; } while (m[pA] != 0); }
  inline void draw(cstr styles[]) {
#ifndef USE_ANSI
    for (int i=0; i<nM; i++) putStr(i, styles[m[i]]);
    putStr(pA, sFruit);
    refresh();
#else
    m[pA] = 3;
    int iY = 0; for (int y=0; y<h; y++) {
      for (int x=0; x<w; x++) printf("%s", styles[m[iY+x]]);
      printf("\n");
      iY += w; //optimized
    }
    m[pA] = 0;
#endif
  }
public:
  SnakeCli(int w, int h, int dt): BaseGameCli(w, h, dt) {
    p = pYX((h/2), (w/2));
  }
  void setStyle(cstr none, cstr wall, cstr fruit, cstr body = nullptr) {
    sNone=none; sWall=wall; sBody=(body==nullptr)? wall : body; sFruit=fruit;
    nBlk = strlen(sNone);
  }
#define handle(key, nd, dv) else if (ch == key && d != nd) d = dv
  int run() {
    iHead = 0; int d=1, iTail=0;
    setupCurses();
    putWall();
    putCell(); giveFruit();
    cstr styles[] = {sNone, sWall, sBody, sFruit/*pseudo*/};
    int ch; while ((ch = getch()) != (int)'\x1B') {
      if (ch == ERR) {}
      handle(KEY_UP, w, -w);
      handle(KEY_DOWN, -w, w);
      handle(KEY_LEFT, 1, -1);
      handle(KEY_RIGHT, -1, 1);
      p += d; if (m[p]) break/*gg*/;
      putCell(); //<v nextframe && draw map.
      if (p == pA) giveFruit();/*keep 1tail*/
      else { m[stk[cycledInc(iTail)]] = 0; }
      draw(styles);
      usleep(delay); // NOTE: add time delta for constant speed?
    } // gg||Esc
#ifndef USE_ANSI
    nodelay(stdscr, false); getch();//wait.
    return endwin();
#else
    tcsetattr(fileno(stdin), TCSANOW, &oldTerm);
    return 0;
#endif
  }
};

#include<sstream>
template <typename T>
T envOr(T default_value, const char* name) {
  char* res = getenv(name);
  if (res == nullptr) return default_value;
  T value; std::stringstream s;
  s.str(res); s >> value;
  return value;
}
char* intToCStr(int num) {
  int nBuf = snprintf(nullptr, 0, "%d", num); //ceil(log10(num))+(num<0)?1/*-*/:0+1/*\0*/
  char* buf = new char[nBuf+1];
  sprintf(buf, "%d", num);
  return buf;
}

void assignDefaultCoord() {
#ifndef USE_ANSI
  int mxRow, mxCol=0;
  initscr(); getmaxyx(stdscr, mxRow, mxCol); // FIXME: why cols too big sometimes?
  struct { const char* name; int dval; } cfg[] = { {"nrow", mxRow}, {"ncol", mxCol} };
  for (int i=0; i<2; i++) {
    const char* res = getenv(cfg[i].name);
    if (res == nullptr || strcmp(res, "?") != 0) continue;
    setenv(cfg[i].name, intToCStr(cfg[i].dval), true);
  }
#endif
}
int main(int argc, char* argv[]) {
  setlocale(LC_ALL, "");
  srand(time(nullptr));
  assignDefaultCoord();
  SnakeCli snake(envOr(40, "ncol"), envOr(24, "nrow"), envOr(100, "delay_ms")*1000);
  argv++; argc--;//shift argv0
  if (argc >= 3) {
    const char* sBody = (argc == 4)? argv[3] : "!!"; //fuzzy
    snake.setStyle(argv[0], argv[1], argv[2], sBody);
  } else snake.setStyle("  ", "[]", "()");
  return snake.run();
}
