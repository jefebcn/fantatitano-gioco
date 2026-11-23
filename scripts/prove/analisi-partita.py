# Analisi di una partita registrata da rec.cjs: pallone, passaggi, piedi, direzioni, gesti. uso: analisi-partita.py <nome>
import json, sys, math, collections, os
import numpy as np
S = os.environ.get('USCITA', os.getcwd()) + '/'
nome = sys.argv[1]
I = json.load(open(S + nome + '-info.json')); D = I['diz']; NOMI = I['nomi']; OGNI = I['ogni']
R = [json.loads(l) for l in open(S + nome + '.ndjson')]
N = len(R); DT = 1 / 60
st = lambda k: D['stato'][R[k][1]]
def P(k): return {p[0]: p for p in R[k][19]}
PL = [P(k) for k in range(N)]
chi = lambda i: '%s (%s%s)' % (NOMI[i]['nome'], 'casa ' if NOMI[i]['sq'] == 0 else 'ospiti ', NOMI[i]['ruolo']) if i >= 0 else '-'
img = lambda k: 'f%05d' % (k // OGNI)
def mmss(k): return '%5.1fs %s' % (R[k][0], img(k))
ev = collections.defaultdict(list)   # nome difetto -> esempi
dur = collections.Counter()          # nome -> secondi
def nota(n, k, testo=''): ev[n].append((k, testo))
gioco = np.array([st(k) == 'play' and not R[k][16] and not R[k][17] for k in range(N)])
print('== %s: %d passi (%.0f s), in gioco %.0f s, modo %s, %s %d-%d %s' % (nome, N, N * DT, gioco.sum() * DT, I['modo'], I['squadre'][0], R[-1][13], R[-1][14], I['squadre'][1]))
print('errori della pagina:', [e for e in I['errori'] if 'ReadPixels' not in e] or 'nessuno')
print('stati (s):', {s: round(sum(1 for k in range(N) if st(k) == s) * DT, 1) for s in D['stato']})

# ---------- A. pallone
B = np.array([r[2:8] for r in R], float); own = np.array([r[8] for r in R]); sp = np.hypot(B[:, 3], B[:, 5])
vicino = np.zeros(N)  # distanza del giocatore più vicino al pallone
for k in range(N):
    vicino[k] = min((math.hypot(p[1] - B[k, 0], p[2] - B[k, 2]) for p in R[k][19]), default=99)
for k in range(1, N):
    if not (gioco[k] and gioco[k - 1]): continue
    d = math.dist(B[k, :3], B[k - 1, :3]); v = math.sqrt(B[k - 1, 3] ** 2 + B[k - 1, 4] ** 2 + B[k - 1, 5] ** 2)
    if own[k] < 0 and own[k - 1] < 0 and d > v * DT * 2 + .25: nota('pallone che salta di posto (senza padrone)', k, '%.2f m in un passo, velocità %.1f' % (d, v))
    if own[k] >= 0 and own[k - 1] == own[k] and d > .8: nota('pallone che salta di posto (col padrone)', k, '%.2f m in un passo, %s' % (d, chi(own[k])))
    if B[k, 1] < .06: dur['pallone sotto terra'] += DT
    if own[k] >= 0:
        p = PL[k].get(own[k]);
        if p:
            do = math.hypot(p[1] - B[k, 0], p[2] - B[k, 2])
            if do > 2.2: dur['pallone a più di 2,2 m dal suo padrone'] += DT
    if own[k] < 0 and own[k - 1] < 0:
        dv = math.dist(B[k, 3:], B[k - 1, 3:])
        rimbalzo = B[k - 1, 1] < .3 or B[k, 1] < .3
        porta = abs(B[k, 0]) > 51.5 and abs(B[k, 2]) < 4.5
        if dv > 3.5 and vicino[k] > 1.6 and vicino[k - 1] > 1.6 and not porta and not (rimbalzo and abs(B[k, 4] - B[k - 1, 4]) > 1):
            nota('pallone che cambia velocità da solo (nessuno entro 1,6 m)', k, 'da %.1f a %.1f m/s, altezza %.2f' % (v, math.sqrt((B[k, 3:] ** 2).sum()), B[k, 1]))
print('\n-- PALLONE: velocità massima %.1f m/s, altezza massima %.1f m' % (np.sqrt((B[gioco, 3:] ** 2).sum(1)).max(), B[gioco, 1].max()))
# pallone che attraversa un giocatore: passa a meno di 25 cm dal centro di uno, basso, veloce, e non cambia direzione
k = 1; att = []
while k < N - 6:
    if gioco[k] and own[k] < 0 and sp[k] > 6 and B[k, 1] < 1.3:
        for p in R[k][19]:
            if math.hypot(p[1] - B[k, 0], p[2] - B[k, 2]) < .25 and B[k, 1] < p[24] * .85:
                a0 = math.atan2(B[k - 1, 5], B[k - 1, 3]); a1 = math.atan2(B[k + 5, 5], B[k + 5, 3]); dd = abs(math.atan2(math.sin(a1 - a0), math.cos(a1 - a0)))
                if dd < .12 and sp[k + 5] > sp[k - 1] * .8 and own[k + 5] < 0 and R[k + 5][15] != p[0] and R[k - 1][15] != p[0]:
                    att.append((k, '%s, pallone a %.1f m/s alto %.2f m' % (chi(p[0]), sp[k], B[k, 1]))); k += 20; break
    k += 1
ev['pallone che attraversa un giocatore senza toccarlo'] = att

# ---------- B. calci e passaggi
calci = []  # (k, chi, velocità, tipo)
for k in range(1, N):
    if gioco[k] and own[k - 1] >= 0 and own[k] < 0:
        v = math.sqrt((B[k, 3:] ** 2).sum())
        if v > 6: calci.append((k, own[k - 1], v))
piedeD = []; senzaGesto = collections.Counter(); gestiCalcio = collections.Counter()
for k, c, v in calci:
    p = PL[k - 1].get(c)
    if not p: continue
    bx, by, bz = B[k - 1, :3]
    d = min(math.dist((p[11], p[12], p[13]), (bx, by, bz)), math.dist((p[14], p[15], p[16]), (bx, by, bz)))
    dm = min(math.dist((p[27], p[28], p[29]), (bx, by, bz)), math.dist((p[30], p[31], p[32]), (bx, by, bz)))
    fx = D['fx'][p[8]]; gestiCalcio[fx or '(nessun gesto)'] += 1
    piedeD.append((min(d, dm), k, c, v, fx, d, dm))
    if NOMI[c]['i'] != 0 and d > .55: nota('calcio col piede lontano dal pallone (più di 55 cm)', k, '%s, piede a %.2f m, gesto %s, pallone a %.0f m/s' % (chi(c), d, fx or 'nessuno', v))
    if NOMI[c]['i'] == 0 and min(d, dm) > .6: nota('portiere: pallone che parte lontano da mani e piedi', k, '%s, a %.2f m, gesto %s' % (chi(c), min(d, dm), fx or 'nessuno'))
    if not fx: nota('calcio senza nessun gesto', k, '%s, pallone a %.0f m/s' % (chi(c), v))
if piedeD:
    a = np.array([x[5] for x in piedeD if NOMI[x[2]]['i'] != 0])
    print('-- CALCI: %d (giocatori di movimento %d). Distanza piede-pallone al momento del calcio: mediana %.2f m, 90%% sotto %.2f m, massima %.2f m' % (len(piedeD), len(a), np.median(a), np.percentile(a, 90), a.max()))
    print('   gesti al momento del calcio:', dict(gestiCalcio.most_common(14)))
# sincronia del calcio: quando il piede passa più vicino al pallone rispetto all'istante in cui il pallone parte
sinc = []
for k, c, v in calci:
    if NOMI[c]['i'] == 0: continue
    best = (9, 0)
    for j in range(max(1, k - 25), min(N, k + 12)):
        p = PL[j].get(c)
        if not p: continue
        bb = B[min(j, k - 1), :3]  # dopo il calcio si confronta col punto da cui è partito
        d = min(math.dist((p[11], p[12], p[13]), bb), math.dist((p[14], p[15], p[16]), bb))
        if d < best[0]: best = (d, j - k)
    sinc.append((best[0], best[1], k, c))
if sinc:
    a = np.array([s[0] for s in sinc]); o = np.array([s[1] for s in sinc])
    print('   piede più vicino al pallone nel raggio di 0,4 s: mediana %.2f m; arriva in media %.2f s %s la partenza del pallone (prima: %d, dopo: %d, insieme: %d)' % (np.median(a), abs(o.mean()) * DT, 'dopo' if o.mean() > 0 else 'prima', (o < -1).sum(), (o > 1).sum(), (abs(o) <= 1).sum()))
    for d, off, k, c in sorted(sinc, key=lambda s: -abs(s[1]))[:0]: pass
# pallone che scatta ai piedi quando viene preso; distanza dal padrone in conduzione
presa = []; dOwn = []
for k in range(1, N):
    if gioco[k] and gioco[k - 1] and own[k] >= 0:
        p = PL[k].get(own[k])
        if p: dOwn.append(math.hypot(p[1] - B[k, 0], p[2] - B[k, 2]))
        if own[k - 1] != own[k]:
            d = math.dist(B[k, :3], B[k - 1, :3])
            if d > .45 + math.sqrt((B[k - 1, 3:] ** 2).sum()) * DT * 1.5: nota('pallone che scatta ai piedi di chi lo prende', k, '%s, %.2f m in un passo' % (chi(own[k]), d))
if dOwn: print('   pallone col padrone: distanza mediana %.2f m, 99%% sotto %.2f m, massima %.2f m' % (np.median(dOwn), np.percentile(dOwn, 99), max(dOwn)))
# passaggi: dal calcio fino a chi prende il pallone
passi = []
for n, (k, c, v) in enumerate(calci):
    dest = R[k][10]; fine = None
    for j in range(k + 1, min(N, k + 600)):
        if not gioco[j]: fine = (j, 'fuori o palla ferma', -1); break
        if own[j] >= 0: fine = (j, 'ok' if NOMI[own[j]]['sq'] == NOMI[c]['sq'] else 'preso dagli avversari', own[j]); break
    if not fine or R[k][11] != R[k - 1][11]: continue  # tiro
    if R[k][9] != c: continue
    j, esito, preso = fine; alto = B[k:j, 1].max() > 1.2
    # scorta: il destinatario resta entro 2,5 m dal pallone che corre (più di 3 m/s) senza prenderlo
    scorta = 0
    if dest >= 0:
        for q in range(k, j):
            pd = PL[q].get(dest)
            if pd and math.hypot(pd[1] - B[q, 0], pd[2] - B[q, 2]) < 2.5 and sp[q] > 3 and B[q, 1] < .5: scorta += DT
    passi.append(dict(k=k, da=c, a=dest, v=v, esito=esito, preso=preso, volo=(j - k) * DT, alto=alto, scorta=scorta, vArr=sp[j - 1], dist=math.hypot(B[j, 0] - B[k, 0], B[j, 2] - B[k, 2])))
    if scorta > .8: nota('chi riceve corre accanto al pallone senza prenderlo (più di 0,8 s)', k, '%s per %s: %.1f s, pallone a %.1f m/s all\'arrivo' % (chi(c), chi(dest), scorta, sp[j - 1]))
if passi:
    ok = [p for p in passi if p['esito'] == 'ok']; ras = [p for p in passi if not p['alto']]
    print('-- PASSAGGI: %d, riusciti %d%% (rasoterra %d, alti %d). Velocità d\'arrivo dei rasoterra riusciti: mediana %.1f m/s, massima %.1f. Scorta media %.2f s, oltre 0,8 s: %d' % (
        len(passi), 100 * len(ok) / len(passi), len(ras), len(passi) - len(ras), np.median([p['vArr'] for p in ok if not p['alto']] or [0]), max([p['vArr'] for p in ok if not p['alto']] or [0]), np.mean([p['scorta'] for p in passi]), sum(1 for p in passi if p['scorta'] > .8)))
    altro = [p for p in ok if p['a'] >= 0 and p['preso'] != p['a']]
    print('   riusciti ma presi da un compagno diverso dal destinatario: %d' % len(altro))

# ---------- C. giocatori e animazioni
ids = sorted({p[0] for k in range(N) for p in R[k][19]})
piede = collections.defaultdict(lambda: [0., 0.])  # categoria -> [secondi d'appoggio, metri strisciati]
fxSec = collections.Counter(); fxVolte = collections.Counter()
for i in ids:
    ks = [k for k in range(N) if i in PL[k]]
    if len(ks) < 120: continue
    A = np.array([PL[k][i][:26] + PL[k][i][27:] for k in ks], float); kk = np.array(ks); alt = NOMI[i]['alt'] or 1.8; port = NOMI[i]['i'] == 0
    x, z, vx, vz, dirf, vdir = A[:, 1], A[:, 2], A[:, 3], A[:, 4], A[:, 5], A[:, 6]; v = np.hypot(vx, vz); fxW = A[:, 9]; fl = A[:, 22].astype(int)
    cont = np.diff(kk, prepend=kk[0] - 1) == 1; g = gioco[kk]
    fxn = [D['fx'][int(a)] for a in A[:, 8]]
    for n in range(len(kk)):
        if fxn[n]: fxSec[fxn[n]] += DT
        if fxn[n] and (n == 0 or fxn[n - 1] != fxn[n]): fxVolte[fxn[n]] += 1
    # piedi: quota del terreno per ogni piede = 3° percentile; in appoggio se entro 3,5 cm
    for nomeP, c0 in (('sx', 11), ('dx', 14)):
        fy = A[:, c0 + 1]; terra = np.percentile(fy, 3); app = fy < terra + .035
        dxy = np.hypot(np.diff(A[:, c0], prepend=A[0, c0]), np.diff(A[:, c0 + 2], prepend=A[0, c0 + 2])) / DT
        for n in range(1, len(kk)):
            if not (cont[n] and g[n] and g[n - 1] and app[n] and app[n - 1]): continue
            if math.hypot(x[n] - x[n - 1], z[n] - z[n - 1]) > .5: continue
            cat = fxn[n] if fxW[n] > .5 and fxn[n] else ('laterale' if A[n, 21] > .4 else 'indietro' if fl[n] & 2 else 'fermo' if v[n] < .5 else 'cammina' if v[n] < 2.6 else 'corsetta' if v[n] < 5.2 else 'corsa')
            piede[cat][0] += DT; s = dxy[n]
            if s > .6: piede[cat][1] += s * DT
            if s > 3 and v[n] < 7.5: dur['piede in appoggio che striscia a più di 3 m/s'] += DT
        if (fy < terra - .06).sum() * DT > .5: nota('piede sotto l\'erba (più di 6 cm) per oltre mezzo secondo', int(kk[np.argmin(fy)]), '%s piede %s, fino a %.0f cm sotto' % (chi(i), nomeP, (terra - fy.min()) * 100))
    # direzione del corpo rispetto alla corsa
    ang = np.abs(np.arctan2(np.sin(np.arctan2(vx, vz) - vdir), np.cos(np.arctan2(vx, vz) - vdir)))
    ind = g & (v > 3.5) & (ang > 2.1) & (fxW < .5); lat = g & (v > 3.5) & (ang > 1.05) & (ang <= 2.1) & (fxW < .5)
    dur['corre all\'indietro a più di 3,5 m/s (%s)' % ('portiere' if port else 'giocatori')] += ind.sum() * DT
    dur['corre di lato a più di 3,5 m/s (%s)' % ('portiere' if port else 'giocatori')] += lat.sum() * DT
    seq = 0
    for n in range(len(kk)):
        seq = seq + 1 if ind[n] else 0
        if seq == 45: nota('corsa all\'indietro veloce per più di 0,75 s', int(kk[n]), '%s a %.1f m/s' % (chi(i), v[n]))
    # scatti: rotazione, velocità, posizione
    dvd = np.abs(np.arctan2(np.sin(np.diff(vdir, prepend=vdir[0])), np.cos(np.diff(vdir, prepend=vdir[0]))))
    dp = np.hypot(np.diff(x, prepend=x[0]), np.diff(z, prepend=z[0])); dv = np.hypot(np.diff(vx, prepend=vx[0]), np.diff(vz, prepend=vz[0]))
    for n in range(1, len(kk)):
        if not (cont[n] and g[n] and g[n - 1]): continue
        if dvd[n] > .6 and dp[n] < .5: nota('corpo che gira di scatto (più di 35° in un passo)', int(kk[n]), '%s gira di %.0f°, velocità %.1f, gesto %s' % (chi(i), math.degrees(dvd[n]), v[n], fxn[n] or '-'))
        if dp[n] > .6: nota('giocatore spostato di colpo', int(kk[n]), '%s di %.1f m' % (chi(i), dp[n]))
        if dv[n] > 2.2 and dp[n] < .5: nota('velocità che cambia di colpo (più di 2,2 m/s in un passo)', int(kk[n]), '%s da %.1f a %.1f m/s, gesto %s' % (chi(i), v[n - 1], v[n], fxn[n] or '-'))
        if v[n] > 9.2: dur['giocatore oltre 9,2 m/s'] += DT
    # pattina o corre sul posto
    patt = g & (v > 3) & (A[:, 17] > .5) & (fxW < .3); posto = g & (v < .4) & (A[:, 19] + A[:, 20] > .5) & (fxW < .3)
    dur['si sposta a più di 3 m/s in posa da fermo'] += patt.sum() * DT; dur['corre sul posto'] += posto.sum() * DT
    # gesto bloccato: lo stesso gesto per più di 3 s
    n0 = 0
    for n in range(1, len(kk) + 1):
        if n == len(kk) or fxn[n] != fxn[n0] or not cont[n]:
            if fxn[n0] and (n - n0) * DT > 3: nota('gesto che dura più di 3 secondi', int(kk[n0]), '%s: %s per %.1f s' % (chi(i), fxn[n0], (n - n0) * DT))
            n0 = n
    # braccia aperte (posa a T): mani lontane tra loro e alte, senza un gesto che lo giustifichi
    tpose = g & (A[:, 23] > .86 * alt) & (A[:, 25] > .68 * alt)
    seq = 0
    for n in range(len(kk)):
        seq = seq + 1 if tpose[n] else 0
        if seq == 12: nota('braccia aperte come una T per più di 0,2 s', int(kk[n]), '%s, gesto %s, mani a %.2f m tra loro' % (chi(i), fxn[n] or '-', A[n, 23]))
    # testa: troppo bassa in piedi senza gesto, o corpo sollevato
    bassa = g & (A[:, 24] < .55 * alt) & (fxW < .2) & ((fl & 40) == 0)
    if bassa.sum() * DT > .3: nota('testa molto bassa senza gesto né caduta', int(kk[np.argmax(bassa)]), '%s per %.1f s' % (chi(i), bassa.sum() * DT))
    alta = g & (A[:, 24] > 1.2 * alt)
    if alta.sum() * DT > .2: nota('corpo sollevato da terra', int(kk[np.argmax(alta)]), '%s testa a %.2f m (alto %.2f) per %.1f s, gesto %s' % (chi(i), A[:, 24].max(), alt, alta.sum() * DT, fxn[int(np.argmax(alta))] or '-'))
    fuori = g & ((np.abs(x) > 55.5) | (np.abs(z) > 37))
    if fuori.sum() * DT > .5: nota('giocatore fuori dal campo durante il gioco', int(kk[np.argmax(fuori)]), '%s per %.1f s' % (chi(i), fuori.sum() * DT))
# giocatori sovrapposti
sov = collections.Counter()
for k in range(0, N, 2):
    if not gioco[k]: continue
    ps = R[k][19]
    for a in range(len(ps)):
        for b in range(a + 1, len(ps)):
            if abs(ps[a][1] - ps[b][1]) < .3 and abs(ps[a][2] - ps[b][2]) < .3 and math.hypot(ps[a][1] - ps[b][1], ps[a][2] - ps[b][2]) < .3 and not ((ps[a][22] | ps[b][22]) & 40): sov[(ps[a][0], ps[b][0])] += 2 * DT
for (a, b), s in sov.items():
    if s > .5: nota('due giocatori uno dentro l\'altro per più di mezzo secondo', next(k for k in range(0, N, 2) if gioco[k] and a in PL[k] and b in PL[k] and math.hypot(PL[k][a][1] - PL[k][b][1], PL[k][a][2] - PL[k][b][2]) < .3), '%s e %s per %.1f s' % (chi(a), chi(b), s))

print('\n-- PIEDI in appoggio: quanto strisciano (metri strisciati per secondo d\'appoggio), per andatura o gesto')
for cat, (s, m) in sorted(piede.items(), key=lambda x: -x[1][1])[:22]:
    if s > .3: print('   %-26s appoggio %6.1f s  strisciata %6.2f m  -> %.2f m/s' % (cat, s, m, m / s))
print('\n-- GESTI visti (volte, secondi):', ', '.join('%s %d (%.0f s)' % (f, fxVolte[f], fxSec[f]) for f, _ in fxVolte.most_common(60)))
print('\n-- DURATE (secondi su tutta la partita, sommando i giocatori)')
for n, s in sorted(dur.items(), key=lambda x: -x[1]): print('   %-62s %7.1f s' % (n, s))
print('\n-- DIFETTI trovati (quante volte, primi esempi con tempo e immagine)')
for n, l in sorted(ev.items(), key=lambda x: -len(x[1])):
    print('   %s: %d' % (n, len(l)))
    for k, t in l[:6]: print('        %s  %s' % (mmss(k), t))
json.dump({n: [(int(k), t) for k, t in l] for n, l in ev.items()}, open(S + nome + '-difetti.json', 'w'))
