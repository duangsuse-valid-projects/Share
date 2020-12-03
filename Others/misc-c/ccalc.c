#include <stdio.h>
#include <stdlib.h>

int ans = 0, num = 0;
int lastMode/*used when Enter*/ = 'p';
void onKey(char k) {
  int* dest = (lastMode != 'p')? &num : &ans; // 
  if ('0' <=k&&k <= '9') { *dest = *dest*10 + (k-'0')/*read decimal digit*/; }
  else if (k == '=') { // update ans
    switch (lastMode) {
    case '+': ans = ans + num; break;
    case '-': ans = ans - num; break;
    }
    printf("%d", ans);
  } else lastMode = k;
}

int main(void) {
  char *line = malloc(BUFSIZ); // for each char
  while (!feof(stdin)/*fscanf(stdin, "%s", &line);*/) {
    //for (char* c=line; *c!='\0'; c++)/*for-each*/
      onKey(fgetc(stdin));
  }
}
