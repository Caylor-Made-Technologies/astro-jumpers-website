"""One-time helper: crop the logo and generate favicons + social share image.

You only need this if you replace assets/logo.jpg. The website itself has no
build step; the files this creates are committed alongside it.

Usage (needs Python 3 + Pillow: `pip install pillow`):
    python3 tools/make-icons.py

Reads   assets/logo.jpg
Writes  assets/logo-cropped.jpg   logo with black bars and white frame removed
        assets/logo-icon.png      close-up of the astronaut (header/footer badge)
        assets/favicon.ico        16/32/48 px, from the close-up
        assets/favicon-32.png
        assets/apple-touch-icon.png (180 px, full logo)
        assets/og-image.jpg       1200 x 630 link-preview image
and prints the logo's main colors so you can match the CSS variables.
"""
import colorsys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SRC = ASSETS / "logo.jpg"
BG = (19, 14, 45)  # matches --space-800 in css/styles.css
# A row counts as "black bar" when it is near-black on average and has no bright
# pixels (so dark-navy sky or a row with stars in it is kept).
BAR_MEAN_MAX = 10
BAR_PEAK_MAX = 40
# The logo sits inside a thin white frame; lines brighter than this on average are trimmed.
FRAME_MEAN_MIN = 150
FRAME_EXTRA = 0.005  # extra inset (fraction of size) to clear the frame's soft edge
# Close-up used for tiny icons, as fractions of the trimmed logo: (left, top, right, bottom).
# The full logo is unreadable at 16-32 px, so icons show the astronaut's helmet.
ICON_BOX = (0.20, 0.23, 0.62, 0.65)


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


def line_mean(img, box):
    hist = img.crop(box).convert("L").histogram()
    return sum(level * count for level, count in enumerate(hist)) / sum(hist)


def trim_frame(img):
    w, h = img.size
    left, top, right, bottom = 0, 0, w, h
    while left < w // 4 and line_mean(img, (left, 0, left + 1, h)) > FRAME_MEAN_MIN:
        left += 1
    while right > w * 3 // 4 and line_mean(img, (right - 1, 0, right, h)) > FRAME_MEAN_MIN:
        right -= 1
    while top < h // 4 and line_mean(img, (0, top, w, top + 1)) > FRAME_MEAN_MIN:
        top += 1
    while bottom > h * 3 // 4 and line_mean(img, (0, bottom - 1, w, bottom)) > FRAME_MEAN_MIN:
        bottom -= 1
    pad = round(min(w, h) * FRAME_EXTRA)
    return img.crop((left + pad, top + pad, right - pad, bottom - pad))


def square(img):
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side))


def palette(img, n=8):
    """Typical color for each hue family, so you get "the blue", "the orange", etc."""
    small = img.copy()
    small.thumbnail((300, 300))
    raw = small.tobytes()
    buckets = {}
    for i in range(0, len(raw), 3):
        px = tuple(raw[i:i + 3])
        hue, sat, val = colorsys.rgb_to_hsv(*(c / 255 for c in px))
        if val < 0.2:
            key = "dark"
        elif sat < 0.25:
            continue  # whites/grays
        else:
            key = int(hue * 18)  # 20-degree hue slices
        buckets.setdefault(key, []).append(px)
    total = len(raw) // 3
    out = []
    for pixels in sorted(buckets.values(), key=len, reverse=True)[:n]:
        pixels.sort(key=sum)
        out.append(("#%02x%02x%02x" % pixels[len(pixels) // 2], len(pixels) / total))
    return out


def main():
    img = ImageOps.exif_transpose(Image.open(SRC)).convert("RGB")
    cropped, cut_top, cut_bottom = crop_bars(img)
    print(f"Original {img.size}, removed {cut_top}px top / {cut_bottom}px bottom -> {cropped.size}")
    cropped = trim_frame(cropped)
    print(f"After trimming the white frame -> {cropped.size}")

    web = cropped.copy()
    web.thumbnail((1000, 1000), Image.LANCZOS)
    web.save(ASSETS / "logo-cropped.jpg", quality=86, optimize=True, progressive=True)

    square(cropped).resize((180, 180), Image.LANCZOS).save(ASSETS / "apple-touch-icon.png", optimize=True)

    w, h = cropped.size
    l, t, r, b = ICON_BOX
    icon = square(cropped.crop((round(l * w), round(t * h), round(r * w), round(b * h))))
    icon.resize((192, 192), Image.LANCZOS).save(ASSETS / "logo-icon.png", optimize=True)
    icon.resize((32, 32), Image.LANCZOS).save(ASSETS / "favicon-32.png", optimize=True)
    icon.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    og = Image.new("RGB", (1200, 630), BG)
    art = cropped.copy()
    art.thumbnail((1100, 580), Image.LANCZOS)
    og.paste(art, ((1200 - art.width) // 2, (630 - art.height) // 2))
    og.save(ASSETS / "og-image.jpg", quality=86, optimize=True)

    print("Main colors in the logo, one per hue family (share of pixels):")
    for hex_, share in palette(cropped):
        print(f"  {hex_}  {share:5.1%}")


if __name__ == "__main__":
    main()
