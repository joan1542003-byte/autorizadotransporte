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
