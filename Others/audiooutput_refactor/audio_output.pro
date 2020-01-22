TEMPLATE = app
TARGET = audiooutput

QT += multimedia widgets

HEADERS       = \
  audio_output.h \
  helper.h \
  primitiveData.h

SOURCES       = \
                audio_output.cpp \
                main.cpp

target.path = $$[QT_INSTALL_EXAMPLES]/multimedia/audiooutput
INSTALLS += target
