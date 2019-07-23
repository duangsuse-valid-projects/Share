#include <csignal>
#include <iostream>

using namespace std;

void doTrapSigInt() {
  signal(SIGINT, [](int s) { cout << "SIGINT ("<<s<<") Received" << endl; });
}

[[noreturn]] int main() {
  doTrapSigInt();
  for(;;){}
}
