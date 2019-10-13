#include <iostream>
#include <math.h>

using namespace std;

using NumBase = const unsigned int;

const char RADIX_2[] = "01";
const char RADIX_10[] = "0123456789";
const char RADIX_16[] = "0123456789ABCDEF";
const int ASCII_D0 = 48;

// Why not use higher-order function? not required for this impl.
template <typename N, NumBase base>
N parseInt(const char *numstr, size_t nchar, const int digip0 = ASCII_D0) {
  N accumlator = static_cast<N>(0);
  for (size_t i=0; i<nchar; ++i)
    { accumlator = (accumlator*base) + (numstr[i]-digip0); }
  return accumlator;
}

template <typename N, NumBase base>
inline size_t intToStringLen(N num)
  { return round(log10(num+9))+1; /*upper*/ }

template <typename N, NumBase base>
void intToString(const N num, char *dst, size_t ndst, const char radix[base]) {
  N rest = num; size_t digi0 = ndst -1;
  for (size_t ndigi=0; rest !=0; ++ndigi) {
    dst[digi0-ndigi] = radix[rest%base]; // and
    rest = (rest/base); // shr
  }
}

int main() {
  cout << parseInt<int, 10>("123456789", 9) << endl;
  int simpleI = 10086;
  size_t to_ss = intToStringLen<int, 10>(simpleI);
  char show[to_ss+1] = {'\0'};
  cout << to_ss << endl;
  intToString<int, 10>(simpleI, show,to_ss, RADIX_10);
  cout << show << endl;
  return 0;
}
