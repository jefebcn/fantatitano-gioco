"""Importa le illustrazioni che Alex mette in assets/arrivo/ (anche nelle sue sottocartelle, per esempio
assets/arrivo/premi/): le controlla (nome, misure, trasparenza), le ritaglia al centro se il rapporto è poco diverso, le
prepara a 1x, 2x e 3x in WebP dentro public/img/illustrazioni/ e scrive src/casa/illustrazioni.js, che dice al gioco
quali immagini ci sono (le altre restano segnaposto).
Nell'elenco (assets/immagini.json) un'immagine può essere segnata «rifila»: le si toglie il margine vuoto attorno e il
soggetto riempie la misura, intero e centrato; oppure «usa»: non ha un file suo, vale quello di un'altra immagine.
Uso: python3 scripts/importa_immagini.py            importa tutto quello che c'è in assets/arrivo/
     python3 scripts/importa_immagini.py stato      dice solo quali sono definitive e quali segnaposto
Serve Pillow (c'è già nelle sessioni di lavoro; sul computer: pip install pillow)."""
import json, os, sys
from PIL import Image

RADICE = os.path.join(os.path.dirname(__file__), '..')
ARRIVO, USCITA = os.path.join(RADICE, 'assets', 'arrivo'), os.path.join(RADICE, 'public', 'img', 'illustrazioni')
ELENCO_JS = os.path.join(RADICE, 'src', 'casa', 'illustrazioni.js')
ELENCO = {i['nome']: i for i in json.load(open(os.path.join(RADICE, 'assets', 'immagini.json'), encoding='utf8'))['immagini']}
# quanto può essere diverso il rapporto tra larghezza e altezza prima di rifiutare l'immagine (sotto si ritaglia al centro)
TOLLERANZA = .15
# sotto questa parte della misura piena l'immagine è troppo piccola (2x su 3x: va ancora bene su quasi tutti i telefoni)
MINIMO = 2 / 3
# sotto questa opacità (su 255) un punto conta come margine vuoto, quando si rifila
RIFILA = 8


def rifila(im, v):
    """Toglie il margine vuoto e mette il soggetto, intero e centrato, in un riquadro col rapporto dell'elenco."""
    im = im.crop(im.split()[3].point(lambda a: 255 if a > RIFILA else 0).getbbox())
    voluto = v['w'] / v['h']
    w, h = (im.width, round(im.width / voluto)) if im.width / im.height > voluto else (round(im.height * voluto), im.height)
    tela = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    tela.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    return tela


def importa(cartella, file):
    nome, est = os.path.splitext(file)
    if est.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        return None
    v = ELENCO.get(nome)
    if not v:
        return f'✗ {file}: nome non in elenco (vedi docs/immagini-da-generare.md)'
    if v.get('usa'):
        return f'✗ {file}: non serve, al suo posto si usa {v["usa"]}'
    im = Image.open(os.path.join(cartella, file))
    alfa = im.mode in ('RGBA', 'LA') and im.convert('RGBA').getextrema()[3][0] < 250
    if v['alfa'] and not alfa:
        return f'✗ {file}: serve lo sfondo trasparente (PNG), questa non ce l\'ha'
    im = im.convert('RGBA' if v['alfa'] else 'RGB')
    note = []
    if v.get('rifila'):
        im = rifila(im, v); note.append(f'tolto il margine vuoto: il soggetto è {im.width} × {im.height}')
    voluto, avuto = v['w'] / v['h'], im.width / im.height
    if abs(avuto / voluto - 1) > TOLLERANZA:
        return f'✗ {file}: è {im.width} × {im.height}, serve il rapporto di {v["w"]} × {v["h"]}'
    if abs(avuto / voluto - 1) > .005:
        # ritaglio al centro fino al rapporto giusto
        w, h = (round(im.height * voluto), im.height) if avuto > voluto else (im.width, round(im.width / voluto))
        x, y = (im.width - w) // 2, (im.height - h) // 2
        im = im.crop((x, y, x + w, y + h)); note.append(f'ritagliata a {w} × {h}')
    # un'immagine segnata «ingrandisci» nell'elenco si accetta anche piccola: viene portata alla misura piena
    if im.width < v['w'] * MINIMO and not v.get('ingrandisci'):
        return f'✗ {file}: troppo piccola ({im.width} px di larghezza, ne servono almeno {round(v["w"] * MINIMO)})'
    if im.width < v['w']:
        note.append(f'più piccola del pieno ({im.width} su {v["w"]} px): ' + ('ingrandita alla misura piena' if im.width < v['w'] * MINIMO else 'va bene, ma a 3x è ingrandita'))
    os.makedirs(USCITA, exist_ok=True)
    for k in (1, 2, 3):
        m = im.resize((round(v['w'] * k / 3), round(v['h'] * k / 3)), Image.LANCZOS)
        m.save(os.path.join(USCITA, f'{nome}@{k}x.webp'), 'WEBP', quality=84, method=6)
    return f'✓ {file}' + (': ' + '; '.join(note) if note else '')


def pronte():
    return sorted(n for n in ELENCO if os.path.exists(os.path.join(USCITA, f'{n}@3x.webp')))


def al_posto():
    """Le immagini senza un file loro, quando è pronta quella che usano."""
    fatte = pronte()
    return sorted(n for n, v in ELENCO.items() if v.get('usa') in fatte)


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] != 'stato':
        male = 0
        for cartella, sotto, file in os.walk(ARRIVO):
            sotto.sort()
            for f in sorted(file):
                r = importa(cartella, f)
                if r:
                    print(r); male += r.startswith('✗')
        ok = pronte()
        if ok:
            # le misure a 1x: il gioco sceglie da solo la grandezza giusta per lo schermo
            righe = {n: [round(ELENCO[n]['w'] / 3), round(ELENCO[n]['h'] / 3)] for n in ok}
            open(ELENCO_JS, 'w', encoding='utf8').write('// Generato da scripts/importa_immagini.py: le illustrazioni pronte, con le misure a 1x.\n// Quelle che qui non ci sono restano segnaposto.\nexport const ILLUSTRAZIONI = ' + json.dumps(righe, separators=(', ', ': ')) + ';\n')
        sys.exit(1 if male else 0)
    ok, posto = pronte(), al_posto()
    print(f'Definitive ({len(ok)}): ' + (', '.join(ok) or 'nessuna'))
    if posto:
        print(f'Usano un\'altra immagine ({len(posto)}): ' + ', '.join(f'{n} (usa {ELENCO[n]["usa"]})' for n in posto))
    print(f'Segnaposto ({len(ELENCO) - len(ok) - len(posto)}): ' + ', '.join(n for n in ELENCO if n not in ok and n not in posto))
    if len(ok) + len(posto) == len(ELENCO):
        print(f'Tutte e {len(ELENCO)} le immagini dell\'elenco sono definitive: {len(ok)} con un file loro, {len(posto)} che usano quello di un\'altra.')
