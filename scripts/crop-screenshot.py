from PIL import Image
import sys

src = sys.argv[1]
img = Image.open(src)
w, h = img.size
print(f"Size: {w}x{h}")

# Crop into vertical sections of ~1000px each
section_h = 1000
n = (h + section_h - 1) // section_h
base = src.rsplit('.', 1)[0]
for i in range(n):
    top = i * section_h
    bottom = min((i + 1) * section_h, h)
    crop = img.crop((0, top, w, bottom))
    out = f"{base}-section-{i}.png"
    crop.save(out)
    print(f"Saved {out} ({top}-{bottom})")
