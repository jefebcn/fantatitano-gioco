"""Importa le illustrazioni che Alex mette in assets/arrivo/: le controlla (nome, misure, trasparenza), le ritaglia al
centro se il rapporto è poco diverso, le prepara a 1x, 2x e 3x in WebP dentro public/img/illustrazioni/ e scrive
public/img/illustrazioni/elenco.js, che dice al gioco quali immagini ci sono (le altre restano segnaposto).
Uso: python3 scripts/importa_immagini.py            importa tutto quello che c'è in assets/arrivo/
     python3 scripts/importa_immagini.py stato      dice solo quali sono definitive e quali segnaposto
Serve Pillow (c'è già nelle sessioni di lavoro; sul computer: pip install pillow)."""
import json, os, sys
from PIL import Image

RADICE = os.path.join(os.path.dirname(__file__), '..')
ARRIVO, USCITA = os.path.join(RADICE, 'assets', 'arrivo'), os.path.join(RADICE, 'public', 'img', 'illustrazioni')
ELENCO = {i['nome']: i for i in json.load(open(os.path.join(RADICE, 'assets', 'immagini.json'), encoding='utf8'))['immagini']}
# quanto può essere diverso il rapporto tra larghezza e altezza prima di rifiutare l'immagine (sotto si ritaglia al centro)
TOLLERANZA = .15
# sotto questa parte della misura piena l'immagine è troppo piccola (2x su 3x: va ancora bene su quasi tutti i telefoni)
MINIMO = 2 / 3


def importa(file):
    nome, est = os.path.splitext(file)
    if est.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        return None
    v = ELENCO.get(nome)
    if not v:
        return f'✗ {file}: nome non in elenco (vedi docs/immagini-da-generare.md)'
    im = Image.open(os.path.join(ARRIVO, file))
    alfa = im.mode in ('RGBA', 'LA') and im.convert('RGBA').getextrema()[3][0] < 250
    if v['alfa'] and not alfa:
        return f'✗ {file}: serve lo sfondo trasparente (PNG), questa non ce l\'ha'
    im = im.convert('RGBA' if v['alfa'] else 'RGB')
    voluto, avuto, note = v['w'] / v['h'], im.width / im.height, []
    if abs(avuto / voluto - 1) > TOLLERANZA:
        return f'✗ {file}: è {im.width} × {im.height}, serve il rapporto di {v["w"]} × {v["h"]}'
    if abs(avuto / voluto - 1) > .005:
        # ritaglio al centro fino al rapporto giusto
        w, h = (round(im.height * voluto), im.height) if avuto > voluto else (im.width, round(im.width / voluto))
        x, y = (im.width - w) // 2, (im.height - h) // 2
        im = im.crop((x, y, x + w, y + h)); note.append(f'ritagliata a {w} × {h}')
    if im.width < v['w'] * MINIMO:
        return f'✗ {file}: troppo piccola ({im.width} px di larghezza, ne servono almeno {round(v["w"] * MINIMO)})'
    if im.width < v['w']:
        note.append(f'più piccola del pieno ({im.width} su {v["w"]} px): va bene, ma a 3x è ingrandita')
    os.makedirs(USCITA, exist_ok=True)
    for k in (1, 2, 3):
        m = im.resize((round(v['w'] * k / 3), round(v['h'] * k / 3)), Image.LANCZOS)
        m.save(os.path.join(USCITA, f'{nome}@{k}x.webp'), 'WEBP', quality=84, method=6)
    return f'✓ {file}' + (': ' + '; '.join(note) if note else '')


def pronte():
    return sorted(n for n in ELENCO if os.path.exists(os.path.join(USCITA, f'{n}@3x.webp')))


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] != 'stato':
        male = 0
        for f in sorted(os.listdir(ARRIVO)):
            r = importa(f)
            if r:
                print(r); male += r.startswith('✗')
        ok = pronte()
        if ok:
            # le misure a 1x: il gioco sceglie da solo la grandezza giusta per lo schermo
            righe = {n: [round(ELENCO[n]['w'] / 3), round(ELENCO[n]['h'] / 3)] for n in ok}
            open(os.path.join(USCITA, 'elenco.js'), 'w', encoding='utf8').write('// Generato da scripts/importa_immagini.py: le illustrazioni pronte, con le misure a 1x\nwindow.ILLUSTRAZIONI=' + json.dumps(righe, separators=(',', ':')) + ';\n')
        sys.exit(1 if male else 0)
    ok = pronte()
    print(f'Definitive ({len(ok)}): ' + (', '.join(ok) or 'nessuna'))
    print(f'Segnaposto ({len(ELENCO) - len(ok)}): ' + ', '.join(n for n in ELENCO if n not in ok))
