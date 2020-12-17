import re
text = """
你好，%s、%s、%s 色
""". strip()
subst = list("赤橙黄绿青蓝紫")

def showSubsts():
  filled = re.split('%(\\w+)', text); print(filled)
  im = [i for (i,s) in enumerate(filled) if s. strip() == "s"]; print (im)
  substz = iter(subst)
  nIm = len(im)
  for i in range (nIm) :
    filled[im[i]] = next(substz)
  while True:
    print("". join (filled))
    for i in range(0, nIm- 1):
      filled[im[i]] = filled[im[i+1]]
    try: filled[im[nIm-1]] = next (substz)
    except StopIteration: break
showSubsts ()
