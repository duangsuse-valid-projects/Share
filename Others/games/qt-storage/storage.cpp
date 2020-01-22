#include <QApplication>
#include <QVBoxLayout>
#include "storage.hpp"

#include <QDebug>
#include <QMessageBox>

auto toString(int i) -> QString {
  QString text; text.setNum(i);
  return text;
}
StorageApp::StorageApp(): sched(new QTimer), settings("org.duangsuse", "sample_StorageApp")
{
  this->tinTime = new QTextEdit(this);
  this->tinCmd = new QTextEdit(this);
  this->btnShowTime = new QPushButton(this);

  auto t = new QVBoxLayout(this);
  tinTime->setMaximumHeight(maxH_tinTime);
  t->addWidget(tinTime);
  t->addWidget(tinCmd);
  t->addWidget(btnShowTime);
  setLayout(t);

  bindLayout();
  doSchedule();
}
StorageApp::~StorageApp() = default;

auto StorageApp::bindLayout() -> void {
  auto time = settings.value(iniTime, 30).toInt();
  tinTime->setText(toString(time));
  tinCmd->setText(settings.value(iniCmd, "systemctl suspend").toString());

  this->timeout = tinTime->toPlainText().toInt();
  connect(&sched, &QTimer::timeout, this, &StorageApp::onExecuteCommand);
  connect(btnShowTime, &QPushButton::clicked, this, &StorageApp::onShowTime);
}

auto StorageApp::doSchedule() -> void {
  qInfo() << "Reset timer back " << timeout << "s";
  sched.start(timeout *msPerSec);
}
auto StorageApp::onShowTime() -> void {
  btnShowTime->setText(toString(sched.remainingTime() /msPerSec));
}
auto StorageApp::onExecuteCommand() -> void {
  qInfo() << "Executing: " << tinCmd->toPlainText();
  system(tinCmd->toPlainText().toStdString().c_str());
  doSchedule();
}
auto StorageApp::onExit() -> void {
  qInfo() << "Good byte";
  settings.setValue(iniTime, tinTime->toPlainText().toInt());
  settings.setValue(iniCmd, tinCmd->toPlainText());
}
auto StorageApp::onResetDefaults() -> void {
  qInfo() << "Reset config";
  settings.clear();
  QMessageBox::warning(this, QString("Reset Note"), QString("Restart needed"));
}

auto main(int argc, char* argv[]) -> int {
  QApplication qa(argc, argv);
  QApplication::setApplicationName("Command Periodic");
  StorageApp app;
  app.show();
  QObject::connect(&qa, &QApplication::lastWindowClosed, &app, &StorageApp::onExit);
  return QApplication::exec();
}
