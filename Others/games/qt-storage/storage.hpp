#pragma once

#include <QWidget>
#include <QTextEdit>
#include <QPushButton>

#include <QSettings>
#include <QTimer>
#include <QKeyEvent>

/**
 * @brief Sample app using config persistence and executes an command periodic
 */
class StorageApp: public QWidget {
public:
  StorageApp(); ~StorageApp();
  auto bindLayout() -> void;
  auto doSchedule() -> void;
public slots:
  auto onShowTime() -> void;
  auto onResetDefaults() -> void;
  auto onExecuteCommand() -> void;
  auto onExit() -> void;
private:
  QTextEdit* tinTime;
  QTextEdit* tinCmd;
  QPushButton* btnShowTime;
private:
  QTimer sched;
  int timeout;
  QSettings settings;
private:
  const int maxH_tinTime = 30;
  const int msPerSec = 1000;
  const char* iniTime = "time";
  const char* iniCmd = "command";
};
