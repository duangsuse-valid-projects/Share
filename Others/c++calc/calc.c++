#include <iostream>
#include <fstream>

using namespace std;

static bool has_next();
static int next();

static fstream *f;

const static char EOT = '\04';

static inline void putps1() {
  if (f==nullptr) { cout << "> " << flush; }
}

int main(int argc, char *argv[]) {
  string argf("");
  if (argc == 2) argf = argv[1];

  if (argf !="") {
    cout << "Using file " << argf << endl;
    f = new fstream(argf, fstream::in);
    if (!f->good()) {
      cerr << "Cannot use " <<argf<< " as input" << endl;
      exit(1); }}

  putps1();
  while (has_next()) {
    int res = next();
    cout << " = " << res << endl;
    putps1(); }

  delete f;
  return 0;
}

#include <stddef.h>

static size_t pos;
static unsigned line;
static char vLastChar = '_';
static char next_char() {
  ++pos;
  char got = (vLastChar = (f==nullptr? getchar() : f->get()));
  if (got == '\r' || got == '\n') ++line;
  return (char)got;
}
static bool has_next() {
  return !(f==nullptr? feof(stdin) : f->eof()) && (next_char() != EOT);
}

////
enum SkipOption { DEFAULT, NO_NL };
static void skipSpaces(SkipOption so = DEFAULT) { while ((so == NO_NL)? (vLastChar != '\n'):true && isspace(vLastChar)) { next_char(); } }

static string num("");
static void logNum() { num += vLastChar; }

static bool isnumex(char c = vLastChar) { return isdigit(c) || c == '_'; }
static bool trimnum(char c = vLastChar) { return c == '_'; }
////
#define PASS_EOT(dr) if (vLastChar == EOT || vLastChar == -1) return(dr);

static int read_i() {
  num.clear();
  if (!trimnum()) logNum();
  next_char();
  while (isnumex()) { if(!trimnum()) { logNum(); } next_char(); };
  return atoi(num.c_str());
}

typedef enum { add, sub, mul, divide, pfail } op;
static unsigned opprec(op o) { switch (o) {
#define prec(k, p) case k: return p;
prec(mul, 3)
prec(divide, 3)
prec(add, 5)
prec(sub, 5)

default: return -1; }
#undef prec
}
static bool leftrec(op o) { switch (o) {
#define infixl(k) case k: return true;
#define infixr(k) case k: return false;
infixl(add)
infixl(sub)
infixl(mul)
infixl(divide)

default: return true; }
#undef infixl
#undef infixr
}


static op scanOperator(bool must = false) {
  PASS_EOT(add)
  char lastchar = vLastChar;
  next_char();
  switch (lastchar) {
  case '+': return add;
  case '-': return sub;
  case '*': return mul;
  case '/': return divide;
//  case '\n': return pfail;
  default:
    if (must) cerr << "Unknown operator `" << lastchar << "'" << endl;
    return pfail; }
}

static int transparent_operand(op o, int *i) {
  if (i !=nullptr) return *i;
  switch (o) {
    case add: return 0;
    case sub: return 0;
    case mul: return 1;
    case divide: return 1;
    default:
      cerr << "Unknown transparent operand for: " << o;
      return 0; }
}

#include <stdarg.h>
static void pfailed(const char *messages, ...) {
  cerr << "Parser failed at (L"<<line<<", "<<pos<<"): `"
       <<vLastChar<<"'"<<static_cast<int>(vLastChar) <<": "<<messages;
  va_list ap;
  va_start(ap, messages);
    cerr << va_arg(ap, const char *);
  va_end(ap);
  cerr << endl;
}

extern "C" {
typedef int (*eval_t)(int, int);
}

#define cxxop(inx) return [](int a, int b) { return a inx b; };
static eval_t impl(op o) {
  switch (o) {
    case add: cxxop(+)
    case sub: cxxop(-)
    case mul: cxxop(*)
    case divide: cxxop(/)
    default:
      cerr << "Unknown operator implementation for: " << o;
      return 0; }  
}
#undef cxxop

static int scanBinary(int *left, op left_infix) {
cerr<<"Enter: " << left<< "/" <<left_infix << "/"<< (left!=nullptr?(*left):-1)<< endl;
  int a; op ao; // [ b (·1) a (·2) ]
  int tleft = transparent_operand(left_infix, left), lhsval;

  PASS_EOT(-1)
  if (isnumex()) { a = read_i(); }
    else { pfailed("expecting integer ", "[0-9]"); }
  skipSpaces();// next_char(); 
  ao = scanOperator(true);
  if (ao == pfail) return tleft;
  skipSpaces();
//cout << ao;
//cin >> a;
  unsigned
    lhsprec = opprec(left_infix) - ((leftrec(left_infix))? 1 : 0) - 1,
    rhsprec = opprec(ao) - ((!leftrec(ao))? 1 : 0);

  if (lhsprec < rhsprec) {
cerr<<"leftrec";
    lhsval = impl(left_infix)(tleft, a);
    return scanBinary(&lhsval, ao);
  } else {
cerr<<"rightrec";
    lhsval = transparent_operand(ao, nullptr);
    int right = scanBinary(&lhsval, ao);
    return impl(ao)(tleft, right);
  }
cerr<<"Leave: " << left<<left_infix << endl;
  return -1;
}

////
static int next() {
  skipSpaces();
  int i = scanBinary(nullptr, add);
  return i;
}

