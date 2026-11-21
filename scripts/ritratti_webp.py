# Dai ritratti resi da Blender (scripts/blender/render_ritratti.py) fa i file per il gioco, a 512 e a 256 punti di lato:
#   <id>-512.webp, <id>-256.webp               la testa di ogni giocatore (sfondo trasparente, senza maglia);
#   <id>-sopra-512.webp, -256.webp             capelli e barba che cadono davanti alla maglia (solo se ce ne sono);
#   maglia-<scollo>-luce-512.webp, -256.webp   la maglia bianca con ombre e pieghe, uguale per tutti, una per scollo;
#   maglia-<scollo>-mappa-512.png, -256.png    la mappa per colorarla (senza perdita: sono numeri, non colori).
# E, se richiesto, un foglio di controllo coi ritratti composti come farà il gioco.
# Uso: python3 scripts/ritratti_webp.py <cartella dei PNG> <cartella di uscita> [foglio.jpg] [aspetti.json]
#      (con aspetti.json il foglio usa per ognuno i colori e lo scollo della sua «maglia»; senza, una maglia blu)
import sys, os, glob, json
import numpy as np
from PIL import Image

# le due misure per il gioco e la qualità del WebP; colonne e lato di ogni riquadro del foglio di controllo
MISURE = (512, 256); QUALITA = 82; COLONNE = 4; RIQUADRO = 480; FONDO = (11, 21, 48)
# gli scolli e i metri coperti dalla mappa, di lato lungo la stoffa e in altezza rispetto agli occhi: gli stessi di
# MAGLIE e MAPPA in render_ritratti.py
SCOLLI = ('girocollo', 'v'); MAPPA = dict(x=(-.6, .6), z=(-.5, .1))
# la luce della stoffa bianca più chiara (vale come «bianco pieno»); quanto si approfondiscono le ombre delle pieghe; e
# quanto i colori scuri tengono di luce, perché le pieghe si vedano anche sul nero
BIANCO = .86; OMBRE = 2.2; FILO = .07

def leggi_mappa(f):
    """La mappa di Blender è larga il doppio: a sinistra la posizione di lato (rosso = parte grossa, verde = parte fine)
    e il bordo (blu), a destra l'altezza. Torna tre immagini di numeri tra 0 e 1: lato, altezza, bordo."""
    m = np.asarray(Image.open(f).convert('RGB'), float); L = m.shape[0]
    return [(m[:, :L, 0] * 256 + m[:, :L, 1]) / 65535, (m[:, L:, 0] * 256 + m[:, L:, 1]) / 65535, m[:, :L, 2] / 255]

def misura(canali, lato):
    return [np.asarray(Image.fromarray(x.astype(np.float32), 'F').resize((lato, lato), Image.BILINEAR)) for x in canali]

def scrivi_mappa(canali, lato, dove):
    c = misura(canali, lato); out = np.zeros((lato, lato * 2, 3), np.uint8)
    for k, meta in ((0, slice(0, lato)), (1, slice(lato, lato * 2))):
        n = np.clip(np.round(c[k] * 65535), 0, 65535).astype(np.uint32); out[:, meta, 0] = n // 256; out[:, meta, 1] = n % 256
    out[:, :lato, 2] = np.clip(np.round(c[2] * 255), 0, 255); Image.fromarray(out, 'RGB').save(dove, optimize=True)

def srgb(lineare):
    v = np.clip(np.array(lineare, float), 0, 1); return np.where(v <= .0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - .055)

def disegno(x, z, stile):
    """Dove va il secondo colore, dato il disegno della squadra: x e z sono metri sulla stoffa della maglia."""
    onda = lambda v, passo, soglia=.5, sposta=0: ((v / passo + sposta) % 1) > soglia
    if stile in ('righe', 'righine'): return onda(x, .09 if stile == 'righe' else .045, .5, .25)
    if stile == 'fasce': return onda(z, .11)
    if stile in ('banda', 'diagonale'): return onda(x * .7 + z * .7, .5, .78, .38)
    if stile == 'meta': return x > 0
    if stile == 'scacchi': return onda(x, .16) == onda(z, .16)
    if stile in ('v', 'chevron'): return onda(np.abs(x) + z, .6, .86, .15)
    return np.zeros_like(x, bool)

def sopra_a(su, giu):
    """Un'immagine con trasparenza sopra un'altra (numeri tra 0 e 1)."""
    a = su[..., 3:4]; b = giu[..., 3:4]; t = a + b * (1 - a)
    return np.concatenate([(su[..., :3] * a + giu[..., :3] * b * (1 - a)) / np.maximum(t, 1e-6), t], -1)

def componi(luce, canali, testa, maglia, sopra=None):
    """Il ritratto come lo compone il gioco: la testa, sopra la maglia (il disegno coi colori della squadra moltiplicato
    per la luce della stoffa) e in cima capelli e barba che le cadono davanti. Le immagini sono RGBA della stessa misura,
    `canali` è la mappa già a quella misura."""
    x = MAPPA['x'][0] + canali[0] * (MAPPA['x'][1] - MAPPA['x'][0]); z = MAPPA['z'][0] + canali[1] * (MAPPA['z'][1] - MAPPA['z'][0])
    c1 = srgb(maglia['c1']); c2 = srgb(maglia['c2']); b = np.clip(canali[2], 0, 1)[..., None]
    colore = np.where(disegno(x, z, maglia.get('stile', ''))[..., None], c2, c1) * (1 - b) + srgb(maglia.get('bordo', maglia['c2'])) * b
    l = np.asarray(luce, float) / 255; stoffa = np.clip(np.clip(l[..., :3] / BIANCO, 0, 1) ** OMBRE * (colore * (1 - FILO) + FILO), 0, 1)
    out = sopra_a(np.concatenate([stoffa, l[..., 3:4]], -1), np.asarray(testa, float) / 255)
    if sopra is not None: out = sopra_a(np.asarray(sopra, float) / 255, out)
    return Image.fromarray((out * 255 + .5).astype(np.uint8), 'RGBA')

def carica(cartella):
    """Le maglie e, per ogni testa, le sue immagini già ripulite: della testa resta solo quello che almeno una maglia
    lascia vedere; dello strato «sopra» solo quello che cade su una maglia."""
    maglie = {s: (Image.open(os.path.join(cartella, f'maglia-{s}-luce.png')).convert('RGBA'), leggi_mappa(os.path.join(cartella, f'maglia-{s}-mappa.png'))) for s in SCOLLI}
    alfa = [np.asarray(l, float)[..., 3] / 255 for l, _ in maglie.values()]; tutte = np.minimum.reduce(alfa); qualcuna = np.maximum.reduce(alfa)
    teste = {}
    for f in sorted(glob.glob(os.path.join(cartella, '*.png'))):
        nome = os.path.splitext(os.path.basename(f))[0]
        if nome.startswith('maglia-') or nome.endswith('-sopra'): continue
        t = np.asarray(Image.open(f).convert('RGBA'), float) / 255; t[..., 3] *= 1 - (tutte >= .999); s = None; fs = os.path.join(cartella, nome + '-sopra.png')
        if os.path.exists(fs):
            s = np.asarray(Image.open(fs).convert('RGBA'), float) / 255
            # un margine di qualche punto attorno alle maglie, poi niente: il resto dei capelli è già nella testa
            largo = np.asarray(Image.fromarray((qualcuna * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(9)), float) / 255
            s[..., 3] *= largo; s = s if (s[..., 3] > .02).sum() > 40 else None
        teste[nome] = (Image.fromarray((t * 255 + .5).astype(np.uint8), 'RGBA'), None if s is None else Image.fromarray((s * 255 + .5).astype(np.uint8), 'RGBA'))
    return maglie, teste

def main():
    ingresso, uscita = sys.argv[1], sys.argv[2]; foglio = sys.argv[3] if len(sys.argv) > 3 else None
    aspetti = {a['id']: a for a in json.load(open(sys.argv[4], encoding='utf-8'))} if len(sys.argv) > 4 else {}
    os.makedirs(uscita, exist_ok=True); maglie, teste = carica(ingresso); peso = 0; comune = 0; con_sopra = 0
    for nome, (testa, sopra) in teste.items():
        con_sopra += sopra is not None
        for lato in MISURE:
            for im, coda in ((testa, ''), (sopra, '-sopra')):
                if im is None: continue
                dove = os.path.join(uscita, f'{nome}{coda}-{lato}.webp'); im.resize((lato, lato), Image.LANCZOS).save(dove, 'WEBP', quality=QUALITA, method=6); peso += os.path.getsize(dove)
    for scollo, (luce, canali) in maglie.items():
        for lato in MISURE:
            dove = os.path.join(uscita, f'maglia-{scollo}-luce-{lato}.webp'); luce.resize((lato, lato), Image.LANCZOS).save(dove, 'WEBP', quality=90, method=6); comune += os.path.getsize(dove)
            dove = os.path.join(uscita, f'maglia-{scollo}-mappa-{lato}.png'); scrivi_mappa(canali, lato, dove); comune += os.path.getsize(dove)
    print(f'{len(teste)} teste ({con_sopra} con lo strato sopra), {peso / 1024:.0f} KB in tutto ({peso / 1024 / max(1, len(teste)):.0f} KB a giocatore); maglie comuni a tutti: {comune / 1024:.0f} KB')
    if foglio and teste:
        righe = (len(teste) + COLONNE - 1) // COLONNE; tela = Image.new('RGB', (COLONNE * RIQUADRO, righe * RIQUADRO), FONDO); R = (RIQUADRO, RIQUADRO)
        for i, (nome, (testa, sopra)) in enumerate(teste.items()):
            maglia = aspetti.get(nome, {}).get('maglia') or dict(c1=[.02, .1, .45], c2=[1, 1, 1], stile=''); luce, canali = maglie[maglia.get('scollo', 'girocollo')]
            im = componi(luce.resize(R, Image.LANCZOS), misura(canali, RIQUADRO), testa.resize(R, Image.LANCZOS), maglia, sopra.resize(R, Image.LANCZOS) if sopra else None)
            tela.paste(im, ((i % COLONNE) * RIQUADRO, (i // COLONNE) * RIQUADRO), im)
        tela.save(foglio, quality=90); print('foglio di controllo:', foglio)

if __name__ == '__main__': main()
