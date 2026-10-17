"""One-time helper: crop the logo and generate favicons + social share image.

You only need this if you replace assets/logo.jpg. The website itself has no
build step; the files this creates are committed alongside it.

Usage (needs Python 3 + Pillow: `pip install pillow`):
    python3 tools/make-icons.py

Reads   assets/logo.jpg
Writes  assets/logo-cropped.jpg   logo with black top/bottom bars removed
        assets/favicon.ico        16/32/48 px
        assets/favicon-32.png
        assets/apple-touch-icon.png (180 px)
        assets/og-image.jpg       1200 x 630 link-preview image
and prints the logo's main colors so you can match the CSS variables.
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SRC = ASSETS / "logo.jpg"
BG = (11, 15, 51)  # matches --space-800 in css/styles.css
# A row counts as "black bar" when it is near-black on average and has no bright
# pixels (so dark-navy sky or a row with stars in it is kept).
BAR_MEAN_MAX = 10
BAR_PEAK_MAX = 40


def is_bar_row(img, y):
    row = img.crop((0, y, img.width, y + 1)).convert("L")
    hist = row.histogram()
    mean = sum(level * count for level, count in enumerate(hist)) / img.width
    peak = max(level for level, count in enumerate(hist) if count)
    return mean < BAR_MEAN_MAX and peak < BAR_PEAK_MAX


def crop_bars(img):
    top, bottom = 0, img.height
    while top < bottom - 1 and is_bar_row(img, top):
        top += 1
    while bottom - 1 > top and is_bar_row(img, bottom - 1):
        bottom -= 1
    return img.crop((0, top, img.width, bottom)), top, img.height - bottom


def square(img):
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side))


def palette(img, n=8):
    small = img.copy()
    small.thumbnail((200, 200))
    q = small.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: n * 3]
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    return [("#%02x%02x%02x" % tuple(pal[i * 3: i * 3 + 3]), c / total) for c, i in counts]


def main():
    img = ImageOps.exif_transpose(Image.open(SRC)).convert("RGB")
    cropped, cut_top, cut_bottom = crop_bars(img)
    print(f"Original {img.size}, removed {cut_top}px top / {cut_bottom}px bottom -> {cropped.size}")

    web = cropped.copy()
    web.thumbnail((1000, 1000), Image.LANCZOS)
    web.save(ASSETS / "logo-cropped.jpg", quality=86, optimize=True, progressive=True)

    sq = square(cropped)
    sq.resize((180, 180), Image.LANCZOS).save(ASSETS / "apple-touch-icon.png", optimize=True)
    sq.resize((32, 32), Image.LANCZOS).save(ASSETS / "favicon-32.png", optimize=True)
    sq.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    og = Image.new("RGB", (1200, 630), BG)
    art = cropped.copy()
    art.thumbnail((1100, 580), Image.LANCZOS)
    og.paste(art, ((1200 - art.width) // 2, (630 - art.height) // 2))
    og.save(ASSETS / "og-image.jpg", quality=86, optimize=True)

    print("Main colors in the logo (share of pixels):")
    for hex_, share in palette(cropped):
        print(f"  {hex_}  {share:5.1%}")


if __name__ == "__main__":
    main()
