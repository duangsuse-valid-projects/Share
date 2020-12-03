#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char* INPUT = "1,2,3";
int main(void) {
  FILE* fp=fopen("a.txt", "w+");
  fwrite(INPUT, 1, sizeof(INPUT), fp);
  fseek(fp, 0, SEEK_SET);
#ifdef __cplusplus
  int* xs = new int;
#else
  int* xs = malloc(1);
#endif
  for (int i=0; !feof(fp); i++){
    xs=(int*)realloc(xs, i+1);
    fscanf(fp, "%d", &xs[i]);
    printf("%d ", xs[i]);
    if(fgetc(fp) != ',') break;
  }
#ifdef __cplusplus
  delete xs;
#else
  free(xs);
#endif
  return 0;
}
