//g++ snake.cpp -lncursesw
#include <curses.h>
#include <unistd.h> //usleep
#include <stdlib.h> //rand
#include <time.h> //time
#include <cstring> //strlen
#include <locale.h> // setlocale

class BaseGameCli {
protected:
  typedef int* map2D; // I heart C++ <3
  typedef const char* cstr;

  int w, h, nM, nBlk;
  useconds_t delay;
  map2D m, stk;
  void initCurses() {
    initscr(); noecho(); nodelay(stdscr, true); keypad(stdscr, true);
  }
  inline int pYX(int y, int x) { return y*w+x; }
  inline void putStr(int p, cstr s) { mvaddstr(p/w, (p%w)*nBlk, s); }
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
    initCurses(); curs_set(0);
    putWall();
    putCell(); giveFruit();
    cstr styles[] = {sNone, sWall, sBody};
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
      for (int i=0; i<nM; i++) putStr(i, styles[m[i]]);
      putStr(pA, sFruit);
      refresh();
      usleep(delay); // NOTE: add time delta for constant speed?
    } // gg||Esc
    nodelay(stdscr, false); getch();//wait.
    return endwin();
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
int main(int argc, char* argv[]) {
  setlocale(LC_ALL, "");
  srand(time(nullptr));
  SnakeCli snake(envOr(40, "ncol"), envOr(24, "nrow"), envOr(100, "delay_ms")*1000);
  argv++; argc--;//shift argv0
  if (argc >= 3) {
    const char *sBody = (argc == 4)? argv[3] : "!!"; //fuzzy
    snake.setStyle(argv[0], argv[1], argv[2], sBody);
  } else snake.setStyle("  ", "[]", "()");
  return snake.run();
}
