#include <QApplication>
#include <QDebug>
#include "wav.hpp"

AudioGenerator::AudioGenerator(QAudioFormat &fmt, usec dur): fmt(fmt), dur(dur) {
  require(fmt.isValid(), "format");
}
void AudioGenerator::start() { open(QIODevice::ReadOnly); wav(); }
void AudioGenerator::stop() { pWav = 0; close(); }

qint64 AudioGenerator::writeData(const char *data, qint64 len) { return 0;} //R-only, for pull-audIO
qint64 AudioGenerator::bytesAvailable() const {
  return bufAud.size() + QIODevice::bytesAvailable();
}

void AudioGenerator::writeBuf(byte *ys, idx i, qreal y) {
  auto ty = fmt.sampleType();
  switch (fmt.sampleSize()) {

#define W8(v) ys[i] = v;
#define W16(v) if (this->fmt.byteOrder() == QAudioFormat::LittleEndian) qToLittleEndian(v, ys+i); else qToBigEndian(v, ys+i);
  //^know what data read()!
#define W(nb) \
  if (ty == QAudioFormat::UnSignedInt) {W##nb(static_cast<u##nb>((1.0 + y) / 2 * QUINT##nb##_MAX))} \
  else if (ty == QAudioFormat::SignedInt) {W##nb(static_cast<i##nb>(y * QINT##nb##_MAX))} else unsupported(); \
break;

  case BYTE_BITS: W(8)
  case SHORT_BITS: W(16)
  default: unsupported();
  }
}

class SinWaveGenerator : public AudioGenerator {
public:
  int pitch;
#define wavY(x) qCos(2*M_PI* qreal(x) / fmt.sampleRate() * pitch)

  SinWaveGenerator(QAudioFormat& fmt, usec dur, int pitch): AudioGenerator(fmt, dur), pitch(pitch) {}
  void wav() override {
    int nbSamp = fmt.sampleSize() / BYTE_BITS; //bytePerSample
    int nbSec = fmt.sampleRate() * nbSamp;
    // [sample]: (rate * size) * n_channel
    cnt n = fmt.channelCount() * (this->dur/SEC_US * nbSec);
    Q_ASSERT(n % nbSec == 0);

    bufAud.resize(n);
    byte* ys = reinterpret_cast<byte*>(bufAud.data());
    for (idx i=0, x=0; i != n; i += nbSamp, x += 1) {
        //for (int _t=0; _t<fmt.channelCount(); _t++) {
        writeBuf(ys, i, wavY(x % fmt.sampleRate()));
    }
  }
};
longcnt AudioGenerator::readData(char* data, longcnt len) {
  if (bufAud.isEmpty()) return 0;
  cnt pos = 0, lenv = cnt(len);
  cnt &wavePos = pWav, waveLen = cnt(bufAud.size());
  for (cnt n; pos < lenv; pos += n) {
    n = qMin(lenv - pos, waveLen - wavePos);
    memcpy(data+pos, bufAud.constData()+wavePos, n);
    wavePos = cycleLT(waveLen, wavePos + n);
  }
  return pos; //count read
}



int main(int argc, char *argv[]) {
  QApplication _(argc, argv);
  QApplication::setApplicationName("Audio Test");
  AudioTest test;test.show();
  return QApplication::exec();
}


AudioTest::AudioTest(): pushTimer(new QTimer(this)) {
  init();
  initAud(QAudioDeviceInfo::defaultOutputDevice(), DEFAULT_PITCH);
}
AudioTest::~AudioTest() { pushTimer->stop(); }

void AudioTest::init() {
  auto win = new QWidget;
  auto _0 = new QComboBox(this);
  for (auto deviceInfo : QAudioDeviceInfo::availableDevices(QAudio::AudioOutput)/*default first*/) {
    _0->addItem(deviceInfo.deviceName(), QVariant::fromValue(deviceInfo));
  }
  connect(_0, QOverload<int>::of(&QComboBox::activated), this, &AudioTest::device);
  svVol=acon(makeQSlider(Qt::Horizontal, 0, 100, 10), &QSlider::valueChanged, this, &AudioTest::volume);
  svPit=acon(makeQSlider(Qt::Horizontal, 0, DEFAULT_PITCH, 10), &QSlider::valueChanged, this, &AudioTest::pitch);

  win->setLayout(el<QVBoxLayout>({ _0,
    acon(new QPushButton(this), SIGNAL(clicked()), this, SLOT(btnUsePull)), //label are in SLOT()
    acon(new QPushButton(this), SIGNAL(clicked), this, SLOT(btnPlay))
  },{
    el<QHBoxLayout>({new QLabel(tr("Volume:")), svVol}),
    el<QHBoxLayout>({new QLabel(tr("Pitch:")), svPit})
  }));
  setCentralWidget(win);
  //win->show();
}

QAudioFormat audFmt(std::array<int,3> a) {
  QAudioFormat it;
  it.setSampleRate(a[0]);
  it.setChannelCount(a[1]);
  it.setSampleSize(a[2]);
  it.setCodec("audio/pcm");
  it.setByteOrder(QAudioFormat::LittleEndian);
  it.setSampleType(QAudioFormat::SignedInt);
  return it;
}

void AudioTest::initAud(QAudioDeviceInfo dv, int pitch) {
  qDevice=dv; auto fmt=audFmt({44100,1,16});
  if (!dv.isFormatSupported(fmt)) {
    qWarning() << "Default format not supported - trying to use nearest";
    fmt = dv.nearestFormat(fmt);
  }
  auto v0 = (gout==nullptr||1)? 0.5 : gout->volume(); // wtf doesn't work
  gen=new SinWaveGenerator(fmt, 1 * SEC_US, pitch);
  gout=new QAudioOutput(dv, fmt);

  // gout->start();
  qreal vInit = QAudio::convertVolume(v0, QAudio::LinearVolumeScale, QAudio::LogarithmicVolumeScale);
  svVol->setValue(qRound(vInit * 100));
  svPit->setValue(DEFAULT_PITCH);
//  btnUsePull();
  //gout->stop();gout->resume();
  gen->start();
  gout->start(gen);
}

void AudioTest::btnPlay() {
  if (gout->state() == QAudio::SuspendedState || gout->state() == QAudio::StoppedState) {
    gout->resume();
    sent(QLabel)->setText(tr("Suspend recording"));
  } else if (gout->state() == QAudio::ActiveState) {
    gout->suspend();
    sent(QLabel)->setText(tr("Resume playback"));
  } //QAudio::IdleState
}


void AudioTest::btnUsePull() {
  pushTimer->stop();
  gout->stop();
//  btnPlay(); // NO more vars, even for init()!!!

  if (usePull) {
    //switch to pull mode (QAudioOutput pulls from Generator as needed)
    sent(QPushButton)->setText(tr("Go push"));
    gout->start(gen); //no QPointer
  } else {
    //switch to push mode (periodically PUSH to QAudioOutput using a timer)
    sent(QPushButton)->setText(tr("Go pull"));
    auto io = gout->start();
    pushTimer->disconnect();
    connect(pushTimer, &QTimer::timeout, [this, io]() {
      if (gout->state() == QAudio::StoppedState) return;

      QByteArray buffer(1+QINT16_MAX, 0);
      qint64 n_chunk = gout->bytesFree() / gout->periodSize();
      for (qint64 n; n_chunk != 0; n_chunk--) {
        n = gen->read(buffer.data(), gout->periodSize()); //L39
        if (n != 0) io->write(buffer.data(), n);
        if (n != gout->periodSize()) break;
      }
    });

    pushTimer->start(100);
  }
  usePull^=1;
}

void AudioTest::device(int index) {
  gen->stop();
  gout->stop(); gout->disconnect(this);
  initAud(sent(QComboBox)->itemData(index).value<QAudioDeviceInfo>(), DEFAULT_PITCH);
}

void AudioTest::volume(int value) {
  qreal linearVolume = QAudio::convertVolume(value / qreal(100), QAudio::LogarithmicVolumeScale, QAudio::LinearVolumeScale);
  gout->setVolume(linearVolume);
}

void AudioTest::pitch(int value) {
  ((SinWaveGenerator*)gen)->pitch = value;
  initAud(qDevice, value);
}
