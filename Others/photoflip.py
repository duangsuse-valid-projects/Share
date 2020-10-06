from PIL import Image

def photoFlip(img):
  (w, h) = img.size
  mw = img.width // 2
  a = img.crop((0, 0, mw, h))
  b = img.crop((mw, 0, w, h))
  flip = Image.new(img.mode, img.size)
  flip.paste(b, (0, 0))
  flip.paste(a, (mw, 0))
  return flip

from sys import argv
for fname in argv[1:]:
  photoFlip(Image.open(fname)).save(f"flip_{fname}")
