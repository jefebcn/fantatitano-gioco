# Ritratti dei giocatori: un busto di tre quarti per ogni «aspetto», fatto con MPFB (MakeHuman per Blender: i personaggi
# creati sono CC0) e reso con Cycles. Il corpo è quello ad alta definizione di MPFB, non quello alleggerito del gioco.
# Ogni aspetto dice età, pelle, viso, occhi, capelli, barba e maglia: lo stesso aspetto dà sempre lo stesso ritratto.
# I volti escono da numeri a caso (il «seme» del viso): nessuno è fatto per somigliare a una persona vera.
#
# Uso: blender -b --python scripts/blender/render_ritratti.py -- <aspetti.json> <cartella di uscita> [campioni] [lato] [id,id…]
# Serve: Blender 4.2 LTS, l'estensione MPFB, i pacchetti «makehuman_system_assets» e «skins02» di MakeHuman (tutti CC0).
# Esce: <cartella>/<id>.png, quadrato, sfondo trasparente. I WebP per il gioco li fa scripts/ritratti_webp.py.
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
# dove stanno gli occhi, contando dall'alto (un terzo); di quanto gli occhi si girano verso la camera
OBIETTIVO = 85; ALTEZZA = .5; TRE_QUARTI = 22; OCCHI_DALL_ALTO = 1 / 3; SGUARDO = .8
# luce principale calda da sinistra a 45 gradi, riempimento morbido da destra, contorno azzurro da dietro:
# [gradi attorno al soggetto rispetto alla camera, distanza, altezza sugli occhi, potenza in watt, colore, lato del pannello]
LUCI = [[45, 1.5, .45, 42, (1.0, .9, .78), .9], [-55, 1.8, .05, 9, (.93, .96, 1.0), 1.8], [-150, 1.4, .5, 85, (.45, .68, 1.0), .5]]

# ---------- pelle: sei tonalità ----------
# per ognuna: la pelle di MPFB (giovane, e la versione adulta dai 30 anni), il miscuglio dei tratti del viso, un colore da
# mescolare alla pelle e quanto, la luminosità. Le lentiggini sono una pelle a parte, solo per le tonalità chiare.
PELLI = [
    dict(giovane='young_caucasian_male2', adulta='middleage_caucasian_male', tratti=(.03, .94, .03), mescola=((.95, .78, .68), .0), luce=.02),
    dict(giovane='young_caucasian_male', adulta='middleage_caucasian_male', tratti=(.06, .88, .06), mescola=((.85, .55, .40), .12), luce=-.01),
    dict(giovane='toigo_light_skin_male_bronze', adulta='toigo_light_skin_male_bronze', tratti=(.12, .76, .12), mescola=((.52, .33, .21), .42), luce=-.05),
    dict(giovane='young_african_male', adulta='middleage_african_male', tratti=(.25, .40, .35), mescola=((.74, .43, .24), .34), luce=.03),
    dict(giovane='young_african_male', adulta='middleage_african_male', tratti=(.08, .22, .70), mescola=((.45, .28, .18), .10), luce=.05),
    dict(giovane='young_african_male', adulta='mindfront_skin_male_african_middleage', tratti=(.03, .07, .90), mescola=((.22, .13, .09), .18), luce=-.02),
]
LENTIGGINI = 'toigo_light_skin_male_freckles'
# occhi: colore principale e secondario dell'iride
OCCHI = {'scuri': ((.025, .012, .006), (.05, .025, .012)), 'castani': ((.07, .035, .015), (.14, .075, .03)), 'nocciola': ((.14, .09, .035), (.13, .14, .06)),
         'verdi': ((.07, .14, .07), (.18, .19, .08)), 'azzurri': ((.07, .16, .30), (.22, .32, .42)), 'grigi': ((.13, .17, .20), (.26, .29, .31))}
# capelli e barba: melanina (0 chiarissimo, 1 nero) e quanto tira al rosso
COLORI = {'nero': (1.0, .1), 'castano scuro': (.97, .15), 'castano': (.9, .3), 'castano chiaro': (.78, .4), 'biondo': (.52, .4), 'rosso': (.7, 1.0)}

# ---------- capelli: dodici capigliature a ciocche ----------
# Ogni ciocca cresce da script: parte dalla pelle e piega verso il «verso» in cui è pettinata (x di lato, y indietro,
# z in su), restando fuori dalla testa. sopra, lati: lunghezza in metri in cima e sui lati; quante: ciocche disegnate;
# alza: quanto restano dritte invece di sdraiarsi sulla testa; piega: quanto in fretta prendono il verso; strati: di
# quanto si staccano dalla pelle, per dare volume; mosso: quanto sono spettinate; riccio: larghezza del ricciolo e
# giri; ciuffi: quanto si raccolgono a gruppi verso la punta; peso: quanto ricadono; riga: dove sta la riga di lato;
# fuori: pettinati dal centro verso i lati; davanti: quanto sono più lunghi sulla fronte; stempiato, calvo, chignon.
CAPELLI = {
    'rasato':    dict(sopra=.004, lati=.003, quante=42000, verso=(0, 0, 0), alza=1, piega=.2, strati=.0004, mosso=.08, spessi=.00008),
    'corto':     dict(sopra=.026, lati=.014, quante=46000, verso=(0, -.7, -.5), alza=.22, piega=.6, strati=.003, mosso=.04, ciuffi=.3, spessi=.00013),
    'sfumato':   dict(sopra=.034, lati=.0035, quante=32000, verso=(.5, -.6, 0), alza=.5, piega=.45, strati=.004, mosso=.05, ciuffi=.4),
    'ciuffo':    dict(sopra=.03, lati=.010, quante=34000, verso=(.15, .5, .35), alza=.55, piega=.45, strati=.004, mosso=.04, ciuffi=.45, davanti=.8),
    'indietro':  dict(sopra=.085, lati=.035, quante=28000, verso=(0, 1, -.1), alza=.12, piega=.6, strati=.006, mosso=.02, ciuffi=.5, peso=.5),
    'riga':      dict(sopra=.06, lati=.02, quante=28000, verso=(1, .25, -.25), riga=.03, alza=.18, piega=.55, strati=.005, mosso=.025, ciuffi=.45, peso=.6),
    'ricci':     dict(sopra=.045, lati=.02, quante=20000, verso=(0, 0, 0), alza=1, piega=.3, strati=.004, mosso=.12, riccio=(.006, 2.2), ciuffi=.5, spessi=.00011),
    'afro':      dict(sopra=.06, lati=.05, quante=24000, verso=(0, 0, 0), alza=1, piega=.3, strati=.004, mosso=.15, riccio=(.005, 4), spessi=.00011),
    'raccolti':  dict(sopra=.11, lati=.09, quante=26000, chignon=True, verso=(0, 1, 0), alza=.06, piega=.7, strati=.004, mosso=.015, ciuffi=.4),
    'calvo':     dict(sopra=.006, lati=.006, quante=26000, calvo=True, verso=(0, 0, -.3), alza=.8, piega=.3, strati=.0004, mosso=.08),
    'stempiato': dict(sopra=.016, lati=.009, quante=36000, stempiato=.65, verso=(0, .4, -.4), alza=.3, piega=.45, strati=.002, mosso=.05, ciuffi=.3),
    'lunghi':    dict(sopra=.15, lati=.13, quante=26000, verso=(.35, .45, -.6), fuori=True, alza=.12, piega=.55, strati=.008, mosso=.02, ciuffi=.55, peso=1.2),
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

# Le regolazioni del viso: per ognuna i due file di MPFB (di più, di meno) e quanto può cambiare. Quelle con «l-» valgono
# per tutti e due i lati, con lo stesso valore: il viso resta simmetrico.
VISO = [('head-fat', .5), ('head-scale-horiz', .4), ('head-scale-vert', .4), ('head-scale-depth', .3), ('forehead-temple', .5), ('forehead-scale-vert', .5), ('forehead-nubian', .4),
        ('nose-scale-horiz', .7), ('nose-scale-vert', .6), ('nose-scale-depth', .6), ('nose-hump', .7), ('nose-nostrils-width', .7), ('nose-point-width', .6), ('nose-greek', .5), ('nose-flaring', .5),
        ('chin-width', .7), ('chin-height', .6), ('chin-prominent', .6), ('chin-jaw-drop', .5), ('chin-bones', .7), ('chin-cleft', .5),
        ('mouth-scale-horiz', .6), ('mouth-lowerlip-volume', .6), ('mouth-upperlip-volume', .6), ('mouth-scale-depth', .4),
        ('l-cheek-bones', .7), ('l-cheek-volume', .5), ('l-cheek-inner', .5), ('l-ear-scale', .6), ('l-ear-wing', .7), ('l-ear-lobe', .6), ('l-ear-rot', None),
        ('l-eye-scale', .4), ('l-eye-height2', .5), ('l-eye-bag', .5), ('neck-scale-horiz', .5), ('neck-scale-depth', .4)]
FORME = ['head-oval', 'head-round', 'head-rectangular', 'head-square', 'head-triangular', 'head-invertedtriangular', 'head-diamond']
SOPRACCIGLIA = ['eyebrow001', 'eyebrow002', 'eyebrow003', 'eyebrow004', 'eyebrow006', 'eyebrow008', 'eyebrow009', 'eyebrow010', 'eyebrow012']

def carica(corpo, nome, peso):
    f = TargetService.target_full_path(nome)
    if f and peso > .01: TargetService.load_target(corpo, f, weight=peso, name=nome)

def viso(corpo, caso):
    carica(corpo, caso.choice(FORME), caso.uniform(.25, .7))
    for nome, quanto in VISO:
        if quanto is None: continue
        v = caso.uniform(-quanto, quanto)
        for lato in (('l-', 'r-') if nome.startswith('l-') else ('',)):
            carica(corpo, lato + nome[2 if lato else 0:] + ('-incr' if v > 0 else '-decr'), abs(v))

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

def oggetto_ciocche(nome, ciocche, raggio, mat):
    """Mette le ciocche in un oggetto «capelli» di Blender: Cycles le disegna come fili, più sottili verso la punta."""
    cu = bpy.data.hair_curves.new(nome); cu.add_curves([len(c) for c in ciocche])
    cu.points.foreach_set('position', [x for c in ciocche for p in c for x in p])
    r = cu.attributes.get('radius') or cu.attributes.new('radius', 'FLOAT', 'POINT')
    r.data.foreach_set('value', [raggio * (1 - .75 * k / (len(c) - 1)) for c in ciocche for k in range(len(c))])
    o = bpy.data.objects.new(nome, cu); bpy.context.scene.collection.objects.link(o); cu.materials.append(mat); return o

def raccogli(ciocche, quanto, caso):
    """Le ciocche si raccolgono a gruppi verso la punta attorno a una ciocca guida vicina (una ogni quattordici)."""
    if quanto <= 0 or len(ciocche) < 30: return
    guide = ciocche[::14]; albero = KDTree(len(guide))
    for i, g in enumerate(guide): albero.insert(g[0], i)
    albero.balance()
    for c in ciocche:
        g = guide[albero.find(c[0])[1]]
        if g is c or len(g) != len(c): continue
        scarto = c[0] - g[0]
        for k in range(1, len(c)):
            t = k / (len(c) - 1); c[k] = c[k].lerp(g[k] + scarto * (1 - .8 * t), quanto * t)

def capelli(corpo, a, caso, pelle, facce):
    C = CAPELLI[a['capelli']]; mat = materiale_capelli('Capelli', a['colore'])
    testa = gruppo(corpo, 'scalp'); z0 = min(v.co.z for v in testa); z1 = max(v.co.z for v in testa); y0 = min(v.co.y for v in testa); y1 = max(v.co.y for v in testa); xm = max(abs(v.co.x) for v in testa)
    alto = z1 - z0; pesi = {}
    for v in testa:
        w = 1.0
        # stempiato: l'attaccatura arretra davanti, ai lati della fronte
        if C.get('stempiato'):
            davanti = liscio(y0 + .06, y0 + .005, v.co.y); tempia = liscio(xm * .2, xm * .7, abs(v.co.x)); w = 1 - clamp(C['stempiato'] * davanti * (.3 + tempia) * 1.7, 0, 1)
        # calvo: niente capelli nella parte alta
        if C.get('calvo'): w *= liscio(z0 + alto * .52, z0 + alto * .40, v.co.z)
        if w > .03: pesi[v.index] = w
    nodo = mathutils.Vector((0, y1 - .012, z0 + alto * .70))
    def pettine(p, t):
        # la direzione in cui i capelli vengono pettinati in quel punto della testa
        x, y, z = C['verso']
        if C.get('riga'): x = x if p.x > C['riga'] else -x
        if C.get('chignon'): v = nodo - p; return v.normalized() if v.length > .01 else mathutils.Vector((0, 1, 0))
        return mathutils.Vector((x if not C.get('fuori') else (1 if p.x > 0 else -1) * abs(x), y, z - C.get('peso', 0) * t))
    ciocche = []
    for p, n, w in radici(corpo, facce, pesi, C['quante'], caso):
        su = liscio(.45, .75, (p.z - z0) / alto); lunga = (C['lati'] + (C['sopra'] - C['lati']) * su) * caso.uniform(.75, 1.1) * (.55 + .45 * w)
        # il ciuffo: più lungo davanti che dietro
        if C.get('davanti'): lunga *= 1 + C['davanti'] * liscio(y0 + .09, y0 + .01, p.y) * su
        if C.get('chignon'): lunga = min(lunga, (nodo - p).length * 1.08)
        if lunga < .0015: continue
        passi = clamp(int(lunga / .006) + 2, 2, 16)
        ciocche.append(cresci(pelle, p, n, lunga, passi, pettine, C.get('alza', .5), C.get('piega', .5), .0015 + caso.random() * C.get('strati', .003), caso, C.get('mosso', 0), C.get('riccio')))
    raccogli(ciocche, C.get('ciuffi', 0), caso)
    if C.get('chignon'):
        # i capelli raccolti dietro: giri di capelli attorno a una palla
        for _ in range(900):
            asse = mathutils.Vector((caso.gauss(0, 1), caso.gauss(0, 1), caso.gauss(0, 1))).normalized(); u = asse.orthogonal().normalized(); v = asse.cross(u)
            r = .026 * caso.uniform(.75, 1.05); a0 = caso.uniform(0, 6.283); alt = caso.uniform(-.6, .6) * r; rr = math.sqrt(max(1e-6, r * r - alt * alt))
            ciocche.append([nodo + mathutils.Vector((0, .018, .004)) + asse * alt + u * (math.cos(a0 + k * .45) * rr) + v * (math.sin(a0 + k * .45) * rr) for k in range(9)])
    if ciocche: oggetto_ciocche('Capelli', ciocche, C.get('spessi', .0001), mat)

def barba(corpo, a, caso, pelle, facce):
    B = BARBE[a.get('barba', 'nessuna')]
    if not B: return
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
    if not pesi: return
    mat = materiale_capelli('Barba', a.get('colore_barba', a['colore']), ruvido=.5)
    giu = lambda p, t: mathutils.Vector(((1 if p.x > 0 else -1) * (.5 if p.z > lz1 else .08), -.25, -1))
    ciocche = []
    for p, n, w in radici(corpo, facce, pesi, B['quante'], caso):
        lunga = B['lunga'] * caso.uniform(.6, 1.15) * (.5 + .5 * w)
        if caso.random() > w * 1.4 or lunga < .0006: continue
        ciocche.append(cresci(pelle, p, n, lunga, clamp(int(lunga / .004) + 2, 2, 7), giu, B.get('alza', .55), .5, .0006, caso, B.get('mosso', .05), B.get('riccio')))
    raccogli(ciocche, B.get('ciuffi', 0), caso)
    if ciocche: oggetto_ciocche('Barba', ciocche, B.get('spessi', .00008), mat)

def maglia(o, m):
    """La maglia: la maglietta di MPFB coi colori e il disegno della squadra, bordi di collo e maniche nel secondo colore."""
    mat = o.material_slots[0].material; nt = mat.node_tree; n = nt.nodes; L = nt.links
    bsdf = next(x for x in n if x.type == 'BSDF_PRINCIPLED'); tex = n.get('diffuseTexture')
    c1 = m['c1'] + [1]; c2 = m['c2'] + [1]; stile = m.get('stile', '')
    co = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); L.new(co.outputs['Object'], sep.inputs[0])
    def onda(uscita, passo, soglia=.5, sposta=0):
        # righe larghe `passo` metri lungo una coordinata: vale 1 su una riga sì e una no
        a = n.new('ShaderNodeMath'); a.operation = 'MULTIPLY_ADD'; L.new(uscita, a.inputs[0]); a.inputs[1].default_value = 1 / passo; a.inputs[2].default_value = sposta
        f = n.new('ShaderNodeMath'); f.operation = 'FRACT'; L.new(a.outputs[0], f.inputs[0])
        g = n.new('ShaderNodeMath'); g.operation = 'GREATER_THAN'; L.new(f.outputs[0], g.inputs[0]); g.inputs[1].default_value = soglia; return g.outputs[0]
    def somma(u1, k1, u2, k2):
        a = n.new('ShaderNodeMath'); a.operation = 'MULTIPLY'; L.new(u1, a.inputs[0]); a.inputs[1].default_value = k1
        b = n.new('ShaderNodeMath'); b.operation = 'MULTIPLY_ADD'; L.new(u2, b.inputs[0]); b.inputs[1].default_value = k2; L.new(a.outputs[0], b.inputs[2]); return b.outputs[0]
    X, Z = sep.outputs['X'], sep.outputs['Z']; disegno = None
    if stile in ('righe', 'righine'): disegno = onda(X, .09 if stile == 'righe' else .045, .5, .25)
    elif stile == 'fasce': disegno = onda(Z, .11)
    elif stile in ('banda', 'diagonale'): disegno = onda(somma(X, .7, Z, .7), .5, .78, .2)
    elif stile == 'meta': g = n.new('ShaderNodeMath'); g.operation = 'GREATER_THAN'; L.new(X, g.inputs[0]); g.inputs[1].default_value = 0; disegno = g.outputs[0]
    elif stile == 'scacchi':
        x = n.new('ShaderNodeMath'); x.operation = 'COMPARE'; L.new(onda(X, .16), x.inputs[0]); L.new(onda(Z, .16), x.inputs[1]); x.inputs[2].default_value = .1; disegno = x.outputs[0]
    elif stile in ('v', 'chevron'):
        ab = n.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L.new(X, ab.inputs[0]); disegno = onda(somma(ab.outputs[0], 1.0, Z, 1.0), .6, .86, .4)
    base = n.new('ShaderNodeMixRGB'); base.inputs[1].default_value = c1; base.inputs[2].default_value = c2
    if disegno: L.new(disegno, base.inputs[0])
    else: base.inputs[0].default_value = 0
    # i bordi di collo e maniche: nella trama della maglietta di MPFB sono arancioni (rosso alto, blu basso)
    rgb = n.new('ShaderNodeSeparateColor'); L.new(tex.outputs['Color'], rgb.inputs[0])
    d = n.new('ShaderNodeMath'); d.operation = 'SUBTRACT'; L.new(rgb.outputs['Red'], d.inputs[0]); L.new(rgb.outputs['Blue'], d.inputs[1])
    r = n.new('ShaderNodeMapRange'); L.new(d.outputs[0], r.inputs['Value']); r.inputs['From Min'].default_value = .08; r.inputs['From Max'].default_value = .22
    # la trama ha anche il marchio di MakeHuman sul petto: i bordi contano solo vicino al collo o verso le maniche
    alto = max((o.matrix_world @ v.co).z for v in o.data.vertices)
    su = n.new('ShaderNodeMath'); su.operation = 'GREATER_THAN'; L.new(Z, su.inputs[0]); su.inputs[1].default_value = alto - .075
    ax = n.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; L.new(X, ax.inputs[0]); fuori = n.new('ShaderNodeMath'); fuori.operation = 'GREATER_THAN'; L.new(ax.outputs[0], fuori.inputs[0]); fuori.inputs[1].default_value = .16
    dove = n.new('ShaderNodeMath'); dove.operation = 'MAXIMUM'; L.new(su.outputs[0], dove.inputs[0]); L.new(fuori.outputs[0], dove.inputs[1])
    solo = n.new('ShaderNodeMath'); solo.operation = 'MULTIPLY'; L.new(r.outputs[0], solo.inputs[0]); L.new(dove.outputs[0], solo.inputs[1])
    bordo = n.new('ShaderNodeMixRGB'); L.new(solo.outputs[0], bordo.inputs[0]); L.new(base.outputs[0], bordo.inputs[1]); bordo.inputs[2].default_value = m.get('bordo', m['c2']) + [1]
    fine = bordo.outputs[0]
    L.new(fine, bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .78
    # il tessuto: una trama fitta a rombi in rilievo sopra le pieghe della maglietta, come nelle maglie da gioco
    trama = n.new('ShaderNodeTexVoronoi'); trama.feature = 'F1'; trama.inputs['Scale'].default_value = 300; L.new(co.outputs['Object'], trama.inputs['Vector'])
    rilievo = n.new('ShaderNodeBump'); rilievo.inputs['Strength'].default_value = .35; rilievo.inputs['Distance'].default_value = .001; L.new(trama.outputs['Distance'], rilievo.inputs['Height'])
    pieghe = next((x for x in n if x.type == 'NORMAL_MAP'), None)
    if pieghe: pieghe.inputs['Strength'].default_value = 2.2; L.new(pieghe.outputs['Normal'], rilievo.inputs['Normal'])
    L.new(rilievo.outputs['Normal'], bsdf.inputs['Normal'])
    if 'Sheen Weight' in bsdf.inputs: bsdf.inputs['Sheen Weight'].default_value = .25

def sguardo(occhi, gradi):
    """Gira i due occhi verso la camera: ognuno attorno al proprio centro."""
    R = mathutils.Matrix.Rotation(math.radians(gradi), 4, 'Z')
    for segno in (-1, 1):
        vs = [v for v in occhi.data.vertices if v.co.x * segno > 0]; c = sum((v.co for v in vs), mathutils.Vector()) / len(vs)
        for v in vs: v.co = c + (R @ (v.co - c))

def ritratto(a):
    t0 = time.time(); bpy.ops.wm.read_factory_settings(use_empty=True); caso = random.Random(a['viso'])
    P = PELLI[a['pelle']]; asia, cauc, afr = P['tratti']; anni = a['eta']
    macro = {'gender': 1.0, 'age': eta_mpfb(anni), 'muscle': caso.uniform(.5, .64), 'weight': caso.uniform(.38, .5), 'proportions': caso.uniform(.6, .8), 'height': .55, 'cupsize': .5, 'firmness': .5,
             'race': {'asian': asia, 'caucasian': cauc, 'african': afr}}
    corpo = HumanService.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    viso(corpo, caso); TargetService.bake_targets(corpo); pelle_alb, facce = superficie(corpo)

    pelle = LENTIGGINI if a.get('lentiggini') and a['pelle'] <= 1 else P['adulta'] if anni >= 30 else P['giovane']
    HumanService.set_character_skin(trova('skins', pelle, True), corpo, skin_type='ENHANCED_SSS')
    for m in bpy.data.materials:
        g = next((x for x in m.node_tree.nodes if x.type == 'GROUP'), None) if m.use_nodes else None
        if g and 'colorMixIn' in g.inputs:
            g.inputs['colorMixIn'].default_value = P['mescola'][0] + (1,); g.inputs['colorMixInStrength'].default_value = P['mescola'][1]; g.inputs['Brightness'].default_value = P['luce']
            g.inputs['SSS strength'].default_value = .28; g.inputs['Pore strength'].default_value = .3; g.inputs['Roughness'].default_value = .42 if 'lips' not in m.name else .3
    pezzi = {}
    for sotto, nome, tipo, come in [('eyes', 'high-poly', 'Eyes', 'PROCEDURAL_EYES'), ('eyebrows', caso.choice(SOPRACCIGLIA), 'Eyebrows', 'MAKESKIN'), ('eyelashes', 'eyelashes01', 'Eyelashes', 'MAKESKIN'), ('clothes', 'male_casualsuit04', 'Clothes', 'MAKESKIN')]:
        prima = set(bpy.data.objects)
        HumanService.add_mhclo_asset(trova(sotto, nome), corpo, asset_type=tipo, subdiv_levels=1, material_type=come, set_up_rigging=False, interpolate_weights=False, import_subrig=False, import_weights=False)
        pezzi[sotto] = (set(bpy.data.objects) - prima).pop()
    # occhi: colore dell'iride, cornea lucida, sguardo verso la camera
    occhi = pezzi['eyes']; g = next(x for x in occhi.material_slots[0].material.node_tree.nodes if x.type == 'GROUP'); c1, c2 = OCCHI[a.get('occhi', 'castani')]
    g.inputs['IrisMajorColor'].default_value = c1 + (1,); g.inputs['IrisMinorColor'].default_value = c2 + (1,); g.inputs['IrisSection4Color'].default_value = tuple(x * .45 for x in c1) + (1,); g.inputs['PupilSize'].default_value = .27; g.inputs['Clearcoat'].default_value = .6
    sguardo(occhi, -TRE_QUARTI * SGUARDO)
    # sopracciglia del colore dei capelli (un po' più scure)
    mel = COLORI[a['colore']][0]; scuro = (.03 + (1 - mel) * .22, .02 + (1 - mel) * .15, .015 + (1 - mel) * .08, 1)
    ms = pezzi['eyebrows'].material_slots[0].material; b = next(x for x in ms.node_tree.nodes if x.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = scuro
    for l in list(b.inputs['Base Color'].links): ms.node_tree.links.remove(l)
    maglia(pezzi['clothes'], a['maglia'])
    capelli(corpo, a, caso, pelle_alb, facce); barba(corpo, a, caso, pelle_alb, facce)
    for o in bpy.data.objects:
        if o.type != 'MESH': continue
        s = next((m for m in o.modifiers if m.type == 'SUBSURF'), None) or o.modifiers.new('Liscia', 'SUBSURF'); s.levels = 1; s.render_levels = 2 if o in (corpo, pezzi['clothes']) else 1
        for p in o.data.polygons: p.use_smooth = True

    # la camera gira attorno al soggetto: è come girare il busto di tre quarti. Gli occhi stanno a un terzo dall'alto.
    oz = sum((occhi.matrix_world @ v.co).z for v in occhi.data.vertices) / len(occhi.data.vertices)
    centro = mathutils.Vector((0, -.03, oz + ALTEZZA * (OCCHI_DALL_ALTO - .5))); ang = math.radians(TRE_QUARTI); dist = OBIETTIVO * ALTEZZA / 36
    attorno = lambda gradi, raggio, su: mathutils.Vector((centro.x - math.sin(ang + math.radians(gradi)) * raggio, centro.y - math.cos(ang + math.radians(gradi)) * raggio, oz + su))
    cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = OBIETTIVO; cam.data.sensor_width = 36; cam.location = attorno(0, dist, centro.z - oz); cam.rotation_euler = (centro - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for i, (gradi, raggio, su, watt, colore, lato) in enumerate(LUCI):
        d = bpy.data.lights.new(f'Luce{i}', 'AREA'); d.energy = watt; d.color = colore; d.size = lato
        o = bpy.data.objects.new(d.name, d); bpy.context.scene.collection.objects.link(o); o.location = attorno(gradi, raggio, su)
        o.rotation_euler = (mathutils.Vector((0, -.03, oz - .05)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    sc = bpy.context.scene; sc.camera = cam; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = CAMPIONI; sc.cycles.use_denoising = True
    sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = .02
    sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = LATO; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 60
    sc.view_settings.view_transform = 'Filmic'; sc.view_settings.look = 'Medium High Contrast'
    sc.world = bpy.data.worlds.new('Mondo'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.5, .6, .8, 1); sc.world.node_tree.nodes['Background'].inputs[1].default_value = .1
    sc.render.filepath = os.path.join(USCITA, a['id'] + '.png'); t1 = time.time(); bpy.ops.render.render(write_still=True)
    print(f"RITRATTO {a['id']}: preparato in {t1 - t0:.1f} s, reso in {time.time() - t1:.1f} s", flush=True)

for a in ASPETTI:
    if SOLO and a['id'] not in SOLO: continue
    ritratto(a)
