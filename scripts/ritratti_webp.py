# Dai ritratti resi da Blender (scripts/blender/render_ritratti.py) fa i file per il gioco, a 512 e a 256 punti di lato:
#   <id>-512.webp, <id>-256.webp          la testa di ogni giocatore (sfondo trasparente, senza maglia);
#   maglia-luce-512.webp, -256.webp       la maglia bianca con ombre e pieghe, uguale per tutti;
#   maglia-mappa-512.png, -256.png        la mappa per colorare la maglia (senza perdita: sono numeri, non colori).
# E, se richiesto, un foglio di controllo coi ritratti composti come farà il gioco (testa sopra la maglia colorata).
# Uso: python3 scripts/ritratti_webp.py <cartella dei PNG> <cartella di uscita> [foglio.jpg] [aspetti.json]
#      (con aspetti.json il foglio usa per ognuno i colori della sua «maglia»; senza, una maglia blu col bordo bianco)
import sys, os, glob, json
import numpy as np
from PIL import Image

# le due misure per il gioco e la qualità del WebP; colonne e lato di ogni riquadro del foglio di controllo
MISURE = (512, 256); QUALITA = 82; COLONNE = 4; RIQUADRO = 480; FONDO = (11, 21, 48)
# i metri coperti dalla mappa, di lato e in altezza rispetto agli occhi: gli stessi di MAPPA in render_ritratti.py
MAPPA = dict(x=(-.4, .4), z=(-.5, .1))
# la luce della stoffa bianca più chiara (vale come «bianco pieno») e quanto i colori scuri tengono di luce, perché le
# pieghe si vedano anche sul nero
BIANCO = .94; FILO = .07

def leggi_mappa(f):
    """La mappa di Blender è larga il doppio: a sinistra la posizione di lato (rosso = parte grossa, verde = parte fine)
    e il bordo (blu), a destra l'altezza. Torna tre immagini di numeri tra 0 e 1: lato, altezza, bordo."""
    m = np.asarray(Image.open(f).convert('RGB'), float); L = m.shape[0]
    return [(m[:, :L, 0] * 256 + m[:, :L, 1]) / 65535, (m[:, L:, 0] * 256 + m[:, L:, 1]) / 65535, m[:, :L, 2] / 255]

def scrivi_mappa(canali, lato, dove):
    c = [np.asarray(Image.fromarray(x.astype(np.float32), 'F').resize((lato, lato), Image.BILINEAR)) for x in canali]
    out = np.zeros((lato, lato * 2, 3), np.uint8)
    for k, meta in ((0, slice(0, lato)), (1, slice(lato, lato * 2))):
        n = np.clip(np.round(c[k] * 65535), 0, 65535).astype(np.uint32); out[:, meta, 0] = n // 256; out[:, meta, 1] = n % 256
    out[:, :lato, 2] = np.clip(np.round(c[2] * 255), 0, 255); Image.fromarray(out, 'RGB').save(dove, optimize=True)

def srgb(lineare):
    v = np.clip(np.array(lineare, float), 0, 1); return np.where(v <= .0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - .055)

def disegno(x, z, stile):
    """Dove va il secondo colore, dato il disegno della squadra: x e z sono metri sulla maglia."""
    onda = lambda v, passo, soglia=.5, sposta=0: ((v / passo + sposta) % 1) > soglia
    if stile in ('righe', 'righine'): return onda(x, .09 if stile == 'righe' else .045, .5, .25)
    if stile == 'fasce': return onda(z, .11)
    if stile in ('banda', 'diagonale'): return onda(x * .7 + z * .7, .5, .78, .38)
    if stile == 'meta': return x > 0
    if stile == 'scacchi': return onda(x, .16) == onda(z, .16)
    if stile in ('v', 'chevron'): return onda(np.abs(x) + z, .6, .86, .15)
    return np.zeros_like(x, bool)

def componi(luce, canali, testa, maglia):
    """Il ritratto come lo compone il gioco: il disegno coi colori della squadra moltiplicato per la luce della stoffa,
    e sopra la testa. `luce` e `testa` sono immagini RGBA della stessa misura, `canali` la mappa già a quella misura."""
    x = MAPPA['x'][0] + canali[0] * (MAPPA['x'][1] - MAPPA['x'][0]); z = MAPPA['z'][0] + canali[1] * (MAPPA['z'][1] - MAPPA['z'][0])
    c1 = srgb(maglia['c1']); c2 = srgb(maglia['c2']); b = np.clip(canali[2], 0, 1)[..., None]
    colore = np.where(disegno(x, z, maglia.get('stile', ''))[..., None], c2, c1) * (1 - b) + srgb(maglia.get('bordo', maglia['c2'])) * b
    l = np.asarray(luce, float) / 255; t = np.asarray(testa, float) / 255; ta = t[..., 3:4]; la = l[..., 3:4]
    stoffa = np.clip(l[..., :3] / BIANCO * (colore * (1 - FILO) + FILO), 0, 1); a = ta + la * (1 - ta)
    rgb = (t[..., :3] * ta + stoffa * la * (1 - ta)) / np.maximum(a, 1e-6)
    return Image.fromarray((np.concatenate([rgb, a], -1) * 255 + .5).astype(np.uint8), 'RGBA')

def main():
    ingresso, uscita = sys.argv[1], sys.argv[2]; foglio = sys.argv[3] if len(sys.argv) > 3 else None
    aspetti = {a['id']: a for a in json.load(open(sys.argv[4], encoding='utf-8'))} if len(sys.argv) > 4 else {}
    os.makedirs(uscita, exist_ok=True); peso = 0
    teste = sorted(f for f in glob.glob(os.path.join(ingresso, '*.png')) if not os.path.basename(f).startswith('maglia-'))
    for f in teste:
        im = Image.open(f).convert('RGBA'); nome = os.path.splitext(os.path.basename(f))[0]
        for lato in MISURE:
            dove = os.path.join(uscita, f'{nome}-{lato}.webp'); im.resize((lato, lato), Image.LANCZOS).save(dove, 'WEBP', quality=QUALITA, method=6); peso += os.path.getsize(dove)
    luce = Image.open(os.path.join(ingresso, 'maglia-luce.png')).convert('RGBA'); canali = leggi_mappa(os.path.join(ingresso, 'maglia-mappa.png')); comune = 0
    for lato in MISURE:
        dove = os.path.join(uscita, f'maglia-luce-{lato}.webp'); luce.resize((lato, lato), Image.LANCZOS).save(dove, 'WEBP', quality=90, method=6); comune += os.path.getsize(dove)
        dove = os.path.join(uscita, f'maglia-mappa-{lato}.png'); scrivi_mappa(canali, lato, dove); comune += os.path.getsize(dove)
    print(f'{len(teste)} teste, {peso / 1024:.0f} KB in tutto ({peso / 1024 / max(1, len(teste)):.0f} KB a giocatore); maglia comune a tutti: {comune / 1024:.0f} KB')
    if foglio and teste:
        righe = (len(teste) + COLONNE - 1) // COLONNE; tela = Image.new('RGB', (COLONNE * RIQUADRO, righe * RIQUADRO), FONDO)
        l = luce.resize((RIQUADRO, RIQUADRO), Image.LANCZOS); c = [np.asarray(Image.fromarray(x.astype(np.float32), 'F').resize((RIQUADRO, RIQUADRO), Image.BILINEAR)) for x in canali]
        for i, f in enumerate(teste):
            nome = os.path.splitext(os.path.basename(f))[0]; maglia = aspetti.get(nome, {}).get('maglia') or dict(c1=[.02, .1, .45], c2=[1, 1, 1], stile='')
            im = componi(l, c, Image.open(f).convert('RGBA').resize((RIQUADRO, RIQUADRO), Image.LANCZOS), maglia); tela.paste(im, ((i % COLONNE) * RIQUADRO, (i // COLONNE) * RIQUADRO), im)
        tela.save(foglio, quality=90); print('foglio di controllo:', foglio)

if __name__ == '__main__': main()
