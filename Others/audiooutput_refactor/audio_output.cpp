/****************************************************************************
**
** Copyright (C) 2017 The Qt Company Ltd.
** Contact: https://www.qt.io/licensing/
**
** This file is part of the examples of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:BSD$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** BSD License Usage
** Alternatively, you may use this file under the terms of the BSD license
** as follows:
**
** "Redistribution and use in source and binary forms, with or without
** modification, are permitted provided that the following conditions are
** met:
**   * Redistributions of source code must retain the above copyright
**     notice, this list of conditions and the following disclaimer.
**   * Redistributions in binary form must reproduce the above copyright
**     notice, this list of conditions and the following disclaimer in
**     the documentation and/or other materials provided with the
**     distribution.
**   * Neither the name of The Qt Company Ltd nor the names of its
**     contributors may be used to endorse or promote products derived
**     from this software without specific prior written permission.
**
**
** THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
** "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
** LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
** A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
** OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
** LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
** DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
** THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
** (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
** OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."
**
** $QT_END_LICENSE$
**
****************************************************************************/

#include "audio_output.h"
#include "helper.h"

#include <QDebug>

AudioGenerator::AudioGenerator(QAudioFormat &format, usec durationUs, cnt sampleRate)
  : format(format), durationUs(durationUs), sampleRate(sampleRate)
{
  require(format.isValid(), "format");
  generateData();
}

void AudioGenerator::start()
{
  open(QIODevice::ReadOnly);
}

void AudioGenerator::stop()
{
  position = 0; close();
}

void AudioGenerator::generateData()
{
  int bytePerSample = nByteFromBit(format.sampleSize());
  int bytePerSec = format.sampleRate() * bytePerSample;
  // [sample]: (rate * size) * n_channel
  size_t byteLength = format.channelCount() * (secFromUs(this->durationUs) * bytePerSec);
  Q_ASSERT(byteLength % bytePerSec == 0);

  audioBuffer.resize(byteLength);

  byte* ys = reinterpret_cast<byte*>(audioBuffer.data());
  for (size_t i=0, x=0; i != byteLength; i += bytePerSample, x += 1) {
      const qreal y = waveY(x);
      for (int _t=0; _t<format.channelCount(); _t++) {
        writeSample(ys, i, y);
      }
    }
}
qreal AudioGenerator::waveY(unsigned x) {
  return qCos(2 * M_PI * sampleRate * qreal(x % format.sampleRate()) / format.sampleRate());
}
auto AudioGenerator::writeUInt16(byte* dst, quint16 v) -> void {
  if (this->format.byteOrder() == QAudioFormat::LittleEndian)
    qToLittleEndian(v, dst);
  else
    qToBigEndian(v, dst);
};

auto AudioGenerator::writeSample(byte* ys, idx i, qreal y) -> void {
  auto sampleType = format.sampleType();
  switch (format.sampleSize()) {
    case BYTE_WIDTH:
      if (sampleType == QAudioFormat::UnSignedInt) {
          ys[i] = static_cast<quint8>((1.0 + y) / 2 * QUINT8_MAX);
        } else if (format.sampleType() == QAudioFormat::SignedInt) {
          ys[i] = static_cast<qint8>(y * QINT8_MAX);
        } else unsupported();
      break;
    case SHORT_WIDTH:
      if (sampleType == QAudioFormat::UnSignedInt) {
          writeUInt16(&ys[i], static_cast<quint16>((1.0 + y) / 2 * QUINT16_MAX));
        } else if (format.sampleType() == QAudioFormat::SignedInt) {
          writeUInt16(&ys[i], static_cast<qint16>(y * QINT16_MAX));
        } else unsupported();
      break;
    default:
      unsupported();
      break;
    }
}

longcnt AudioGenerator::readData(char* data, longcnt len)
{
  if (audioBuffer.isEmpty()) return 0;
  cnt pos = 0;
  for (cnt nChunk; pos < len; pos += nChunk) {
    cnt nBufferRest = audioBuffer.size() - position;
    nChunk = qMin(cnt(len) - pos, nBufferRest);
    memcpy(data+pos, audioBuffer.constData()+position, nChunk);
    position = coerceCycle(position + nChunk, cnt(audioBuffer.size()));
  }
  return pos; //count read
}

qint64 AudioGenerator::writeData(const char *data, qint64 len)
{
  Q_UNUSED(data); Q_UNUSED(len);
  return 0;
}

qint64 AudioGenerator::bytesAvailable() const
{
  return audioBuffer.size() + QIODevice::bytesAvailable();
}

AudioTest::AudioTest(): pushTimer(new QTimer(this))
{
  initializeWindow();
  initializeAudio(QAudioDeviceInfo::defaultOutputDevice());
}

AudioTest::~AudioTest()
{
  pushTimer->stop();
}

void AudioTest::initializeWindow()
{
  QWidget *window = new QWidget;
  QVBoxLayout *layout = new QVBoxLayout;

  boxDevice = new QComboBox(this);
  const QAudioDeviceInfo &defaultDeviceInfo = QAudioDeviceInfo::defaultOutputDevice();
  boxDevice->addItem(defaultDeviceInfo.deviceName(), QVariant::fromValue(defaultDeviceInfo));
  for (auto deviceInfo : QAudioDeviceInfo::availableDevices(QAudio::AudioOutput)) {
      if (deviceInfo != defaultDeviceInfo)
        boxDevice->addItem(deviceInfo.deviceName(), QVariant::fromValue(deviceInfo));
    }
  connect(boxDevice, QOverload<int>::of(&QComboBox::activated), this, &AudioTest::deviceChanged);

  btnMode = new QPushButton(this);
  connect(btnMode, &QPushButton::clicked, this, &AudioTest::toggleMode);

  btnSuspendResume = new QPushButton(this);
  connect(btnSuspendResume, &QPushButton::clicked, this, &AudioTest::toggleSuspendResume);

  QHBoxLayout *volumeBox = new QHBoxLayout;
  labelVolume = new QLabel;
  labelVolume->setText(tr("Volume:"));
  sliderVolume = new QSlider(Qt::Horizontal);
  sliderVolume->setMinimum(0);
  sliderVolume->setMaximum(100);
  sliderVolume->setSingleStep(10);
  connect(sliderVolume, &QSlider::valueChanged, this, &AudioTest::volumeChanged);
  volumeBox->addWidget(labelVolume);
  volumeBox->addWidget(sliderVolume);

  layout->addWidget(boxDevice);
  layout->addWidget(btnMode);
  layout->addWidget(btnSuspendResume);
  layout->addItem(volumeBox);

  window->setLayout(layout);
  setCentralWidget(window);
  window->show();
}

void AudioTest::initializeAudio(const QAudioDeviceInfo &deviceInfo)
{
  QAudioFormat format;
  format.setSampleRate(44100);
  format.setChannelCount(1);
  format.setSampleSize(16);
  format.setCodec("audio/pcm");
  format.setByteOrder(QAudioFormat::LittleEndian);
  format.setSampleType(QAudioFormat::SignedInt);

  if (!deviceInfo.isFormatSupported(format)) {
      qWarning() << "Default format not supported - trying to use nearest";
      format = deviceInfo.nearestFormat(format);
    }

  const int durationSeconds = 1;
  const int toneSampleRateHz = 600;
  audioGenerator.reset(new AudioGenerator(format, durationSeconds * 1000000, toneSampleRateHz));
  audioOutput.reset(new QAudioOutput(deviceInfo, format));
  audioGenerator->start();

  qreal initialVolume = QAudio::convertVolume(audioOutput->volume(),
                                              QAudio::LinearVolumeScale,
                                              QAudio::LogarithmicVolumeScale);
  sliderVolume->setValue(qRound(initialVolume * 100));
  toggleMode();
}

void AudioTest::deviceChanged(int index)
{
  audioGenerator->stop();
  audioOutput->stop();
  audioOutput->disconnect(this);
  initializeAudio(boxDevice->itemData(index).value<QAudioDeviceInfo>());
}

void AudioTest::volumeChanged(int value)
{
  qreal linearVolume = QAudio::convertVolume(value / qreal(100),
                                             QAudio::LogarithmicVolumeScale,
                                             QAudio::LinearVolumeScale);

  audioOutput->setVolume(linearVolume);
}

void AudioTest::toggleMode()
{
  pushTimer->stop();
  audioOutput->stop();
  toggleSuspendResume();

  if (isPullMode) {
      //switch to pull mode (QAudioOutput pulls from Generator as needed)
      btnMode->setText(tr("Enable push mode"));
      audioOutput->start(audioGenerator.data());
    } else {
      //switch to push mode (periodically push to QAudioOutput using a timer)
      btnMode->setText(tr("Enable pull mode"));
      auto io = audioOutput->start();
      pushTimer->disconnect();

      connect(pushTimer, &QTimer::timeout, [this, io]() {
          if (audioOutput->state() == QAudio::StoppedState)
            return;

          QByteArray buffer(32768, 0);
          int chunks = audioOutput->bytesFree() / audioOutput->periodSize();
          while (chunks) {
              const qint64 len = audioGenerator->read(buffer.data(), audioOutput->periodSize());
              if (len)
                io->write(buffer.data(), len);
              if (len != audioOutput->periodSize())
                break;
              --chunks;
            }
        });

      pushTimer->start(20);
    }

  isPullMode = !isPullMode;
}

void AudioTest::toggleSuspendResume()
{
  if (audioOutput->state() == QAudio::SuspendedState || audioOutput->state() == QAudio::StoppedState) {
      audioOutput->resume();
      btnSuspendResume->setText(tr("Suspend recording"));
    } else if (audioOutput->state() == QAudio::ActiveState) {
      audioOutput->suspend();
      btnSuspendResume->setText(tr("Resume playback"));
    } else if (audioOutput->state() == QAudio::IdleState) {
      // no-op
    }
}

