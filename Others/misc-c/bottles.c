#include <stdio.h>

int divAssignRem(int* a, int b) {
  int div=*a/b; *a%=b; return div;
}
void bottlesBeer(int n) {
  int acc=0, nBeer=n, nBottle=0, nCap=0;
  while (nBeer != 0) {
    nBottle+=nBeer, nCap+=nBeer;
    acc+=nBeer; nBeer=0; // move to counted
    nBeer += divAssignRem(&nBottle, 2)+divAssignRem(&nCap, 4);
  }
  printf("%d, rest %d bottle, %d cap.\n", acc, nBottle, nCap);
}
#include <stdlib.h>
int main(int argc, char** argv) {
  if (argc==2) bottlesBeer(atoi(argv[1]));
  return 0;
}
