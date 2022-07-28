#pragma once

#include <functional>
#include <stdexcept>
#include <initializer_list>
#include <QSlider>
#include <QLayoutItem>
#define fn static inline auto
const int SEC_US = 1000000;

template<typename I>
auto cycleLT(I stop, I n) -> I {
  return n % stop;
}

fn require(bool p, std::string name) {
  if (!p) throw std::invalid_argument("invalid "+name);
}

Q_NORETURN fn unsupported() {
  throw std::runtime_error("unspported");
}

fn repeat(unsigned n, const std::function<void(unsigned)> &op) {
  for (unsigned i=0; i<n; i++) op(i);
}

static inline QSlider* makeQSlider(Qt::Orientation orientation, int min, int max, int step)
{
  QSlider* it = new QSlider(orientation);
  it->setMinimum(min); it->setMaximum(max);
  it->setSingleStep(step);
  return it;
}

using El=QWidget*;
template<typename T>
fn el(std::initializer_list<El> childs) {
  T* widget = new T;
  for (auto child : childs) {
    widget->addWidget(child);

  }
  return widget;
}
template<typename A,typename B,typename C,typename D>
fn acon(A s,B si, C r,D sl) { QObject::connect(s,si,r,sl); return s; }

template<typename T>
fn el(std::initializer_list<El> childs, std::initializer_list<QLayoutItem*> subs) {
  T* e = new T;
  for (auto x : childs) e->addWidget(x);
  for (auto x : subs) e->addItem(x);
  return e;
}

//fxxk C++ this&visib
#define sent(T) qobject_cast<T*>(sender())
