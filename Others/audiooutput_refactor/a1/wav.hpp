#pragma once
#include <QByteArray>
#include <QObject>

#include <QAudioOutput>
#include <QAudioDeviceInfo>
#include <QIODevice>

#include <QComboBox>
#include <QLabel>
#include <QMainWindow>
#include <QPushButton>
#include <QTimer>
#include <QVBoxLayout>

#include "../primitive_data.hpp"
#include "help.hpp"

class AudioGenerator : public QIODevice { Q_OBJECT
public:
  AudioGenerator(QAudioFormat &fmt, usec dur);
  void start(); void stop();

  longcnt readData(char *data, longcnt n_max) override;
  longcnt writeData(const char *data, longcnt n) override;
  longcnt bytesAvailable() const override;

protected:
  QByteArray bufAud;
  void writeBuf(byte *ys, idx i, qreal y);
  virtual void wav() = 0;

  QAudioFormat &fmt; usec dur;
private:
  cnt pWav = 0;
};


class AudioTest : public QMainWindow { Q_OBJECT
public:
  AudioTest();
  ~AudioTest();
  void init();
  void initAud(QAudioDeviceInfo device_info, int pitch);

  bool usePull = true;
  void btnUsePull();
  int DEFAULT_PITCH = 800;

private:
  AudioGenerator*gen; QAudioOutput*gout; QAudioDeviceInfo qDevice;
  QTimer*pushTimer;
  QSlider*svVol,*svPit;
  void btnPlay();
  void device(int index);
  void volume(int);
  void pitch(int);
};
