#include <stdio.h>

int divAssignRem(int* a, int b) {
  int div=*a/b; *a%=b; return div;
}
void bottlesBeer(int n) {
  int acc=n, nBottle=n, nCap=n;
  int nBeer; do {
    nBeer = divAssignRem(&nBottle, 2)+divAssignRem(&nCap, 4);
    nBottle+=nBeer, nCap+=nBeer;
    acc+=nBeer; // move to counted
  } while (nBeer != 0);
  printf("%d, rest %d bottle, %d cap.\n", acc, nBottle, nCap);
}
#include <stdlib.h>
int main(int argc, char** argv) {
  if (argc==2) bottlesBeer(atoi(argv[1]));
  return 0;
}
