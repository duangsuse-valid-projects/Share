#pragma once

#include <functional>
#include <stdexcept>

#include "primitiveData.h"

auto secFromUs(usec us) -> sec { return us / 1000000; }
auto nByteFromBit(cnt n_bit) -> cnt { return n_bit / BYTE_WIDTH; }

template<typename I>
auto coerceCycle(I n, I stop) -> I {
  return n % stop;
}

auto require(bool p, const std::string &name) -> void {
  if (!p) throw std::invalid_argument("invalid "+name);
}

Q_NORETURN auto unsupported() {
  throw std::runtime_error("unspported");
}

auto repeat(unsigned n, const std::function<void(unsigned)> &op) -> void {
  for (unsigned i=0; i<n; i++) op(i);
}
