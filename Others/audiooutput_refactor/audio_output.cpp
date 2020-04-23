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

#include "audio_output.hpp"
#include "helper.hpp"

#include <QDebug>

AudioGenerator::AudioGenerator(QAudioFormat &format, usec durationUs)
  : format(format), durationUs(durationUs)
{
  require(format.isValid(), "format");
}

void AudioGenerator::start() { open(QIODevice::ReadOnly); generateData(); }
void AudioGenerator::stop() { position = 0; close(); }

longcnt AudioGenerator::readData(char* data, longcnt len)
{
  if (audioBuffer.isEmpty()) return 0;
  cnt pos = 0, lenv = cnt(len);
  cnt &wavePos = position, waveLen = cnt(audioBuffer.size());
  for (cnt n_chunk; pos < lenv; pos += n_chunk) {
    n_chunk = qMin(lenv - pos, waveLen - wavePos);
    memcpy(data+pos, audioBuffer.constData()+wavePos, n_chunk);
    wavePos = cyclicCoerceLT(wavePos + n_chunk, waveLen);
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

auto AudioGenerator::writeUInt16(byte* dst, quint16 v) -> void {
  if (this->format.byteOrder() == QAudioFormat::LittleEndian) qToLittleEndian(v, dst);
  else qToBigEndian(v, dst);
};

auto AudioGenerator::writeSample(byte* ys, idx i, qreal y) -> void {
  auto sampleType = format.sampleType();
  switch (format.sampleSize()) {
    case BYTE_BITS:
      if (sampleType == QAudioFormat::UnSignedInt) {
        ys[i] = static_cast<u8>((1.0 + y) / 2 * QUINT8_MAX);
      } else if (format.sampleType() == QAudioFormat::SignedInt) {
        ys[i] = static_cast<i8>(y * QINT8_MAX);
      } else unsupported();
      break;
    case SHORT_BITS:
      if (sampleType == QAudioFormat::UnSignedInt) {
        writeUInt16(&ys[i], static_cast<u16>((1.0 + y) / 2 * QUINT16_MAX));
      } else if (format.sampleType() == QAudioFormat::SignedInt) {
        writeUInt16(&ys[i], static_cast<i16>(y * QINT16_MAX));
      } else unsupported();
      break;
    default:
      unsupported();
      break;
  }
}

SinWaveGenerator::SinWaveGenerator(QAudioFormat& format, usec durationUs, int pitch)
  : AudioGenerator(format, durationUs), pitch(pitch) {}

void SinWaveGenerator::generateData()
{
  int bytePerSample = format.sampleSize() / BYTE_BITS;
  int bytePerSec = format.sampleRate() * bytePerSample;
  // [sample]: (rate * size) * n_channel
  cnt n_byte = format.channelCount() * (this->durationUs / SEC_US * bytePerSec);
  Q_ASSERT(n_byte % bytePerSec == 0);

  audioBuffer.resize(n_byte);

  byte* ys = reinterpret_cast<byte*>(audioBuffer.data());
  for (idx i=0, x=0; i != n_byte; i += bytePerSample, x += 1) {
    const qreal y = waveY(x % format.sampleRate());
    for (int _t=0; _t<format.channelCount(); _t++) { writeSample(ys, i, y); }
  }
}

qreal SinWaveGenerator::waveY(int x) {
  return qCos(2*M_PI* qreal(x) / format.sampleRate() * pitch);
}


AudioTest::AudioTest(): pushTimer(new QTimer(this))
{
  initializeWindow();
  initializeAudio(QAudioDeviceInfo::defaultOutputDevice(), DEFAULT_PITCH);
}
AudioTest::~AudioTest() { pushTimer->stop(); }

void AudioTest::initializeWindow()
{
  QWidget *window = new QWidget;

  boxDevice = new QComboBox(this);
  const auto &defaultDeviceInfo = QAudioDeviceInfo::defaultOutputDevice();
  boxDevice->addItem(defaultDeviceInfo.deviceName(), QVariant::fromValue(defaultDeviceInfo));
  for (auto deviceInfo : QAudioDeviceInfo::availableDevices(QAudio::AudioOutput)) {
    if (deviceInfo != defaultDeviceInfo)
    boxDevice->addItem(deviceInfo.deviceName(), QVariant::fromValue(deviceInfo));
  }
  connect(boxDevice, QOverload<int>::of(&QComboBox::activated), this, &AudioTest::deviceChanged);

  btnMode = new QPushButton(this); connect(btnMode, &QPushButton::clicked, this, &AudioTest::toggleMode);
  btnSuspendResume = new QPushButton(this); connect(btnSuspendResume, &QPushButton::clicked, this, &AudioTest::toggleSuspendResume);

  sliderVolume = makeQSlider(Qt::Horizontal, 0, 100, 10); connect(sliderVolume, &QSlider::valueChanged, this, &AudioTest::volumeChanged);
  sliderPitch = makeQSlider(Qt::Horizontal, 0, DEFAULT_PITCH, 10); connect(sliderPitch, &QSlider::valueChanged, this, &AudioTest::pitchChanged);

  QVBoxLayout *layout = layoutOf<QVBoxLayout>({ boxDevice, btnMode, btnSuspendResume });
  layout->addItem(layoutOf<QHBoxLayout>({new QLabel(tr("Volume:")), sliderVolume}));
  layout->addItem(layoutOf<QHBoxLayout>({new QLabel(tr("Pitch:")), sliderPitch}));

  window->setLayout(layout);
  setCentralWidget(window);
  window->show();
}


void AudioTest::initializeAudio(const QAudioDeviceInfo &deviceInfo, int pitch)
{
  this->currentDevice = deviceInfo;
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

  auto oldVolume = (audioOutput.isNull())? 0.5 : audioOutput->volume(); // wtf doesn't work
  audioGenerator.reset(new SinWaveGenerator(format, 1 * SEC_US, pitch));
  audioOutput.reset(new QAudioOutput(deviceInfo, format));
  audioGenerator->start();

  qreal initialVolume = QAudio::convertVolume(oldVolume, QAudio::LinearVolumeScale, QAudio::LogarithmicVolumeScale);
  sliderVolume->setValue(qRound(initialVolume * 100));
  toggleMode();
}

void AudioTest::deviceChanged(int index)
{
  audioGenerator->stop();
  audioOutput->stop();
  audioOutput->disconnect(this);
  initializeAudio(boxDevice->itemData(index).value<QAudioDeviceInfo>(), DEFAULT_PITCH);
  sliderPitch->setValue(DEFAULT_PITCH);
}

void AudioTest::volumeChanged(int value)
{
  qreal linearVolume = QAudio::convertVolume(value / qreal(100), QAudio::LogarithmicVolumeScale, QAudio::LinearVolumeScale);

  audioOutput->setVolume(linearVolume);
}

void AudioTest::pitchChanged(int value) {
  audioGenerator->pitch = value;
  initializeAudio(currentDevice, value);
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
      if (audioOutput->state() == QAudio::StoppedState) return;

      QByteArray buffer(1+QINT16_MAX, 0);
      qint64 n_chunk = audioOutput->bytesFree() / audioOutput->periodSize();
      for (qint64 len; n_chunk != 0; n_chunk--) {
        len = audioGenerator->read(buffer.data(), audioOutput->periodSize());
        if (len != 0) io->write(buffer.data(), len);
        if (len != audioOutput->periodSize()) break;
      }
    });

    pushTimer->start(100);
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

