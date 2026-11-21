# Ritratti dei giocatori: un busto di tre quarti per ogni «aspetto», fatto con MPFB (MakeHuman per Blender: i personaggi
# creati sono CC0) e reso con Cycles. Il corpo è quello ad alta definizione di MPFB, non quello alleggerito del gioco.
# Ogni aspetto dice età, pelle, viso, occhi, capelli, barba, espressione e posa della testa: lo stesso aspetto dà sempre
# lo stesso ritratto. I volti escono da numeri a caso (il «seme» del viso): nessuno è fatto per somigliare a una persona vera.
#
# Il ritratto è fatto di due strati, così la maglia la colora il gioco (un giocatore che cambia squadra cambia maglia):
#   <id>.png            testa, collo, capelli e barba di quel giocatore, senza maglia;
#   maglia-luce.png     la maglia bianca con le sue ombre e pieghe, uguale per tutti (il busto è lo stesso per tutti);
#   maglia-mappa.png    per ogni punto della maglia: rosso = posizione di lato, verde = altezza, blu = colletto e bottoni.
# Il gioco disegna la maglia coi colori e il disegno della squadra moltiplicandoli per «maglia-luce», e sopra la testa.
#
# Uso: blender -b --python scripts/blender/render_ritratti.py -- <aspetti.json> <cartella di uscita> [campioni] [lato] [id,id…]
#      (tra gli id, «maglia» rifà i due file della maglia; senza id si fa tutto, e la maglia solo se manca)
# Serve: Blender 4.2 LTS, l'estensione MPFB, i pacchetti «makehuman_system_assets», «skins02» e «shirts01» di MakeHuman
# (tutti CC0). I WebP per il gioco li fa scripts/ritratti_webp.py.
import bpy, sys, os, json, math, random, time, mathutils
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

arg = sys.argv[sys.argv.index('--') + 1:]
ASPETTI = json.load(open(arg[0], encoding='utf-8')); USCITA = arg[1]
CAMPIONI = int(arg[2]) if len(arg) > 2 else 256; LATO = int(arg[3]) if len(arg) > 3 else 1024
SOLO = set(arg[4].split(',')) if len(arg) > 4 and arg[4] else None
os.makedirs(USCITA, exist_ok=True)

# ---------- inquadratura e luci (uguali per tutti, così le carte risultano allineate) ----------
# obiettivo in mm; quanto del soggetto entra in altezza, in metri; di quanti gradi il busto è girato rispetto alla camera;
# dove stanno gli occhi, contando dall'alto: poco sotto un terzo, così anche la capigliatura più alta resta tutta dentro;
# di quanto gli occhi si girano verso la camera (1 = la guardano)
OBIETTIVO = 85; ALTEZZA = .48; TRE_QUARTI = 22; OCCHI_DALL_ALTO = .38; SGUARDO = 1
# luce principale calda da sinistra a 45 gradi, riempimento morbido da destra, contorno appena azzurro e debole da dietro:
# [gradi attorno al soggetto rispetto alla camera, distanza, altezza sugli occhi, potenza in watt, colore, lato del pannello]
LUCI = [[45, 1.5, .45, 42, (1.0, .9, .78), .9], [-55, 1.8, .05, 9, (.93, .96, 1.0), 1.8], [-150, 1.4, .5, 26, (.82, .9, 1.0), .5]]
# la luce di contorno non tocca capelli e barba: attraversandoli li accende di giallo. Per loro ce n'è una sua, debole.
CONTORNO_PELI = 5

# ---------- il busto: uguale per tutti ----------
# Dal collo in giù tutti i giocatori hanno lo stesso corpo e la stessa maglia: così la maglia è un'immagine sola e le carte
# sono allineate. Corporatura da calciatore, non da culturista; la maglia è una polo di MakeHuman (CC0) col colletto vero.
BUSTO = dict(muscle=.42, weight=.40, proportions=.55, height=.55, eta=25, tratti=(.1, .8, .1)); MAGLIA = 'namuhekam_male_polo_shirt'
# il collo: l'asse lungo cui sale (inclinato in avanti di 25 gradi) e, misurando lungo l'asse a partire dagli occhi, dove
# comincia e dove finisce il tratto che si piega. Sotto c'è il busto uguale per tutti, sopra la testa del giocatore.
COLLO = dict(gradi=25, da=-.187, a=-.107, perno=(0, -.03))
# le pieghe della stoffa: larghezza delle onde in metri, quanto sporgono, come sono stirate (più lunghe che larghe) e inclinate
PIEGHE = dict(larghe=.06, alte=.026, stira=(1.0, 1.0, .32), gradi=22)
# di quanto la testa è ingrandita rispetto al corpo di MakeHuman (in un busto piccolo si legge meglio)
TESTA = 1.04
# la mappa della maglia: i metri coperti dal rosso (di lato, da sinistra a destra) e dal verde (in altezza, rispetto agli occhi)
MAPPA = dict(x=(-.4, .4), z=(-.5, .1))
# posa della testa, in gradi: quanto gira verso la camera, quanto si inclina di lato, quanto china il mento
POSA = dict(gira=(4, 14), inclina=(-4, 4), china=(-3, 3))
# espressioni: le «unità» di MPFB da caricare e quanto. Si sceglie dal seme del viso, se l'aspetto non la dice.
ESPRESSIONI = {
    'sorriso': {'mouth-corner-puller': .55, 'eye-left-slit': .2, 'eye-right-slit': .2},
    'mezzo sorriso': {'mouth-corner-puller': .3, 'eye-left-slit': .08, 'eye-right-slit': .08},
    'deciso': {'eyebrows-left-down': .6, 'eyebrows-right-down': .6, 'eye-left-slit': .15, 'eye-right-slit': .15, 'mouth-compression': .25},
    'serio': {'eyebrows-left-down': .25, 'eyebrows-right-down': .25},
}
SCELTA_ESPRESSIONE = [('sorriso', 3), ('mezzo sorriso', 3), ('deciso', 3), ('serio', 1)]

# ---------- pelle: sei tonalità ----------
# per ognuna: la pelle di MPFB (giovane, e la versione adulta dai 30 anni), il miscuglio dei tratti del viso, un colore da
# mescolare alla pelle e quanto, la luminosità, il colore verso cui tirano le labbra (perché non sembrino truccate). Le lentiggini sono una pelle a parte, solo per le tonalità chiare.
PELLI = [
    dict(giovane='young_caucasian_male2', adulta='middleage_caucasian_male', tratti=(.03, .94, .03), mescola=((.95, .78, .68), .0), luce=.02, labbra=(0.74, 0.52, 0.44)),
    dict(giovane='young_caucasian_male', adulta='middleage_caucasian_male', tratti=(.06, .88, .06), mescola=((.85, .55, .40), .12), luce=-.01, labbra=(0.7, 0.48, 0.39)),
    dict(giovane='toigo_light_skin_male_bronze', adulta='toigo_light_skin_male_bronze', tratti=(.12, .76, .12), mescola=((.52, .33, .21), .42), luce=-.05, labbra=(0.56, 0.37, 0.28)),
    dict(giovane='toigo_light_skin_male_bronze', adulta='toigo_light_skin_male_bronze', tratti=(.25, .40, .35), mescola=((.36, .21, .13), .62), luce=-.07, labbra=(0.42, 0.26, 0.19)),
    dict(giovane='young_african_male', adulta='middleage_african_male', tratti=(.08, .22, .70), mescola=((.45, .28, .18), .10), luce=.05, labbra=(0.34, 0.21, 0.16)),
    dict(giovane='young_african_male', adulta='mindfront_skin_male_african_middleage', tratti=(.03, .07, .90), mescola=((.22, .13, .09), .18), luce=-.02, labbra=(0.22, 0.13, 0.1)),
]
LENTIGGINI = 'toigo_light_skin_male_freckles'
# occhi: colore principale e secondario dell'iride
OCCHI = {'scuri': ((.025, .012, .006), (.05, .025, .012)), 'castani': ((.07, .035, .015), (.14, .075, .03)), 'nocciola': ((.14, .09, .035), (.13, .14, .06)),
         'verdi': ((.07, .14, .07), (.18, .19, .08)), 'azzurri': ((.07, .16, .30), (.22, .32, .42)), 'grigi': ((.13, .17, .20), (.26, .29, .31))}
# capelli e barba: melanina (0 chiarissimo, 1 nero) e quanto tira al rosso
COLORI = {'nero': (1.0, .1), 'castano scuro': (.97, .15), 'castano': (.9, .25), 'castano chiaro': (.8, .25), 'biondo': (.55, .22), 'rosso': (.72, .9)}

# ---------- capelli: dodici capigliature a ciocche ----------
# Ogni ciocca cresce da script: parte dalla pelle e piega verso il «verso» in cui è pettinata (x di lato, y indietro,
# z in su), restando fuori dalla testa. sopra, lati: lunghezza in metri in cima e sui lati; quante: ciocche disegnate;
# alza: quanto restano dritte invece di sdraiarsi sulla testa; piega: quanto in fretta prendono il verso; strati: di
# quanto si staccano dalla pelle, per dare volume; mosso: quanto sono spettinate; riccio: larghezza del ricciolo e
# giri; ciuffi: quanto si raccolgono a gruppi verso la punta; vario: quanto ogni ciuffo va per conto suo (verso e
# lunghezza), perché non sembrino un casco; onda: larghezza dell'onda dei capelli lunghi; peso: quanto ricadono; riga:
# dove sta la riga di lato; fuori: pettinati dal centro verso i lati; davanti: quanto sono più lunghi sulla fronte;
# stempiato; calvo: nessun capello; chignon: raccolti dietro.
CAPELLI = {
    'rasato':    dict(sopra=.004, lati=.003, quante=42000, verso=(0, 0, 0), alza=1, piega=.2, strati=.0004, mosso=.08, spessi=.00008),
    'corto':     dict(sopra=.026, lati=.014, quante=46000, verso=(0, -.7, -.5), alza=.22, piega=.6, strati=.003, mosso=.04, ciuffi=.25, vario=.1, spessi=.00013),
    'sfumato':   dict(sopra=.034, lati=.0035, quante=32000, verso=(.5, -.6, 0), alza=.5, piega=.45, strati=.004, mosso=.05, ciuffi=.45, vario=.2),
    'ciuffo':    dict(sopra=.036, lati=.009, quante=36000, verso=(.3, .9, .2), alza=.3, piega=.5, strati=.005, mosso=.035, ciuffi=.6, vario=.25, davanti=.9),
    'indietro':  dict(sopra=.085, lati=.035, quante=30000, verso=(0, 1, -.1), alza=.12, piega=.6, strati=.007, mosso=.02, ciuffi=.6, vario=.18, peso=.5),
    'riga':      dict(sopra=.06, lati=.02, quante=30000, verso=(1, .25, -.25), riga=.03, alza=.2, piega=.55, strati=.007, mosso=.025, ciuffi=.6, vario=.22, peso=.6),
    'ricci':     dict(sopra=.045, lati=.02, quante=20000, verso=(0, 0, 0), alza=1, piega=.3, strati=.004, mosso=.12, riccio=(.006, 2.2), ciuffi=.5, spessi=.00011),
    'afro':      dict(sopra=.05, lati=.04, quante=24000, verso=(0, 0, 0), alza=1, piega=.3, strati=.004, mosso=.15, riccio=(.005, 4), spessi=.00011),
    'raccolti':  dict(sopra=.11, lati=.09, quante=26000, chignon=True, verso=(0, 1, 0), alza=.06, piega=.7, strati=.004, mosso=.015, ciuffi=.45, vario=.06),
    'calvo':     dict(calvo=True),
    'stempiato': dict(sopra=.018, lati=.009, quante=38000, stempiato=.55, verso=(.2, .5, -.3), alza=.3, piega=.45, strati=.002, mosso=.05, ciuffi=.35, vario=.2),
    'lunghi':    dict(sopra=.15, lati=.13, quante=30000, verso=(.35, .45, -.6), fuori=True, alza=.14, piega=.55, strati=.012, mosso=.015, ciuffi=.7, vario=.14, onda=.005, peso=1.2, spessi=.00009),
}
# ---------- barbe: sei tipi, più il viso rasato ----------
# zone: dove cresce (baffi, mento, guance e mascella, sotto il mento); lunga: lunghezza in metri; quante: peli disegnati.
BARBE = {
    'nessuna':  None,
    'ombra':    dict(zone=('baffi', 'mento', 'guance', 'sotto'), lunga=.0018, quante=17000, alza=.9, mosso=.1, spessi=.00005),
    'corta':    dict(zone=('baffi', 'mento', 'guance', 'sotto'), lunga=.007, quante=22000, alza=.6, mosso=.08),
    'piena':    dict(zone=('baffi', 'mento', 'guance', 'sotto'), lunga=.02, quante=26000, alza=.5, mosso=.08, riccio=(.0015, 1.5), ciuffi=.3),
    'pizzetto': dict(zone=('baffi', 'mento'), lunga=.01, quante=10000, alza=.55, mosso=.06),
    'baffi':    dict(zone=('baffi',), lunga=.01, quante=4500, alza=.35, mosso=.05),
    'collare':  dict(zone=('mento', 'guance', 'sotto'), lunga=.008, quante=17000, alza=.6, mosso=.08, sottile=True),
}

clamp = lambda v, a, b: max(a, min(b, v))
liscio = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(clamp((x - a) / (b - a), 0, 1)) if a != b else float(x >= a)

def trova(sotto, nome, pelle=False):
    for p in (AssetService.list_mhmat_assets(sotto) if pelle else AssetService.list_mhclo_assets(sotto)):
        if os.path.basename(str(p)).rsplit('.', 1)[0] == nome: return str(p)
    raise RuntimeError(f'manca {sotto}/{nome}: installare i pacchetti di MakeHuman')

def eta_mpfb(anni):
    # nella scala di MakeHuman 0,1875 sono dieci anni, 0,5 venticinque, 1 novanta
    return .1875 + (anni - 10) / 15 * .3125 if anni <= 25 else .5 + (anni - 25) / 65 * .5

# Le regolazioni del viso: per ognuna i due file di MPFB (di più, di meno) e tra quali valori può cambiare. Quelle con
# «l-» valgono per tutti e due i lati, con lo stesso valore: il viso resta simmetrico. Gli intervalli tengono i tratti
# maschili: mascella e mento larghi, labbra sottili, occhi non grandi, guance asciutte.
VISO = [('head-fat', -.5, .15), ('head-scale-horiz', -.3, .4), ('head-scale-vert', -.3, .4), ('head-scale-depth', -.3, .3), ('forehead-temple', -.5, .5), ('forehead-scale-vert', -.5, .4), ('forehead-nubian', -.4, .4),
        ('nose-scale-horiz', -.5, .7), ('nose-scale-vert', -.4, .6), ('nose-scale-depth', -.4, .6), ('nose-hump', -.5, .7), ('nose-nostrils-width', -.6, .7), ('nose-point-width', -.4, .6), ('nose-greek', -.5, .5), ('nose-flaring', -.5, .5),
        ('chin-width', .0, .8), ('chin-height', -.2, .6), ('chin-prominent', -.2, .6), ('chin-jaw-drop', -.2, .5), ('chin-bones', .1, .8), ('chin-cleft', -.3, .5),
        ('mouth-scale-horiz', -.3, .6), ('mouth-lowerlip-volume', -.7, .0), ('mouth-upperlip-volume', -.7, .0), ('mouth-scale-depth', -.4, .3),
        ('l-cheek-bones', -.4, .7), ('l-cheek-volume', -.6, .1), ('l-cheek-inner', -.5, .3), ('l-ear-scale', -.6, .6), ('l-ear-wing', -.6, .35), ('l-ear-lobe', -.6, .6),
        ('l-eye-scale', -.45, .05), ('l-eye-height2', -.5, .3), ('l-eye-bag', -.3, .5), ('neck-scale-horiz', .0, .5), ('neck-scale-depth', -.2, .4)]
FORME = ['head-oval', 'head-rectangular', 'head-square', 'head-triangular', 'head-invertedtriangular', 'head-diamond']
SOPRACCIGLIA = ['eyebrow001', 'eyebrow002', 'eyebrow003', 'eyebrow004', 'eyebrow006', 'eyebrow008', 'eyebrow009', 'eyebrow010', 'eyebrow012']

def carica(corpo, nome, peso):
    f = nome if os.path.isabs(nome) else TargetService.target_full_path(nome)
    if f and peso > .01: TargetService.load_target(corpo, f, weight=peso, name=os.path.basename(nome).split('.')[0])

def viso(corpo, caso, espressione, tratti):
    carica(corpo, caso.choice(FORME), caso.uniform(.25, .7))
    for nome, meno, piu in VISO:
        v = caso.uniform(meno, piu)
        for lato in (('l-', 'r-') if nome.startswith('l-') else ('',)):
            carica(corpo, lato + nome[2 if lato else 0:] + ('-incr' if v > 0 else '-decr'), abs(v))
    # sopracciglia un po' più basse sugli occhi
    carica(corpo, 'eyebrows-trans-down', caso.uniform(.1, .45))
    # l'espressione: le unità di MPFB della famiglia di tratti che pesa di più
    famiglia = ('asian', 'caucasian', 'african')[max(range(3), key=lambda i: tratti[i])]
    cartella = os.path.join(os.path.dirname(os.path.dirname(TargetService.target_full_path('head-oval'))), 'expression', 'units', famiglia)
    for nome, peso in ESPRESSIONI[espressione].items(): carica(corpo, os.path.join(cartella, nome + '.target.gz'), peso)

def gruppo(corpo, nome):
    g = corpo.vertex_groups[nome].index
    return [v for v in corpo.data.vertices if any(x.group == g and x.weight > .5 for x in v.groups)]

def materiale_capelli(nome, colore, ruvido=.3):
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes; n.clear()
    h = n.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'MELANIN'; mel, rosso = COLORI[colore]
    h.inputs['Melanin'].default_value = mel; h.inputs['Melanin Redness'].default_value = rosso; h.inputs['Roughness'].default_value = ruvido
    h.inputs['Radial Roughness'].default_value = .4; h.inputs['Random Color'].default_value = .15; h.inputs['Random Roughness'].default_value = .1
    o = n.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(h.outputs[0], o.inputs[0]); return m

def superficie(corpo):
    """La pelle del corpo (senza le forme di servizio di MPFB) come albero di ricerca: serve a tenere i capelli fuori dalla testa."""
    dentro = {v.index for v in gruppo(corpo, 'body')}; corpo.data.update()
    facce = [tuple(p.vertices) for p in corpo.data.polygons if all(i in dentro for i in p.vertices)]
    return BVHTree.FromPolygons([v.co.copy() for v in corpo.data.vertices], facce), facce

def radici(corpo, facce, pesi, quante, caso):
    """Punti a caso sulla pelle dove `pesi` (vertice → 0-1) è positivo, più fitti dove pesa di più: posizione, normale, peso."""
    V = corpo.data.vertices; tri = []; area = []
    for f in facce:
        if max(pesi.get(i, 0) for i in f) <= 0: continue
        for k in range(1, len(f) - 1):
            a, b, c = f[0], f[k], f[k + 1]; w = (pesi.get(a, 0) + pesi.get(b, 0) + pesi.get(c, 0)) / 3
            if w > 0: tri.append((a, b, c)); area.append(mathutils.geometry.area_tri(V[a].co, V[b].co, V[c].co) * w)
    out = []
    if not tri: return out
    for a, b, c in caso.choices(tri, weights=area, k=quante):
        u, v = caso.random(), caso.random()
        if u + v > 1: u, v = 1 - u, 1 - v
        w = 1 - u - v; peso = pesi.get(a, 0) * w + pesi.get(b, 0) * u + pesi.get(c, 0) * v
        out.append((V[a].co * w + V[b].co * u + V[c].co * v, (V[a].normal * w + V[b].normal * u + V[c].normal * v).normalized(), peso))
    return out

def cresci(pelle, p0, n0, lunga, passi, pettine, alza, piega, stacco, caso, mosso=0, riccio=None):
    """Una ciocca: parte dalla pelle lungo la normale e piega verso il `pettine` (la direzione voluta in quel punto),
    restando sempre almeno `stacco` fuori dalla pelle. `alza` dice quanto resta dritta invece di sdraiarsi sulla testa."""
    pts = [p0.copy()]; p = p0.copy(); d = n0.copy(); nor = n0; seg = lunga / passi
    for k in range(1, passi + 1):
        t = pettine(p, k / passi); tt = t - nor * t.dot(nor); voluta = tt + nor * alza
        if voluta.length > 1e-6: d = (d * (1 - piega) + voluta.normalized() * piega)
        if mosso: d = d + mathutils.Vector((caso.gauss(0, mosso), caso.gauss(0, mosso), caso.gauss(0, mosso)))
        d.normalize(); p = p + d * seg
        vicino, n2, _, _ = pelle.find_nearest(p)
        if vicino is not None:
            nor = n2
            if (p - vicino).dot(n2) < stacco: p = vicino + n2 * stacco
        pts.append(p.copy())
    if riccio:
        # il ricciolo: ogni punto gira attorno alla ciocca, sempre più largo verso la punta
        amp, giri = riccio; fase = caso.uniform(0, 6.283); asse = (pts[-1] - pts[0]); asse = asse.normalized() if asse.length > 1e-6 else n0
        u = asse.orthogonal().normalized(); v = asse.cross(u)
        for k in range(1, len(pts)):
            a = fase + giri * 6.283 * k / passi; r = amp * min(1, k / passi * 2.5); pts[k] = pts[k] + u * (math.cos(a) * r) + v * (math.sin(a) * r)
    return pts

def oggetto_ciocche(nome, ciocche, raggio, mat, muovi):
    """Mette le ciocche in un oggetto «capelli» di Blender: Cycles le disegna come fili, più sottili verso la punta.
    Le ciocche sono cresciute sulla testa dritta: `muovi` le porta dove la posa ha portato la testa."""
    cu = bpy.data.hair_curves.new(nome); cu.add_curves([len(c) for c in ciocche])
    cu.points.foreach_set('position', [x for c in ciocche for p in c for x in muovi(p)])
    r = cu.attributes.get('radius') or cu.attributes.new('radius', 'FLOAT', 'POINT')
    r.data.foreach_set('value', [raggio * (1 - .75 * k / (len(c) - 1)) for c in ciocche for k in range(len(c))])
    o = bpy.data.objects.new(nome, cu); bpy.context.scene.collection.objects.link(o); cu.materials.append(mat); return o

def raccogli(ciocche, guida, quanto, caso):
    """Le ciocche si raccolgono verso la punta attorno alla ciocca guida del loro ciuffo; qualcuna resta libera."""
    if quanto <= 0: return
    for i, c in enumerate(ciocche):
        g = ciocche[guida[i]]
        if g is c or caso.random() < .03: continue
        scarto = c[0] - g[0]; n = len(c) - 1; m = len(g) - 1
        for k in range(1, n + 1):
            t = k / n; c[k] = c[k].lerp(g[round(t * m)] + scarto * (1 - .8 * t), quanto * t)

def capelli(corpo, a, caso, pelle, facce):
    """Le ciocche dei capelli, cresciute sulla testa ancora dritta: tornano con raggio e materiale, da mettere in scena dopo la posa."""
    C = CAPELLI[a['capelli']]
    if C.get('calvo'): return None
    mat = materiale_capelli('Capelli', a['colore'])
    testa = gruppo(corpo, 'scalp'); z0 = min(v.co.z for v in testa); z1 = max(v.co.z for v in testa); y0 = min(v.co.y for v in testa); y1 = max(v.co.y for v in testa); xm = max(abs(v.co.x) for v in testa)
    alto = z1 - z0; pesi = {}
    for v in testa:
        w = 1.0
        # stempiato: l'attaccatura arretra davanti, ai lati della fronte
        if C.get('stempiato'):
            davanti = liscio(y0 + .06, y0 + .005, v.co.y); tempia = liscio(xm * .2, xm * .7, abs(v.co.x)); w = 1 - clamp(C['stempiato'] * davanti * (.3 + tempia) * 1.7, 0, 1)
        if w > .03: pesi[v.index] = w
    nodo = mathutils.Vector((0, y1 - .012, z0 + alto * .70))
    def pettine(p, t):
        # la direzione in cui i capelli vengono pettinati in quel punto della testa
        x, y, z = C['verso']
        if C.get('riga'): x = x if p.x > C['riga'] else -x
        if C.get('chignon'): v = nodo - p; return v.normalized() if v.length > .01 else mathutils.Vector((0, 1, 0))
        return mathutils.Vector((x if not C.get('fuori') else (1 if p.x > 0 else -1) * abs(x), y, z - C.get('peso', 0) * t))
    rad = radici(corpo, facce, pesi, C['quante'], caso)
    if not rad: return None
    # i ciuffi: una radice ogni quaranta fa da guida; ogni ciuffo ha il suo verso, la sua lunghezza, il suo stacco dalla
    # testa e la sua onda, così i capelli si leggono a ciocche e non come una massa sola
    vario = C.get('vario', 0); quanti = max(1, len(rad) // 40); albero = KDTree(quanti)
    for i in range(quanti): albero.insert(rad[i][0], i)
    albero.balance()
    ciuffo = [(mathutils.Vector((caso.gauss(0, vario), caso.gauss(0, vario), caso.gauss(0, vario))), 1 + caso.uniform(-.6, .25) * vario * 2, caso.random(), caso.uniform(0, 6.283)) for _ in range(quanti)]
    ciocche = []; guida = []; posto = {}
    for i, (p, n, w) in enumerate(rad):
        g = albero.find(p)[1]; devia, lungo, stacco, fase = ciuffo[g]
        su = liscio(.45, .75, (p.z - z0) / alto); lunga = (C['lati'] + (C['sopra'] - C['lati']) * su) * caso.uniform(.8, 1.08) * lungo * (.55 + .45 * w)
        # il ciuffo: più lungo davanti che dietro
        if C.get('davanti'): lunga *= 1 + C['davanti'] * liscio(y0 + .09, y0 + .01, p.y) * su
        if C.get('chignon'): lunga = min(lunga, (nodo - p).length * 1.08)
        if lunga < .001: continue
        passi = clamp(int(lunga / .006) + 2, 2, 18)
        pts = cresci(pelle, p, n, lunga, passi, lambda q, t: pettine(q, t) + devia, C.get('alza', .5), C.get('piega', .5), .0015 + (stacco * .7 + caso.random() * .3) * C.get('strati', .003), caso, C.get('mosso', 0), C.get('riccio'))
        if C.get('onda'):
            # l'onda dei capelli lunghi: di lato rispetto alla ciocca, la stessa per tutto il ciuffo
            for k in range(1, len(pts)):
                t = k / passi; d = pts[k] - pts[k - 1]; lato = d.cross(n)
                if lato.length > 1e-9: pts[k] = pts[k] + lato.normalized() * (math.sin(fase + t * 7.5) * C['onda'] * t)
        # la guida del ciuffo è la ciocca cresciuta dalla sua radice (le prime radici dell'elenco)
        posto[i] = len(ciocche); guida.append(g); ciocche.append(pts)
    guida = [posto.get(g, k) for k, g in enumerate(guida)]
    raccogli(ciocche, guida, C.get('ciuffi', 0), caso)
    if C.get('chignon'):
        # i capelli raccolti dietro: giri di capelli attorno a una palla
        for _ in range(900):
            asse = mathutils.Vector((caso.gauss(0, 1), caso.gauss(0, 1), caso.gauss(0, 1))).normalized(); u = asse.orthogonal().normalized(); v = asse.cross(u)
            r = .026 * caso.uniform(.75, 1.05); a0 = caso.uniform(0, 6.283); alt = caso.uniform(-.6, .6) * r; rr = math.sqrt(max(1e-6, r * r - alt * alt))
            ciocche.append([nodo + mathutils.Vector((0, .018, .004)) + asse * alt + u * (math.cos(a0 + k * .45) * rr) + v * (math.sin(a0 + k * .45) * rr) for k in range(9)])
    return ('Capelli', ciocche, C.get('spessi', .0001), mat) if ciocche else None

def barba(corpo, a, caso, pelle, facce):
    B = BARBE[a.get('barba', 'nessuna')]
    if not B: return None
    labbra = gruppo(corpo, 'lips'); orecchie = gruppo(corpo, 'ears'); corpo_v = {v.index for v in gruppo(corpo, 'body')}; no = {v.index for v in labbra} | {v.index for v in orecchie}
    lz1 = max(v.co.z for v in labbra); lz0 = min(v.co.z for v in labbra); ly = min(v.co.y for v in labbra); bocca = max(abs(v.co.x) for v in labbra)
    oy = min(v.co.y for v in orecchie); oz0 = min(v.co.z for v in orecchie); ox = min(abs(v.co.x) for v in orecchie)
    # il mento: il punto più avanti sotto la bocca, in mezzo
    sotto = [v for v in corpo.data.vertices if v.index in corpo_v and abs(v.co.x) < .012 and lz0 - .065 < v.co.z < lz0 - .012 and v.co.y < ly + .03]
    mento = min(sotto, key=lambda v: v.co.y).co; base = mento.z - .022
    pesi = {}
    for v in corpo.data.vertices:
        if v.index not in corpo_v or v.index in no: continue
        x = abs(v.co.x); y = v.co.y; z = v.co.z
        if z > lz1 + .03 or z < base - .035 or y > oy + .004: continue
        w = 0
        if 'baffi' in B['zone']:
            w = max(w, liscio(lz1 - .001, lz1 + .003, z) * liscio(lz1 + .019, lz1 + .012, z) * liscio(bocca * 1.3, bocca * 1.05, x) * liscio(ly + .03, ly + .018, y))
        if 'mento' in B['zone']:
            w = max(w, liscio(lz0 - .002, lz0 - .008, z) * liscio(base - .014, base, z) * liscio(bocca * 1.4, bocca * 1.0, x) * liscio(mento.y + .05, mento.y + .03, y))
        if 'guance' in B['zone']:
            # sotto la linea che va dall'angolo della bocca all'attaccatura dell'orecchio, e davanti all'orecchio
            k = clamp((x - bocca * .9) / max(.001, ox - bocca * .9), 0, 1); linea = (lz1 - .002) + (oz0 + .008 - lz1 + .002) * k ** 1.6
            alta = linea if not B.get('sottile') else min(linea, base + .028 + .04 * k)
            w = max(w, liscio(alta + .006, alta - .008, z) * liscio(base - .016, base + .002, z) * liscio(bocca * .85, bocca * 1.15, x) * liscio(oy + .002, oy - .012, y))
        if 'sotto' in B['zone']:
            w = max(w, liscio(base + .008, base - .004, z) * liscio(base - .034, base - .018, z) * liscio(ox * 1.0, ox * .8, x) * liscio(oy - .008, oy - .03, y) * .85)
        if w > .04: pesi[v.index] = w
    if not pesi: return None
    mat = materiale_capelli('Barba', a.get('colore_barba', a['colore']), ruvido=.5)
    giu = lambda p, t: mathutils.Vector(((1 if p.x > 0 else -1) * (.5 if p.z > lz1 else .08), -.25, -1))
    ciocche = []
    for p, n, w in radici(corpo, facce, pesi, B['quante'], caso):
        lunga = B['lunga'] * caso.uniform(.6, 1.15) * (.5 + .5 * w)
        if caso.random() > w * 1.4 or lunga < .0006: continue
        ciocche.append(cresci(pelle, p, n, lunga, clamp(int(lunga / .004) + 2, 2, 7), giu, B.get('alza', .55), .5, .0006, caso, B.get('mosso', .05), B.get('riccio')))
    return ('Barba', ciocche, B.get('spessi', .00008), mat) if ciocche else None

# ---------- il busto standard, la testa del giocatore sopra, la maglia ----------
ASSE = mathutils.Vector((0, -math.sin(math.radians(COLLO['gradi'])), math.cos(math.radians(COLLO['gradi']))))

def umano(macro):
    corpo = HumanService.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    return corpo

def pezzo(corpo, sotto, nome, tipo, come):
    prima = set(bpy.data.objects)
    HumanService.add_mhclo_asset(trova(sotto, nome), corpo, asset_type=tipo, subdiv_levels=1, material_type=come, set_up_rigging=False, interpolate_weights=False, import_subrig=False, import_weights=False)
    return (set(bpy.data.objects) - prima).pop()

def centro_occhi(occhi):
    return sum((v.co for v in occhi.data.vertices), mathutils.Vector()) / len(occhi.data.vertices)

def macro_di(eta, tratti):
    asia, cauc, afr = tratti
    return {'gender': 1.0, 'age': eta_mpfb(eta), 'muscle': BUSTO['muscle'], 'weight': BUSTO['weight'], 'proportions': BUSTO['proportions'], 'height': BUSTO['height'], 'cupsize': .5, 'firmness': .5,
            'race': {'asian': asia, 'caucasian': cauc, 'african': afr}}

def standard():
    """Il corpo uguale per tutti: le posizioni dei suoi punti e il centro dei suoi occhi."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    corpo = umano(macro_di(BUSTO['eta'], BUSTO['tratti'])); TargetService.bake_targets(corpo)
    occhi = pezzo(corpo, 'eyes', 'high-poly', 'Eyes', 'PROCEDURAL_EYES')
    return [v.co.copy() for v in corpo.data.vertices], centro_occhi(occhi)

def sul_busto(corpo, occhi):
    """Mette la testa del giocatore sul busto standard: prima la sposta finché gli occhi coincidono con quelli standard,
    poi dal collo in giù ogni punto del corpo prende la posizione standard (sfumando lungo il collo)."""
    sposta = OCCHI_STD - centro_occhi(occhi); t0 = OCCHI_STD.dot(ASSE)
    for v in occhi.data.vertices: v.co += sposta
    for v, std in zip(corpo.data.vertices, STD):
        w = liscio(COLLO['da'] - .03, COLLO['da'] + .01, std.dot(ASSE) - t0); v.co = std.lerp(v.co + sposta, w)

def posa(oggetti, occhi, gira, inclina, china):
    """Ingrandisce un poco la testa e la gira, la inclina e la china attorno al collo. Il movimento cresce lungo il collo:
    alla base è zero (il busto resta fermo), sotto il mento è pieno. Alla fine gli occhi tornano nel punto di sempre.
    Torna la funzione che porta un punto qualsiasi dove la posa l'ha portato (serve a capelli e barba)."""
    t0 = OCCHI_STD.dot(ASSE); perno = mathutils.Vector((COLLO['perno'][0], COLLO['perno'][1], 0))
    perno.z = (t0 + COLLO['da'] - perno.dot(ASSE)) / ASSE.z
    def muovi(p, sposta=mathutils.Vector()):
        w = liscio(COLLO['da'], COLLO['a'], p.dot(ASSE) - t0)
        if w <= 0: return p.copy()
        R = mathutils.Euler((math.radians(china * w), math.radians(inclina * w), math.radians(-gira * w)), 'XYZ').to_matrix()
        return perno + (R @ (p - perno)) * (1 + (TESTA - 1) * w) + sposta * w
    sposta = OCCHI_FISSI - muovi(centro_occhi(occhi))
    for o in oggetti:
        for v in o.data.vertices: v.co = muovi(v.co, sposta)
        o.data.update()
    return lambda p: muovi(p, sposta)

def liscia(oggetti, fini):
    for o in oggetti:
        s = next((m for m in o.modifiers if m.type == 'SUBSURF'), None) or o.modifiers.new('Liscia', 'SUBSURF'); s.levels = 1; s.render_levels = 2 if o in fini else 1
        for p in o.data.polygons: p.use_smooth = True

def tessuto(o):
    """La stoffa della maglia, bianca: pieghe larghe che scendono dalle spalle e una trama fitta da maglia da gioco.
    Colletto e bottoni (i pezzi staccati dal resto della polo) stanno nel secondo materiale, per la mappa."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table(); visti = set(); isole = []
    for v in bm.verts:
        if v.index in visti: continue
        pila = [v]; isola = []; visti.add(v.index)
        while pila:
            a = pila.pop(); isola.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in visti: visti.add(b.index); pila.append(b)
        isole.append(isola)
    # il pezzo più grande è la maglia; gli altri pezzi che stanno in alto sono colletto e bottoni
    grande = max(isole, key=len); alto = max(v.co.z for v in grande); bordo = set()
    for i in isole:
        if i is not grande and max(v.co.z for v in i) > alto - .15: bordo |= {v.index for v in i}
    bm.free()
    mat = bpy.data.materials.new('Stoffa'); mat.use_nodes = True; n = mat.node_tree.nodes; L = mat.node_tree.links; b = n['Principled BSDF']
    b.inputs['Base Color'].default_value = (.8, .8, .8, 1); b.inputs['Roughness'].default_value = .62
    if 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = .3
    co = n.new('ShaderNodeTexCoord')
    # le pieghe: onde larghe, storte dal rumore, più strette in altezza che di lato
    sc = n.new('ShaderNodeMapping'); sc.inputs['Scale'].default_value = (1.0, 1.0, .45); sc.inputs['Rotation'].default_value = (0, math.radians(28), 0); L.new(co.outputs['Object'], sc.inputs['Vector'])
    pieghe = n.new('ShaderNodeTexNoise'); pieghe.inputs['Scale'].default_value = 9; pieghe.inputs['Detail'].default_value = 2.5; pieghe.inputs['Roughness'].default_value = .45; pieghe.inputs['Distortion'].default_value = 1.2; L.new(sc.outputs['Vector'], pieghe.inputs['Vector'])
    r1 = n.new('ShaderNodeBump'); r1.inputs['Strength'].default_value = .4; r1.inputs['Distance'].default_value = .015; L.new(pieghe.outputs['Fac'], r1.inputs['Height'])
    trama = n.new('ShaderNodeTexVoronoi'); trama.feature = 'F1'; trama.inputs['Scale'].default_value = 700; L.new(co.outputs['Object'], trama.inputs['Vector'])
    r2 = n.new('ShaderNodeBump'); r2.inputs['Strength'].default_value = .12; r2.inputs['Distance'].default_value = .0006; L.new(trama.outputs['Distance'], r2.inputs['Height']); L.new(r1.outputs['Normal'], r2.inputs['Normal'])
    L.new(r2.outputs['Normal'], b.inputs['Normal'])
    o.data.materials.clear(); o.data.materials.append(mat); o.data.materials.append(mat.copy())
    for f in o.data.polygons: f.material_index = 1 if all(i in bordo for i in f.vertices) else 0
    # le pieghe vere: la stoffa si gonfia lungo onde storte, quasi solo in fuori per non entrare nel corpo (non vicino al
    # colletto, che resta al suo posto)
    liscia([o], [o]); g = o.vertex_groups.new(name='Pieghe')
    for v in o.data.vertices: g.add([v.index], 0 if v.index in bordo else liscio(alto - .035, alto - .12, v.co.z), 'REPLACE')
    guida = bpy.data.objects.new('GuidaPieghe', None); bpy.context.scene.collection.objects.link(guida); guida.scale = PIEGHE['stira']; guida.rotation_euler = (0, math.radians(PIEGHE['gradi']), 0)
    tex = bpy.data.textures.new('Pieghe', 'CLOUDS'); tex.noise_scale = PIEGHE['larghe']; tex.noise_depth = 1
    d = o.modifiers.new('Pieghe', 'DISPLACE'); d.texture = tex; d.texture_coords = 'OBJECT'; d.texture_coords_object = guida; d.vertex_group = 'Pieghe'; d.mid_level = .2; d.strength = PIEGHE['alte']
    return o

def mappa(o):
    """I due materiali della maglia diventano colori piatti: rosso = posizione di lato, verde = altezza, blu = bordo."""
    for i in (0, 1):
        m = bpy.data.materials.new(f'Mappa{i}'); m.use_nodes = True; n = m.node_tree.nodes; L = m.node_tree.links; n.clear()
        co = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); L.new(co.outputs['Object'], sep.inputs[0]); com = n.new('ShaderNodeCombineXYZ')
        for asse, (da, a), base in (('X', MAPPA['x'], 0), ('Z', MAPPA['z'], OCCHI_FISSI.z)):
            r = n.new('ShaderNodeMapRange'); r.inputs['From Min'].default_value = base + da; r.inputs['From Max'].default_value = base + a; L.new(sep.outputs[asse], r.inputs['Value']); L.new(r.outputs[0], com.inputs['X' if asse == 'X' else 'Y'])
        com.inputs['Z'].default_value = i
        e = n.new('ShaderNodeEmission'); L.new(com.outputs[0], e.inputs['Color']); u = n.new('ShaderNodeOutputMaterial'); L.new(e.outputs[0], u.inputs[0])
        o.material_slots[i].material = m

def mappa_gioco():
    """Riscrive la mappa in una forma che il gioco legge senza perdere precisione: un'immagine larga il doppio, a otto
    bit e senza trasparenza. Metà sinistra: rosso e verde = posizione di lato (parte grossa e parte fine), blu = bordo.
    Metà destra: rosso e verde = altezza. La trasparenza della maglia sta in «maglia-luce»."""
    import numpy as np
    f = os.path.join(USCITA, 'maglia-mappa.png'); im = bpy.data.images.load(f); im.colorspace_settings.name = 'Non-Color'; im.alpha_mode = 'STRAIGHT'
    px = np.empty(LATO * LATO * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(LATO, LATO, 4); bpy.data.images.remove(im)
    def due(v):
        n = np.clip(np.round(v * 65535), 0, 65535); return np.floor(n / 256) / 255, (n % 256) / 255
    out = np.zeros((LATO, LATO * 2, 4), np.float32); out[..., 3] = 1
    out[:, :LATO, 0], out[:, :LATO, 1] = due(px[..., 0]); out[:, :LATO, 2] = px[..., 2]; out[:, LATO:, 0], out[:, LATO:, 1] = due(px[..., 1])
    nuova = bpy.data.images.new('MappaGioco', LATO * 2, LATO, alpha=False); nuova.colorspace_settings.name = 'Non-Color'; nuova.pixels.foreach_set(out.ravel())
    nuova.filepath_raw = f; nuova.file_format = 'PNG'; nuova.save(); bpy.data.images.remove(nuova)

def sguardo(occhi, gradi):
    """Gira i due occhi verso la camera: ognuno attorno al proprio centro."""
    R = mathutils.Matrix.Rotation(math.radians(gradi), 4, 'Z'); m = centro_occhi(occhi).x
    for segno in (-1, 1):
        vs = [v for v in occhi.data.vertices if (v.co.x - m) * segno > 0]; c = sum((v.co for v in vs), mathutils.Vector()) / len(vs)
        for v in vs: v.co = c + (R @ (v.co - c))

def scena(nome, campioni=None, grezzo=False):
    """Camera, luci e impostazioni del render, uguali per tutti: la camera gira attorno al soggetto (è come girare il
    busto di tre quarti) e tiene gli occhi sempre nello stesso punto dell'immagine."""
    oz = OCCHI_FISSI.z; centro = mathutils.Vector((0, -.03, oz + ALTEZZA * (OCCHI_DALL_ALTO - .5))); ang = math.radians(TRE_QUARTI); dist = OBIETTIVO * ALTEZZA / 36
    attorno = lambda gradi, raggio, su: mathutils.Vector((centro.x - math.sin(ang + math.radians(gradi)) * raggio, centro.y - math.cos(ang + math.radians(gradi)) * raggio, oz + su))
    sc = bpy.context.scene
    if not sc.camera:
        cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam)
        cam.data.lens = OBIETTIVO; cam.data.sensor_width = 36; cam.location = attorno(0, dist, centro.z - oz); cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler(); sc.camera = cam
        for i, (gradi, raggio, su, watt, colore, lato) in enumerate(LUCI):
            d = bpy.data.lights.new(f'Luce{i}', 'AREA'); d.energy = watt; d.color = colore; d.size = lato
            o = bpy.data.objects.new(d.name, d); sc.collection.objects.link(o); o.location = attorno(gradi, raggio, su)
            o.rotation_euler = (mathutils.Vector((0, -.03, oz - .05)) - o.location).to_track_quat('-Z', 'Y').to_euler()
        peli = [x for x in bpy.data.objects if x.type == 'CURVES']
        if peli:
            # l'ultima luce è quella di contorno: una copia debole illumina solo capelli e barba, l'originale tutto il resto
            def lega(luce, includi):
                c = bpy.data.collections.new('Peli' + luce.name)
                for x in peli: c.objects.link(x)
                luce.light_linking.receiver_collection = c
                for x in c.collection_objects: x.light_linking.link_state = 'INCLUDE' if includi else 'EXCLUDE'
            d2 = d.copy(); d2.energy = CONTORNO_PELI; o2 = bpy.data.objects.new('ContornoPeli', d2); sc.collection.objects.link(o2); o2.location = o.location; o2.rotation_euler = o.rotation_euler
            lega(o, False); lega(o2, True)
        sc.world = bpy.data.worlds.new('Mondo'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.5, .6, .8, 1); sc.world.node_tree.nodes['Background'].inputs[1].default_value = .16
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = campioni or CAMPIONI; sc.cycles.use_denoising = not grezzo
    sc.cycles.use_adaptive_sampling = not grezzo; sc.cycles.adaptive_threshold = .02
    sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = LATO; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 60
    # la mappa è fatta di numeri, non di colori: esce senza correzioni e a sedici bit
    sc.render.image_settings.color_depth = '16' if grezzo else '8'
    sc.view_settings.view_transform = 'Raw' if grezzo else 'Filmic'; sc.view_settings.look = 'None' if grezzo else 'Medium High Contrast'
    sc.render.filepath = os.path.join(USCITA, nome + '.png'); bpy.ops.render.render(write_still=True)

def maglia():
    """I due file della maglia, uguali per tutti: la stoffa bianca con luci, ombre e pieghe, e la mappa per colorarla.
    Il corpo standard (con la testa) non si vede ma fa la sua ombra sul colletto e sulle spalle."""
    t0 = time.time(); bpy.ops.wm.read_factory_settings(use_empty=True)
    corpo = umano(macro_di(BUSTO['eta'], BUSTO['tratti'])); TargetService.bake_targets(corpo)
    occhi = pezzo(corpo, 'eyes', 'high-poly', 'Eyes', 'PROCEDURAL_EYES'); m = tessuto(pezzo(corpo, 'clothes', MAGLIA, 'Clothes', 'MAKESKIN'))
    posa([corpo, occhi], occhi, 0, 0, 0); liscia([corpo], [corpo])
    corpo.visible_camera = False; occhi.hide_render = True
    scena('maglia-luce'); mappa(m); corpo.hide_render = True; scena('maglia-mappa', 24, True); mappa_gioco()
    print(f"MAGLIA: fatta in {time.time() - t0:.1f} s", flush=True)

def ritratto(a):
    t0 = time.time(); bpy.ops.wm.read_factory_settings(use_empty=True); caso = random.Random(a['viso'])
    P = PELLI[a['pelle']]; anni = a['eta']
    espressione = a.get('espressione') or caso.choices([e for e, _ in SCELTA_ESPRESSIONE], weights=[w for _, w in SCELTA_ESPRESSIONE])[0]
    gira, inclina, china = (a.get(k, caso.uniform(*POSA[k])) for k in ('gira', 'inclina', 'china'))
    corpo = umano(macro_di(anni, P['tratti'])); viso(corpo, caso, espressione, P['tratti']); TargetService.bake_targets(corpo)

    pelle = LENTIGGINI if a.get('lentiggini') and a['pelle'] <= 1 else P['adulta'] if anni >= 30 else P['giovane']
    HumanService.set_character_skin(trova('skins', pelle, True), corpo, skin_type='ENHANCED_SSS')
    for m in bpy.data.materials:
        g = next((x for x in m.node_tree.nodes if x.type == 'GROUP'), None) if m.use_nodes else None
        if g and 'colorMixIn' in g.inputs:
            g.inputs['colorMixIn'].default_value = P['mescola'][0] + (1,); g.inputs['colorMixInStrength'].default_value = P['mescola'][1]; g.inputs['Brightness'].default_value = P['luce']
            if 'lips' in m.name: g.inputs['colorMixIn'].default_value = P['labbra'] + (1,); g.inputs['colorMixInStrength'].default_value = .45
            g.inputs['SSS strength'].default_value = .28; g.inputs['Pore strength'].default_value = .3; g.inputs['Roughness'].default_value = .42 if 'lips' not in m.name else .34
    # occhi per primi (servono a mettere la testa sul busto standard), poi il resto si adatta al corpo già a posto
    occhi = pezzo(corpo, 'eyes', 'high-poly', 'Eyes', 'PROCEDURAL_EYES'); sul_busto(corpo, occhi)
    ciglia = [pezzo(corpo, 'eyebrows', caso.choice(SOPRACCIGLIA), 'Eyebrows', 'MAKESKIN'), pezzo(corpo, 'eyelashes', 'eyelashes01', 'Eyelashes', 'MAKESKIN')]
    polo = tessuto(pezzo(corpo, 'clothes', MAGLIA, 'Clothes', 'MAKESKIN'))
    # capelli e barba crescono adesso, sulla testa ancora dritta e simmetrica; poi seguono la posa come il resto
    corpo.data.update(); pelle_alb, facce = superficie(corpo); peli = [capelli(corpo, a, caso, pelle_alb, facce), barba(corpo, a, caso, pelle_alb, facce)]
    muovi = posa([corpo, occhi] + ciglia, occhi, gira, inclina, china)
    for x in peli:
        if x: oggetto_ciocche(*x, muovi)
    # occhi: colore dell'iride, cornea lucida, sguardo verso la camera (la testa ha già fatto parte del giro)
    g = next(x for x in occhi.material_slots[0].material.node_tree.nodes if x.type == 'GROUP'); c1, c2 = OCCHI[a.get('occhi', 'castani')]
    g.inputs['IrisMajorColor'].default_value = c1 + (1,); g.inputs['IrisMinorColor'].default_value = c2 + (1,); g.inputs['IrisSection4Color'].default_value = tuple(x * .45 for x in c1) + (1,); g.inputs['PupilSize'].default_value = .27; g.inputs['Clearcoat'].default_value = 1
    sguardo(occhi, -(TRE_QUARTI - gira) * SGUARDO)
    # sopracciglia del colore dei capelli (un po' più scure)
    mel = COLORI[a['colore']][0]; scuro = (.03 + (1 - mel) * .22, .02 + (1 - mel) * .15, .015 + (1 - mel) * .08, 1)
    ms = ciglia[0].material_slots[0].material; b = next(x for x in ms.node_tree.nodes if x.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = scuro
    for l in list(b.inputs['Base Color'].links): ms.node_tree.links.remove(l)
    liscia([o for o in bpy.data.objects if o.type == 'MESH' and o is not polo], [corpo])
    # la maglia qui non si disegna: nasconde quello che le sta dietro e lascia il buco, che il gioco riempie con la sua
    polo.is_holdout = True
    t1 = time.time(); scena(a['id'])
    print(f"RITRATTO {a['id']}: {espressione}, gira {gira:.0f}, preparato in {t1 - t0:.1f} s, reso in {time.time() - t1:.1f} s", flush=True)

STD, OCCHI_STD = standard()
# dove finiscono gli occhi di tutti: quelli standard, spostati dall'ingrandimento della testa
OCCHI_FISSI = (lambda perno: perno + (OCCHI_STD - perno) * TESTA)(mathutils.Vector((COLLO['perno'][0], COLLO['perno'][1], (OCCHI_STD.dot(ASSE) + COLLO['da'] - mathutils.Vector((COLLO['perno'][0], COLLO['perno'][1], 0)).dot(ASSE)) / ASSE.z)))
if (SOLO and 'maglia' in SOLO) or (not SOLO and not os.path.exists(os.path.join(USCITA, 'maglia-luce.png'))): maglia()
for a in ASPETTI:
    if SOLO and a['id'] not in SOLO: continue
    ritratto(a)
print('FINITO', flush=True)
