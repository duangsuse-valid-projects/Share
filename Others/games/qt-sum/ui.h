#pragma once

#include <functional>
#include <initializer_list>

#include <QObject>
#include <QVariant>
#include <QWidget>
#include <QBoxLayout>
#include <QAbstractSlider>

using namespace std;

template <typename T>
using Producer = function<T()>;
template <typename T>
using Consumer = function<void(T)>;

using BoxLayoutConfig = Consumer<QBoxLayout*>;
using WidgetConfig = Consumer<QWidget*>;

template <typename QBOX>
auto makeBoxLayout(Producer<QBOX*> creator, BoxLayoutConfig init, initializer_list<QWidget*> childs) -> QBOX* {
  auto box = creator(); init(box);
  for (QWidget* child : childs) {
    box->addWidget(child);
  }
  return box;
}
auto verticalLayout(QWidget* parent, BoxLayoutConfig init, initializer_list<QWidget*> childs) -> QVBoxLayout* {
  return makeBoxLayout<QVBoxLayout>([parent]() { return new QVBoxLayout(parent); }, init, childs);
}
auto horizontalLayout(QWidget* parent, BoxLayoutConfig init, initializer_list<QWidget*> childs...) -> QHBoxLayout* {
  return makeBoxLayout<QHBoxLayout>([parent]() { return new QHBoxLayout(parent); }, init, childs);
}
auto asWidget(QBoxLayout* lay) -> QWidget* {
  auto widg = new QWidget;
  widg->setLayout(lay);
  return widg;
}
template <typename QWID>
auto widgetOf(QWID* w, WidgetConfig init) -> QWID* {
  init(w); return w;
}

BoxLayoutConfig layoutWithDefaults = [](QBoxLayout*){};
WidgetConfig withDefaults = [](QWidget*){};

auto configured(initializer_list<BoxLayoutConfig> config) -> BoxLayoutConfig {
  return [config](QBoxLayout* w) { for (BoxLayoutConfig cfg : config) cfg(w); };
}
auto configured(initializer_list<WidgetConfig> config) -> WidgetConfig {
  return [config](QWidget* w) { for (WidgetConfig cfg : config) cfg(w); };
}

auto withTooltip(const QString tooltip) -> WidgetConfig {
  return [tooltip](QWidget* w) { w->setToolTip(tooltip); };
}
auto withText(const QString text) -> WidgetConfig {
  return [text](QWidget* w) { w->setProperty("text", QVariant(text)); };
}
auto with(const char* property_name, QVariant value) -> WidgetConfig {
  return [property_name, value](QWidget* w) { w->setProperty(property_name, value); };
}


auto withRange(int min, int max) -> WidgetConfig {
  return [min, max](QWidget* w) { dynamic_cast<QAbstractSlider*>(w)->setRange(min, max); };
}
auto withStep(int step) -> WidgetConfig {
  return [step](QWidget* w) { dynamic_cast<QAbstractSlider*>(w)->setSingleStep(step); };
}
