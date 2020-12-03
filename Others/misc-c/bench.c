#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h> //getenv, execvp, fork

static pid_t pcA, pcB;
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
#define mustNotM1(x) x; if (x==-1) exit(-1)
#define ostime() time(NULL)
int main(int argc, char** argv) {
  char* ps = (pcA!=0)? psA : (pcB!=0)? psB : NULL;
  if (ps!=NULL) { for (int i=0; i<nTime; i++) execvp(ps, arg); } 
  nTime = ienvOr(2, "nTime");
  psA=envOr("echo", "pA"), psB=envOr("echo", "pB");
  int tcA, tcB, tA, tB;
  char** argz = argv;
  for (int i=0; i<argc; i++) {
    tA=ostime(); pcA = mustNotM1(fork()); tcA+=ostime()-tA;
    tB=ostime(); pcB = mustNotM1(fork()); tcB+=ostime()-tB;
    pcA=pcB=0;
    argz++; arg[0]=*argz;
  }
  fprintf(stderr, "%s=%d, %s=%d", psA, tcA, psB, tcB);
  return 0;
}

