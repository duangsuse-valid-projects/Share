import kotlin.math.sin
import kotlin.math.PI

import java.io.File
import java.io.OutputStream
import java.io.DataOutputStream

// audio: channel * sample
// sample: rate(sample pre sec) / size(bit size)

typealias Real = Double
typealias Sample = Double

abstract class SampleIterator: DoubleIterator() {
  final override fun hasNext() = true
  final override fun nextDouble() = nextSample()
  abstract fun nextSample(): Sample
}

typealias IndexedSampler = (Int) -> Sample
open class Wave(private val y: IndexedSampler): SampleIterator() {
  private var x = 0
  override fun nextSample() = y(x++)
}

typealias PipeSampler = (Real) -> Sample
open class RepeatWave(y: PipeSampler, private val cycle: Real)
: Wave({ y(cycle * ((it%cycle) /cycle) ) }) /*cycle realdiv (i%cycle)*/

object SinWave: RepeatWave({ sin(2*PI*it) }, _441kHzD) {
  @JvmStatic
  fun main(vararg arg: String) = File("sample.raw").outputStream()
    .let(::DataOutputStream).writeWave(this, 1*_441kHz)
}

const val _441kHz = 441000
const val _441kHzD = 441000.0

fun DataOutputStream.writeWave(wave: SampleIterator, n_sample: Int) {
  repeat(n_sample) { writeDouble((1.0+wave.nextSample()) / 2*Short.MAX_VALUE) }
}
