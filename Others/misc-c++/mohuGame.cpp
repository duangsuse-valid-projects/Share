#include <string>
#include <locale>
#include <codecvt>
#include <sstream>
#include <cstdio>
#include <stdlib.h>

#include <algorithm>
#include <random>
#include <vector> // shuffle
using namespace std;

#ifdef _WIN32
#include <conio.h>
#include <windows.h>
void initScreen() {
  system("mode con cols=50 lines=10");
  system("chcp 65001"/*UTF-8,fallback hack*/);
  system("color f0");
  system("title 恶政隐文字游戏　C语言版本　v20200521.+1s");
}
static HANDLE hStdout = GetStdHandle(STD_OUTPUT_HANDLE);
#else
#  include <termios.h>
tcflag_t oldTcFlag;
void initScreen() {
  struct termios tcs;
  tcgetattr(0, &tcs);
  oldTcFlag = tcs.c_lflag;
  tcs.c_lflag &= ~(ICANON/*cbreak*/ | ECHO | ISIG/*ctrl escape*/);
  tcs.c_cc[VMIN] = 1/*char*/; tcs.c_cc[VTIME] = 1;
  tcsetattr(0, TCSANOW, &tcs);
  setvbuf(stdin, nullptr, _IONBF, 0);
  atexit([]() { struct termios tcs = { .c_lflag = oldTcFlag }; tcsetattr(0, TCSANOW, &tcs); });
}
char getch() { return getchar(); }
#endif

static wstring_convert<codecvt_utf8_utf16<wchar_t>> iconv; // UTF-8
void writeUTF(string utf) {
#ifdef _WIN32
    WriteConsole(hStdout, utf.c_str(), utf.length(), nullptr, nullptr);
#else
    printf("%s", utf.c_str());
#endif
}
void putc(char16_t ch) {
  string utf = iconv.to_bytes(ch);
  writeUTF(utf);
}

typedef size_t idx;
class WordPairGame {
private:
  void clears() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
  }
  void prints(const wchar_t* msg) {
    string utf = iconv.to_bytes(msg);
    writeUTF(utf);
  }
  void printsNl(const wchar_t* msg) {
    prints(msg); puts("\n");
  }
private:
  char16_t sQuestion, sAnswer, words[4];
  idx iQ=0;
  vector<idx>::iterator indicez;

  void doJudge(idx i_option) {
    nTotal++;
    if (words[i_option] == sAnswer) {
      nCorrect++; nCombo++;
    } else {
      nMistake++; //v C++ 的 UTF-8 跨平台(windows)输出是老问题了，不加库没什么好的解决办法……
      prints(L"错误！正确集体记忆是「"); putc(sAnswer); prints(L"」。您的"); printf("%d", nCombo); prints(L"连击也药丸啦，请按微博发布…\n");
      comboCounts.push_back({nCombo, iQ});
      nCombo=0; getch();
    }
  }
  idx nextI() { if (indicez == indiceOrder.end()) { indicez = indiceOrder.begin(); } return *indicez++; }
  idx randI() { return static_cast<idx>(rand()) %(nWordseq-1) +1; }
  void shuffleWords(int i_a, int i_b, int i_c) {
    auto ws = wordseqs[1];
    do {
      words[i_a] = ws[randI()];
    } while (words[i_a] == words[i_b]);
    do {
      words[i_c] = ws[randI()];
    } while (words[i_c] == words[i_b] || words[i_c] == words[i_a]);
  }
  void putword(idx i) {
    for (idx j=0; j<2; j++) { putc(wordseqs[j][i]); }
  }
public:
  char16_t* wordseqs[2]; size_t nWordseq;
  vector<idx> indiceOrder;
  vector<pair<size_t,size_t>> comboCounts;
  size_t nTotal=0, nCorrect=0, nCombo=0, nMistake=0;

  WordPairGame(size_t n, char16_t* words1, char16_t* words2, unsigned seed): nWordseq(n) {
    wordseqs[0] = words1; wordseqs[1] = words2;
    size_t n1 = n -1; //!!
    vector<idx> xs(n1); for (idx i=0; i<n1; i++) xs[i] = 1+i;
    shuffle(xs.begin(), xs.end(), default_random_engine(seed)); // 洗牌避免 too simple 的重问
    indiceOrder = xs; indicez = indiceOrder/*must not xs(freed)*/.begin();
  }
  void run() {
Title:
    clears();
    printsNl(L"按 7 搞大新闻，按 9 做中国梦；亦可按 8 提升姿势水平\n港记提问发言稿：");
    for (idx i=0;i<nWordseq-1; i++) {
      auto c = indiceOrder[i];
      printf(" %d", c);
      if (*indicez == c &&i!=0) prints(L"(继续前进>>)");
    }
    if (!comboCounts.empty()) {
      printsNl(L"\n满脸喷粪：");
      for (auto i = comboCounts.begin(); i != comboCounts.end(); i++) {
        printf(" %d|%d#", i->first, i->second); putword(i->second);
      }
    }
    switch (getch()) {
    case '7': goto Play;
    case '9': return;
    case '8':
      for (idx i=0; i<nWordseq; i++) {
        clears();
        putword(i);
        printf("(%d/%d)\n", i, nWordseq);
        switch (getch()) {
        case '9': goto Play;
        case '=': i += 10; break;
        case '-': i -= 10; break;
        }
      }
    default: goto Title;
    }
Play:
    iQ = nextI(); //指定题面...
    sQuestion = wordseqs[0][iQ];
    sAnswer = wordseqs[1][iQ];

    //指定选项...
    int iA = (rand() %3) +1 /*0..<3|+1 = 1..3*/;
    words[iA] = sAnswer;
    switch (iA) { //v shuffle option ui
    case 1: // 2,1  3,1/2
      shuffleWords(2, 1, 3); break;
    case 2: // 1,2  3,2/1
      shuffleWords(1, 2, 3); break;
    case 3: // 1,3  2,3/1
      shuffleWords(1, 3, 2); break;
    }

AskOnce:
    clears();
    prints(L"按 1 2 3 来钦定答案，按 9 不做了睡大觉\n");
    printf("历史数%d 正确数%d，%d连击　失误数%d\n", nTotal, nCorrect, nCombo, nMistake);
    prints(L"题面：   "); putc(sQuestion); prints(L"     （民选中第"); printf("%d/%d", iQ, nWordseq); prints(L"个字）\n选项：");
    for (int i=1; i<4; i++) {
      printf("   %d ", i); putc(words[i]);
    }
    printsNl(L"");

    switch (getch()) {
    case '1': doJudge(1); break;
    case '2': doJudge(2); break;
    case '3': doJudge(3); break;
    case '9': goto Title;
    default: goto AskOnce;
    }

    goto Play;
  }
};

static char16_t worddata[][2+1] =
{u"!!", u"续命", u"蛤蟆", u"青蛙", u"改变", u"夏威", u"吉他", u"谦虚", u"另请", u"高明", u"苟利", u"赛艇", u"吼啊", u"基本", u"钦点", u"无可", u"奉告", u"滋磁",
 u"削习", u"图样", u"身经", u"西方", u"华莱", u"谈笑", u"风生", u"姿势", u"识得", u"捉急", u"跑快", u"森破", u"上台", u"拿衣", u"抱歉", u"长者", u"经验", u"碰到",
 u"闷声", u"发财", u"坠吼", u"负泽", u"特首", u"连任", u"要要", u"表态", u"民白", u"新闻", u"批判", u"安轨", u"不行", u"得罪", u"いよ", u"祈翠", u"小熊", u"维尼",
 u"猪头", u"刁犬", u"庆丰", u"包子", u"吸精", u"禁平", u"倒车", u"星瀚", u"轻关", u"易道", u"通商", u"宽衣", u"金科", u"律玉", u"绿玉", u"颐使", u"气指", u"冰棒",
 u"岿然", u"大海", u"掀翻", u"池塘", u"风狂", u"雨骤", u"萨格", u"格尔", u"尔王", u"吃饱", u"麦子", u"十里", u"山路", u"二百", u"百斤", u"换肩", u"突开", u"满脸",
 u"喷粪", u"梁家", u"沼气", u"精甚", u"细腻", u"工笔", u"八千", u"撸袖", u"自息", u"困难", u"艰苦", u"奋斗", u"苦吃", u"逆差", u"没有", u"发酵", u"时代", u"读过",
 u"书单", u"闹欢", u"清单", u"应验", u"神明", u"敬畏", u"坡涛", u"汹涌", u"找准", u"瞻养", u"游泳", u"亲自", u"撒币", u"谭德", u"麻批", u"泼鸡", u"膜乎", u"品韭",
 u"赵弹", u"共惨", u"称帝", u"言论", u"粉蛆", u"五毛", u"网紧", u"干五", u"反贼", u"翻车", u"一派", u"胡言", u"法轮", u"坏球", u"逼站", u"支乎", u"抖阴", u"辣椒",
 u"厉害", u"墙国", u"六四", u"坦克", u"常识", u"铁骑", u"螳臂", u"当车", u"占人", u"腊肉", u"耿爽", u"战狼", u"冲塔", u"恶隐", u"秦城"};
// Python: from re import findall, sub; code='''^above'''; for s in ["".join(ab) for ab in zip(*map(lambda s: eval(sub("\n\s*","", s)), findall("(?s){(.*?)}", code)))]: print(s)
// Add-op: print(", ".join(f"u\"{ln}\"" for ln in iter(input, ".")))

int main() {
  char16_t *worddata1, *worddata2; //< it[0] is not used
  typedef remove_reference<decltype(worddata[0][0])>::type c_t;
  size_t n = sizeof(worddata)/sizeof(*worddata);
  worddata1 = new c_t[n]; worddata2 = new c_t[n]; // mbrtowc() is complicated, so no load-text impl. 亦可实现一个。
  for (idx i=0; i<n; i++) { worddata1[i] = worddata[i][0]; worddata2[i] = worddata[i][1]; }
  initScreen();
  auto seed = static_cast<unsigned>(time(nullptr));
  srand(seed);
  WordPairGame game(n, worddata1, worddata2, seed);
  game.run();
  return 0;
}
