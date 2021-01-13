#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# https://github.com/FerryYoungFan/SimpleTextMontage
# 之前我不知道 Montage 是什么
# 其实用反向 Alpha-blend 也可以，不过我不想这么做，因为懒，而且我是没大阅读 doc…

from PIL import Image
from PIL import ImageDraw, ImageFont
from argparse import ArgumentParser, FileType
from math import ceil
from sys import stdout, stderr

from logging import getLogger, WARNING, INFO, DEBUG

log = getLogger('MontagePY')
log.setLevel(INFO)

URL = 'https://github.com/FerryYoungFan/SimpleTextMontage'
SUPPORTED_ENCODERS = "png webp pdf bmp dib gif ico jpeg ppm xbm tiff tga".split(';')
log.debug(f'Supproted encoders {SUPPORTED_ENCODERS}')

app = ArgumentParser(prog='montage', description='Simple montage graph generator',
  epilog=f'by duangsuse, see also {URL}')

app.add_argument('image', type=str, nargs='+', help='Images (path) for input')
app.add_argument('--convert', type=str, metavar='coding', help='Convert image color coding (RGBA)', default='RGBA')
app.add_argument('--output-format', type=str, metavar='encoder',
  help=f'Python pillow image encoder type in [{",".join(SUPPORTED_ENCODERS)}]',
  default='png', choices=SUPPORTED_ENCODERS)
app.add_argument('-o', type=FileType('w'), nargs='?', metavar='opath',
  help='Output to file directly (Text)', default=None)
app.add_argument('--output-fmtstr', type=str, metavar='opathfmt',
  help='Output filename format like out_@_#.png', default='Mon@.png')

app.add_argument('--text', type=str, help='Text to be embeeded', default='#')
app.add_argument('--grayscale', help='Use grayscale and text output', default=False, action='store_true')
app.add_argument('--text-grayscale', type=str, nargs='+', metavar='gray-texts',
  help=f'Character for grayscale picking', default=". * % #".split(' '))
app.add_argument('--scale', type=float, metavar='ratio', help='Text-image scale ratio X.Y', default=1.0)
app.add_argument('--scaleXY', '-sxy', type=int, nargs=2, metavar=('x', 'y'),
  help='Size skip of collecting X/Y (override)', default=None)
app.add_argument('-fnt', '--font', type=str, nargs='?', metavar='fpath',
  help='Font TTF/OTF glyph path, if like `:name`, treat as font(TrueType/FreeType) name, not path')
app.add_argument('-fntsz', '--font-size', type=int, metavar='size', help='Font size (avaliable for fonts by :name)', default=16)
app.add_argument('--preview', type=str, metavar='cmd', help='Preview command (don\'t do save)')
app.add_argument('--preview!', dest='do_preview', action='store_true')
app.add_argument('--print-render-src', help='Print Render source', default=False, action='store_true')

def iterable(xs_):
  try: return iter(xs_)
  except TypeError: return None
def repeat(n, x, skip=1):
  assert n >= 0, 'n must not negtive'
  while n !=0:
    yield x
    n -= skip

# 此类会接受参数：
#  + --convert 颜色系统
#  + --text 内嵌文字，grayscale 模式无效
#  + --text-grayscale 按灰色深度从小到大排列的字符取样
#  + --scale 生成综合块 (w,h) 大小(skip), --scaleXY 区间缩放
#  + --font 文字字体, --font-size 字体大小
#
# 提供 generate(img) -> img; generate_grayscale(img) -> str 方法
class Montage (object):
  def __init__(self, colorspace: str, text: str, text_grayscale: str, scale=1.0, skipXY = None, font=None, fontsz=16):
    self.space = colorspace
    self.text = text; self.graytexts = text_grayscale
    self.ratio = scale
    self.skipXY = skipXY
    self.font = font if type(font) is ImageFont else Montage.cfg_read_font(font,fontsz)
    self.log = getLogger('Montage')

  # Load font fmtstr, when :name do search, else read file
  @staticmethod
  def cfg_read_font(fnt: str, sz):
    if fnt is None:
      return ImageFont.load_default()
    elif len(fnt) !=0 and fnt[0] == ':':
      try:
        return ImageFont.truetype(fnt[1:], sz)
      except OSError:
        return ImageFont.FreeTypeFont(fnt[1:], size=sz)
    else:
      return ImageFont.load_path(fnt)

  # Not efficient but usable Lum
  @staticmethod
  def grayscale(rgb_a):
    if len(rgb_a) ==3: r,g,b = rgb_a; a=1.0
    elif len(rgb_a) ==4: r,g,b,a = rgb_a
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) *a

  @staticmethod
  def icsum(xs_s, is_atom=lambda o: not iterable(o)):
    accum = 0
    for x in xs_s:
      accum += (x if is_atom(x) else Montage.icsum(x))
    return accum # 就不用拜会 numpy 了

  @staticmethod
  def caverage(ts): # (a, b, c), (a1, b1, c1) -> map(/2) (a+a1, b+b1 c+c1)
    assert len(ts) is not 0
    dims = list(); dims.extend(repeat(len(ts[0]), 0))
    for di in range(0, len(dims)):
      dims[di] = [t[di] for t in ts] # dims_0 = a_0, b_0, c_0, ...
    return [divmod(Montage.icsum(dim), len(dim))[0] for dim in dims]

  @staticmethod
  def points2D(xs, ys):
    for x in xs: # 1, 2, 3, ...
      for y in ys: # 0, 4, 8, ...
        yield (x, y) # (1, 0), (1, 4), (1, 8), (2, 0)...
        
  @staticmethod
  def coord(img: Image): return (img.width, img.height)

  # 为了达到 self.ratio 的缩放比，需要多少 skip? 已经放弃
  def ratio_skip(self, img, coerc=ceil) -> (int,int):
    if self.skipXY is not None:
      assert len(self.skipXY) == 2
      return self.skipXY
    sca = self.ratio
    w, h = [img.width, img.height]
    nw, nh = [sca*w, sca*h]; dw, dh = [nw-w, nh-h]
    return (coerc(sca/w), coerc(sca/w))

  RGBA_0 = (0xFF, 0xFF, 0xFF, 0)
  # 将图像切分为块的 color average，很慢，懒得用并行处理
  # 其实就是平均插值缩放图像，不过我自己实现了个
  def clippy(self, img: Image, sxy: (int, int), cmapper: callable=None) -> Image:
    sx, sy = sxy
    self.log.info('Scale', (sx, sy))
    rangx = range (0, img.width, sx)
    rangy = range (0, img.height, sy)
    width, height = list(map(len, (rangx, rangy)))
    #print(rangx,width, rangy,height)
    cblk = Image.new(self.space, (width,height), Montage.RGBA_0)
    nx, ny = (0, 0)
    for x in rangx:
      hline = [i for i in range (x, x+sx)]
      for y in rangy: # generate blk
        vline = [i for i in range (y, y+sy)]
        block = []
        for p in Montage.points2D(hline, vline):
          try:
            block.append(img.getpixel(p))
          except IndexError: pass
        coloravg = Montage.caverage(block) # 本块均色
        #self.log.debug((hline, vline), block, coloravg, (nx,ny))
        cblk.putpixel((nx, ny), tuple(coloravg) if cmapper==None else cmapper(tuple(coloravg)))
        ny += 1
      nx += 1; ny = 0
    return cblk

  # 生成彩色蒙太奇，虽然低性能但是不着急（很稳，删除）
  def generate_cmap(self, img: Image) -> (Image, list):
    skips = self.ratio_skip(img)
    if skips != (1,1): img = self.clippy(img, skips)
    fntsz = self.font.getsize(self.text)
    clipf = self.clippy(img, fntsz)
    coord = (clipf.width, clipf.height)
    print('TextXY', fntsz, 'Clipped', coord, file=stderr)
    monsrc = []
    for ix, iy in Montage.points2D( range(0, coord[0]), range(0, coord[1]) ):
      monsrc.append(( (ix*fntsz[0], iy*fntsz[1]), clipf.getpixel((ix,iy))))
    return clipf, (Montage.coord(img), monsrc)
  def generate(self, img: Image) -> Image:
    cord, src = self.generate_cmap(img)[1]
    montage = Image.new(self.space, cord, Montage.RGBA_0)
    draw = ImageDraw.Draw(montage)
    for p, c in src:
      draw.text(p, self.text, font=self.font, fill=c)
    return montage
  
  def selectGsChar(self, avg, cr):
    graytexts = self.graytexts
    txtlen = len(graytexts)
    i = int(cr-avg) % txtlen
    return ord(graytexts[i])

  # 生成 ASCII Art
  def generate_grayscale(self, img: Image) -> str:
    scaled = self.clippy(img, self.ratio_skip(img))
    scaled.show()
    co = Montage.coord(scaled)
    vline, hline = (range (0,co[0]), range (0,co[1]))
    gray = [Montage.grayscale(scaled.getpixel(p)) for p in Montage.points2D(hline, vline)]
    ts = bytearray(len(gray))
    avg = 0; ac = 1
    for n in hline:
      i = (co[0]*n)
      for m in vline:
        c = gray[i+m]
        avg = divmod((avg + c), ac)[0]; ac += 1
        ts[i+m] = self.selectGsChar(avg, c)
      ts[i] = ord('\n')
    return ts

# 此应用主函数处理参数：
#  + image [...] 遍历生成目标图像
#  + --output-format save(...) 格式
#  + --output-fmtstr save(...) 文件名，@ 表示输入名、# 表示输入序号
#  + --grayscale 指示使用 generate_grayscale
#  + -o 指示 grayscale 模式的输出文件
def main(args):
  cfg = app.parse_args(args)
  txt, tgs = [cfg.text, cfg.text_grayscale]
  montage = Montage(cfg.convert, txt, tgs, scale=cfg.scale, skipXY=cfg.scaleXY, font=cfg.font, fontsz=cfg.font_size)
  tout = cfg.o
  for i, img in enumerate(cfg.image[1:len(cfg.image)]):
    ofname = solve_opathfmt(cfg.output_fmtstr, img, str(i+1))
    img = Image.open(img).convert(cfg.convert)
    print('Image', (img.width, img.height), 'Scale', cfg.scaleXY, file=stderr)
    if cfg.grayscale:
      textmon = montage.generate_grayscale(img)
      write_or_createw(textmon, tout, ofname)
      continue
    elif cfg.print_render_src:
      avgscale, monsrc = montage.generate_cmap(img)
      avgscale.show(title=ofname)
      print('Image (w, h)', monsrc[0])
      for p, c in (monsrc[1]):
        for t in ['#', sharpcolor(c), ' ']: stdout.write(t)
        print(p[0],p[1], sep=':')
      continue
    mon = montage.generate(img)
    if cfg.preview is not None or cfg.do_preview:
      mon.show(title=ofname, command=cfg.preview)
      continue
    mon.save(ofname, cfg.output_format)
  if tout is not None: tout.close()

def sharpcolor(cvs):
  return ''.join(map(lambda i: hex(i)[2:], cvs))

# Write to non-null of or create nf & write
def write_or_createw(o, of, nf: str, p=lambda f: f.writable(), mode='w+'):
  if of is not None and p(of):
    return of.buffer.write(o)
  else:
    with open(nf, mode) as out:
      return out.buffer.write(o)
# @=ifname; #=output_no
def solve_opathfmt(fmt: str, ifname, ofno) -> str:
  oat, osharp = list(map(ord, "@#"))
  return fmt.translate({oat: ifname, osharp: ofno})

from sys import argv
if __name__ == '__main__': main(argv)

