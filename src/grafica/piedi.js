/* Piedi piantati (foot locking). Le animazioni di corsa e dei gesti hanno un passo fisso, il giocatore invece va alla
   velocità che decide il gioco: senza correzione il piede in appoggio scivola sull'erba. Qui, dopo che l'animazione ha
   messo in posa lo scheletro, ogni piede che tocca terra viene fissato nel punto in cui è sceso e la gamba si piega (anca e
   ginocchio, cinematica inversa a due ossa) per tenerlo lì; quando l'animazione lo rialza, o la gamba non ci arriva più, il
   piede torna morbidamente dove lo vuole l'animazione. Il piede tiene l'orientamento che aveva nella clip.

   PIEDI.su: quanto sopra il punto più basso raggiunto dalla caviglia il piede conta come appoggiato (metri);
   entra/esce: in quanti secondi il blocco arriva pieno e sparisce; max: il piede bloccato non resta mai più lontano di così
   da quello dell'animazione (oltre si fa trascinare: meglio un piccolo scivolone che una gamba tirata o uno scatto). */
export const PIEDI = { su: 0.035, entra: 0.05, esce: 0.12, max: 0.28, risale: 0.0006 };

export function creaPiedi(T) {
  const H = new T.Vector3(), K = new T.Vector3(), A = new T.Vector3(), A2 = new T.Vector3(), M = new T.Vector3(), B = new T.Vector3(); // B: il bersaglio
  const v1 = new T.Vector3(), v2 = new T.Vector3(), asse = new T.Vector3(), q = new T.Quaternion(), qp = new T.Quaternion(), dq = new T.Quaternion(), qPiede = new T.Quaternion();
  const LATI = [['l', 'thigh_l', 'calf_l', 'foot_l'], ['r', 'thigh_r', 'calf_r', 'foot_r']];

  /** Ruota un osso nel mondo di dq (premoltiplicata), aggiornando la rotazione locale rispetto al padre. */
  function ruotaNelMondo(osso, dq) {
    osso.getWorldQuaternion(qp); qp.premultiply(dq);
    osso.parent.getWorldQuaternion(q); osso.quaternion.copy(q.invert().multiply(qp));
    osso.updateMatrixWorld(true);
  }

  /** Cinematica inversa a due ossa: porta la caviglia sul bersaglio piegando il ginocchio e girando la coscia. */
  function dueOssa(anca, ginocchio, piede, bersaglio) {
    anca.getWorldPosition(H); ginocchio.getWorldPosition(K); piede.getWorldPosition(A); piede.getWorldQuaternion(qPiede);
    const l1 = H.distanceTo(K), l2 = K.distanceTo(A); if (l1 < 1e-4 || l2 < 1e-4) return;
    const d = Math.min(Math.max(H.distanceTo(bersaglio), Math.abs(l1 - l2) + .01), l1 + l2 - .002);
    // 1. il ginocchio: l'angolo interno che dà la distanza giusta tra anca e caviglia
    v1.subVectors(H, K).normalize(); v2.subVectors(A, K).normalize();
    const ora = Math.acos(Math.min(1, Math.max(-1, v1.dot(v2)))), voglio = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
    asse.crossVectors(v1, v2); if (asse.lengthSq() < 1e-8) { anca.getWorldQuaternion(q); asse.set(1, 0, 0).applyQuaternion(q); } asse.normalize();
    if (Math.abs(voglio - ora) > 1e-4) ruotaNelMondo(ginocchio, dq.setFromAxisAngle(asse, voglio - ora));
    // 2. la coscia: gira tutta la gamba perché la caviglia punti al bersaglio
    piede.getWorldPosition(A2); v1.subVectors(A2, H).normalize(); v2.subVectors(bersaglio, H).normalize();
    ruotaNelMondo(anca, dq.setFromUnitVectors(v1, v2));
    // 3. il piede resta orientato come nella clip
    piede.parent.getWorldQuaternion(q); piede.quaternion.copy(q.invert().multiply(qPiede)); piede.updateMatrixWorld(true);
  }

  /**
   * Da chiamare dopo la posa (mixer aggiornato, corpo alzato o abbassato). attivo: false nelle azioni a terra, nei tuffi e
   * quando il giocatore è stato appena spostato di colpo: i blocchi si sciolgono.
   */
  return function blocca(f, dt, attivo) {
    const b = f.bones; if (!b || !b.thigh_l || !b.calf_l || !b.foot_l || !b.thigh_r || !b.calf_r || !b.foot_r) return;
    const st = f.piedi || (f.piedi = { l: { w: 0, on: false, x: 0, z: 0 }, r: { w: 0, on: false, x: 0, z: 0 }, h0: 9 });
    f.root.updateMatrixWorld(true);
    for (const [s, na, ng, np] of LATI) {
      const k = st[s]; b[np].getWorldPosition(M);
      st.h0 = Math.min(st.h0 + PIEDI.risale * dt * 60, M.y); // il punto più basso della caviglia (risale piano: terreno e corpo cambiano)
      const giu = attivo && M.y < st.h0 + PIEDI.su;
      if (giu) { if (!k.on) { k.on = true; k.x = M.x; k.z = M.z; } k.w = Math.min(1, k.w + dt / PIEDI.entra); } else { k.on = false; k.w = Math.max(0, k.w - dt / PIEDI.esce); }
      if (!attivo) k.w = 0;
      if (k.w <= 0) continue;
      // troppo lontano dal piede dell'animazione: il punto bloccato si fa trascinare (resta a PIEDI.max), senza staccarsi di colpo
      const dl = Math.hypot(k.x - M.x, k.z - M.z); if (dl > PIEDI.max) { k.x = M.x + (k.x - M.x) * PIEDI.max / dl; k.z = M.z + (k.z - M.z) * PIEDI.max / dl; }
      const tx = M.x + (k.x - M.x) * k.w, tz = M.z + (k.z - M.z) * k.w;
      dueOssa(b[na], b[ng], b[np], B.set(tx, M.y, tz));
    }
  };
}
