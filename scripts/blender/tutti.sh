#!/bin/bash
# Rende tutti i ritratti che mancano, a blocchi, e li mette nel gioco. Si può fermare e rilanciare: riparte da dove era.
# Per ogni blocco: Blender rende le teste (scripts/blender/render_ritratti.py), poi scripts/ritratti_webp.py scrive i
# WebP nella cartella del gioco e i PNG grandi delle teste si buttano (le maglie restano nella cartella di lavoro).
# Uso: scripts/blender/tutti.sh <blender> <cartella di lavoro> [minuti al massimo] [lato] [campioni] [volti per blocco]
#      aspetti: scripts/blender/aspetti.json (da node scripts/aspetti.mjs); gioco: public/img/ritratti
set -u
BLENDER=$1; LAVORO=$2; MINUTI=${3:-100}; LATO=${4:-1024}; CAMPIONI=${5:-256}; BLOCCO=${6:-16}
QUI=$(cd "$(dirname "$0")/../.." && pwd); ASPETTI=$QUI/scripts/blender/aspetti.json; GIOCO=$QUI/public/img/ritratti
mkdir -p "$LAVORO" "$GIOCO"; FINE=$(( $(date +%s) + MINUTI * 60 ))
while [ "$(date +%s)" -lt "$FINE" ]; do
  # i prossimi volti senza WebP nel gioco
  IDS=$(python3 -c "
import json, os, sys
manca = [a['id'] for a in json.load(open(sys.argv[1], encoding='utf-8')) if not os.path.exists(os.path.join(sys.argv[2], a['id'] + '-512.webp'))]
print(len(manca), ','.join(manca[:int(sys.argv[3])]))" "$ASPETTI" "$GIOCO" "$BLOCCO")
  QUANTI=${IDS%% *}; IDS=${IDS#* }
  if [ "$QUANTI" = 0 ]; then echo "TUTTI FATTI"; exit 0; fi
  # le maglie si rendono una volta sola, col primo blocco
  [ -f "$LAVORO/maglia-girocollo-luce.png" ] || IDS="maglia,$IDS"
  echo "$(date +%H:%M) mancano $QUANTI volti: rendo $IDS"
  "$BLENDER" -b --python "$QUI/scripts/blender/render_ritratti.py" -- "$ASPETTI" "$LAVORO" "$CAMPIONI" "$LATO" "$IDS" 2>&1 | grep --line-buffered -E "RITRATTO|MAGLIA|Error|Traceback|File "
  python3 "$QUI/scripts/ritratti_webp.py" "$LAVORO" "$GIOCO" || exit 1
  # i PNG grandi delle teste non servono più
  find "$LAVORO" -maxdepth 1 -name '*.png' ! -name 'maglia-*' -delete
done
echo "TEMPO FINITO"
