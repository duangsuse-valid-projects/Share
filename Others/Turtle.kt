import kotlin.math.sin
import kotlin.math.cos
import kotlin.math.PI

import javax.swing.JPanel
import javax.swing.JFrame
import javax.swing.BorderFactory
import java.awt.*

import Degrees.FULL_DEG
import Degrees.PANE_DEG

typealias Deg = Double
typealias Axis = Int

object Degrees {
  const val FULL_DEG = 360.0
  const val PANE_DEG = 180.0
}

interface Point2 { val x: Axis; val y: Axis }
operator fun Point2.plus(other: Point2) = Point(x+other.x, y+other.y)

data class Point(override val x: Int, override val y: Int): Point2
data class MutablePoint(override var x: Int, override var y: Int): Point2 {
  fun assign(p: Point) { x = p.x; y = p.y }
}

typealias ActionOn<T> = T.() -> Unit

////

/** Basic turtle canvas with draw position/rotation */
abstract class AbstractTurtle(private val dim: Dimension): JPanel() {
  init { setPreferredSize(dim) }
  protected lateinit var canvas: Graphics
  protected var rawRotation = 0.0
  protected var rotation: Deg
    get() = (rawRotation*FULL_DEG)
    set(d) { rawRotation = (d/FULL_DEG).cycledIn(1.0) }
  protected val position = MutablePoint(0, 0)

  protected open fun reset() {
    rawRotation = 0.0
    position.assign(Point(dim.width/2, dim.height/2))
  }
  override fun paintComponent(g: Graphics) {
    super.paintComponent(g)
    canvas = g; reset(); paint()
  }
  abstract fun paint()
}

/** Solve (x, y) distance to another edge of a rotated line */
fun Double.lineDegreed(rotation: Deg): Point {
  val d = this; val r = rotation.coerceRad()
  return Point( (d*cos(r)).toInt(), (d*sin(r)).toInt() )
}
/** Coerce to radix from degree, don't calculate (x*PI) first (prec loss) */
fun Deg.coerceRad() = this / PANE_DEG*PI
/** If this greater or equal to [n], lesser value in [n] returned. */
fun Double.cycledIn(n: Double) = this % n

abstract class BasicTurtle(dim: Dimension): AbstractTurtle(dim) {
  fun posit(x: Int, y: Int) { position.assign( Point(x, y) ) }
  fun rotate(deg: Double) { rotation += deg }
  fun forward(distance: Double) {
    val pA = position
    val distanceAB = distance.lineDegreed(rotation)
    val pB = pA + distanceAB
    canvas.drawLine(pA.x, pA.y, pB.x, pB.y)
    position.assign(pB)
  }
}

class Turtle(dim: Dimension = Dimension(320, 460), private val onPaint: ActionOn<BasicTurtle>): BasicTurtle(dim) {
  override fun paint() = onPaint(this)
}

////

open class PanelWindow(pan: JPanel): JFrame() {
  init {
    initPanel(pan); setContentPane(pan); initRest(); pack()
    defaultCloseOperation = JFrame.EXIT_ON_CLOSE
  }
  open fun initPanel(pan: JPanel) = pan.run {
    border = BorderFactory.createLineBorder(Color.GREEN)
  }
  open fun initRest() {}
}

open class TurtleDrawing(val name: String, val paint: (List<String>) -> Turtle) {
  fun showMain(vararg args: String) = EventQueue.invokeLater {
    val win = PanelWindow(paint(args.toList()))
    win.title = name; win.setVisible(true)
  }
}

fun <E> Array<out E>.getOrDefault(index: Int, defaultValue: E): E
  = if (index in this.indices) this[index] else defaultValue
fun <E> List<E>.getOrDefault(index: Int, defaultValue: E): E
  = if (index in this.indices) this[index] else defaultValue

////

object RegularTriangle: TurtleDrawing("Regular Triangle", { args ->
  val n_tri = args.getOrDefault(0, "12").toInt()
  val deg_tri = args.getOrDefault(1, "30").toDouble()
  val d_vertice = args.getOrDefault(2, "100").toDouble()
  Turtle {
    fun regTriangle() = repeat(3) { forward(d_vertice); rotate(PANE_DEG+60.0) }
    repeat(n_tri) { regTriangle(); rotate(deg_tri) }
  }
}) {
  @JvmStatic fun main(vararg args: String) = showMain(*args)
}

object KochStar {
  @JvmStatic fun main(vararg args: String) = EventQueue.invokeLater {
    val n_fractal = args.getOrDefault(0, "200").toDouble()
    val d_min_vert = args.getOrDefault(1, "10").toDouble()
    PanelWindow(kochStar(n_fractal, d_min_vert))
      .apply { title = "Koch Star ${n_fractal}/${d_min_vert}" }.setVisible(true)
  }
  fun kochStar(n: Double, k: Double) = Turtle {
    fun triLine(x: Double): Unit =
    if (x < k) { forward(x) } else {
      val d = x / 3.0
      triLine(d); rotate(-60.0)
      triLine(d); rotate(120.0)
      triLine(d); rotate(-60.0)
      triLine(d)
    }
    repeat(3) { triLine(n); rotate(120.0) }
  }
}
