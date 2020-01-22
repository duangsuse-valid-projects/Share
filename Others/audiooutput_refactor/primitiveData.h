#pragma once

#include <qmath.h>
#include <qendian.h>

using u8 = quint8;
using u16 = quint16;
using i8 = qint8;
using i16 = quint16;

const u8 QUINT8_MAX = 0xFF;
const i8 QINT8_MAX = 0x7F;
const u16 QUINT16_MAX = 0xFFFF;
const i16 QINT16_MAX = 0x7FFF;

const int BYTE_WIDTH = 8;
const int SHORT_WIDTH = 16;

using byte = unsigned char;
using cnt = unsigned int;
using longcnt = qint64;
using idx = int;

using sec = qint64;
using usec = qint64;
