"""Rigenera public/data.js (16 squadre e undici titolari) dai dati dell'app Fantatitano.
Uso: python3 scripts/genera-dati.py /percorso/di/fantasyfootballrsm
Legge src/listone-dati.js (rose e quotazioni) e data/listone.json (numeri di maglia)."""
import json, re, sys, unicodedata
app = sys.argv[1].rstrip('/')
src = open(f'{app}/src/listone-dati.js', encoding='utf8').read()
rows = json.loads('[' + src.split('export const LISTONE = [', 1)[1].split('];', 1)[0].rstrip().rstrip(',') + ']')
norm = lambda s: re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
nums = {}
for s in json.load(open(f'{app}/data/listone.json', encoding='utf8'))['societa']:
    for g in s['giocatori']:
        if g.get('numero') and str(g['numero']).isdigit(): nums[norm(g['nome'])] = int(g['numero'])
# id, nome, sigla, colore 1 (da src/data.js dell'app), colore 2 (scelto a occhio dagli stemmi), forza
CLUBS = [('trefiori','Tre Fiori','TFI','#D4A017','#1B2A5C',5),('lafiorita','La Fiorita','FIO','#1E6FB5','#F2B822',5),('virtus','Virtus','VIR','#2E8B57','#C9A227',5),('trepenne','Tre Penne','TPE','#3B8ED0','#FFFFFF',4),('folgore','Folgore','FOL','#E0B400','#111111',4),('cosmos','Cosmos','COS','#1D4F8A','#D7263D',4),('murata','Murata','MUR','#222222','#FFFFFF',3),('libertas','Libertas','LIB','#7A1F3D','#E8C77A',3),('juvenes','Juvenes/Dogana','JUV','#1D4F8A','#C9A227',3),('fiorentino','Fiorentino','FRT','#C0392B','#1E4FA3',3),('faetano','Faetano','FAE','#6B2D8F','#F4D03F',2),('domagnano','Domagnano','DOM','#8A1D1D','#E0A526',3),('pennarossa','Pennarossa','PEN','#B03A2E','#FFFFFF',2),('cailungo','Cailungo','CAI','#2C7A7B','#D7262E',2),('sangiovanni','San Giovanni','SGV','#5B3FA6','#111111',2),('academy','SM Academy U22','ACA','#3AA6E0','#FFFFFF',2)]
# disegno della maglia (vedi DISEGNI in src/divisa.js), preso dal motivo dello stemma di fantasia
STILE = {'folgore': 'righe', 'pennarossa': 'meta', 'sangiovanni': 'banda'}
out = []
for cid, name, sh, c1, c2, st in CLUBS:
    sq = [r for r in rows if r[0] == cid]; xi = []
    for role, n in [('P', 1), ('D', 4), ('C', 3), ('A', 3)]:
        xi += sorted([r for r in sq if r[3] == role], key=lambda r: -r[4])[:n]
    assert len(xi) == 11, (cid, len(xi))
    used, pl = set(), []
    for r in xi:
        n = nums.get(norm(r[1] + r[2]))
        if n is None or n in used or n > 99:
            n = next(k for k in ([1] if r[3] == 'P' else []) + list(range(2, 100)) if k not in used)
        used.add(n); pl.append([r[2], r[3], n, r[4]])
    d = dict(id=cid, name=name, short=sh, c1=c1, c2=c2, str=st, xi=pl)
    if cid in STILE: d['st'] = STILE[cid]  # disegno della maglia: 'righe' = righe verticali col secondo colore
    out.append(d)
open('public/data.js', 'w', encoding='utf8').write('// Generato da scripts/genera-dati.py dai dati dell\'app Fantatitano\nwindow.CLUBS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'squadre')
