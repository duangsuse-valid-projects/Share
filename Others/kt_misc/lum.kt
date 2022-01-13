import java.io.File //黑白
import javax.imageio.*
import java.awt.image.*
object ImGray{
@JvmStatic fun main(vararg a:String){
  ImageIO.read(File(a[0])).mapPix{val(r,g,b)=Byte.cut(3,it); val l=(r * 299/1000 + g * 587/1000 + b * 114/1000); Byte.cat(l,l,l) }.save(a[1])
}//每Pix=Lum亮度公式

fun BufferedImage.mapPix(op:(Int)->Int)=this.apply{
  for(y in 0 until height)for(x in 0 until width)
    setRGB(x,y, op(getRGB(x,y)) )
}
fun RenderedImage.save(fp:String)=ImageIO.write(this,fp.substringAfter("."),File(fp))
object Byte{
  fun cut(n:Int, b:Int)=IntArray(n).also{var u=b; for(i in 1 until n){it[i]=u and 0xFF; u=u ushr 8}  }
  fun cat(vararg b:Int)=b.fold(0){u,x -> u shl 8 or x}//小端正巧是BGR 的字节序，且这次是cat(lll)。否则要 reversed()或foldRight
//{var u=0; b.forEach{u=u shl 8 or it}; return u }
}
}

object Img {
  @JvmStatic fun main(vararg args: String) {
    val image = ImageIO.read(File("image.jpg"))
    val image_gray = image.mapPixels(::luma)
    image_gray.writeTo("image_bw.jpg")
  }
  fun BufferedImage.mapPixels(transform: (Int) -> Int): BufferedImage {
    val newImg = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
    for (y in 0 until height)
      for (x in 0 until width)
        newImg.setRGB(x, y, transform(this.getRGB(x, y)))
    return newImg
  }
  fun RenderedImage.writeTo(path: String) {
    ImageIO.write(this, path.substringAfter("."), File(path))
  }
  /** R * 299/1000 + G * 587/1000 + B * 114/1000 */
  //see also https://www.cnblogs.com/bixiaopengblog/p/7462961.html
  fun luma(rgb: Int): Int {
    val (r, g, b) = unpackRGB(rgb)
    val lum = r * 299/1000 + g * 587/1000 + b * 114/1000
    return repackRGB(lum, lum, lum)
  }
  fun repackRGB(r: Int, g: Int, b: Int): Int = (r shl 16) or (g shl 8) or b
  fun unpackRGB(rgb: Int): IntArray = intArrayOf(rgb byte 2, rgb byte 1, rgb byte 0)
  private infix fun Int.byte(n: Int) = this shr (n*8) and 0xFF
}
