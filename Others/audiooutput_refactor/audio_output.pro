TEMPLATE = app
TARGET = audio_output

QT += widgets multimedia
QMAKE_CXXFLAGS = -std=c++14

SOURCES += main.cpp audio_output.cpp
HEADERS += primitive_data.hpp helper.hpp audio_output.hpp

target.path = /bin/
INSTALLS += target


