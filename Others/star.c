#include <curses.h>

typedef unsigned int ptlist;
const int W=6, H=6;
#ifndef _NO_DATA
const int nData = 3+3;
const ptlist data[(3+3)][6] = { // I <3 U KWH //滑稽
  {
    0b000000,
    0b011100,
    0b001000, // I
    0b001000,
    0b011100,
    0b000000,
  },
  {
    0b000000,
    0b110110,
    0b111110, //<3
    0b011100,
    0b001000,
    0b000000,
  },
  {
    0b000000,
    0b010010,
    0b010010, // U
    0b010010,
    0b001100,
    0b000000,
  },
  {
    0b000000,
    0b101100,
    0b110000, // K
    0b110000,
    0b101100,
    0b000000,
  },
  {
    0b000000,
    0b101001,
    0b101001, // W
    0b101010,
    0b010100,
    0b000000,
  },
  {
    0b010010,
    0b010010,
    0b011110, // H
    0b010010,
    0b010010,
    0b000000,
  },
};
#endif

char *sBlack = "[]", *sWhite = "  ";
ptlist reverseBits(ptlist x) { // 0b1100 -> 0b0011
  ptlist rx = 0;
  for (int i=0; i<sizeof(ptlist)*8/*char bits*/; i++) {
    rx = rx<<1 | (x&0b1);
    x = x /*shr*/>> 1;
  }
  return rx;
}
void drawFrameTo(WINDOW* scr, const ptlist* frame) {
  for (int i=0; i<H; i++) {
    wmove(scr, i, 0);
    ptlist bitBuf = reverseBits(frame[i]);
    while (bitBuf != 0) {
      wprintw(scr, (bitBuf&0b1)? sBlack : sWhite);
      bitBuf = bitBuf >> 1;
    }
  }
}

void _sleep(unsigned int n_op) {
  while (--n_op != 0) asm volatile ("nop");
}
#include <stdlib.h>
int main(void) {
  const char* svNsec = getenv("nsec");
  double nsec = 1; if (svNsec != NULL) sscanf(svNsec, "%lf", &nsec);

  initscr(); noecho(); nodelay(stdscr, true); cbreak(); curs_set(0/*invisible*/);
  for (int i=0; getch() != 'q'; i = (i+1) % nData) { //'q' to exit
    clear(); drawFrameTo(stdscr, data[i]); refresh();
#ifdef GOOD
    usleep((int)(nsec*1000*1000)); // LICM optimization required.
#else
    _sleep((int)(nsec*150000000));
#endif
  }
  getch();//wait
  return endwin();
}
