# Ritratti delle carte fatti con Gemini: ogni foglio generato è una griglia 2x2 con quattro calciatori su sfondo verde
# acceso (#00FF00) o magenta (per le squadre con maglia verde), maglia già colorata. Questo script toglie lo sfondo,
# mette ogni volto alla stessa misura e posizione e scrive i file del gioco in public/img/ritratti-carte/:
#   <id>-512.webp e <id>-256.webp   ritratto intero (testa e maglia), sfondo trasparente.
# Uso: python3 scripts/ritratti_gemini.py <foglio.jpg> <g|m> <id1,id2,id3,id4> [cartella di uscita]
#      (gli id nell'ordine: in alto a sinistra, in alto a destra, in basso a sinistra, in basso a destra; per un quarto
#      vuoto basta lasciare meno id)
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

# lato del ritratto grande; larghezza della testa rispetto al lato; dove sta la cima della testa; fin dove deve
# arrivare almeno la maglia in basso; qualità del WebP
LATO = 512; LARGO = .40; CIMA = .07; FONDO_MAGLIA = .86; QUALITA = 82


def scontorna(a, fondo):
    """Toglie lo sfondo verde ('g') o magenta ('m'). Tutto il colore di sfondo forte diventa trasparente; solo in una
    fascia attorno alla persona la trasparenza sfuma e si toglie il riflesso del colore dello sfondo, così una maglia
    lime o rosa dentro la figura resta piena."""
    a = a.astype(np.float32); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    s = G - np.maximum(R, B) if fondo == 'g' else np.minimum(R, B) - G
    # quanto è «sfondo» lo sfondo vero: lo si misura negli angoli in alto
    rif = np.median(np.concatenate([s[:15, :15].ravel(), s[:15, -15:].ravel()]))
    t1, t2 = .25 * rif, .6 * rif; forte = s > t2; fascia = nd.binary_dilation(forte, iterations=8)
    alfa = np.where(fascia, 1 - np.clip((s - t1) / (t2 - t1), 0, 1), 1.0); alfa[forte] = 0
    if fondo == 'g':
        a[..., 1] = np.where(fascia, np.minimum(G, np.minimum(np.maximum(R, B), (R + B) / 2 + 12)), G)
    else:
        via = np.clip(s, 0, None) * fascia; a[..., 0] = R - via; a[..., 2] = B - via
    alfa = nd.uniform_filter(alfa, 2)
    return np.dstack([np.clip(a, 0, 255), alfa * 255]).astype(np.uint8)


def senza_bordi(q):
    """Qualche foglio ha cornici bianche tra i riquadri: le toglie prima di scontornare."""
    bianco = q.min(2) > 225; righe = np.where(bianco.mean(1) < .6)[0]; colonne = np.where(bianco.mean(0) < .6)[0]
    return q[righe.min() + 4:righe.max() - 3, colonne.min() + 4:colonne.max() - 3]


def metti_in_posa(q):
    """Stessa grandezza della testa e stessa altezza per tutti: la testa si misura tra l'8% e il 30% dell'altezza della
    persona, la si porta a LARGO del lato e la si centra; la maglia deve arrivare almeno a FONDO_MAGLIA."""
    m = q[..., 3] > 128; lab, n = nd.label(m)
    if n > 1: m = lab == np.argmax(nd.sum(m, lab, range(n + 1)))
    righe = np.where(m.any(1))[0]; su, giu = righe.min(), righe.max(); h = giu - su
    testa = m[su + int(h * .08):su + int(h * .30)]; largo = np.percentile(testa.sum(1), 90); xc = np.median(np.where(testa)[1])
    k = LARGO * LATO / largo; im = Image.fromarray(q).resize((int(q.shape[1] * k), int(q.shape[0] * k)), Image.LANCZOS)
    dy = int(CIMA * LATO - su * k)
    if dy + giu * k < FONDO_MAGLIA * LATO: dy = int(FONDO_MAGLIA * LATO - giu * k)
    out = Image.new('RGBA', (LATO, LATO), (0, 0, 0, 0)); out.paste(im, (int(LATO / 2 - xc * k), dy), im)
    return out


def foglio(percorso, fondo, ids, uscita):
    im = np.asarray(Image.open(percorso).convert('RGB')); H, W = im.shape[:2]; os.makedirs(uscita, exist_ok=True)
    for k, id_ in enumerate(ids):
        y0, x0 = (k // 2) * H // 2, (k % 2) * W // 2
        q = scontorna(senza_bordi(im[y0:y0 + H // 2, x0:x0 + W // 2]), fondo)
        # un riquadro quasi vuoto vuol dire che Gemini non ha disegnato la persona: va rigenerato
        if (q[..., 3] > 128).sum() < 5000: print('vuoto:', id_); continue
        r = metti_in_posa(q)
        r.save(os.path.join(uscita, f'{id_}-512.webp'), quality=QUALITA, method=4)
        r.resize((LATO // 2, LATO // 2), Image.LANCZOS).save(os.path.join(uscita, f'{id_}-256.webp'), quality=QUALITA, method=4)
        print('fatto:', id_)


if __name__ == '__main__':
    foglio(sys.argv[1], sys.argv[2], [x for x in sys.argv[3].split(',') if x], sys.argv[4] if len(sys.argv) > 4 else 'public/img/ritratti-carte')
