#!/usr/bin/env python3
# -*- coding: utf-8 -*-

'''
CLI Program: Drawing font faces using
  + FreeType Python
  + Pillow

author: duangsuse
'''

# CLI Program
#  usage: python3 txt2png.py [text]
#  image output: stdout

from __future__ import print_function

from os import environ
from sys import argv, stdout, stderr

# Pillow graphics binding
from PIL import Image

# FreeType binding
import freetype as ft

def eprint(*args, **kwargs):
    ''' Print line to stderr '''
    print(*args, file=stderr, **kwargs)

def peprint(*args, **kwargs):
    ''' Print debug properties to stderr '''
    eprint(*args, **kwargs, sep=': ')

# configuration
FT_FACE_V = 'FT_FACE'
FT_SIZE_V = 'FT_SIZE'
WIDTH_V = 'WIDTH'
HEIGHT_V = 'HEIGHT'
PREIMG_V = 'IMG'
LINEOFF_V = 'VLINE'
CHAROFF_V = 'VCHAR'
ALPHA_V = 'ALPHA'

def env_or(env, default=None, caster=lambda x: x):
    ''' Gets environment variable or None '''
    if env in environ:
        return caster(environ[env])
    return default

# do set-ups
FT_FACE = env_or(FT_FACE_V, "/usr/share/fonts/google-droid/DroidSans.ttf")
FT_SIZE = env_or(FT_SIZE_V, 64 * 30, int)
WIDTH = env_or(WIDTH_V, 800, int)
HEIGHT = env_or(HEIGHT_V, 600, int)
PREIMG = env_or(PREIMG_V, None)
LINEOFF = env_or(LINEOFF_V, 4, int)
CHAROFF = env_or(CHAROFF_V, 4, int)
ALPHA = env_or(ALPHA_V, 300, int)

def draw_bitmap(image, bitmap, x_pos=0, y_pos=0):
    ''' Draw a FreeType BitMap to PIL Image with given (x, y) offset '''
    x_max = x_pos + bitmap.width # max compositoin x offset
    y_max = y_pos + bitmap.rows  # max conposition y offset
    # iterating: (col, row): bitmap index(from (0, 0) to max)
    # (i, j) image index (x_pos, y_pos) to (x_max, y_max)
    for row, i in enumerate(range(x_pos, x_max)):
        for col, j in enumerate(range(y_pos, y_max)):
            if i < 0  or j < 0 or i >= WIDTH or j >= HEIGHT:
                continue # Skip pixels not in imageable bounds
            pixel = image.getpixel((i, j))
            font_pixel = bitmap.buffer[col * bitmap.width + row]

            pixel |= int(font_pixel) * ALPHA

            image.putpixel((i, j), pixel)

# main program
def main(args):
    ''' Main program '''
    peprint("Font Size", FT_SIZE)
    peprint("Font Face", FT_FACE)
    peprint("Image (X, Y)", (WIDTH, HEIGHT))
    peprint("Prefill Diffx Image", PREIMG)
    peprint("Padding (HOFF, VOFF)", (CHAROFF, LINEOFF))

    face = ft.Face(FT_FACE) # load font face
    face.set_char_size(FT_SIZE) # set font size

    text = 'hello' # default text
    if len(args) > 1:
        text = args[1] # use custom text

    image = Image.new('I', (WIDTH, HEIGHT)) # make Pillow image with mode 32bit
    if PREIMG is not None:
        preimg = Image.open(PREIMG)
        preimg.show('Merged image')
        #image = Image.composite(image, preimg)
        image = preimg

    slot = face.glyph # font face character glyph

    x_off = 0 # glyph drawing x-offset
    y_off = 0 # glyph drawing y-offset

    for (nrep, atom) in enumerate(text):
        face.load_char(atom) # load character, render it into glyph
        bitmap = slot.bitmap # get greyscale bitmap
        try:
            draw_bitmap(image, bitmap, x_off, y_off) # draw it to image
        except KeyboardInterrupt:
            desc = "Preview: drawing @ ({}, {}) char '{}' [{}/{}]".format(
                x_off, y_off, atom, nrep, len(text))
            eprint(desc)
            image.show(desc)
        x_off += bitmap.width + CHAROFF # increase x position by char + xoffset

        if x_off >= (WIDTH - CHAROFF): # Line break
            x_off = 0 # reset xoffset printing newline
            y_off += bitmap.rows + LINEOFF # increase y position by char + yoff

    image.save(stdout.buffer, 'png') # output image to stdout

# launcher script
if __name__ == '__main__':
    main(argv) # launch application with system argv
