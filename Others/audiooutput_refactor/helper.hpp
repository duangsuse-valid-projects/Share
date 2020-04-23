#pragma once

#include <functional>
#include <stdexcept>
#include <initializer_list>

#include "primitive_data.hpp"

const int SEC_US = 1000000;

template<typename I>
auto cyclicCoerceLT (I n, I stop) -> I {
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

static inline QSlider* makeQSlider(Qt::Orientation orientation, int min, int max, int step)
{
  QSlider* it = new QSlider(orientation);
  it->setMinimum(min); it->setMaximum(max);
  it->setSingleStep(step);
  return it;
}

template<typename T>
static inline T* layoutOf(std::initializer_list<QWidget*> childs) {
  T* widget = new T;
  for (auto child : childs) {
    widget->addWidget(child);
  }
  return widget;
}
