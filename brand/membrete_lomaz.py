#!/usr/bin/env python3
"""
Genera la hoja membretada de LoMaz Home (PNG tamaño carta, 2550x3300 px, 300 dpi)
para usarla como fondo de página en documentos Word/PDF.

Uso:
  python3 membrete_lomaz.py                        # escribe membrete_lomaz.png junto al script
  python3 membrete_lomaz.py --salida /ruta/x.png   # otra ruta de salida
  python3 membrete_lomaz.py --sin-marca-agua       # sin logo tenue en el centro
  python3 membrete_lomaz.py --linea1 "Inmobiliaria boutique en Bogotá" \
      --linea2 "Ventas · Arriendos · Administración de inmuebles" \
      --linea3 "lomazhome.com · 300 330 0343 · lomazhome@gmail.com" \
      --pie1 "Te damos lo más para encontrar tu hogar." \
      --pie2 "LoMaz Home · Bogotá D.C. · lomazhome.com · 300 330 0343"

Requiere Pillow y los archivos logo_lomaz_transparente.png y logo_lomaz_marca_agua.png
en la misma carpeta (nunca se redibuja el logo: siempre se usa el original).
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
NAVY = (13, 28, 57)        # #0D1C39 (azul marino del logo)
GOLD = (201, 169, 110)     # #C9A96E
GOLD_DARK = (160, 120, 64) # #A07840
CREAM = (248, 240, 224)    # #F8F0E0

def font(candidates, size):
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

SERIF = ["/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
         "C:/Windows/Fonts/georgia.ttf", "/Library/Fonts/Georgia.ttf"]
SANS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/calibri.ttf", "/Library/Fonts/Arial.ttf"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", default=os.path.join(HERE, "membrete_lomaz.png"))
    ap.add_argument("--linea1", default="Inmobiliaria boutique en Bogotá")
    ap.add_argument("--linea2", default="Ventas  ·  Arriendos  ·  Administración de inmuebles")
    ap.add_argument("--linea3", default="lomazhome.com   ·   300 330 0343   ·   lomazhome@gmail.com")
    ap.add_argument("--pie1", default="Te damos lo más para encontrar tu hogar.")
    ap.add_argument("--pie2", default="LoMaz Home  ·  Bogotá D.C.  ·  lomazhome.com  ·  300 330 0343")
    ap.add_argument("--sin-marca-agua", action="store_true")
    a = ap.parse_args()

    S = 2                                   # supermuestreo para líneas limpias
    W, H = 2550 * S, 3300 * S               # carta 8.5 x 11 in a 300 dpi
    ML = MR = 180 * S; MT = MB = 150 * S    # marco dorado (0,6 in / 0,5 in del borde)
    page = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(page)

    # Hilo dorado: dos verticales y la base
    th = 3 * S
    d.rectangle([ML, MT, ML + th, H - MB], fill=GOLD)
    d.rectangle([W - MR - th, MT, W - MR, H - MB], fill=GOLD)
    d.rectangle([ML, H - MB - th, W - MR, H - MB], fill=GOLD)

    # Banda azul marino superior con filo dorado
    band_top, band_h = MT, 430 * S
    d.rectangle([ML, band_top, W - MR, band_top + band_h], fill=NAVY)
    d.rectangle([ML, band_top + band_h, W - MR, band_top + band_h + 4 * S], fill=GOLD)

    # Logo original (transparente) a la izquierda de la banda
    logo = Image.open(os.path.join(HERE, "logo_lomaz_transparente.png")).convert("RGBA")
    lh = int(band_h * 0.78); lw = int(logo.width * lh / logo.height)
    page.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), (ML + 110 * S, band_top + (band_h - lh) // 2))

    # Textos a la derecha de la banda
    d = ImageDraw.Draw(page)
    f1 = font(SERIF, 54 * S); f2 = font(SANS, 34 * S); f3 = font(SANS, 30 * S)
    rx = W - MR - 110 * S
    d.text((rx - d.textlength(a.linea1, font=f1), band_top + 150 * S), a.linea1, font=f1, fill=CREAM)
    d.rectangle([rx - 980 * S, band_top + 215 * S, rx, band_top + 217 * S], fill=GOLD)
    d.text((rx - d.textlength(a.linea2, font=f2), band_top + 228 * S), a.linea2, font=f2, fill=GOLD)
    d.text((rx - d.textlength(a.linea3, font=f3), band_top + 288 * S), a.linea3, font=f3, fill=CREAM)

    # Marca de agua: el logo original, tenue, centrado
    if not a.sin_marca_agua:
        wm = Image.open(os.path.join(HERE, "logo_lomaz_marca_agua.png")).convert("RGBA")
        ww = 1250 * S; wh = int(wm.height * ww / wm.width)
        page.alpha_composite(wm.resize((ww, wh), Image.LANCZOS), ((W - ww) // 2, int(H / 2 - wh / 2 + 60 * S)))

    # Pie de página
    d = ImageDraw.Draw(page)
    fp1 = font(SERIF, 36 * S); fp2 = font(SANS, 28 * S)
    d.text(((W - d.textlength(a.pie1, font=fp1)) / 2, H - MB - 120 * S), a.pie1, font=fp1, fill=GOLD_DARK)
    d.text(((W - d.textlength(a.pie2, font=fp2)) / 2, H - MB - 68 * S), a.pie2, font=fp2, fill=NAVY)

    page.resize((2550, 3300), Image.LANCZOS).convert("RGB").save(a.salida, optimize=True)
    print("ok:", a.salida)

if __name__ == "__main__":
    main()
