/* Checklists por etapa de la campaña (checklist-*.html, los genera tools/ayuda.py). Cada pregunta se responde Sí, No
   o No sé; con No o No sé aparece qué hacer. Para dejar una pregunta en blanco: tocar otra vez la respuesta marcada o
   «Quitar respuesta». Arriba van las cuatro etapas con su avance y, al final, «Tus pendientes».
   Las respuestas quedan en este dispositivo (localStorage, una clave por etapa, y su resumen en cr-res-<etapa>, que la
   ficha ofrece incluir al cotizar): si no se pueden guardar, el checklist funciona igual mientras la página esté
   abierta. «Imprimir o guardar en PDF» y «Guardar en PDF» usan la impresión del navegador. */
(() => {
  const d = document;
  const root = d.querySelector('[data-ck-campana]');
  if (!root) return;
  const CLAVE = root.dataset.clave;
  const items = [...root.querySelectorAll('.ckc-item')];
  const NOMBRE = { si: 'Sí', no: 'No', nose: 'No sé' };
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch { return {}; } };
  let resp = leer(CLAVE);
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(resp)); } catch { /* sin almacenamiento: queda en la página */ } };
  const falta = (v) => v === 'no' || v === 'nose';

  const pinta = (li, animar) => {
    const v = resp[li.dataset.n] || '';
    li.dataset.resp = v;
    li.querySelectorAll('[data-ckc-op]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ckcOp === v)));
    li.querySelector('[data-ckc-quitar]').hidden = !v;
    const reco = li.querySelector('[data-ckc-reco]');
    const nose = reco.querySelector('[data-ckc-texto-nose]');
    if (nose) { nose.hidden = v !== 'nose'; reco.querySelector('[data-ckc-texto-no]').hidden = v === 'nose'; }
    if (falta(v) && reco.hidden) {
      reco.hidden = false;
      if (animar && motion.matches) reco.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2, .7, .2, 1)' });
    } else if (!falta(v)) reco.hidden = true;
  };

  /* Avance de las cuatro etapas (las otras se leen de su clave) */
  const etapas = () => d.querySelectorAll('[data-ckc-etapa]').forEach((a) => {
    const datos = `cr-${a.dataset.ckcEtapa}` === CLAVE ? resp : leer(`cr-${a.dataset.ckcEtapa}`);
    const vals = Object.values(datos).filter(Boolean);
    const total = Number(a.dataset.ckcTotal);
    const pend = vals.filter(falta).length;
    a.querySelector('[data-ckc-etapa-estado]').textContent = vals.length
      ? `${vals.length} de ${total}${pend ? ` · ${pend} pendiente${pend === 1 ? '' : 's'}` : ''}` : `${total} preguntas`;
    a.classList.toggle('is-avance', vals.length > 0);
    a.classList.toggle('is-lista', vals.length === total && !pend);
  });

  const host = root.querySelector('[data-ckc-pendientes]');
  const resume = () => {
    const vals = items.map((li) => li.dataset.resp);
    const hechas = vals.filter(Boolean).length;
    root.querySelector('[data-ckc-hechas]').textContent = hechas;
    root.querySelector('[data-ckc-progreso]').style.setProperty('--p', `${(hechas / items.length) * 100}%`);
    const cuenta = (k) => vals.filter((v) => v === k).length;
    const partes = ['si', 'no', 'nose'].filter(cuenta).map((k) => `${cuenta(k)} ${NOMBRE[k]}`);
    root.querySelector('[data-ckc-detalle]').textContent = partes.length ? ` · ${partes.join(' · ')}` : '';
    root.querySelector('[data-ckc-borrar]').hidden = !hechas;
    const pend = items.filter((li) => falta(li.dataset.resp));
    host.replaceChildren();
    if (pend.length) {
      const ol = d.createElement('ol');
      ol.className = 'ckc-pend';
      pend.forEach((li) => {
        const a = d.createElement('a');
        a.href = `#p${li.dataset.n}`;
        const n = d.createElement('span');
        n.className = 'ckc-pend-n';
        n.textContent = li.dataset.n;
        const t = d.createElement('span');
        t.textContent = li.querySelector('.ckc-texto').textContent;
        const e = d.createElement('em');
        e.textContent = NOMBRE[li.dataset.resp];
        a.append(n, t, e);
        const item = d.createElement('li');
        item.append(a);
        ol.append(item);
      });
      host.append(ol);
    } else {
      const p = d.createElement('p');
      p.className = 'ckc-vacio';
      p.textContent = hechas === items.length ? 'Respondiste «Sí» a todo: esta etapa está lista.' : 'Aún no marcas «No» ni «No sé» en esta etapa.';
      host.append(p);
    }
    etapas();
    /* Resumen de la etapa para la ficha (campanas.js ofrece incluirlo al cotizar): respondidas y preguntas con No o No sé */
    try {
      const k = `cr-res-${CLAVE.slice(3)}`;
      if (!hechas) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify({ nombre: root.dataset.nombre, total: items.length, hechas,
        pend: pend.map((li) => ({ n: Number(li.dataset.n), resp: li.dataset.resp, texto: li.querySelector('.ckc-texto').textContent })) }));
    } catch { /* sin almacenamiento: no hay resumen para la ficha */ }
    d.dispatchEvent(new CustomEvent('ckc:cambio'));  // la ficha flotante de esta misma página se pone al día
  };

  const fija = (li, v) => {
    if (v) resp[li.dataset.n] = v; else delete resp[li.dataset.n];
    guardar();
    pinta(li, true);
    resume();
  };

  /* «Borrar respuestas» pide un segundo toque: «¿Borrar todo? Toca de nuevo» por unos segundos */
  const borrar = root.querySelector('[data-ckc-borrar]');
  const borrarTexto = borrar.querySelector('span');
  let armado = 0;
  const desarma = () => { clearTimeout(armado); armado = 0; borrar.classList.remove('is-armado'); borrarTexto.textContent = 'Borrar respuestas'; };

  root.addEventListener('click', (e) => {
    const op = e.target.closest('[data-ckc-op]');
    if (op) {
      fija(op.closest('.ckc-item'), op.getAttribute('aria-pressed') === 'true' ? '' : op.dataset.ckcOp);
      return;
    }
    const quitar = e.target.closest('[data-ckc-quitar]');
    if (quitar) {
      const li = quitar.closest('.ckc-item');
      fija(li, '');
      li.querySelector('[data-ckc-op]').focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-ckc-borrar]')) {
      if (!armado) {
        borrar.classList.add('is-armado');
        borrarTexto.textContent = '¿Borrar todo? Toca de nuevo';
        armado = setTimeout(desarma, 4000);
        return;
      }
      desarma();
      resp = {};
      guardar();
      items.forEach((li) => pinta(li, false));
      resume();
      window.SITE?.toast?.('Respuestas borradas');
      return;
    }
    if (e.target.closest('[data-ckc-imprimir]')) window.print();
  });

  items.forEach((li) => pinta(li, false));
  resume();
  /* Otra pestaña con el mismo checklist o con otra etapa */
  addEventListener('storage', (e) => {
    if (e.key === CLAVE) { resp = leer(CLAVE); items.forEach((li) => pinta(li, false)); resume(); } else if (e.key?.startsWith('cr-checklist-')) etapas();
  });
})();
