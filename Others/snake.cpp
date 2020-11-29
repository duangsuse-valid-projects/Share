#include <curses.h>
#include <unistd.h> //usleep
#include <stdlib.h> //rand
#include <time.h> //time
#include <cstring> //strlen

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
  cstr sNone, sBody, sFruit;

  void putWall() { for (int i=0; i<nM; i++) m[i] = !( (i/w)%(h-1) && (i%w)%(w-1) );  }
  void putCell() { stk[cycledInc(iHead)] = p; m[p] = 1; }
  void giveFruit() { do { pA = rand()%nM; } while (m[pA]); }
public:
  SnakeCli(int w, int h, int dt): BaseGameCli(w, h, dt) {
    p = pYX((h/2), (w/2));
  }
  void setStyle(cstr none, cstr body, cstr fruit) {
    sNone=none; sBody=body; sFruit=fruit;
    nBlk = strlen(sNone);
  }
#define handle(key, nd, dv) else if (ch == key && d != nd) d = dv
  int run() {
    iHead = 0; int d=1, iTail=0;
    initCurses(); curs_set(0);
    putWall();
    putCell(); giveFruit();
    int ch; while ((ch = getch()) != (int)'\x1B') {
      if (ch == ERR) {}
      handle(KEY_UP, w, -w);
      handle(KEY_DOWN, -w, w);
      handle(KEY_LEFT, 1, -1);
      handle(KEY_RIGHT, -1, 1);
      p += d; if (m[p]) break/*gg*/;
      putCell();
      if (p == pA) giveFruit();/*keep 1tail*/
      else { m[stk[cycledInc(iTail)]] = 0; }
      for (int i=0; i<nM; i++) putStr(i, m[i]? sBody : sNone);
      putStr(pA, sFruit);
      refresh();
      usleep(delay); // NOTE: add time delta for constant speed?
    } // gg||Esc
    nodelay(stdscr, false); getch();//wait.
    return endwin();
  }
};

int main(int argc, char* argv[]) {
  srand(time(nullptr));
  SnakeCli snake(40, 24, 100*1000);
  argv++; argc--;//shift argv0
  if (argc == 3) snake.setStyle(argv[0], argv[1], argv[2]);
  else snake.setStyle("  ", "[]", "()");
  return snake.run();
}
