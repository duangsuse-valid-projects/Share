#!/bin/env python3
# -*- coding: utf-8 -*-

from PIL import Image, ImageDraw, ImageFont
from argparse import ArgumentParser, FileType
from itertools import cycle

from re import compile
class RegexType:
  def __init__(self, pattern, transform):
    self.regex = compile(pattern)
    self.transform = transform
  def __call__(self, text):
    res = self.regex.match(text)
    return self.transform(res.groups())

class FileNameType(FileType):
  def __call__(self, text):
    return super().__call__(text).name

def require(value, predicate, message):
  if not predicate(value): raise ValueError(f"{message}: {value}")

def let(transform, self):
  return transform(self) if self != None else None

def colorFromHtml(html):
  vpart = html.lstrip("#")
  require(len(vpart) % 2, lambda it: it == 0, "color value not correct")
  return tuple(int(vpart[i:i+2], 16) for i in range(0, len(vpart), 2))
def colorBackHtml(color):
  vals = [hex(v)[2:].ljust(2,"0") for v in color]
  return "#"+ "".join(vals)

def imagePixels(img):
  for y in range(0, img.height):
    for x in range(0, img.width):
      yield img.getpixel((x, y))

class Reducer:
  def __init__(self): pass
  def accept(self, value): pass
  def finish(self): pass

class Averager(Reducer):
  def __init__(self):
    self.n, self.k = 0, 0
  def accept(self, value):
    self.n += value; self.k += 1
  def finish(self):
    return self.n / self.k

class MapFold(Reducer):
  def __init__(self, fold, n):
    self.reducers = tuple(fold() for _ in range(n))
  def accept(self, value):
    for reducer, v in zip(self.reducers, value): reducer.accept(v)
  def finish(self):
    return tuple(reducer.finish() for reducer in self.reducers)

# == App ==
app = ArgumentParser("montage", description="Draw montage pictures built from cycle char sequence, with font(size), scale, spacing")

apg = app.add_argument_group("basic params")
apg.add_argument("-font", type=FileNameType("r"), help="font path supported by Python Pillow library")
apg.add_argument("-font-size", type=int, default=10, help="size of font (e.g. 14)")
apg.add_argument("-scale", type=float, default=1.0, help="scale for input image")
apg.add_argument("-spacing", metavar="h,v", type=RegexType(r"(\d+),(\d+)", lambda t: (int(t[0]), int(t[1]))), default=(0,0), help="horizontal,vertical padding each item")
apg.add_argument("-text", type=str, default="#", help="cycling montage text")
apg.add_argument("images", nargs="+", type=FileNameType("r"), help="images to generate montage")

apg1 = app.add_argument_group("background key color")
apg1.add_argument("-key-color", type=str, default="#FFFFFF", help="key color for new bitmap")
apg1.add_argument("--key-thres", type=int, default=10, help="color fuzzy match(sum all channels) threshold")
apg1.add_argument("--key-ratio", type=float, default=0.5, help=">percentage, for key-color chunk being not drawn")

def solveItemLayout(img_size, item_size, scale, spacing):
  (width, height) = img_size
  (w_item, h_item) = tuple(item_size+sp for sp in spacing)
  (padLeft, padTop) = tuple(int(v * scale / 2) for v in [(width % w_item), (height % h_item)])

  for y in range(padTop, height, h_item):
    for x in range(padLeft, width, w_item):
      yield (x, y, x+w_item, y+h_item)

def drawTextMontage(src_img, dst_img, areas, seq, font, calc_draw_color):
  draw = ImageDraw.Draw(dst_img)
  for area in areas:
    shadowed = src_img.crop(area)
    drawc = calc_draw_color(shadowed)
    if drawc != None:
      draw.text(area[0:2], next(seq), font=font, fill=colorBackHtml(drawc))

def averageColorUnlessIsBackground(img, key_color, key_thres, key_ratio):
  count = 0
  avgc = MapFold(Averager, Image.getmodebands(img.mode))
  for px in imagePixels(img):
    avgc.accept(px)
    distances = map(lambda ab: abs(ab[0] - ab[1]), zip(px, key_color))
    if sum(distances) < key_thres: count += 1
  return map(int, avgc.finish()) if count < key_ratio*(img.width*img.height) else None

def main(args):
  cfg = app.parse_args(args)
  font = ImageFont.truetype(cfg.font, cfg.font_size) if cfg.font != None else ImageFont.load_default()
  key_color = colorFromHtml(cfg.key_color)
  print(f"{cfg.font_size}px, {key_color} ±{cfg.key_thres}")
  calc_draw_color = lambda img: averageColorUnlessIsBackground(img, key_color, cfg.key_thres, cfg.key_ratio)
  for path in cfg.images:
    image = Image.open(path)
    newSize = tuple(int(d*cfg.scale) for d in image.size)
    scaledImage = image.resize(newSize, Image.ANTIALIAS) if cfg.scale != 1.0 else image
    newImage = Image.new(image.mode, newSize, key_color)
    areas = solveItemLayout(newSize, cfg.font_size, cfg.scale, cfg.spacing)
    drawTextMontage(scaledImage, newImage, areas, cycle(cfg.text), font, calc_draw_color)
    newImage.save(f"{path[:path.rfind('.')]}_mon.png")

from sys import argv
if __name__ == "__main__": main(argv[1:])
