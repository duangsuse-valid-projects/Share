#include <curses.h>
#include <unistd.h> // usleep()
#include <stdlib.h> // rand()
#include <time.h> // time()

typedef int* map;
char *S_BODY = "[]", *S_NONE = "  ", *S_FRUIT = "()";

int W, H, nM;
map m, stk;
int p;
useconds_t delay;

void init_curses() {
  initscr(); noecho(); nodelay(stdscr, 1); keypad(stdscr, 1); 
}
void init(int w, int h, int dt) {
  W=w; H=h; nM = w*h;
  delay = dt;
  map* bs[] = {&m,&stk};
  for (int i=0;i<2;i++) *bs[i] = malloc(sizeof(int)*nM);
  p = (H/2)*W +(W/2);
}
//void move(int d) {}
#define handle(key, nd, dv) else if (i == (key) && d != (nd)) d = (dv)
#define fruit() do { pA = rand()%nM; } while (m[pA])
void game() {
  int i=0, d=1, t=0, h=0, pA=0;
  for (i=0; i<nM; i++) m[i] = !(i/W % (H-1) && i % W%(W-1)); // wall
  //m[stk[t = (t + 1) % nM] = p] = 1;
  //m[p] = 1; p=stk[t++%nM];
  stk[++t%nM] = p; m[p] = 1;
  fruit();
  while ((i = getch()) != 27) {
    if (0);
    handle(KEY_UP, W, -W);
    handle(KEY_DOWN, -W, W);
    handle(KEY_LEFT, 1, -1);
    handle(KEY_RIGHT, -1, 1);
    if (m[p+=d]){break;} //^ key moved
    //m[stk[t = (t + 1) % nM] = p] = 1;
    stk[++t%nM] = p; m[p] = 1;
    //h++; m[stk[h%nM]] = 0;
    if (p == pA) fruit();
    else m[stk[h = (h + 1) % (W * H)]] = 0/*key. stack*/;
    for (i=0; i<nM; i++) mvaddstr(i/W, i%W*2, m[i]? S_BODY : S_NONE);
    mvaddstr(pA/W, (pA%W)*2, S_FRUIT);
    refresh();
    usleep(delay);
  } // gg||ETB.
}
int main(void) {
  srand(time(NULL));
  init_curses(); curs_set(0);
  init(40, 24, 100000); game();
  nodelay(stdscr, 0); getch();
  return endwin();
}
