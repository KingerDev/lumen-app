#!/usr/bin/env python3
"""
App Store screenshots: raw simulator captures -> framed 1320x2868 marketing images.

    python3 scripts/appstore-frames.py <raw-dir> <out-dir>

<raw-dir> holds <lang>/<n>-<name>.png captures from an iPhone 6.9" simulator
(scripts/appstore-capture.sh). Each gets a headline from HEADLINES and
is placed on Lumen's dark background under a warm lamp-light glow.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1320, 2868
BG = (11, 11, 14)
ACCENT = (232, 181, 77)
TEXT = (242, 242, 245)
MUTED = (154, 154, 168)
BORDER = (52, 52, 64)

SERIF = '/System/Library/Fonts/NewYork.ttf'
SANS = '/System/Library/Fonts/SFNS.ttf'

# (headline line 1, line 2 in accent, subline)
HEADLINES = {
    'sk': {
        'journal': ('Tvoje dni,', 'tvojimi slovami.', 'Súkromný denník s fotkami, miestami a sériou.'),
        'entry': ('Každý zápisok', 's fotkou aj miestom.', 'Dátum a polohu si Lumen uloží sám.'),
        'gallery': ('Fotky podľa dní,', 'ktoré si prežil.', 'Galéria zoradená podľa dátumu, nie albumov.'),
        'map': ('Pozri sa, kde', 'sa to všetko stalo.', 'Každý zápisok má svoje miesto na mape.'),
        'template': ('Šablóny, ktoré ti', 'pomôžu začať.', 'Večerné ohliadnutie, vďačnosť, výlety.'),
        'settings': ('Malé kroky,', 'deň po dni.', 'Séria, prehľad a zámok cez PIN a Face ID.'),
    },
    'en': {
        'journal': ('Your days,', 'in your words.', 'A private journal with photos, places and streaks.'),
        'entry': ('Every entry keeps', 'its photos and place.', 'Lumen saves the date and location for you.'),
        'gallery': ('Photos, sorted by', 'the days you lived.', 'A gallery ordered by date, not albums.'),
        'map': ('See where it', 'all happened.', 'Every entry has its place on the map.'),
        'template': ('Templates that', 'get you writing.', 'Evening reflection, gratitude, trips.'),
        'settings': ('Small steps,', 'day by day.', 'Streaks, stats and a passcode with Face ID.'),
    },
}


def font(path, size, style):
    """Variable system fonts: pick a named instance, axes differ per font."""
    f = ImageFont.truetype(path, size)
    f.set_variation_by_name(style)
    return f


def glow():
    """Warm radial light from above the headline — the "lumen"."""
    layer = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(layer)
    cx, cy, r = W // 2, -180, 1100
    for i in range(60, 0, -1):
        k = i / 60
        a = (1 - k) ** 2 * 0.22
        col = tuple(int(BG[c] + (ACCENT[c] - BG[c]) * a) for c in range(3))
        rr = int(r * k)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col)
    return layer.filter(ImageFilter.GaussianBlur(60))


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = Image.new('RGBA', img.size)
    out.paste(img, (0, 0), mask)
    return out


def centered(d, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)


def frame(raw_path, lang, key, out_path):
    line1, line2, sub = HEADLINES[lang][key]
    canvas = glow().convert('RGBA')
    d = ImageDraw.Draw(canvas)

    title = font(SERIF, 112, 'Semibold')
    subf = font(SANS, 44, 'Regular')
    centered(d, 170, line1, title, TEXT)
    centered(d, 296, line2, title, ACCENT)
    centered(d, 458, sub, subf, MUTED)

    shot = Image.open(raw_path).convert('RGB')
    scale = 0.76
    sw, sh = int(W * scale), int(shot.size[1] * W * scale / shot.size[0])
    shot = shot.resize((sw, sh), Image.LANCZOS)
    top = 610
    x = (W - sw) // 2

    # Bezel: a slim dark rim with a hairline edge, then the screen.
    rim = 18
    bezel = Image.new('RGBA', (sw + rim * 2, sh + rim * 2), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bezel)
    bd.rounded_rectangle([0, 0, bezel.size[0] - 1, bezel.size[1] - 1], 118, fill=(24, 24, 30), outline=BORDER, width=3)

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x - rim, top - rim + 30, x + sw + rim, top + sh + rim + 30], 118, fill=(0, 0, 0, 170)
    )
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(40)))
    canvas.alpha_composite(bezel, (x - rim, top - rim))
    canvas.alpha_composite(rounded(shot, 100), (x, top))

    canvas.convert('RGB').save(out_path, 'PNG')


def main():
    raw_dir, out_dir = sys.argv[1], sys.argv[2]
    for lang in HEADLINES:
        src = os.path.join(raw_dir, lang)
        if not os.path.isdir(src):
            continue
        dst = os.path.join(out_dir, lang)
        os.makedirs(dst, exist_ok=True)
        for name in sorted(os.listdir(src)):
            if not name.endswith('.png'):
                continue
            key = name[:-4].split('-', 1)[1]
            frame(os.path.join(src, name), lang, key, os.path.join(dst, name))
            print('framed', lang, name)


if __name__ == '__main__':
    main()
