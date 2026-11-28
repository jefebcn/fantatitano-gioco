# Guida pratica: costruire i giocatori 3D del gioco di calcio Fantatitano

> **Per la chat Claude Code «gioco - dls x fantatitano».** È l'integrazione della sezione 2A del file `DLS_misure_per_Fantatitano.md` (misure e proporzioni). Qui c'è **come costruirli**: strumenti, modellazione, texture e divise, rig e animazioni con Mixamo, esportazione e uso nel gioco.
> Unità: **1 unità = 1 metro**. Il gioco è web e deve girare bene anche dentro l'app iPhone, quindi tutto è pensato per il mobile.

---

## 1. Obiettivi e vincoli

- **In campo ci sono 23 personaggi** (22 giocatori e l'arbitro), tutti animati, a 60 fps su iPhone.
- **Sullo schermo un giocatore è piccolo**: con la telecamera tipo DLS (alta ~14 m, a ~45 m) è alto ~80 px su 1180. Conta la **sagoma leggibile** (colori, proporzioni, pose), non il dettaglio fine.
- **Un solo corpo base condiviso** da tutti i giocatori, con varianti di altezza, corporatura, pelle, capelli e divisa. Non si modellano 22 personaggi diversi.
- **Regole del progetto**:
  - volti solo inventati, mai somiglianti a calciatori veri senza consenso scritto;
  - niente loghi, sponsor, marchi, maglie o stemmi reali né della Federazione;
  - gli stemmi delle squadre sono quelli disegnati da Alex;
  - logo e nome del sito mai sulle divise.

---

## 2. Il flusso di lavoro in breve

```
Corpo base (Blender + MPFB)  →  proporzioni e pulizia  →  UV + texture "maschera" divisa
     →  esportazione FBX in T-pose  →  rig automatico Mixamo  →  animazioni Mixamo (In Place)
     →  montaggio in Blender (azioni con nomi chiari)  →  esportazione .glb  →  ottimizzazione
     →  caricamento nel gioco (1 modello, 23 copie)  →  divise, colori e numeri a runtime
```

---

## 3. Strumenti (tutti gratuiti)

| Strumento | A cosa serve | Nota |
|---|---|---|
| **Blender** (4.x) | modellazione, UV, montaggio, esportazione glTF | |
| **MPFB** (MakeHuman per Blender, add-on) | genera un corpo umano base con proporzioni regolabili | controlla la licenza degli asset nella versione che scarichi |
| **Mixamo** (Adobe, gratis con account) | rig automatico e libreria di animazioni | personaggi e animazioni sono utilizzabili nei progetti, anche commerciali; verifica le condizioni attuali |
| **glTF-Transform** (CLI npm `@gltf-transform/cli`) | ottimizza il .glb (compressione, texture) | |
| **Krita / GIMP / Photopea** | dipingere texture e maschere | |
| **three.js editor** (threejs.org/editor) o **gltf-viewer** | controllare il .glb prima di metterlo nel gioco | |

Alternativa al corpo MPFB: partire da un personaggio base di Mixamo (già riggato) e rimodellarlo. È più veloce, ma si controllano meno le proporzioni.

---

## 4. Misure di riferimento del corpo base

Prese da DLS (sezione 2A del file misure). Il corpo base è alto **1,80 m**.

| Parte | Valore | Frazione dell'altezza H |
|---|---|---|
| Altezza totale | 1,80 m | 1 H |
| Testa (dalla cima al mento) | 0,225 m | ~1/8 H |
| Mento | 1,58 m da terra | 0,88 H |
| Spalle (punto più alto) | 1,53 m da terra | 0,85 H |
| Larghezza spalle | 0,46 m | |
| Profondità torace | 0,25 m | |
| Fondo maglia | 0,94 m da terra | 0,52 H |
| Cavallo / anca | 0,85-0,90 m da terra | ~0,48 H |
| Fondo pantaloncini | 0,63 m da terra | 0,35 H |
| Inizio calzettoni | 0,52 m da terra | 0,29 H |
| Ginocchio | 0,49 m da terra | 0,27 H |
| Caviglia | 0,11 m da terra | 0,06 H |
| Lunghezza piede (scarpino) | ~0,28-0,30 m | |

**Varianti** (fatte con shape key o scala, non con modelli nuovi):

| Ruolo | Altezza | Corporatura |
|---|---|---|
| Portiere | 1,86-1,92 m | robusta |
| Difensore centrale | 1,84-1,90 m | robusta |
| Centrocampista | 1,76-1,84 m | normale |
| Esterno / ala | 1,70-1,78 m | snella |
| Attaccante | 1,78-1,88 m | normale o robusta |

Applica l'altezza **scalando l'intero modello** (per esempio 1,88 / 1,80 = 1,044). La corporatura si fa con 2 shape key sul busto e sulle cosce: "snello" e "robusto", con valori da 0 a 1.

---

## 5. Modellazione in Blender, passo per passo

### 5.1 Impostare la scena
1. *Scene Properties → Units*: **Metric**, *Unit Scale* **1.0**, lunghezze in metri.
2. Aggiungi un **cubo guida** alto 1,80 m (dimensioni 0,5 × 0,3 × 1,8) e delle linee orizzontali alle quote della tabella: spalle, fondo maglia, pantaloncini, ginocchio. Serviranno per controllare le proporzioni.

### 5.2 Creare il corpo con MPFB
1. Installa l'add-on MPFB e crea un **nuovo umano**.
2. Imposta: maschio, adulto, **muscolatura alta**, grasso basso, altezza ~1,80 m.
3. Proporzioni: testa leggermente più piccola del default (**~8 teste**), spalle larghe, gambe lunghe. Confronta con le linee guida.
4. **Posa: T-pose** (braccia orizzontali, palmi in giù, gambe leggermente divaricate). È la posa che il rig automatico di Mixamo riconosce meglio.
5. **Niente vestiti di MPFB**: la divisa la fai tu come parte della mesh (vedi 5.4), così resta un unico oggetto leggero.

### 5.3 Orientamento e origine
- Il personaggio guarda verso **−Y** in Blender, cioè verso di te nella vista frontale (tasto 1 del tastierino). All'esportazione glTF diventa **+Z**, la convenzione abituale di three.js.
- **Origine tra i piedi**, a quota 0: i piedi poggiano esattamente su Z = 0.
- Applica le trasformazioni con *Ctrl+A → All Transforms*: scala 1, rotazione 0.

### 5.4 Divisa come parte del corpo
Il giocatore è un'unica mesh con zone (gruppi di facce):
- **Maglia**: aderente, maniche corte che finiscono a metà bicipite, colletto tondo o a V.
- **Pantaloncini**: dal bacino fino a 0,63 m da terra, leggermente più larghi della coscia (+1-1,5 cm).
- **Calzettoni**: dalla caviglia fino a 0,52 m, con un risvoltino in alto (anello di facce).
- **Scarpini**: mesh semplice e affusolata, con suola appena più larga.
- **Pelle**: braccia, collo, ginocchia e testa.

Togli le facce della pelle sotto la divisa, così risparmi poligoni ed eviti che la pelle "buchi" la maglia nelle animazioni.

### 5.5 Testa, capelli e volto
- **Testa**: una sola mesh base per tutti; la varietà arriva da texture del viso e capelli.
- **Capelli**: 6-8 mesh separate e leggere (300-600 triangoli l'una), con texture e trasparenza a ritaglio (*alpha clip*), niente particelle. Esempi: rasati (solo texture), corti, mossi, ricci, cresta, raccolti, lunghi legati, calvo.
- **Barba**: 3-4 varianti solo in texture (niente, corta, piena, pizzetto).
- **Volti**: 6-10 texture di viso **inventate**. Dalla telecamera di gioco il viso si vede appena: conta nei replay e nelle esultanze.

### 5.6 Budget dei poligoni (LOD)

| Livello | Triangoli | Quando si usa |
|---|---|---|
| **LOD0** | 4.000-6.000 | primi piani, replay, esultanze, schermata della squadra |
| **LOD1** | 1.500-2.500 | **partita normale** (il giocatore è alto ~80 px) |
| **LOD2** | 600-900 | giocatori lontani o dispositivi lenti |

- Crea LOD0, poi ricava LOD1 e LOD2 con il modificatore **Decimate** (*Collapse*, rapporto ~0,4 e ~0,15).
- Controlla che spalle, ginocchia e gomiti abbiano abbastanza anelli di poligoni per piegarsi bene: almeno 3 anelli per articolazione nel LOD1.
- Totale in campo con il LOD1: 23 × ~2.000 = **~46.000 triangoli**, che un iPhone gestisce senza problemi.

---

## 6. UV e texture

### 6.1 Atlas unico
- **Una sola texture per personaggio**, **1024×1024** per il LOD0 e **512×512** per LOD1/LOD2.
- Disposizione consigliata dell'atlas:

```
┌───────────────┬───────────────┐
│ MAGLIA fronte │ MAGLIA retro  │   ← numero grande sul retro, piccolo davanti
├───────────────┼───────┬───────┤
│ PANTALONCINI  │ CALZE │SCARPE │
├───────────────┼───────┴───────┤
│ PELLE corpo   │  VISO + collo │
└───────────────┴───────────────┘
```

- Tieni **dritte e grandi** le isole UV di maglia fronte e retro: ci vanno numero, stemma e strisce.
- Fai le cuciture (*seams*) ai lati del busto e sotto le braccia, dove non si vedono.

### 6.2 Divise con una "maschera" (un modello per tutte le squadre)
Non si dipinge una texture per ogni squadra. Si dipinge **una maschera** e i colori li sceglie il gioco:

| Canale della texture maschera | Significato |
|---|---|
| **R** (rosso) | zone del **colore primario** della divisa |
| **G** (verde) | zone del **colore secondario** (maniche, fasce, strisce) |
| **B** (blu) | zone del **terzo colore** (bordini, colletto, risvolto calze) |
| **A** (alfa) | zone di **pelle** (0) e zone di tessuto (1) |

Più una texture **dettagli** in scala di grigi (pieghe del tessuto, cuciture, ombre), moltiplicata sopra.

Con 4-5 maschere diverse ottieni tutti i modelli di maglia: tinta unita, strisce verticali, fascia orizzontale, metà e metà, maniche diverse. Ogni squadra sceglie maschera e 3 colori.

### 6.3 Numeri, nomi e stemma
- **Numero sul retro**: alto ~0,25 m, centrato tra le scapole. Numero piccolo davanti (~0,10 m) sul petto a destra o al centro.
- **Nome**: sopra il numero, alto ~0,06 m. Dalla telecamera di gioco non si legge: serve solo nei primi piani.
- Come farli:
  - generali **a runtime** disegnandoli su un `canvas` 256×256 (font sportivo, contorno) e usali come texture decal sulla zona del numero;
  - in alternativa usa un atlas con le cifre 0-9 e componi il numero nello shader.
- **Stemma**: piccolo decal sul petto a sinistra (~0,08 m), preso dagli **stemmi forniti da Alex**. Mai stemmi o sponsor reali.
- Colori **saturi e contrastati** tra le due squadre: dal campo si distinguono solo le maglie.

### 6.4 Pelle
- Una texture di pelle **neutra** (chiara, con dettagli in grigio) e un parametro di tinta nel materiale.
- Prepara una palette di **8 toni di pelle**, da molto chiaro a molto scuro, e assegnali ai giocatori.

---

## 7. Rig e animazioni con Mixamo

### 7.1 Rig automatico
1. In Blender seleziona **solo** corpo, testa e una pettinatura neutra (o nessuna; i capelli si agganciano dopo all'osso della testa).
2. *File → Export → FBX*:
   - *Selected Objects*;
   - *Apply Scalings: FBX All*;
   - *Forward: −Z Forward*, *Up: Y Up*;
   - niente armature, niente animazioni;
   - *Path Mode: Copy* con *Embed Textures* attivo.
3. Su **mixamo.com** carica il file (*Upload Character*).
4. Posiziona i marcatori: **mento, polsi, gomiti, ginocchia, inguine**.
5. **Skeleton LOD**: scegli lo scheletro **senza dita** (*No Fingers*). Le dita dalla telecamera non si vedono e meno ossa vuol dire più prestazioni.
6. Controlla l'anteprima: braccia e gambe non devono deformarsi in modo strano. Se succede, riposiziona i marcatori.

### 7.2 Animazioni da scaricare
Per tutte le animazioni: formato **FBX Binary**, **Without Skin** (tranne la prima, *With Skin*, che contiene il personaggio), **30 fps**, *Keyframe Reduction: none*. Per le animazioni di movimento spunta **In Place**.

| Gruppo | Animazioni (cerca questi nomi su Mixamo) | In Place |
|---|---|---|
| **Base** | Idle (in piedi, respiro), Soccer Idle | – |
| **Movimento** | Walking, Jogging, Running, Fast Run / Sprint | **sì** |
| **Movimento laterale** | Strafe Left, Strafe Right, Walking Backwards / Running Backward | **sì** |
| **Curve** | Running Turn 180, Left/Right Turn | sì |
| **Con palla** | Soccer Dribble (se non c'è, usa Jogging e Running) | **sì** |
| **Calci** | Soccer Pass, Soccer Kick / Strike Forward (tiro), Soccer Header, Chip / Lob (se disponibile) | – |
| **Difesa** | Soccer Tackle, Slide Tackle, Soccer Trip / Falling Down, Getting Up | – |
| **Portiere** | Goalkeeper Idle, Goalkeeper Diving Save (sinistra e destra, alta e bassa), Goalkeeper Catch, Goalkeeper Drop Kick / Throw | – |
| **Situazioni** | Throw In (rimessa laterale), Soccer Penalty Kick | – |
| **Esultanze** | Victory, Celebration, Fist Pump, Knee Slide (ginocchiata) | – |
| **Delusione** | Defeated, Disappointed | – |

I nomi esatti su Mixamo possono variare: cerca con parole come "soccer", "goalkeeper", "kick", "header", "celebration". Le animazioni del portiere che vanno solo in una direzione si possono specchiare in Blender (*Pose → Paste Flipped*).

### 7.3 Montaggio in Blender
1. Importa il personaggio *With Skin* (FBX). Controlla che sia alto **1,80 m**: se è 100 volte più grande o più piccolo, correggi la scala e applicala.
2. Importa ogni animazione *Without Skin*. Copia l'azione sull'armatura del personaggio e **rinominala** con un nome chiaro: `idle`, `walk`, `jog`, `run`, `sprint`, `strafe_l`, `strafe_r`, `back`, `dribble`, `pass`, `shot`, `header`, `tackle`, `slide`, `fall`, `getup`, `gk_idle`, `gk_dive_l`, `gk_dive_r`, `gk_dive_high_l`, `gk_dive_high_r`, `gk_catch`, `throwin`, `celebrate_1`, `celebrate_2`, `celebrate_3`.
3. In *Dope Sheet → Action Editor* attiva la **protezione (F, fake user)** su ogni azione, così non sparisce al salvataggio.
4. Elimina le armature in più che arrivano con ogni importazione.
5. **Capelli**: imparentali all'osso della testa (*Parent → Bone*, osso `mixamorig:Head`).
6. **Controlla i cicli**: walk, jog, run e sprint devono ripetersi senza scatti; idle deve iniziare e finire nella stessa posa.

### 7.4 Misurare la velocità di ogni animazione di corsa
Serve per sincronizzare piedi e velocità ed evitare lo scivolamento:
1. Riproduci l'animazione **senza In Place** (scaricane una copia normale) e guarda quanti metri avanza l'osso `Hips` in un ciclo completo.
2. Velocità della clip = metri del ciclo / durata del ciclo.
3. Segna il valore per ogni clip, per esempio:

```ts
export const CLIP_SPEED = { walk: 1.5, jog: 3.4, run: 5.8, sprint: 8.0, dribble: 5.5 }; // m/s, da misurare
```

---

## 8. Esportazione e ottimizzazione

### 8.1 Esportare il .glb da Blender
*File → Export → glTF 2.0*:
- *Format*: **glTF Binary (.glb)**;
- *Include*: oggetti selezionati (personaggio, capelli, armatura);
- *Transform*: **+Y Up** attivo;
- *Mesh*: Apply Modifiers attivo, UVs e Normals attivi;
- *Animation*: **Export Animations** attivo, modalità **Actions**, *Always Sample Animations* attivo;
- *Skinning* attivo, *Influence Limit* 4.

Esporta **un file per livello di dettaglio** (`player_lod0.glb`, `player_lod1.glb`, `player_lod2.glb`) con le stesse animazioni, oppure un file per la mesh e un file solo per le animazioni (`player_anims.glb`) condiviso da tutti i LOD.

### 8.2 Ottimizzare
```bash
npx @gltf-transform/cli optimize player_lod1.glb player_lod1_opt.glb --compress meshopt --texture-compress webp
```
- **meshopt** riduce molto il peso della geometria e delle animazioni. Nel gioco serve il `MeshoptDecoder`.
- Texture in **WebP** (oppure KTX2 per usare meno memoria sulla GPU).
- **Obiettivo di peso**: LOD1 sotto **1-1,5 MB** con le animazioni; ogni pettinatura sotto 100 KB.

---

## 9. Uso nel gioco (esempio three.js)

### 9.1 Caricare una volta, clonare 23 volte
```ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const base = await loader.loadAsync('/models/player_lod1_opt.glb');

function createPlayer(cfg) {
  const model = SkeletonUtils.clone(base.scene);        // clone corretto per mesh con scheletro
  model.scale.setScalar(cfg.height / 1.80);             // altezza per ruolo
  const mixer = new THREE.AnimationMixer(model);
  const actions = Object.fromEntries(base.animations.map(c => [c.name, mixer.clipAction(c)]));
  applyKit(model, cfg.kit, cfg.number, cfg.skinTone);  // vedi 9.3
  return { model, mixer, actions };
}
```

### 9.2 Fondere le animazioni in base alla velocità
```ts
// soglie in m/s: idle < 0.5 < walk < 1.6 < jog < 3.5 < run < 6.5 < sprint
function updateLocomotion(p, speed, dt) {
  const w = locomotionWeights(speed);          // pesi che sommano a 1 tra le due clip vicine
  for (const name of ['idle', 'walk', 'jog', 'run', 'sprint']) {
    const a = p.actions[name];
    a.enabled = true;
    a.setEffectiveWeight(w[name] ?? 0);
    if (CLIP_SPEED[name]) a.setEffectiveTimeScale(Math.max(speed, 0.3) / CLIP_SPEED[name]);
  }
  p.mixer.update(dt);
}
```
- Le azioni puntuali (passaggio, tiro, contrasto, tuffo) si lanciano con `fadeIn(0.1)` sopra il movimento e tornano al movimento con `fadeOut(0.15)`.
- **Il momento in cui parte la palla** va legato al fotogramma del contatto del piede nella clip del tiro o del passaggio (segnalo in un file di configurazione, per esempio `shot: { contactTime: 0.32 }`), non all'inizio dell'animazione.

### 9.3 Divisa, numero e pelle nel materiale
- Materiale con una piccola modifica allo shader (`onBeforeCompile`, oppure un `ShaderMaterial`) che legge la **maschera RGBA**:
  - `colore = primario·R + secondario·G + terzo·B`, moltiplicato per la texture dettagli;
  - dove A = 0 usa il **tono di pelle**.
- **Numero**: texture da `canvas` generata una volta per giocatore e applicata nella zona del numero (UV fisse).
- **Un materiale per giocatore**, ma con le texture condivise: cambiano solo i parametri. Sono 23 draw call per i giocatori, un numero accettabile.

### 9.4 Prestazioni su iPhone
- **Ombre**: niente ombre in tempo reale sui giocatori. Usa un **disco d'ombra** sotto ogni giocatore (un piano con texture sfumata, scuro al 40-50%). È economico e leggibile.
- **Culling**: le mesh con scheletro a volte spariscono ai bordi dello schermo. Allarga il *bounding box* o imposta `frustumCulled = false` sui giocatori.
- **LOD**: in partita usa sempre il LOD1. Passa al LOD0 solo in replay ed esultanze (telecamera vicina) e al LOD2 se il dispositivo va sotto i 50 fps.
- **Aggiornamento animazioni**: per i giocatori fuori dallo schermo aggiorna il mixer a frequenza dimezzata.
- **Indicatore del giocatore controllato**: un anello o una freccia sopra la testa, colorato e sempre visibile (DLS usa un indicatore verde con il nome).

---

## 10. Checklist finale di verifica

1. **Altezza**: in scena il giocatore base è alto **1,80 unità**; la palla ha raggio **0,11**.
2. **Piedi**: poggiano su Y = 0 in tutte le animazioni, senza affondare né galleggiare.
3. **Direzione**: il modello guarda verso **+Z** nel gioco.
4. **Scivolamento**: a 6 m/s i piedi non pattinano; se pattinano, correggi `CLIP_SPEED`.
5. **Leggibilità**: con la telecamera di gioco (a ~45 m) le due squadre si distinguono a colpo d'occhio e il numero sul retro si intuisce.
6. **Varietà**: in campo non ci sono due giocatori identici (pelle, capelli, altezza).
7. **Prestazioni**: 60 fps su iPhone con 23 giocatori; LOD1 sotto ~2.500 triangoli e 1,5 MB.
8. **Regole del progetto**: volti inventati, nessun logo, sponsor o stemma reale, solo stemmi di Alex.

---

## 11. Ordine di lavoro consigliato

1. **Prototipo grigio**: corpo base senza texture, rig Mixamo, 5 animazioni di movimento. Verifica scala, velocità e scivolamento in partita.
2. **Divisa a maschera**: una maschera tinta unita, colori delle due squadre e numero da canvas.
3. **Tutte le animazioni** di calci, contrasti e portiere, con i tempi di contatto.
4. **Varietà**: pelle, 6-8 capelli, volti, altezze per ruolo.
5. **LOD e ottimizzazione**, test su iPhone.
6. **Esultanze e primi piani** (LOD0) per replay e momenti del gol.

## 12. Errori comuni da evitare

- **Scala in centimetri** da Mixamo o FBX: tutto risulta 100 volte più grande e le velocità non tornano.
- **Animazioni di corsa con spostamento incorporato** (senza *In Place*): il personaggio scatta indietro a ogni ciclo.
- **Trasformazioni non applicate** prima dell'esportazione: rotazioni e scale strane nel gioco.
- **Texture separate per ogni squadra**: file pesanti e lavoro moltiplicato. Usa la maschera.
- **Ombre in tempo reale** su mobile: crollo degli fps.
- **Volti troppo dettagliati**: in partita non si vedono. Il dettaglio va nei capelli e nella sagoma.
