#include <curses.h>
#include <unistd.h> // usleep()
#include <stdlib.h> // rand()
#include <time.h>   // time()
#define W 40
#define H 24
int m[W * H], q[W * H], p = H / 2 * W + (W / 2), a, h = 0, t = 0, d = 1, i;
int main(void) {
    initscr(); noecho(); keypad(stdscr, 1); nodelay(stdscr, 1); curs_set(0); //初始化ncurses,rand
    srand(time(NULL));
    for (i = 0; i < W * H; i++)
        m[i] = !(i / W % (H - 1) && i % W % (W - 1)); //填充墙
    m[q[t = (t + 1) % (W * H)] = p] = 1; //p=pYX(n/2,m/2); ps=[p]
    do { a = rand() % (W * H); } while (m[a]);
    while ((i = getch()) != 27) { //'q'
        if      (i == KEY_UP    && d !=  W) d = -W;
        else if (i == KEY_DOWN  && d != -W) d =  W; // 拒绝倒头吃蛇身
        else if (i == KEY_LEFT  && d !=  1) d = -1;
        else if (i == KEY_RIGHT && d != -1) d =  1;
        if (m[p += d]) break;
        m[q[t = (t + 1) % (W * H)] = p] = 1; //增长
        if (p == a) do { a = rand() % (W * H); } while (m[a]); //重复L14
        else m[q[h = (h + 1) % (W * H)]] = 0; //去尾
        for (i = 0; i < W * H; i++)
            mvaddstr(i / W, (i % W) * 2, m[i] ? "[]" : "  "); //渲染, 2=单块字数, v加苹果
        mvaddstr(a / W, (a % W) * 2, "()");
        refresh();
        usleep(100000); //暂停
    }
    while (getch() == ERR);//cmd pause
    endwin();
}

//用C语言，能在100行之内实现贪吃蛇吗？ - Milo Yip的回答 - 知乎
//https://www.zhihu.com/question/360814879/answer/1013986215
