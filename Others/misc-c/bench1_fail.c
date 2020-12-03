#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h> //getenv, execvp, fork

static pid_t pcA=-1, pcB=-1;
static char *arg[]={"",0}, *psA, *psB;
static int nTime;

char* envOr(char* deft, char* name) {
  char* s = getenv(name);
  return (s==NULL)? deft : s;
}
int ienvOr(int deft, char* name) {
  char* s = getenv(name);
  return (s==NULL)? deft : atoi(s);
}
#define mustNotM1(x) x; if (x==0) child(); else if (x==-1) exit(-1)
#define ostime() time(NULL)
void child() {
  char* ps = (pcA)? psA : (pcB!=0)? psB : NULL;
  if (ps!=NULL) { for (int i=0; i<nTime; i++) execvp(ps, arg); } 
}
int main(int argc, char** argv) {
  argv++,argc--;

  nTime = ienvOr(2, "nTime");
  psA=envOr("echo", "pA"), psB=envOr("echo", "pB");
  int tcA=0, tcB=0, tA, tB;
  char** argz = argv;
  for (int i=0; i<argc; i++) {
    arg[0]=*argz; argz++;
    tA=ostime(); pcA = mustNotM1(fork()); tcA+=ostime()-tA;
    tB=ostime(); pcB = mustNotM1(fork()); tcB+=ostime()-tB;
    pcA=pcB=0;
  }
  fprintf(stderr, "%s=%d, %s=%d\n", psA, tcA, psB, tcB);
  return 0;
}

