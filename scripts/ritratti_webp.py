# Dai ritratti resi da Blender (PNG quadrati con sfondo trasparente, scripts/blender/render_ritratti.py) fa i WebP per il
# gioco, a 512 e a 256 punti di lato, e un foglio di controllo con tutti i ritratti affiancati.
# Uso: python3 scripts/ritratti_webp.py <cartella dei PNG> <cartella di uscita> [foglio.jpg]
import sys, os, glob
from PIL import Image

# le due misure per il gioco e la qualità del WebP; colonne e lato di ogni riquadro del foglio di controllo
MISURE = (512, 256); QUALITA = 82; COLONNE = 4; RIQUADRO = 512; FONDO = (11, 21, 48)

def main():
    ingresso, uscita = sys.argv[1], sys.argv[2]; foglio = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(uscita, exist_ok=True); file = sorted(glob.glob(os.path.join(ingresso, '*.png'))); peso = 0
    for f in file:
        im = Image.open(f).convert('RGBA'); nome = os.path.splitext(os.path.basename(f))[0]
        for lato in MISURE:
            dove = os.path.join(uscita, f'{nome}-{lato}.webp'); im.resize((lato, lato), Image.LANCZOS).save(dove, 'WEBP', quality=QUALITA, method=6); peso += os.path.getsize(dove)
    print(f'{len(file)} ritratti, {len(file) * len(MISURE)} WebP, {peso / 1024:.0f} KB in tutto ({peso / 1024 / max(1, len(file)):.0f} KB a giocatore)')
    if foglio and file:
        righe = (len(file) + COLONNE - 1) // COLONNE; tela = Image.new('RGB', (COLONNE * RIQUADRO, righe * RIQUADRO), FONDO)
        for i, f in enumerate(file):
            im = Image.open(f).convert('RGBA').resize((RIQUADRO, RIQUADRO), Image.LANCZOS); tela.paste(im, ((i % COLONNE) * RIQUADRO, (i // COLONNE) * RIQUADRO), im)
        tela.save(foglio, quality=90); print('foglio di controllo:', foglio)

main()
