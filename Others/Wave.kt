import kotlin.math.*
import kotlin.io.*

import java.io.File
import java.io.OutputStream

//https://t.me/kotlin_cn/6896
const val _41kHz = 44100
const val _41kHzD = _41kHz.toDouble()

fun waveAt(time: Double, k: Double) =
   ( time / (1.0/k) ).let { sin(it*2*PI) }
   .times(Short.MAX_VALUE).toInt()

object Wave {
  @JvmStatic
  fun main(vararg arg: String) = File(arg[0]).outputStream()
    .buffered().use { s ->
      val k = arg[1].toDouble()
      val wave = IntArray(_41kHz*2) {
        it.div(_41kHzD).fractionPart().let { waveAt(it, k) }
      }
      wave.forEach(s::writeShort)
    }
}

fun OutputStream.writeShort(i: Int) {
   write((i and 0xFF00) shr Byte.SIZE_BITS); write(i and 0xFF)
}
fun Double.fractionPart(): Double = this % 1.0
