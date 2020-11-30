#include <curses.h>
#include <unistd.h> // usleep()
#include <stdlib.h> // rand()
#include <time.h>   // time()
#define W 40
#define H 24
int m[W * H], q[W * H], p = H / 2 * W + (W / 2), a, h = 0, t = 0, d = 1, i;
int main(void) {
    initscr(); noecho(); keypad(stdscr, 1); nodelay(stdscr, 1); curs_set(0);
    srand(time(NULL));
    for (i = 0; i < W * H; i++)
        m[i] = !(i / W % (H - 1) && i % W % (W - 1));
    m[q[t = (t + 1) % (W * H)] = p] = 1;
    do { a = rand() % (W * H); } while (m[a]);
    while ((i = getch()) != 27) {
        if      (i == KEY_UP    && d !=  W) d = -W;
        else if (i == KEY_DOWN  && d != -W) d =  W;
        else if (i == KEY_LEFT  && d !=  1) d = -1;
        else if (i == KEY_RIGHT && d != -1) d =  1;
        if (m[p += d]) break;
        m[q[t = (t + 1) % (W * H)] = p] = 1;
        if (p == a) do { a = rand() % (W * H); } while (m[a]);
        else m[q[h = (h + 1) % (W * H)]] = 0;
        for (i = 0; i < W * H; i++)
            mvaddstr(i / W, (i % W) * 2, m[i] ? "[]" : "  ");
        mvaddstr(a / W, (a % W) * 2, "()");
        refresh();
        usleep(100000);
    }
    while (getch() == ERR);
    endwin();
}

//用C语言，能在100行之内实现贪吃蛇吗？ - Milo Yip的回答 - 知乎
//https://www.zhihu.com/question/360814879/answer/1013986215
