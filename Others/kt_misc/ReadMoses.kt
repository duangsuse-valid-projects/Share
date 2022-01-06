import java.io.File
import javax.imageio.ImageIO
import java.awt.image.BufferedImage

import kotlin.math.abs

object ReadMoses {
  @JvmStatic fun main(vararg args: String) {
    val (path, y_zero, y_step) = args
    val image = ImageIO.read(File(path))
    println(image)
    val reader = MosesReader(y_zero.toInt(), y_step.toInt())
    println(reader.runOn(image))
  }
}

typealias ColorSeq = Sequence<Pair<Int, Int>>
class MosesReader(val y_zero: Int, val y_step: Int) {
  private fun lineArrangement(img: BufferedImage): ColorSeq = sequence {
    for (y in y_zero until img.height step y_step)
      for (x in 0 until img.width) yield(x to img.getRGB(x, y))
  }
  private fun blackWhite(seq: ColorSeq) = seq.map { it.first to (abs(it.second) > LEVEL_BLACK) }
  fun runOn(img: BufferedImage): Sequence<Int> = sequence {
    val points = blackWhite(lineArrangement(img))
    val lines: Sequence<Sequence<Int>> = sequence {
      fun line(pos: Int) = points.drop(pos).zipWithNext().takeWhile { val (p0, p1) = it; p1.first > p0.first }
      var position = 0
      while (true) { val ln = line(position) }
    }
  }

  companion object Constants {
    const val LEVEL_BLACK = 0xFF*0xFF*0xFF
  }
}
