/* Campañas solo en la Región Metropolitana: el selector de comuna (filas.js, copia sin cambios) muestra solo esa región */
if (window.PICK) window.PICK.REGION_NAMES = ['Metropolitana'];

/* Mes estimado de la campaña ([data-meses]): doce meses desde el primero posible, agrupados por año (el año va una vez,
   como título del grupo; la opción guarda «Marzo de 2027» para el resumen). La solicitud sanitaria va al menos
   40 días hábiles antes del inicio (DS 29/2024, arts. 24 y 39); se cuentan de lunes a viernes, sin feriados, así que es
   aproximado. Si ese primer día cae después del 10, los meses parten desde el siguiente. La fila la abre este archivo
   (data-fila="meses" no es un tipo de filas.js, que igual la pinta con el texto de la opción elegida). */
(() => {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const NO_SE = 'Aún no lo sé';
  const dia = new Date();
  for (let habiles = 0; habiles < 40;) { dia.setDate(dia.getDate() + 1); if (dia.getDay() % 6) habiles++; }
  const desde = new Date(dia.getFullYear(), dia.getMonth() + (dia.getDate() > 10 ? 1 : 0), 1);
  const anios = new Map();
  for (let i = 0; i < 12; i++) {
    const m = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
    const y = m.getFullYear();
    if (!anios.has(y)) anios.set(y, []);
    anios.get(y).push({ value: `${MESES[m.getMonth()]} de ${y}`, label: MESES[m.getMonth()] });
  }
  document.querySelectorAll('[data-meses]').forEach((row) => {
    const sel = row.querySelector('select');
    const no = sel.querySelector(`option[value="${NO_SE}"]`);
    anios.forEach((meses) => meses.forEach((m) => sel.insertBefore(new Option(m.value, m.value), no)));
    row.querySelector('.pick-btn').addEventListener('click', async () => {
      if (!window.Picker) return;
      const r = await window.Picker.choose({
        title: row.dataset.title, sub: row.dataset.sub || '', layout: 'grid', value: sel.value,
        groups: [...anios].map(([y, meses]) => ({ label: String(y), options: meses })),
        action: { label: NO_SE, value: NO_SE }
      });
      if (r === undefined) return;
      sel.value = typeof r === 'object' ? r.value : r;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
})();

/* Checklists en la ficha: si en este dispositivo se respondió alguno (checklist.js deja un resumen por etapa en
   cr-res-<etapa>), el paso «Campaña» ofrece «Incluir mis checklists», marcado. Cada etapa va en su campo oculto y así
   llega al resumen y a WhatsApp: cuántas respondió y, textuales, las preguntas que quedaron en No o No sé. */
(() => {
  document.querySelectorAll('[data-ck-adjunto]').forEach((box) => {
    const incluir = box.querySelector('[data-ck-adjunto-incluir]');
    const detalle = box.querySelector('[data-ck-adjunto-detalle]');
    const campos = [...box.querySelectorAll('input[data-ck]')];
    const NOMBRE = { no: 'No', nose: 'No sé' };
    const leer = (k) => { try { return JSON.parse(localStorage.getItem(`cr-res-${k}`) || 'null'); } catch { return null; } };
    const texto = (r) => (r.pend.length
      ? `${r.hechas} de ${r.total} respondidas; pendientes: ${r.pend.map((x) => `${x.texto} (${NOMBRE[x.resp] || x.resp})`).join('; ')}`
      : `${r.hechas} de ${r.total} respondidas, todas en Sí`);
    const pinta = () => {
      const hay = campos.map((c) => [c, leer(c.dataset.ck)]).filter(([, r]) => r?.hechas);
      box.hidden = !hay.length;
      detalle.textContent = hay.map(([, r]) => `${r.nombre}: ${r.hechas} de ${r.total}`).join(' · ');
      campos.forEach((c) => { const r = hay.find(([x]) => x === c)?.[1]; c.value = incluir.checked && r ? texto(r) : ''; });
    };
    pinta();
    incluir.addEventListener('change', pinta);
    addEventListener('storage', (e) => { if (e.key?.startsWith('cr-res-')) pinta(); });
    addEventListener('pageshow', pinta);  // al volver desde un checklist con «Atrás»
    document.addEventListener('ckc:cambio', pinta);  // en la página del checklist, mientras se responde
    /* Antes de armar el resumen (site.js lo arma en el «submit» del formulario) */
    document.addEventListener('submit', (e) => { if (e.target === box.closest('form')) pinta(); }, true);
  });
})();

/* Resumen de la ficha: al presionar «Enviar» (abre WhatsApp con el texto), Don Reco y Lola Lata agradecen en grande,
   cubriendo el panel, con «Ver resumen» (vuelve al resumen) y «Volver» (cierra el panel; data-hero-close, como la X).
   Mientras se ven, lo de abajo queda inerte para el teclado. Se esconden al editar o al preparar otra ficha. */
(() => {
  document.querySelectorAll('[data-ficha-enviada]').forEach((gracias) => {
    const resumen = gracias.closest('.summary');
    if (!resumen) return;
    const form = document.querySelector(`form[data-summary="${resumen.id}"]`);
    const debajo = [...resumen.children].filter((el) => el !== gracias);
    /* Con fotos en la ficha (transporte-ui.js, [data-adjuntos]): WhatsApp no recibe adjuntos por enlace, así que el
       agradecimiento recuerda enviarlas en el mismo chat y, donde el sistema lo permite, ofrece «Compartir fotos» */
    const zona = form?.querySelector('[data-adjuntos]');
    const texto = gracias.querySelector('.ficha-enviada-texto');
    const base = texto.textContent;
    const btnFotos = gracias.querySelector('[data-gracias-fotos]');
    const fotos = () => zona?.fotos?.() || [];
    const muestra = (on) => {
      if (on) {
        const f = fotos();
        const comparte = f.length > 0 && !!navigator.canShare?.({ files: f });
        const una = f.length === 1;
        texto.textContent = !f.length ? base
          : comparte ? `Don Reco y Lola Lata dejaron tu ficha escrita en WhatsApp. Envíala y después comparte ${una ? 'tu foto' : 'tus fotos'} en ese mismo chat.`
            : `Don Reco y Lola Lata dejaron tu ficha escrita en WhatsApp. Envíala y después adjunta ${una ? 'tu foto' : 'tus fotos'} en ese mismo chat: ${una ? 'está' : 'están'} en «Ver resumen».`;
        if (btnFotos) {
          btnFotos.hidden = !comparte;
          btnFotos.querySelector('span').textContent = una ? 'Compartir foto' : 'Compartir fotos';
        }
      }
      gracias.hidden = !on;
      debajo.forEach((el) => { el.inert = on; });
      if (on) gracias.querySelector('.ficha-enviada-titulo').focus({ preventScroll: true });
    };
    btnFotos?.addEventListener('click', async () => {
      try { await navigator.share({ files: fotos() }); } catch (err) { if (err.name !== 'AbortError') window.SITE?.toast?.('No se pudo abrir el menú para compartir: adjunta las fotos en el chat.'); }
    });
    resumen.querySelector('[data-send]')?.addEventListener('click', () => muestra(true));
    gracias.querySelector('[data-ver-resumen]').addEventListener('click', () => {
      muestra(false);
      resumen.querySelector('[data-send]')?.focus({ preventScroll: true });
    });
    gracias.querySelector('[data-hero-close]').addEventListener('click', () => setTimeout(() => muestra(false), 400));
    /* La animación (222 KB) se pide al preparar la ficha, no al cargar la página: así ya está al presionar «Enviar» */
    form?.addEventListener('submit', () => { muestra(false); gracias.querySelector('img').loading = 'eager'; });
  });
})();

/* Campañas de recolección: lo propio de estas páginas que no está en el sistema de Transporte.
   Logo: como el de Transporte, solo mientras el puntero está encima toma otro color de la paleta de la marca (cada
   pasada, el siguiente); al salir vuelve a su verde, que define el CSS. */
(() => {
  const COLORES = ['#6708C7', '#FF651C', '#E90B2D', '#000000'];
  let i = -1;
  document.querySelectorAll('.logo-cr').forEach((logo) => {
    const zona = logo.closest('a') || logo;
    zona.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      i = (i + 1) % COLORES.length;
      logo.style.setProperty('--logo', COLORES[i]);
    });
    zona.addEventListener('pointerleave', () => logo.style.removeProperty('--logo'));
  });
})();

/* Buscador de la ayuda, como cmdk (26-11-2026): ⌘K o Ctrl+K, o «Buscar…» en el panel «Ayuda». Busca en guías,
   checklists (cada pregunta), preguntas frecuentes, artículos de las normas y medidas de aparatos. El índice lo arma
   tools/ayuda.py (assets/campanas/ayuda-indice.json) y se descarga la primera vez que se abre. Flechas para moverse,
   Enter para abrir, Esc para cerrar; el primer resultado queda marcado. */
(() => {
  const d = document;
  const V = (d.currentScript?.src.match(/\?v=(\w+)/) || [])[1] || '1';
  const GRUPOS = ['Acciones', 'Guías', 'Checklists', 'Preguntas', 'Normativa', 'Tamaños', 'Portada'];
  const LUPA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';
  const fold = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let dlg = null; let input = null; let lista = null; let indice = null; let ops = []; let activo = -1;

  const marca = (texto, palabras) => {
    let html = esc(texto);
    palabras.forEach((p) => {
      if (p.length < 2) return;
      const f = fold(html);
      const i = f.indexOf(p);
      if (i >= 0 && !/<[^>]*$/.test(html.slice(0, i))) html = `${html.slice(0, i)}<mark>${html.slice(i, i + p.length)}</mark>${html.slice(i + p.length)}`;
    });
    return html;
  };
  const busca = (q) => {
    const palabras = fold(q).split(/\s+/).filter(Boolean);
    if (!indice) return { palabras, filas: [] };
    if (!palabras.length) {
      const pick = (g, n) => indice.filter((x) => x.g === g && !/#/.test(x.u || '')).slice(0, n);
      return { palabras, filas: [...pick('Acciones', 1), ...pick('Guías', 3), ...pick('Checklists', 4)] };
    }
    const filas = indice.map((x, i) => {
      const t = fold(x.t); const todo = `${t} ${fold(x.s || '')}`;
      if (!palabras.every((p) => todo.includes(p))) return null;
      const puntos = (t.startsWith(palabras[0]) ? 0 : palabras.every((p) => t.includes(p)) ? 1 : 2) + i / 1e4;
      return { ...x, puntos };
    }).filter(Boolean).sort((a, b) => a.puntos - b.puntos);
    const porGrupo = {};
    return { palabras, filas: filas.filter((x) => (porGrupo[x.g] = (porGrupo[x.g] || 0) + 1) <= 6).slice(0, 24) };
  };
  const mueve = (i, ver = true) => {
    if (!ops.length) { activo = -1; input.removeAttribute('aria-activedescendant'); return; }
    activo = (i + ops.length) % ops.length;
    ops.forEach((o, k) => o.setAttribute('aria-selected', String(k === activo)));
    input.setAttribute('aria-activedescendant', ops[activo].id);
    if (ver) ops[activo].scrollIntoView({ block: 'nearest' });
  };
  const pinta = () => {
    const { palabras, filas } = busca(input.value);
    const titulo = !palabras.length ? 'Sugerencias' : '';
    let n = 0;
    lista.innerHTML = !indice ? '<p class="busca-vacio">Cargando…</p>'
      : !filas.length ? `<p class="busca-vacio">No encontramos «${esc(input.value.trim())}». Prueba con otra palabra o <button type="button" class="busca-enlace" data-dock-open="conversar">escríbenos por WhatsApp</button>.</p>`
        : GRUPOS.filter((g) => filas.some((x) => x.g === g)).map((g) => `<div class="busca-grupo" role="group" aria-label="${titulo || g}"><p class="busca-grupo-t" aria-hidden="true">${titulo || g}</p>${filas.filter((x) => x.g === g).map((x) => {
          const cont = `<span class="busca-op-t">${marca(x.t, palabras)}</span>${x.s ? `<small>${marca(x.s, palabras)}</small>` : ''}`;
          return x.a ? `<button type="button" class="busca-op" role="option" id="busca-op-${n++}" data-dock-open="${x.a}">${cont}</button>`
            : `<a class="busca-op" role="option" id="busca-op-${n++}" href="${esc(x.u)}">${cont}</a>`;
        }).join('')}</div>`).join('');
    ops = [...lista.querySelectorAll('.busca-op')];
    mueve(0, false);
    lista.scrollTop = 0;
  };
  const crear = () => {
    dlg = d.createElement('dialog');
    dlg.className = 'busca';
    dlg.setAttribute('aria-label', 'Buscar en la ayuda');
    dlg.innerHTML = `<div class="busca-caja">${LUPA}<input type="text" role="combobox" aria-expanded="true" aria-controls="busca-lista" aria-autocomplete="list" aria-label="Buscar en la ayuda" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Buscar en guías, checklists, preguntas y normas…"><button type="button" class="busca-cerrar" data-busca-cerrar>Cerrar</button></div>`
      + '<div class="busca-lista" id="busca-lista" role="listbox" aria-label="Resultados"></div>'
      + '<p class="busca-pie" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>esc</kbd> cerrar</span></p>';
    d.body.append(dlg);
    input = dlg.querySelector('input');
    lista = dlg.querySelector('.busca-lista');
    input.addEventListener('input', pinta);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mueve(activo + (e.key === 'ArrowDown' ? 1 : -1)); }
      if (e.key === 'Enter' && ops[activo]) { e.preventDefault(); ops[activo].click(); }
    });
    lista.addEventListener('pointermove', (e) => { const o = e.target.closest('.busca-op'); if (o && ops.indexOf(o) !== activo) mueve(ops.indexOf(o), false); });
    /* Al elegir, se cierra primero (los enlaces de esta misma página y «Organizar una campaña» siguen su curso) */
    lista.addEventListener('click', (e) => { if (e.target.closest('.busca-op, .busca-enlace')) dlg.close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-busca-cerrar]')) dlg.close(); });
  };
  const abrir = () => {
    if (!dlg) crear();
    if (dlg.open) return;
    input.value = '';
    pinta();
    dlg.showModal();
    input.focus();
    if (!indice) {
      fetch(`assets/campanas/ayuda-indice.json?v=${V}`).then((r) => r.json()).then((x) => { indice = x; pinta(); })
        .catch(() => { lista.innerHTML = '<p class="busca-vacio">No se pudo cargar el buscador. Revisa tu conexión e inténtalo de nuevo.</p>'; });
    }
  };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-busca-abrir]')) { e.preventDefault(); abrir(); } });
  d.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dlg?.open) dlg.close(); else abrir(); }
  });
  /* En Windows y Linux el atajo es Ctrl+K */
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) d.querySelectorAll('.ayu-busca kbd').forEach((k) => { k.textContent = 'Ctrl K'; });
})();

/* Avisos como Sonner (26-11-2026): reemplaza window.SITE.toast en Campañas. Se apilan (los anteriores quedan detrás,
   un poco más arriba y más chicos, y se despliegan al pasar el puntero o con el foco), duran 4 s, se pausan con el
   puntero encima, con el foco o con la pestaña oculta, y se cierran con su botón o deslizándolos. Van en una región
   «polite»; con una ventana abierta, dentro de ella (si no, quedarían tapados). */
(() => {
  const d = document;
  if (!window.SITE) return;
  const VIDA = 4000;
  const MAX = 3;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const region = d.createElement('section');
  region.className = 'avisos';
  region.setAttribute('aria-label', 'Avisos');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-relevant', 'additions text');
  const ol = d.createElement('ol');
  region.append(ol);
  d.body.append(region);
  const X = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const avisos = [];
  const pausado = () => region.matches(':hover, :focus-within') || d.hidden;
  const programa = (a) => { clearTimeout(a.timer); a.timer = 0; if (pausado() || a.fuera) return; a.inicio = Date.now(); a.timer = setTimeout(() => quita(a), a.resta); };
  const pausa = (a) => { if (!a.timer) return; clearTimeout(a.timer); a.timer = 0; a.resta = Math.max(1200, a.resta - (Date.now() - a.inicio)); };
  /* Posiciones: el más nuevo adelante; los demás, apilados (o desplegados con --y, la suma de los altos de los de adelante) */
  const ordena = () => {
    let y = 0;
    [...avisos].reverse().forEach((a, k) => {
      a.li.style.setProperty('--k', k);
      a.li.style.setProperty('--y', `${y}px`);
      a.li.toggleAttribute('data-oculto', k >= MAX);
      y += a.li.offsetHeight + 8;
    });
    region.style.setProperty('--alto', `${Math.max(0, y - 8)}px`);
  };
  const quita = (a, hacia = '') => {
    if (a.fuera) return;
    a.fuera = true;
    clearTimeout(a.timer);
    avisos.splice(avisos.indexOf(a), 1);
    a.li.dataset.sale = hacia;
    setTimeout(() => { a.li.remove(); }, motion.matches ? 220 : 0);
    ordena();
  };
  window.SITE.toast = (texto) => {
    const host = [...d.querySelectorAll('dialog[open]')].pop() || d.body;
    if (region.parentElement !== host) host.append(region);
    const ultimo = avisos[avisos.length - 1];
    if (ultimo && ultimo.texto === texto) { ultimo.resta = VIDA; programa(ultimo); return; }  // el mismo aviso: se renueva
    const li = d.createElement('li');
    li.className = 'aviso';
    li.innerHTML = `<p></p><button type="button" class="aviso-cerrar" aria-label="Cerrar aviso">${X}</button>`;
    li.querySelector('p').textContent = texto;
    ol.append(li);
    const a = { li, texto, resta: VIDA, inicio: Date.now(), timer: 0, fuera: false };
    avisos.push(a);
    ordena();
    requestAnimationFrame(() => requestAnimationFrame(() => { li.dataset.dentro = ''; }));
    programa(a);
    li.querySelector('.aviso-cerrar').addEventListener('click', () => quita(a));
    /* Deslizar para cerrar: hacia abajo o a los lados; hacia arriba se resiste */
    let id = null; let x0 = 0; let y0 = 0; let t0 = 0; let eje = '';
    li.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); eje = '';
      li.setPointerCapture(id);
      li.dataset.arrastre = '';
    });
    li.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - x0; let dy = e.clientY - y0;
      if (!eje && Math.hypot(dx, dy) > 1) eje = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (eje === 'x') dy = 0; else { dx = 0; if (dy < 0) dy /= 1.5 + Math.abs(dy) / 20; }
      li.style.setProperty('--dx', `${dx}px`);
      li.style.setProperty('--dy', `${dy}px`);
    });
    const suelta = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      delete li.dataset.arrastre;
      const dx = parseFloat(li.style.getPropertyValue('--dx')) || 0;
      const dy = parseFloat(li.style.getPropertyValue('--dy')) || 0;
      const v = Math.hypot(dx, dy) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) >= 45 || dy >= 45 || (v > 0.11 && (Math.abs(dx) > 8 || dy > 8))) quita(a, eje === 'x' ? (dx > 0 ? 'derecha' : 'izquierda') : 'abajo');
      else { li.style.removeProperty('--dx'); li.style.removeProperty('--dy'); }
    };
    li.addEventListener('pointerup', suelta);
    li.addEventListener('pointercancel', suelta);
  };
  region.addEventListener('pointerenter', () => avisos.forEach(pausa));
  region.addEventListener('pointerleave', () => avisos.forEach(programa));
  region.addEventListener('focusin', () => avisos.forEach(pausa));
  region.addEventListener('focusout', () => setTimeout(() => avisos.forEach(programa)));
  d.addEventListener('visibilitychange', () => avisos.forEach(d.hidden ? pausa : programa));
})();

/* Preguntas desplegables con dirección propia (26-11-2026): al abrir una, la URL lleva su #id (se puede copiar y
   compartir); al cerrarla, se quita. Si se llega con ese #id, la pregunta se abre y queda a la vista. */
(() => {
  const d = document;
  const todas = [...d.querySelectorAll('.accordion details[id]')];
  if (!todas.length) return;
  todas.forEach((det) => det.addEventListener('toggle', () => {
    if (det.open) history.replaceState(history.state, '', `#${det.id}`);
    else if (location.hash === `#${det.id}`) history.replaceState(history.state, '', location.pathname + location.search);
  }));
  const abre = () => {
    const det = location.hash.length > 1 ? d.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (!det?.matches('.accordion details') || det.open) return;
    det.open = true;
    requestAnimationFrame(() => det.scrollIntoView({ block: 'start' }));
  };
  abre();
  addEventListener('hashchange', abre);
})();

/* ¿Hasta cuándo pedir la autorización? ([data-plazo], «Cómo funciona», 26-11-2026): se elige el primer día de la
   campaña y se cuentan 40 días hábiles hacia atrás, de lunes a viernes (DS 29/2024, art. 24; sin feriados, por eso
   es aproximado y lo dice). El calendario parte en el primer día posible desde hoy. «Organizar esta campaña» abre la
   ficha con ese mes, si está entre los que ofrece. */
(() => {
  const box = document.querySelector('[data-plazo]');
  if (!box) return;
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const larga = (f) => `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  const habiles = (f, n) => { const x = new Date(f); const paso = n < 0 ? -1 : 1; for (let k = 0; k < Math.abs(n);) { x.setDate(x.getDate() + paso); if (x.getDay() % 6) k++; } return x; };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const primero = habiles(hoy, 41);
  const desde = Math.round((primero - hoy) / 864e5);
  const resultado = box.querySelector('[data-plazo-resultado]');
  const estado = box.querySelector('[data-plazo-estado]');
  const ficha = box.querySelector('[data-plazo-ficha]');
  let elegido = '';
  box.querySelector('[data-plazo-elegir]').addEventListener('click', async () => {
    if (!window.Picker) return;
    const v = await window.Picker.dates({ title: '¿Cuándo empieza la campaña?', sub: 'Elige el primer día. Desde hoy, el más cercano posible es el ' + larga(primero) + '.', value: elegido ? [elegido] : [], months: 3, desde, hasta: 420, domingos: true });
    if (!v?.[0]) return;
    elegido = v[0];
    const inicio = new Date(`${elegido}T00:00`);
    const limite = habiles(inicio, -40);
    box.querySelector('[data-plazo-limite]').textContent = `A más tardar el ${larga(limite)}`;
    box.querySelector('[data-plazo-inicio]').textContent = larga(inicio).replace(/^./, (c) => c.toUpperCase());
    const mes = `${MESES[inicio.getMonth()].replace(/^./, (c) => c.toUpperCase())} de ${inicio.getFullYear()}`;
    if ([...document.querySelectorAll('select[name="mes"] option')].some((o) => o.value === mes)) ficha.dataset.set = `mes=${mes}`;
    else delete ficha.dataset.set;
    box.querySelector('[data-plazo-elegir] span').textContent = 'Cambiar la fecha';
    const nuevo = resultado.hidden;
    resultado.hidden = false;
    if (nuevo && matchMedia('(prefers-reduced-motion: no-preference)').matches) resultado.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.23, 1, .32, 1)' });
    estado.textContent = `Presenta la solicitud a más tardar el ${larga(limite)}.`;
  });
})();
