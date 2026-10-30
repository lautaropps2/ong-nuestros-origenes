"""
Genera las imágenes para buscadores y redes sociales a partir del logo (chakana 7x7):
  assets/logo.png      512x512  (logo de la organización en Schema.org)
  assets/og-image.png  1200x630 (vista previa al compartir el enlace)
Uso:  python tools/seo_assets.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
RED, GREEN, YELLOW, GRAY, INK = "#E3120B", "#00A651", "#F7D417", "#D6D4CC", "#050506"

# Celdas del logo en una grilla de 7x7 (igual que el símbolo #logo de build.py)
QUADRANTS = {
    RED:    [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (0, 2)],
    GREEN:  [(4, 0), (5, 0), (6, 0), (5, 1), (6, 1), (6, 2)],
    YELLOW: [(0, 4), (0, 5), (1, 5), (0, 6), (1, 6), (2, 6)],
    GRAY:   [(6, 4), (5, 5), (6, 5), (4, 6), (5, 6), (6, 6)],
}


def draw_logo(img, x0, y0, cell, white_quadrant=GRAY):
    d = ImageDraw.Draw(img)
    for color, cells in QUADRANTS.items():
        fill = white_quadrant if color == GRAY else color
        for cx, cy in cells:
            d.rectangle([x0 + cx * cell, y0 + cy * cell, x0 + (cx + 1) * cell - 1, y0 + (cy + 1) * cell - 1], fill=fill)
    for cy in range(7):
        for cx in range(7):
            if abs(cx - 3) + abs(cy - 3) <= 3 and (cx, cy) != (3, 3):
                d.rectangle([x0 + cx * cell, y0 + cy * cell, x0 + (cx + 1) * cell - 1, y0 + (cy + 1) * cell - 1], fill=INK)


def font(size):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    logo = Image.new("RGB", (512, 512), "#FFFFFF")
    draw_logo(logo, 25, 25, 66)
    logo.save(ROOT / "assets" / "logo.png", optimize=True)

    og = Image.new("RGB", (1200, 630), INK)
    d = ImageDraw.Draw(og)
    d.rounded_rectangle([60, 125, 436, 501], radius=28, fill="#FFFFFF")
    draw_logo(og, 80, 145, 48)
    d.rounded_rectangle([470, 150, 640, 222], radius=12, fill=YELLOW)
    d.text((555, 186), "ONG", font=font(54), fill=INK, anchor="mm")
    d.text((470, 250), "Nuestros", font=font(92), fill="#FFFFFF")
    d.text((470, 350), "Orígenes", font=font(92), fill=YELLOW)
    d.text((474, 480), "Rancagua, Chile · desde 2014", font=font(34), fill="#BDBBB4")
    og.save(ROOT / "assets" / "og-image.png", optimize=True)
    print("ok assets/logo.png, assets/og-image.png")


if __name__ == "__main__":
    main()
