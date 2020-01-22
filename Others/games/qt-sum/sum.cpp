#include <QApplication>
#include "sum.hpp"
#include "ui.h"

SumApp::SumApp() {
  this->x0 = widgetOf(new QSlider(Qt::Horizontal, this),
    configured({ withTooltip("x0"), withRange(0, 100) }));
  this->x1 = widgetOf(new QSlider(Qt::Horizontal, this),
    configured({ withTooltip("x1"), withRange(0, 100) }));
  this->result = widgetOf(new QLabel(this), withDefaults);
  this->btnSum = widgetOf(new QPushButton(this), withText(QString("sum")));

  auto t = verticalLayout(this, layoutWithDefaults, {
    x0, x1,
    asWidget(horizontalLayout(this, layoutWithDefaults, {
      btnSum, result
    }))
  });
  setCentralWidget(asWidget(t));
  bindLayout();
}
SumApp::~SumApp() = default;

auto SumApp::bindLayout() -> void {
  connect(this->btnSum, SIGNAL(clicked()), this, SLOT(onSum()));
}

auto SumApp::onSum() -> void {
  auto res = x0->value() + x1->value();
  QString text; text.setNum(res);
  result->setText(text);
}

int main(int argc, char *argv[]) {
  QApplication _(argc, argv);
  QApplication::setApplicationName("Simple Add calculator");
  SumApp app;
  app.show();
  return QApplication::exec();
}
