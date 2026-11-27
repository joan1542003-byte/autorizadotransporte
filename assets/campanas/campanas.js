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

/* Ficha visual (27-11-2026): algunas filas se eligen a la vista, sin abrir una ventana ([data-visual] en la fila).
   - fotos:  tarjetas (quién organiza, aparatos, servicios adicionales), con su imagen PNG (data-img en cada <option> o
             data-imgs en la fila) o, mientras no esté, un ícono de línea. Una opción (<select>) o varias (campo oculto
             con data-options).
   - meses:  los doce meses posibles en una sola fila que se desliza (el año aparece donde cambia), «Aún no lo sé» al
             final y, al elegir uno, hasta cuándo pedir la autorización (40 días hábiles antes del día 1; aproximado).
   - chips:  botones en fila (peso estimado).
   El dato vive en el mismo campo de siempre (select o campo oculto) y se avisa con «change»: el resumen, los campos
   condicionales, las preselecciones (data-set, data-add) y la validación siguen igual; si algo cambia el campo desde
   fuera, la ficha se pone al día. «Otro…» abre la ventana de siempre para escribir cuál. Sin JavaScript, la fila sigue
   siendo el botón que abre la ventana. */
(() => {
  const d = document;
  const filas = [...d.querySelectorAll('[data-visual]')];
  if (!filas.length) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = (p) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  /* Íconos de línea (Lucide) mientras no estén los PNG de cada opción */
  const ICONOS = {
    municipal: '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
    empresa: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    sistema: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>',
    Computadores: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    'Pantallas y monitores': '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    'Pequeños aparatos': '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    'Grandes aparatos': '<path d="M3 6h3"/><path d="M17 6h.01"/><rect width="18" height="20" x="3" y="2" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"/>',
    'Retiro domiciliario asistido': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'Área de equipos potencialmente reutilizables': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    otro: '<path d="M5 12h14"/><path d="M12 5v14"/>'
  };
  const CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const otro = (v) => /^Otr[oa]s?\b/.test(v);
  /* Rótulos cortos en las tarjetas (el valor guardado no cambia) */
  const CORTO = {
    'Área de equipos potencialmente reutilizables': 'Equipos reutilizables', 'Retiro domiciliario asistido': 'Retiro domiciliario',
    'Menos de 500 kg': 'Hasta 500 kg', 'Entre 500 kg y 1 tonelada': '500 kg a 1 ton', 'Entre 1 y 3 toneladas': '1 a 3 ton',
    'Entre 3 y 10 toneladas': '3 a 10 ton', 'Más de 10 toneladas': 'Más de 10 ton'
  };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const antesHabiles = (f, n) => { const x = new Date(f); for (let k = 0; k < n;) { x.setDate(x.getDate() - 1); if (x.getDay() % 6) k++; } return x; };

  filas.forEach((row) => {
    const modo = row.dataset.visual;
    const campo = row.querySelector('select, input[type="hidden"]');
    const multi = row.dataset.fila === 'varias';
    if (!campo) return;
    const rotulo = row.querySelector('.pick-label')?.textContent.trim() || row.dataset.title;
    const opcional = /Opcional/.test(row.querySelector('.pick-value')?.dataset.empty || '') || (multi && !row.dataset.requiredPick);
    const imgs = row.dataset.imgs ? row.dataset.imgs.split('|') : [];
    const opciones = multi
      ? row.dataset.options.split('|').map((v, i) => ({ value: v, label: v, img: imgs[i] || '' }))
      : [...campo.options].filter((o) => o.value).map((o) => ({ value: o.value, label: o.textContent.trim(), img: o.dataset.img || '' }));
    const caja = d.createElement('div');
    caja.className = `vis vis-modo-${modo}`;
    caja.setAttribute('role', multi ? 'group' : 'radiogroup');
    caja.setAttribute('aria-label', rotulo);
    const rol = multi ? 'aria-pressed' : 'role="radio" aria-checked';
    /* El texto del título ya está en el aria-label del grupo; la ayuda «?», si la hay, sí debe quedar accesible */
    let html = `<p class="vis-titulo"><span aria-hidden="true">${esc(rotulo)}</span>${opcional ? '<span class="vis-opcional" aria-hidden="true">opcional</span>' : ''}</p>`;
    if (modo === 'meses') {
      let anio = '';
      html += `<div class="vis-meses">${opciones.map((o) => {
        if (o.value === 'Aún no lo sé') return '';
        const [mes, , y] = o.value.split(' ');
        const cambia = y !== anio; anio = y;
        return `${cambia ? `<span class="vis-anio" aria-hidden="true">${esc(y)}</span>` : ''}<button type="button" class="vis-op vis-mes" ${rol}="false" data-v="${esc(o.value)}" aria-label="${esc(o.value)}">${esc(mes.slice(0, 3))}</button>`;
      }).join('')}<button type="button" class="vis-op vis-mes vis-nose" ${rol}="false" data-v="Aún no lo sé">Aún no lo sé</button></div>`
        + '<p class="vis-plazo" data-vis-plazo hidden></p>';
    } else if (modo === 'chips') {
      html += `<div class="vis-chips">${opciones.map((o) => `<button type="button" class="vis-op vis-chip" ${rol}="false" data-v="${esc(o.value)}"${CORTO[o.label] ? ` aria-label="${esc(o.label)}"` : ''}>${esc(CORTO[o.label] || o.label)}</button>`).join('')}</div>`;
    } else {
      html += `<div class="vis-fotos">${opciones.map((o, i) => `<button type="button" class="vis-op vis-foto" ${rol}="false" data-v="${esc(o.value)}" style="--i:${i}">`
        + `<span class="vis-icono">${o.img ? `<img src="${esc(o.img)}" width="40" height="40" alt="" loading="lazy" decoding="async">` : svg(ICONOS[otro(o.value) ? 'otro' : o.value] || ICONOS.otro)}</span>`
        + `<span class="vis-foto-t">${esc(CORTO[o.label] || o.label)}</span><span class="vis-check" aria-hidden="true">${CHECK}</span></button>`).join('')}</div>`;
    }
    caja.innerHTML = html;
    row.prepend(caja);
    row.classList.add('es-visual');
    const ayuda = row.querySelector(':scope > .pick-ayuda');
    if (ayuda) caja.querySelector('.vis-titulo').append(ayuda);
    const botones = [...caja.querySelectorAll('.vis-op')];

    const lista = () => (campo.value ? campo.value.split(', ').filter(Boolean) : []);
    const pinta = () => {
      const valores = multi ? lista() : [campo.value];
      botones.forEach((b) => {
        const v = b.dataset.v;
        const on = multi ? valores.some((x) => x === v || (otro(v) && otro(x))) : valores[0] === v;
        b.setAttribute(multi ? 'aria-pressed' : 'aria-checked', String(on));
        if (!multi) b.tabIndex = on || (!campo.value && b === botones[0]) ? 0 : -1;
      });
      const plazo = caja.querySelector('[data-vis-plazo]');
      if (plazo) {
        const m = /^(\w+) de (\d{4})$/.exec(campo.value);
        const i = m ? MESES.indexOf(m[1].toLowerCase()) : -1;
        plazo.hidden = i < 0;
        if (i >= 0) {
          const lim = antesHabiles(new Date(Number(m[2]), i, 1), 40);
          plazo.textContent = `Pide la autorización sanitaria antes del ${DIAS[lim.getDay()]} ${lim.getDate()} de ${MESES[lim.getMonth()]}.`;
        }
        /* El mes elegido queda a la vista en la fila */
        const sel = caja.querySelector('.vis-mes[aria-checked="true"]');
        if (sel) { const f = sel.parentElement; const x = sel.offsetLeft - (f.clientWidth - sel.offsetWidth) / 2; f.scrollTo({ left: Math.max(0, x), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
      }
    };
    const guarda = (valor) => {
      campo.value = valor;
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    };
    caja.addEventListener('click', (e) => {
      const b = e.target.closest('.vis-op');
      if (!b) return;
      const v = b.dataset.v;
      if (otro(v) && multi && b.getAttribute('aria-pressed') !== 'true') { row.querySelector('.pick-btn')?.click(); return; }
      if (multi) {
        const l = lista();
        const ya = l.findIndex((x) => x === v || (otro(v) && otro(x)));
        if (ya >= 0) l.splice(ya, 1); else l.push(v);
        const orden = opciones.map((o) => o.value);
        const pos = (x) => orden.indexOf(otro(x) ? orden.find(otro) : x);
        l.sort((x, y) => pos(x) - pos(y));
        guarda(l.join(', '));
      } else guarda(campo.value === v && row.dataset.fila !== 'opciones' ? '' : v);
      row.removeAttribute('data-invalid');
    });
    /* Una opción: flechas para moverse, como un grupo de radios */
    if (!multi) caja.addEventListener('keydown', (e) => {
      const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!paso) return;
      const i = botones.indexOf(d.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const b = botones[(i + paso + botones.length) % botones.length];
      b.focus();
      b.click();
    });
    campo.addEventListener('change', pinta);
    d.addEventListener('change', (e) => { if (e.target === campo) pinta(); });
    pinta();
  });
})();

/* Checklists en la ficha: si en este dispositivo se respondió alguno (checklist.js deja un resumen por etapa en
   cr-res-<etapa>), sus respuestas van solas en la ficha, sin opción a la vista: cada etapa en su campo oculto, que se
   llena justo antes de armar el resumen y llega a WhatsApp: cuántas respondió y, textuales, las preguntas que quedaron
   en No o No sé. */
(() => {
  document.querySelectorAll('[data-ck-adjunto]').forEach((box) => {
    const campos = [...box.querySelectorAll('input[data-ck]')];
    const NOMBRE = { no: 'No', nose: 'No sé' };
    const leer = (k) => { try { return JSON.parse(localStorage.getItem(`cr-res-${k}`) || 'null'); } catch { return null; } };
    const texto = (r) => (r.pend.length
      ? `${r.hechas} de ${r.total} respondidas; pendientes: ${r.pend.map((x) => `${x.texto} (${NOMBRE[x.resp] || x.resp})`).join('; ')}`
      : `${r.hechas} de ${r.total} respondidas, todas en Sí`);
    const pinta = () => {
      const hay = campos.map((c) => [c, leer(c.dataset.ck)]).filter(([, r]) => r?.hechas);
      campos.forEach((c) => { const r = hay.find(([x]) => x === c)?.[1]; c.value = r ? texto(r) : ''; });
    };
    pinta();
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
      if (!on) corta();
      gracias.hidden = !on;
      debajo.forEach((el) => { el.inert = on; });
      if (on) gracias.querySelector('.ficha-enviada-titulo').focus({ preventScroll: true });
    };
    btnFotos?.addEventListener('click', async () => {
      try { await navigator.share({ files: fotos() }); } catch (err) { if (err.name !== 'AbortError') window.SITE?.toast?.('No se pudo abrir el menú para compartir: adjunta las fotos en el chat.'); }
    });
    /* Onda al enviar (27-11-2026; inspirada en «Distortion waves», sin React ni WebGL): un frente de color se abre desde
       el botón que se presionó y lleva el resumen al agradecimiento. El agradecimiento se revela dentro del círculo
       (clip-path) y, justo detrás del borde, una banda de color con lente (backdrop-filter) deforma lo que pasa. La
       avanza requestAnimationFrame con pasos de hasta 34 ms: si WhatsApp se abre en otra pestaña, la onda espera y
       sigue donde iba al volver. Sin movimiento (prefers-reduced-motion), el agradecimiento aparece como antes. */
    let ondaViva = null;
    const corta = () => { if (ondaViva) { ondaViva(); ondaViva = null; } };
    const onda = (btn) => {
      corta();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const caja = resumen.getBoundingClientRect(); const b = btn.getBoundingClientRect();
      if (!caja.width || !b.width) return;
      const ox = b.left + b.width / 2 - caja.left; const oy = b.top + b.height / 2 - caja.top;
      const rmax = Math.hypot(Math.max(ox, caja.width - ox), Math.max(oy, caja.height - oy)) + 64;
      const capa = document.createElement('div');
      capa.className = 'onda'; capa.setAttribute('aria-hidden', 'true');
      resumen.append(capa);
      [gracias, capa].forEach((el) => { el.style.setProperty('--ox', `${ox}px`); el.style.setProperty('--oy', `${oy}px`); el.style.setProperty('--r', '0px'); });
      gracias.dataset.onda = '';
      const DUR = 760; let p = 0; let antes = null; let id = 0;
      const fin = () => { cancelAnimationFrame(id); delete gracias.dataset.onda; gracias.style.removeProperty('--r'); capa.remove(); };
      const paso = (t) => {
        if (antes !== null) p = Math.min(1, p + Math.min(t - antes, 34) / DUR);
        antes = t;
        const r = `${(1 - (1 - p) ** 3) * rmax}px`;
        gracias.style.setProperty('--r', r); capa.style.setProperty('--r', r);
        capa.style.opacity = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.45);
        if (p < 1) id = requestAnimationFrame(paso); else { fin(); ondaViva = null; }
      };
      id = requestAnimationFrame(paso);
      ondaViva = fin;
    };
    resumen.querySelector('[data-send]')?.addEventListener('click', (e) => { muestra(true); onda(e.currentTarget); });
    gracias.querySelector('[data-ver-resumen]').addEventListener('click', () => {
      muestra(false);
      resumen.querySelector('[data-send]')?.focus({ preventScroll: true });
    });
    gracias.querySelector('[data-hero-close]').addEventListener('click', () => setTimeout(() => muestra(false), 400));
    /* La animación (222 KB) se pide al preparar la ficha, no al cargar la página: así ya está al presionar «Enviar» */
    form?.addEventListener('submit', () => { muestra(false); gracias.querySelector('img').loading = 'eager'; });
  });
})();

/* Ficha en el teléfono: con el teclado abierto, el campo activo queda al centro de la lista de campos (no al borde,
   donde lo dejaba «nearest»). Se espera a que el teclado termine de abrirse (Safari no avisa): al enfocar y al cambiar
   el área visible. Solo se desplaza la lista, no la página. */
(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  let espera = 0;
  const centrar = () => {
    const el = document.activeElement;
    const lista = el?.closest?.('.hero-sheet .hcard-body');
    if (!lista || !el.matches('input, textarea')) return;
    const r = el.getBoundingClientRect(); const c = lista.getBoundingClientRect();
    lista.scrollTo({ top: Math.max(0, lista.scrollTop + (r.top - c.top) - (c.height - r.height) / 2), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const luego = (ms) => { clearTimeout(espera); espera = setTimeout(() => requestAnimationFrame(centrar), ms); };
  document.addEventListener('focusin', (e) => { if (e.target.closest?.('.hero-sheet')) luego(340); });
  vv.addEventListener('resize', () => luego(140));
})();

/* En iPhone, :active (el hundirse al tocar) solo se activa si la página escucha el toque */
document.addEventListener('touchstart', () => {}, { passive: true });

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

/* Buscador de la ayuda, como cmdk (26-11-2026): ⌘K o Ctrl+K, la lupa de la cabecera o «Buscar…» en el panel «Ayuda».
   Busca en guías, checklists (cada pregunta), preguntas frecuentes, artículos de las normas y medidas de aparatos. El
   índice lo arma tools/ayuda.py (assets/campanas/ayuda-indice.json) y se descarga la primera vez que se abre.
   Sin texto recomienda: tu avance en los checklists, lo más buscado y tus búsquedas recientes (solo en este
   dispositivo). Con texto, algunas búsquedas traen una respuesta rápida arriba (plazo con su línea de tiempo, medida
   de un aparato contra el límite de 50 cm, avance de los checklists, pilas, costo, retiro domiciliario) y sus acciones
   quedan primero en la lista: Enter hace la principal. Flechas para moverse, Enter para abrir, Esc para cerrar. */
(() => {
  const d = document;
  /* Servicios apagados desde el panel de WordPress (plugin campanas-sitio: <html data-cr-off="retiro plazo …">): el
     buscador no los sugiere; sin buscador, no se arma */
  const OFF = new Set((d.documentElement.dataset.crOff || '').split(/\s+/).filter(Boolean));
  if (OFF.has('buscador')) return;
  const RUTA_OFF = { retiro: /#ad-retiro|retiro-domiciliario/, reutilizacion: /#ad-reutilizacion/, plazo: /#plazo$/, aparatos: /^\.\/#aparatos$/,
    transporte: /transporteautorizado\.cl/, hds: /hds\.cl/ };
  if (OFF.has('retiro') && OFF.has('reutilizacion')) RUTA_OFF.adicionales = /#adicionales/;
  if (OFF.has('municipal') && OFF.has('empresa') && OFF.has('sistema')) RUTA_OFF.publicos = /#publicos/;
  const apagado = (x) => Object.entries(RUTA_OFF).some(([k, re]) => (OFF.has(k) || k === 'adicionales' || k === 'publicos') && re.test(x.u || x.id || ''));
  const V = (d.currentScript?.src.match(/\?v=(\w+)/) || [])[1] || '1';
  const GRUPOS = ['Acciones', 'Guías', 'Checklists', 'Preguntas', 'Aparatos', 'Tamaños', 'Normativa', 'Portada'];
  /* Cómo lo dice la gente → cómo está escrito en el sitio (sin tildes, en minúscula) */
  const SINONIMOS = {
    tele: ['televisor'], tv: ['televisor'], refri: ['refrigerador'], nevera: ['refrigerador'], frigobar: ['refrigerador'], heladera: ['refrigerador'],
    pc: ['computador'], compu: ['computador'], laptop: ['notebook'], portatil: ['notebook'], celu: ['celular'], telefono: ['celular'], movil: ['celular'],
    bateria: ['pila'], precio: ['cuesta', 'cotiza'], costo: ['cuesta', 'cotiza'], valor: ['cuesta', 'cotiza'], cotizar: ['cotiza', 'ficha'],
    permiso: ['autorizacion'], salud: ['seremi'], fecha: ['plazo', 'dias habiles'], cuando: ['plazo', 'anticipacion'], demora: ['plazo'],
    medida: ['tamano', 'cm'], tamano: ['medida', 'cm'], chico: ['pequeno'], grande: ['grandes'], reporte: ['retc'], reportar: ['retc'],
    municipio: ['municipalidad'], muni: ['municipalidad'], rep: ['20.920', 'ley'], decreto: ['ds'], basura: ['raee', 'residuo'],
    chatarra: ['raee'], electrodomestico: ['aparato'], reciclaje: ['recoleccion', 'reciclaje'], domicilio: ['domiciliario'], casa: ['domiciliario'],
    lavarropa: ['lavadora'], micro: ['microondas'], monitor: ['pantalla', 'monitor'], avance: ['checklist'], progreso: ['checklist']
  };
  /* Lo más buscado (botones de la recomendación inicial) */
  const FRECUENTES = ['plazo', 'autorización', 'pilas', 'microondas', 'refrigerador', 'costo', 'retiro domiciliario', 'RETC'];
  /* Respuestas rápidas: palabras (en sus formas) que las activan */
  const INTENCION = {
    plazo: ['plazo', 'anticipacion', 'dias habiles', 'demora', 'antelacion', 'cuanto tiempo'],
    avance: ['checklist', 'avance', 'progreso', 'mis respuestas'],
    pilas: ['pila'],
    costo: ['cuesta', 'cotiza', 'gratis', 'cobran', 'presupuesto', 'tarifa'],
    domicilio: ['domiciliario']
  };
  const FAQ = { pilas: 'p-se-reciben-pilas-y-baterias-sueltas', costo: 'p-cuanto-cuesta-organizar-una-campana', domicilio: 'p-como-funciona-el-retiro-domiciliario-asistido' };
  const FOTO = { pilas: ['assets/campanas/guias/pilas-baterias-720.webp', 'Pila de 9 V, pilas AA y AAA y una batería recargable', 480],
    domicilio: ['assets/campanas/raee-retiro-domiciliario-720.webp', '', 540] };
  const RECIENTES = 'cr-busquedas';
  const SIN_AVANCE = 'cr-busca-sin-avance';
  /* Atajos: lo que alguien puede escribir (sin tildes, en minúscula) y adónde lo lleva el buscador, primero en la lista.
     Una clave de varias palabras se busca en la frase; una de una palabra, también mientras se escribe (trans → transporte). */
  const ATAJOS = [
    { t: 'Transporte Autorizado', s: 'Retiro de residuos peligrosos y no peligrosos · otro sitio', u: 'https://transporteautorizado.cl', ext: 1,
      q: ['transporte', 'transportista', 'transporte autorizado', 'retiro de residuos', 'residuos peligrosos', 'residuos no peligrosos', 'residuos industriales', 'camion', 'flete', 'gestor', 'sidrep', 'peligroso', 'respel'] },
    { t: 'HDS: hojas de seguridad', s: 'Hojas de seguridad y evaluación documental de residuos · otro sitio', u: 'https://hds.cl', ext: 1,
      q: ['hds', 'hdsr', 'hoja de seguridad', 'hojas de seguridad', 'hoja de datos', 'msds', 'sds', 'ficha de seguridad', 'evaluacion documental'] },
    { t: 'Escribir por WhatsApp', s: 'Conversa con nosotros: +56 9 8606 7930', a: 'conversar',
      q: ['whatsapp', 'wsp', 'wasap', 'whats', 'telefono', 'llamar', 'contacto', 'contactar', 'hablar', 'asesor', 'ejecutivo', 'numero', 'correo', 'mail', 'email'] },
    { t: 'Organizar una campaña', s: 'Abre la ficha preliminar para cotizar la campaña', a: 'contacto',
      q: ['cotizar', 'cotizacion', 'presupuesto', 'contratar', 'organizar', 'solicitar', 'formulario', 'ficha', 'agendar', 'reservar', 'quiero una campana'] },
    { t: '¿Hasta cuándo pedir la autorización?', s: 'Calcula la fecha límite para presentar la solicitud', u: './#plazo',
      q: ['calcular', 'calculadora', 'calendario', 'fecha limite', 'cuando presentar', 'cuanto antes', 'anticipacion', 'dias habiles'] },
    { t: 'Autorización sanitaria', s: 'Quién la pide, ante quién, con cuánta anticipación y qué incluye', u: 'autorizacion-sanitaria.html',
      q: ['seremi', 'autorizacion', 'permiso', 'resolucion', 'sanitaria', 'tramite', 'solicitud sanitaria'] },
    { t: 'Paso a paso de una campaña', s: 'Las cuatro etapas: planificación, autorización, ejecución y cierre', u: 'paso-a-paso.html',
      q: ['paso a paso', 'etapas', 'como funciona', 'proceso', 'guia', 'pasos', 'como se hace', 'como organizar'] },
    { t: 'Checklists por etapa', s: 'Responde Sí, No o No sé y te decimos qué hacer', u: 'checklist-planificacion.html',
      q: ['checklist', 'lista de verificacion', 'chequeo', 'verificar', 'pendientes', 'revisar'] },
    { t: 'Tamaño de los aparatos', s: 'Qué es un aparato pequeño o grande, con medidas de referencia', u: 'tamano-de-los-aparatos.html',
      q: ['medida', 'medidas', 'tamano', 'dimension', 'pequeno', 'grande', 'cm', 'centimetros', '50 cm'] },
    { t: 'Aparatos que se reciben', s: 'Fotos por tipo, con su grupo y medida típica', u: './#aparatos',
      q: ['que reciben', 'que se recibe', 'aparatos', 'electrodomesticos', 'electronicos', 'raee', 'reciben', 'aceptan', 'linea blanca', 'computadores'] },
    { t: 'Retiro domiciliario asistido', s: 'Para quienes no pueden llevar sus aparatos al punto', u: './#ad-retiro',
      q: ['domicilio', 'domiciliario', 'retiro en casa', 'a domicilio', 'adulto mayor', 'movilidad reducida', 'retirar en casa'] },
    { t: 'Área de equipos reutilizables', s: 'Equipos completos que podrían tener una segunda vida', u: './#ad-reutilizacion',
      q: ['reutilizar', 'reutilizacion', 'reutilizable', 'donar', 'donacion', 'segunda vida', 'reparar', 'reacondicionar'] },
    { t: 'Para quién es cada campaña', s: 'Municipalidades, empresas y sistemas de gestión', u: './#publicos',
      q: ['municipalidad', 'municipio', 'muni', 'empresa', 'sistema de gestion', 'colegio', 'universidad', 'condominio', 'institucion', 'gransic'] },
    { t: 'Normativa', s: 'DS 29/2024 Minsal, DS 22/2025 MMA y Ley REP 20.920, en simple', u: 'normativa.html',
      q: ['ley', 'decreto', 'norma', 'normativa', 'reglamento', 'ds 29', 'ds 22', 'ley rep', '20920', '20.920', 'minsal', 'mma', 'legal'] },
    { t: 'Checklist de cierre y reporte', s: 'Respaldos, reporte en el RETC y destino de lo recibido', u: 'checklist-cierre-reporte.html',
      q: ['retc', 'reporte', 'reportar', 'declarar', 'ventanilla unica', 'informe final', 'certificado', 'trazabilidad'] },
    { t: 'Preguntas frecuentes', s: 'Todas las preguntas sobre las campañas', u: 'preguntas.html',
      q: ['preguntas', 'faq', 'dudas', 'ayuda', 'consultas'] },
    { t: 'Créditos', s: 'Tipografías, íconos, mapa e imágenes del sitio', u: 'creditos.html', q: ['creditos', 'licencias', 'tipografia'] }
  ];
  const atajos = (q) => {
    const frase = ` ${q} `;
    if (!atajos.listos) { atajos.listos = ATAJOS.filter((x) => !apagado(x)); }
    const palabras = q.split(/\s+/).filter((p) => p.length >= 3);
    return atajos.listos.filter((x) => x.q.some((k) => (k.includes(' ') ? frase.includes(` ${k}`) : palabras.some((p) => p === k || (p.length >= 4 && k.startsWith(p)) || (k.length >= 4 && p.startsWith(k)))))).slice(0, 3);
  };
  /* Errores de tipeo: si una palabra no aparece en el índice, se cambia por la más parecida (una letra de diferencia; dos
     en palabras largas) */
  let vocab = null;
  const distancia = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const f = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = f[0]; f[0] = i;
      for (let j = 1; j <= b.length; j++) { const t = f[j]; f[j] = Math.min(f[j] + 1, f[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return f[b.length];
  };
  const corrige = (palabras) => {
    if (!vocab) vocab = [...new Set(indice.flatMap((x) => fold(`${x.t} ${x.s || ''}`).split(/[^a-z0-9ñ.]+/)).filter((w) => w.length >= 4))];
    let cambio = false;
    const nuevas = palabras.map((p) => {
      if (p.length < 4 || vocab.some((w) => w.includes(p)) || formas(p).some((f) => vocab.some((w) => w.includes(f)))) return p;
      const max = p.length >= 8 ? 2 : 1;
      let mejor = null; let d = 9;
      vocab.forEach((w) => { const x = distancia(p, w); if (x < d) { d = x; mejor = w; } });
      if (mejor && d <= max) { cambio = true; return mejor; }
      return p;
    });
    return cambio ? nuevas : null;
  };
  const formas = (p) => {
    const base = p.length > 4 && p.endsWith('es') ? p.slice(0, -2) : p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p;
    return [...new Set([p, base, ...(SINONIMOS[p] || []), ...(SINONIMOS[base] || [])])];
  };
  const LUPA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';
  const FUERA = '<svg class="busca-op-fuera" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  const RELOJ = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
  const fold = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch { return def; } };
  let dlg = null; let input = null; let cuerpo = null; let extra = null; let lista = null; let indice = null; let ops = []; let activo = -1;
  /* La respuesta se vuelve a dibujar (y a animar) solo cuando cambia, no a cada tecla */
  let previa = null;
  const ponExtra = (html) => { if (html !== previa) { extra.innerHTML = html; previa = html; } };

  /* Fechas (como el cálculo de «¿Hasta cuándo pedir la autorización?»: días hábiles de lunes a viernes, sin feriados) */
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const habiles = (f, n) => { const x = new Date(f); for (let k = 0; k < n;) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) k++; } return x; };
  const larga = (f) => `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  const corta = (f) => `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)}.`;

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
  const avance = () => indice.filter((x) => x.ck).map((x) => ({ ...x, r: leer(`cr-res-${x.ck}`, null) }));
  const busca = (q, corregida) => {
    const palabras = fold(q).split(/\s+/).filter(Boolean);
    if (!indice || !palabras.length) return { palabras, variantes: [], filas: [] };
    if (!corregida) {
      const r = busca(q, true);
      if (r.filas.length) return r;
      const otra = corrige(palabras);
      if (otra) { const r2 = busca(otra.join(' '), true); if (r2.filas.length) return { ...r2, corregido: otra.join(' ') }; }
      return r;
    }
    const variantes = palabras.map(formas);
    const filas = indice.map((x, i) => {
      const t = x.ft || (x.ft = fold(x.t));
      const todo = x.fa || (x.fa = `${t} ${fold(x.s || '')} ${fold(x.k || '')}`);
      if (!variantes.every((v) => v.some((f) => todo.includes(f)))) return null;
      const enTitulo = variantes.filter((v) => v.some((f) => t.includes(f))).length;
      const puntos = (variantes[0].some((f) => t.startsWith(f)) ? 0 : enTitulo === variantes.length ? 1 : enTitulo ? 2 : 3) + i / 1e4;
      return { ...x, puntos, enTitulo };
    }).filter(Boolean).sort((a, b) => a.puntos - b.puntos);
    const nombrados = new Set(filas.filter((x) => x.enTitulo && (x.g === 'Aparatos' || x.g === 'Tamaños')).map((x) => x.g));
    const porGrupo = {};
    return { palabras, variantes, filas: filas.filter((x) => !(nombrados.has(x.g) && !x.enTitulo)).filter((x) => (porGrupo[x.g] = (porGrupo[x.g] || 0) + 1) <= 6).slice(0, 24) };
  };

  /* ---------- Respuestas rápidas: { html de la tarjeta, título del grupo de acciones, acciones } ---------- */
  const tarjeta = (clase, etiqueta, html) => `<section class="busca-resp ${clase}" aria-label="${esc(etiqueta)}">${html}</section>`;
  const barras = (lista) => `<ol class="busca-avance">${lista.map((x) => {
    const h = x.r?.hechas || 0; const pend = x.r?.pend?.length || 0;
    const txt = !h ? 'Sin respuestas' : `${h} de ${x.tot}${pend ? ` · ${pend} por resolver` : ''}`;
    return `<li style="--n:${x.e}"><span class="busca-avance-n">${x.e}. ${esc(x.n)}</span><span class="busca-avance-barra" role="img" aria-label="${h} de ${x.tot} preguntas respondidas${pend ? `, ${pend} con No o No sé` : ''}"><span class="busca-avance-relleno"><i style="--p:${(100 * (h - pend)) / x.tot}%"></i><i class="is-pend" style="--p:${(100 * pend) / x.tot}%"></i></span></span><small>${txt}</small></li>`;
  }).join('')}</ol>`;
  const siguienteCk = (lista) => lista.find((x) => x.r?.hechas && x.r.hechas < x.tot) || lista.find((x) => !x.r?.hechas) || lista[0];
  const respuestas = {
    plazo: (guia) => {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const inicio = habiles(hoy, 41);
      return {
        html: tarjeta('is-plazo', 'Respuesta rápida: plazo de la autorización',
          '<p class="busca-resp-t">La autorización sanitaria se pide al menos 40 días hábiles antes</p>'
          + `<p class="busca-resp-s">Si presentas la solicitud ahora, la campaña podría empezar desde el <strong>${larga(inicio)}</strong>.</p>`
          + '<div class="busca-linea" role="img" aria-label="Línea de tiempo: hoy presentas la solicitud; la SEREMI tiene hasta 30 días hábiles para revisarla; quedan 10 días hábiles de margen antes del inicio.">'
          + '<div class="busca-linea-barra"><i class="is-rev"></i><i class="is-margen"></i></div>'
          + `<ol class="busca-linea-hitos" aria-hidden="true"><li><strong>Hoy</strong><small>Presentas</small></li><li><strong>Hasta 30 días hábiles</strong><small>Revisión de la SEREMI</small></li><li><strong>${corta(inicio)}</strong><small>Inicio posible</small></li></ol></div>`
          + '<p class="busca-resp-nota">Aproximado: cuenta de lunes a viernes, sin feriados. Si hay observaciones, se responden en 5 días hábiles y la SEREMI tiene otros 30: conviene presentarla antes.</p>'),
        titulo: 'Plazo de la autorización',
        acciones: [...(guia ? [indice.find((x) => x.u === 'autorizacion-sanitaria.html')].filter(Boolean) : []),
          ...(OFF.has('plazo') ? [] : [{ t: 'Calcular la fecha para mi campaña', s: 'Elige el día de inicio y te decimos hasta cuándo presentar la solicitud', u: './#plazo' }]),
          ...(guia ? [] : [{ t: 'Plazos de la revisión', s: 'Autorización sanitaria, paso a paso', u: 'autorizacion-sanitaria.html#h-plazos' }])]
      };
    },
    avance: () => {
      const l = avance();
      const sig = siguienteCk(l);
      const alguna = l.some((x) => x.r?.hechas);
      return {
        html: tarjeta('is-avance', 'Tu avance en los checklists', `<div class="busca-resp-cabeza"><p class="busca-resp-t">${alguna ? 'Tu avance en los checklists' : 'Cuatro checklists, uno por etapa'}</p>`
          + (alguna ? `<button type="button" class="busca-resp-ocultar" data-busca-avance="${leer(SIN_AVANCE, 0) ? 'mostrar' : 'ocultar'}">${leer(SIN_AVANCE, 0) ? 'Mostrar al abrir' : 'Ocultar'}</button>` : '') + `</div>${barras(l)}`
          + `<p class="busca-resp-nota">${alguna ? 'Tus respuestas quedan en este dispositivo.' : 'Responde Sí, No o No sé y te decimos qué hacer en cada caso.'}</p>`),
        titulo: 'Tu avance',
        acciones: [{ t: `${sig.r?.hechas ? 'Seguir con' : 'Empezar'} el checklist de ${sig.n.toLowerCase()}`, s: `Etapa ${sig.e} de 4`, u: sig.u, i: sig.i }]
      };
    },
    faq: (clave) => {
      const p = indice.find((x) => x.id === FAQ[clave]);
      if (!p) return null;
      const [src, alt, alto] = FOTO[clave] || [];
      return {
        html: tarjeta(`is-faq${src ? ' con-foto' : ''}`, `Respuesta rápida: ${p.t}`,
          (src ? `<img class="busca-resp-foto" src="${src}" width="720" height="${alto}" alt="${esc(alt)}" decoding="async">` : '')
          + `<div><p class="busca-resp-t">${esc(p.t)}</p><p class="busca-resp-s">${esc(p.r)}</p></div>`),
        titulo: 'Respuesta',
        acciones: [...(clave === 'costo' || clave === 'domicilio' ? [{ t: 'Cotizar mi campaña', s: 'Abre la ficha preliminar; la cotización llega después de revisarla', a: 'contacto' }] : []),
          { t: 'Leer la respuesta completa', s: 'Preguntas frecuentes', u: p.u }]
      };
    },
    aparato: (x) => {
      const [a, b] = x.cm; const MAX = 200;
      const izq = (100 * a) / MAX; const ancho = Math.max(2, (100 * (b - a)) / MAX);
      const supera = a > 50; const cruza = a <= 50 && b > 50;
      const lectura = `Mide ${a === b ? `unos ${a}` : `entre ${a} y ${b}`} cm; ${supera ? 'supera' : cruza ? 'puede superar' : 'no supera'} el límite de 50 cm de los pequeños aparatos.`;
      return {
        html: tarjeta('is-aparato', `Medida típica: ${x.t}`,
          `<img class="busca-resp-foto" src="${x.f}" width="400" height="400" alt="" decoding="async">`
          + `<div><p class="busca-resp-t">${esc(x.t)}</p><p class="busca-resp-s">${esc(x.med)} · <strong>${esc(x.gr)}</strong></p>`
          + `<div class="busca-regla" aria-hidden="true"><span class="busca-regla-limite" style="left:25%"><small>50 cm</small></span>`
          + `<span class="busca-regla-rango${supera || cruza ? ' is-sobre' : ''}" style="left:${izq}%;width:${ancho}%"></span></div>`
          + '<p class="busca-regla-escala" aria-hidden="true"><span>0</span><span>50</span><span>100</span><span>150</span><span>200 cm</span></p>'
          + `<p class="busca-resp-nota">${lectura}</p></div>`),
        titulo: x.t,
        acciones: [{ t: `Incluir «${x.gr}» en la ficha`, s: 'Lo suma a los aparatos de tu ficha, sin borrar lo que ya elegiste', a: 'contacto', add: `aparatos=${x.gr}`, i: x.i },
          { t: 'Ver la tabla de medidas', s: 'Tamaño de los aparatos', u: x.u }]
      };
    }
  };
  /* De lo más específico a lo más general: un aparato nombrado, una pregunta frecuente, el avance y, al final, el plazo */
  const intencion = (variantes, filas) => {
    const todas = variantes.flat();
    const frase = fold(input.value);
    const hay = (lista) => lista.some((w) => (w.includes(' ') ? frase.includes(w) : todas.some((f) => f.startsWith(w))));
    const ap = filas.find((x) => x.g === 'Tamaños' && x.enTitulo);
    if (ap) return respuestas.aparato(ap);
    for (const k of ['pilas', 'domicilio', 'costo']) if (!(k === 'domicilio' && OFF.has('retiro')) && hay(INTENCION[k])) return respuestas.faq(k);
    if (hay(INTENCION.avance)) return respuestas.avance();
    if (hay(INTENCION.plazo)) return respuestas.plazo(false);
    if (hay(['autorizacion', 'seremi'])) return respuestas.plazo(true);
    return null;
  };

  /* ---------- Recomendaciones sin texto ---------- */
  const chips = (titulo, valores, borrar) => (valores.length
    ? `<div class="busca-chips" role="group" aria-label="${titulo}"><p class="busca-chips-t">${titulo}${borrar ? '<button type="button" class="busca-chips-borrar" data-busca-borrar>Borrar</button>' : ''}</p>`
      + `${valores.map((v) => `<button type="button" class="busca-chip" data-busca-q="${esc(v)}">${borrar ? RELOJ : ''}${esc(v)}</button>`).join('')}</div>` : '');
  const sugerencias = () => {
    const l = avance();
    const pick = (g, n) => indice.filter((x) => x.g === g && !/#/.test(x.u || '')).slice(0, n);
    const filas = [...pick('Acciones', 1), indice.find((x) => x.u === './#plazo'), ...pick('Guías', 3), ...pick('Checklists', 4)].filter(Boolean);
    return {
      html: (l.some((x) => x.r?.hechas) && !leer(SIN_AVANCE, 0) ? respuestas.avance().html : '')
        + chips('Búsquedas recientes', leer(RECIENTES, []), true) + chips('Lo más buscado', FRECUENTES.filter((f) => !(f === 'retiro domiciliario' && OFF.has('retiro')))),
      filas
    };
  };

  const mueve = (i, ver = true) => {
    if (!ops.length) { activo = -1; input.removeAttribute('aria-activedescendant'); return; }
    activo = (i + ops.length) % ops.length;
    ops.forEach((o, k) => o.setAttribute('aria-selected', String(k === activo)));
    input.setAttribute('aria-activedescendant', ops[activo].id);
    if (ver) ops[activo].scrollIntoView({ block: 'nearest' });
  };
  const opcion = (x, palabras, n) => {
    const r = x.ck ? leer(`cr-res-${x.ck}`, null) : null;
    const s = r?.hechas && !x.u.includes('#') ? `${r.hechas} de ${r.total} respondidas · ${x.s}` : x.s;
    const cont = `${x.i ? `<img class="busca-op-foto" src="${esc(x.i)}" width="40" height="40" alt="" loading="lazy" decoding="async">` : ''}<span class="busca-op-txt"><span class="busca-op-t">${marca(x.t, palabras)}</span>${s ? `<small>${marca(s, palabras)}</small>` : ''}</span>`;
    const cl = `busca-op${x.i ? ' con-foto' : ''}`;
    return x.a ? `<button type="button" class="${cl}" role="option" id="busca-op-${n}" data-dock-open="${x.a}"${x.add ? ` data-add="${esc(x.add)}"` : ''}>${cont}</button>`
      : `<a class="${cl}${x.ext ? ' is-externo' : ''}" role="option" id="busca-op-${n}" href="${esc(x.u)}"${x.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${cont}${x.ext ? `${FUERA}<span class="sr-only"> (se abre en otra pestaña)</span>` : ''}</a>`;
  };
  const pinta = () => {
    if (!indice) { ponExtra(''); lista.innerHTML = '<p class="busca-vacio">Cargando…</p>'; ops = []; return; }
    const q = input.value.trim();
    let { palabras, variantes, filas, corregido } = busca(q);
    let html = ''; let grupos = [];
    if (!palabras.length) {
      const s = sugerencias();
      html = s.html; grupos = [['Sugerencias', s.filas]];
    } else {
      const r = intencion(variantes, filas);
      if (r) {
        html = r.html;
        const usadas = new Set(r.acciones.map((x) => x.u).filter(Boolean));
        filas = filas.filter((x) => !usadas.has(x.u));
        grupos.push([r.titulo, r.acciones]);
      }
      const usadas = new Set(grupos.flatMap(([, fs]) => fs.map((x) => x.u || x.a)));
      const directo = atajos(fold(corregido || q)).filter((x) => !usadas.has(x.u || x.a));
      if (directo.length) {
        grupos.push(['Ir directo', directo]);
        const ya = new Set(directo.map((x) => x.u).filter(Boolean));
        filas = filas.filter((x) => !ya.has(x.u));
      }
      [...new Set(filas.map((x) => x.g))].forEach((g) => grupos.push([g, filas.filter((x) => x.g === g)]));
      if (corregido) html = `<p class="busca-corregido" role="status">Mostramos resultados para «<strong>${esc(corregido)}</strong>».</p>${html}`;
    }
    let n = 0;
    /* Sin resultados, el aviso y su enlace van fuera de la lista (una lista de opciones solo lleva opciones) */
    const nada = palabras.length && !grupos.length && !html;
    lista.innerHTML = nada ? '' : grupos.map(([g, fs]) => `<div class="busca-grupo" role="group" aria-label="${esc(g)}"><p class="busca-grupo-t" aria-hidden="true">${esc(g)}</p>${fs.map((x) => opcion(x, palabras, n++)).join('')}</div>`).join('');
    ponExtra(nada ? `<p class="busca-vacio" role="status">No encontramos «${esc(q)}». Prueba con otra palabra o <button type="button" class="busca-enlace" data-dock-open="conversar">escríbenos por WhatsApp</button>.</p>${chips('Prueba con', FRECUENTES.slice(0, 5))}` : html);
    ops = [...lista.querySelectorAll('.busca-op')];
    mueve(0, false);
    cuerpo.scrollTop = 0;
  };
  const recordar = () => {
    const q = input.value.trim().slice(0, 40);
    if (q.length < 2) return;
    const l = [q, ...leer(RECIENTES, []).filter((x) => fold(x) !== fold(q))].slice(0, 5);
    try { localStorage.setItem(RECIENTES, JSON.stringify(l)); } catch { /* sin almacenamiento */ }
  };
  const crear = () => {
    dlg = d.createElement('dialog');
    dlg.className = 'busca';
    dlg.setAttribute('aria-label', 'Buscar en la ayuda');
    dlg.innerHTML = `<div class="busca-caja">${LUPA}<input type="text" role="combobox" aria-expanded="true" aria-controls="busca-lista" aria-autocomplete="list" aria-label="Buscar en la ayuda" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Busca un aparato, un plazo o una norma…"><button type="button" class="busca-cerrar" data-busca-cerrar>Cerrar</button></div>`
      + '<div class="busca-cuerpo"><div class="busca-extra"></div><div class="busca-lista" id="busca-lista" role="listbox" aria-label="Resultados"></div></div>'
      + '<p class="busca-pie" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>esc</kbd> cerrar</span></p>';
    d.body.append(dlg);
    input = dlg.querySelector('input');
    cuerpo = dlg.querySelector('.busca-cuerpo');
    extra = dlg.querySelector('.busca-extra');
    lista = dlg.querySelector('.busca-lista');
    input.addEventListener('input', pinta);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mueve(activo + (e.key === 'ArrowDown' ? 1 : -1)); }
      if (e.key === 'Enter' && ops[activo]) { e.preventDefault(); ops[activo].click(); }
      if ((e.key === 'Home' || e.key === 'End') && ops.length && !input.value) { e.preventDefault(); mueve(e.key === 'Home' ? 0 : ops.length - 1); }
    });
    /* Con el puntero se marca la fila que está debajo, solo si el puntero se movió de verdad (no porque la lista se
       acomodó bajo él) y no mientras la fila recién marcada termina de agrandarse */
    let px = -1; let py = -1; let quieto = 0;
    lista.addEventListener('pointermove', (e) => {
      if (e.clientX === px && e.clientY === py) return;
      px = e.clientX; py = e.clientY;
      if (performance.now() < quieto) return;
      const o = e.target.closest('.busca-op');
      if (o && ops.indexOf(o) !== activo) { mueve(ops.indexOf(o), false); quieto = performance.now() + 200; }
    });
    /* Al elegir, se recuerda la búsqueda y se cierra primero (los enlaces de esta misma página y la ficha siguen su curso) */
    lista.addEventListener('click', (e) => { if (e.target.closest('.busca-op')) { recordar(); dlg.close(); } });
    extra.addEventListener('click', (e) => {
      if (e.target.closest('.busca-enlace')) { dlg.close(); return; }
      const av = e.target.closest('[data-busca-avance]');
      if (av) {
        const ocultar = av.dataset.buscaAvance === 'ocultar';
        try { if (ocultar) localStorage.setItem(SIN_AVANCE, '1'); else localStorage.removeItem(SIN_AVANCE); } catch { /* sin almacenamiento */ }
        const card = av.closest('.busca-resp');
        /* Sin texto, se va con una animación (se pliega); con texto, solo cambia el botón */
        if (ocultar && !input.value.trim() && card && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
          card.classList.add('is-saliendo');
          setTimeout(() => { previa = null; pinta(); input.focus(); }, 260);
        } else { previa = null; pinta(); input.focus(); }
        return;
      }
      const chip = e.target.closest('[data-busca-q]');
      if (chip) { input.value = chip.dataset.buscaQ; pinta(); input.focus(); return; }
      if (e.target.closest('[data-busca-borrar]')) { try { localStorage.removeItem(RECIENTES); } catch { /* nada */ } pinta(); input.focus(); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-busca-cerrar]')) dlg.close(); });
  };
  const abrir = (q = '') => {
    if (!dlg) crear();
    if (dlg.open) return;
    input.value = q;
    pinta();
    dlg.showModal();
    input.focus();
    if (!indice) {
      fetch(`assets/campanas/ayuda-indice.json?v=${V}`).then((r) => r.json()).then((x) => { indice = OFF.size ? x.filter((y) => !apagado(y)) : x; pinta(); })
        .catch(() => { lista.innerHTML = '<p class="busca-vacio">No se pudo cargar el buscador. Revisa tu conexión e inténtalo de nuevo.</p>'; });
    }
  };
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-busca-abrir]'); if (b) { e.preventDefault(); abrir(b.dataset.buscaAbrir || ''); } });
  /* Para la lupa que se estira (Seek, más abajo): abre el buscador con lo que ya se escribió */
  window.CRBusca = { abrir: (q) => { abrir(q || ''); if (input && q) { input.setSelectionRange(q.length, q.length); } } };
  d.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dlg?.open) dlg.close(); else abrir(); }
  });
  /* En Windows y Linux el atajo es Ctrl+K */
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) d.querySelectorAll('.ayu-busca kbd').forEach((k) => { k.textContent = 'Ctrl K'; });
})();

/* Lupa que se estira (Seek, 27-11-2026; adaptado del componente de referencia, sin React).
   Una sola pieza, no dos: no es un ícono que se va y un campo que llega, sino una caja cuyo ANCHO es el estado, con la
   lupa y el campo adentro todo el tiempo. La lupa queda a una distancia fija del borde izquierdo de la caja: cerrada,
   esa distancia la centra en el círculo ((40 − 18) / 2 = 11) y, abierta, es el margen del campo; que cruce la cabecera
   hacia la izquierda no es una animación escrita, es la caja creciendo a su alrededor (crece desde la derecha, junto a
   «Cómo funciona», hacia el espacio libre). La altura no cambia y la esquina es redonda a cualquier ancho: círculo a
   40, píldora a 240. Al presionar se comprime un instante (90 ms) y después se estira con un resorte (casi sin rebote);
   cerrada, se inclina unos px hacia el puntero cercano (máx. ~4,5 px, solo con mouse). Al escribir, lo escrito pasa al
   buscador completo; Esc o salir sin texto la cierran. Solo en escritorio con mouse; en el teléfono, la lupa abre el
   buscador directamente. Con «reducir movimiento», sin resorte ni inclinación. */
(() => {
  const d = document;
  const lupa = d.querySelector('.nav-busca');
  if (!lupa || !window.CRBusca || d.documentElement.dataset.crOff?.split(' ').includes('buscador')) return;
  const escritorio = matchMedia('(min-width: 861px) and (pointer: fine)');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SHUT = 40; const ANCHO = 240;
  const sek = d.createElement('div');
  sek.className = 'sek';
  sek.innerHTML = '<div class="sek-skin"><svg class="sek-lens" viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.6" cy="7.6" r="5.4"/><path d="M11.6 11.6 15.4 15.4"/></svg>'
    + '<input class="sek-field" type="text" placeholder="Buscar en la ayuda" aria-label="Buscar en la ayuda" autocomplete="off" spellcheck="false" tabindex="-1">'
    + '<button class="sek-hit" type="button" aria-label="Buscar en la ayuda" title="Buscar (⌘K)"></button></div>';
  lupa.after(sek);
  const piel = sek.querySelector('.sek-skin');
  const campo = sek.querySelector('.sek-field');
  const hit = sek.querySelector('.sek-hit');

  /* Resorte por cuadros (no por milisegundos): la amortiguación se eleva a dt, así un cuadro perdido gasta la misma
     energía que los dos que reemplazó. Se detiene apenas llega. Afinado hacia lo firme: un control que tambalea parece
     adorno. */
  const k = 0.112; const amort = 0.66;
  let w = SHUT; let vel = 0; let meta = SHUT; let raf = 0; let prev = 0; let maximo = ANCHO;
  const pinta = () => {
    const p = Math.min(1, Math.max(0, (w - SHUT) / (maximo - SHUT)));
    piel.style.width = `${w.toFixed(2)}px`;
    piel.style.setProperty('--p', p.toFixed(3));
    piel.style.setProperty('--say', Math.min(1, Math.max(0, (p - 0.55) / 0.45)).toFixed(3));
  };
  const tick = (t) => {
    const dt = prev ? Math.min(2.5, Math.max(0, (t - prev) / 16.67)) : 1;
    prev = t;
    vel += (meta - w) * k * dt;
    vel *= amort ** dt;
    w += vel * dt;
    if (Math.abs(meta - w) < 0.02 && Math.abs(vel) < 0.02) { w = meta; vel = 0; raf = 0; pinta(); return; }
    pinta();
    raf = requestAnimationFrame(tick);
  };
  const ve = (m) => {
    meta = m;
    if (quieto) { w = m; pinta(); return; }
    if (!raf) { prev = 0; raf = requestAnimationFrame(tick); }
  };
  /* Cuánto puede crecer: el espacio libre entre el logo y la lupa */
  const cabe = () => {
    const logo = d.querySelector('.site-header .brand, .site-header .logo, .site-header a[class*="logo"]');
    const libre = logo ? sek.getBoundingClientRect().right - logo.getBoundingClientRect().right - 24 : ANCHO;
    return Math.max(SHUT, Math.min(ANCHO, libre));
  };

  let abierta = false; let beat = 0;
  const abre = () => {
    if (abierta) return;
    sek.dataset.press = 'true';
    clearTimeout(beat);
    beat = setTimeout(() => {
      sek.dataset.press = 'false';
      abierta = true;
      sek.dataset.open = 'true';
      maximo = cabe();
      ve(maximo);
      campo.tabIndex = 0;
      campo.focus({ preventScroll: true });
    }, quieto ? 0 : 90);
  };
  const cierra = (inmediato) => {
    abierta = false;
    sek.dataset.open = 'false';
    campo.tabIndex = -1;
    campo.value = '';
    if (inmediato) { cancelAnimationFrame(raf); raf = 0; w = SHUT; vel = 0; meta = SHUT; pinta(); } else ve(SHUT);
  };
  hit.addEventListener('click', abre);
  /* Lo escrito pasa al buscador completo (con sus resultados), y la pieza vuelve a ser lupa detrás de él */
  campo.addEventListener('input', () => {
    const q = campo.value;
    if (!q.trim()) return;
    cierra(true);
    window.CRBusca.abrir(q);
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cierra(); hit.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); const q = campo.value; cierra(true); window.CRBusca.abrir(q); }
  });
  campo.addEventListener('blur', () => { if (!campo.value.trim() && abierta) cierra(); });

  /* El imán: medido desde el marco (que no se mueve), no desde la piel (que sí): leer un vector de algo que ese mismo
     vector desplaza es un circuito que tiembla. Unos px como mucho: reconoce, no persigue. Apagado si está abierta. */
  if (!quieto) {
    let lx = 0; let ly = 0; let pend = 0;
    const publica = () => { pend = 0; piel.style.setProperty('--lx', `${lx.toFixed(2)}px`); piel.style.setProperty('--ly', `${ly.toFixed(2)}px`); };
    d.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || abierta || !escritorio.matches) return;
      const b = sek.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2); const dy = e.clientY - (b.top + b.height / 2);
      const dist = Math.hypot(dx, dy); const R = 110;
      const tira = dist > R ? 0 : (1 - dist / R) ** 1.4 * 4.5;
      const nx = dist ? (dx / dist) * tira : 0; const ny = dist ? (dy / dist) * tira : 0;
      if (Math.abs(nx - lx) < 0.05 && Math.abs(ny - ly) < 0.05) return;
      lx = nx; ly = ny;
      if (!pend) pend = requestAnimationFrame(publica);
    }, { passive: true });
  }
  pinta();
})();

/* Campos con la etiqueta que sube (Label input, 27-11-2026; adaptado del componente de referencia, sin React).
   La etiqueta es el placeholder hasta que entras. Al enfocar, sube al borde de arriba con un saltito que recorre sus
   letras, el contorno se oscurece en su lugar y la línea de arriba se abre bajo la etiqueta desde el medio hacia los
   lados. UNA cosa se mueve: el contorno siempre está entero y solo cambia de tinta; la etiqueta es el evento y la línea
   le hace espacio. El contorno es un SVG con dos medios (desde la muesca, cada uno por su lado, hasta el medio de
   abajo) y la muesca son dos trazos cortos desde su centro, que se retiran hacia afuera (stroke-dashoffset). La muesca
   mide lo que mide la etiqueta (se mide), nunca cae en la curva de la esquina y se recalcula si cambia el ancho.
   El campo es el mismo input de siempre (id, name, required, autocomplete, validación); el texto de ayuda del
   placeholder aparece solo con el foco. */
(() => {
  const d = document;
  const campos = [...d.querySelectorAll('form .pick-field')].filter((f) => f.querySelector('input:not([type="hidden"]), textarea'));
  if (!campos.length) return;
  const H = 52; const S = 0.78; const IN = 0.75; const R = 14;
  campos.forEach((fila) => {
    const input = fila.querySelector('input, textarea');
    const etiqueta = fila.querySelector('label');
    if (!input || !etiqueta) return;
    const texto = etiqueta.textContent.trim();
    const ns = 'http://www.w3.org/2000/svg';
    const caja = d.createElement('div');
    caja.className = 'lbi';
    caja.innerHTML = `<div class="lbi-box"><svg class="lbi-ring" aria-hidden="true"><path class="lbi-lado"/><path class="lbi-lado"/><path class="lbi-gap" pathLength="1"/><path class="lbi-gap" pathLength="1"/></svg></div>`;
    const box = caja.firstChild;
    const lab = d.createElement('label');
    lab.className = 'lbi-label';
    lab.htmlFor = input.id;
    [...texto].forEach((ch, i) => { const sp = d.createElement('span'); sp.textContent = ch === ' ' ? ' ' : ch; sp.style.setProperty('--i', i); lab.append(sp); });
    box.append(lab, input);
    input.classList.add('lbi-field');
    fila.replaceChildren(caja);
    fila.classList.add('es-lbi');
    const svg = box.querySelector('svg');
    const [der, izq, gapL, gapR] = svg.querySelectorAll('path');
    void ns;

    const dibuja = () => {
      const W = box.clientWidth;
      if (!W) return;
      const lw = lab.offsetWidth;
      const r = Math.min(R, H / 2);
      const lx = Math.max(14, r + 4);
      const x0 = Math.max(r * 0.6, lx - 5); const x1 = lx + lw * S + 5;
      const a = r - IN; const RR = W - IN; const B = H - IN; const mid = W / 2; const nm = (x0 + x1) / 2;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      gapL.setAttribute('d', `M${nm},${IN} L${x0},${IN}`);
      gapR.setAttribute('d', `M${nm},${IN} L${x1},${IN}`);
      der.setAttribute('d', `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${RR},${r} L${RR},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`);
      izq.setAttribute('d', `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`);
      box.style.setProperty('--lbi-x', `${lx}px`);
    };
    const estado = () => {
      caja.dataset.up = String(d.activeElement === input || input.value.length > 0);
      caja.dataset.focus = String(d.activeElement === input);
      caja.dataset.invalid = String(input.getAttribute('aria-invalid') === 'true');
    };
    input.addEventListener('focus', () => { estado(); caja.dataset.hop = String(Number(caja.dataset.hop || 0) + 1); });
    input.addEventListener('blur', estado);
    input.addEventListener('input', estado);
    input.addEventListener('change', estado);
    new MutationObserver(estado).observe(input, { attributes: true, attributeFilter: ['aria-invalid'] });
    if ('ResizeObserver' in window) new ResizeObserver(dibuja).observe(box);
    d.fonts?.ready.then(dibuja);
    dibuja();
    estado();
  });
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

/* Anclas que llegan a su lugar (26-11-2026): con content-visibility, las secciones de arriba cambian de alto mientras
   el navegador baja con desplazamiento suave, y el destino quedaba corrido (p. ej., #plazo desde el buscador). Al
   terminar de desplazarse se revisa una vez y, si quedó corrido, se ajusta sin animación. Si la persona ya movió la
   página por su cuenta, no se toca. */
(() => {
  const corrige = () => {
    const id = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : '';
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    let hecho = false; let intentos = 0;
    const suelta = () => { hecho = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => addEventListener(t, suelta, { once: true, passive: true }));
    const revisa = () => {
      if (hecho) return;
      const margen = (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
      if (Math.abs(el.getBoundingClientRect().top - margen) > 12 && intentos++ < 3) {
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        setTimeout(revisa, 150);
      } else hecho = true;
    };
    addEventListener('scrollend', () => setTimeout(revisa, 60), { once: true });
    setTimeout(revisa, 1100);
  };
  if (location.hash) corrige();
  addEventListener('hashchange', corrige);
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
