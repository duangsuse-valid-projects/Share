#pragma once

#include <qmath.h>
#include <qendian.h>

using u8 = quint8;
using u16 = quint16;
using i8 = int8_t;
using i16 = quint16;

const u8 QUINT8_MAX = 0xFF;
const i8 QINT8_MAX = 0x7F;
const u16 QUINT16_MAX = 0xFFFF;
const i16 QINT16_MAX = 0x7FFF;

const int BYTE_BITS = 8;
const int SHORT_BITS = 16;

using byte = unsigned char;
using idx = size_t;
using cnt = size_t;
using longcnt = qint64;

using sec = qint64;
using usec = qint64;
