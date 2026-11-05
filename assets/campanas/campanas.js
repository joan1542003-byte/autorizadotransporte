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

/* Peso total estimado ([data-peso]): un deslizador continuo, de 100 kg a 20 toneladas en escala logarítmica (así cabe
   el detalle de las campañas chicas y el de las grandes), y una pesa que se llena según la posición. Dice el peso
   aproximado del punto donde quedó, redondeado, y el tramo al que pertenece. Mientras no se mueve, el peso queda sin
   informar; el campo oculto lleva el texto al resumen. */
(() => {
  const MIN = 100, MAX = 20000;
  const TRAMOS = [[500, 'menos de 500 kg'], [1000, 'entre 500 kg y 1 tonelada'], [3000, 'entre 1 y 3 toneladas'], [10000, 'entre 3 y 10 toneladas'], [Infinity, 'más de 10 toneladas']];
  const num = (n, d = 0) => n.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const kilos = (p) => MIN * (MAX / MIN) ** p;
  /* Redondeo que se lee bien: 50 kg bajo una tonelada, medio decimal hasta 10 t y enteros después */
  const redondea = (kg) => (kg < 1000 ? Math.max(MIN, Math.round(kg / 50) * 50) : kg < 10000 ? Math.round(kg / 100) * 100 : Math.round(kg / 1000) * 1000);
  const toneladas = (kg) => { const t = kg / 1000; return `${num(t, Number.isInteger(t) ? 0 : 1)} ${t === 1 ? 'tonelada' : 'toneladas'}`; };
  const texto = (kg) => (kg >= MAX ? 'Más de 20 toneladas' : kg < 1000 ? `Aprox. ${num(kg)} kg` : `Aprox. ${toneladas(kg)}`);
  const tramo = (kg) => TRAMOS.find(([tope]) => kg < tope)[1];
  document.querySelectorAll('[data-peso]').forEach((row) => {
    const rango = row.querySelector('input[type="range"]');
    const campo = row.querySelector('input[type="hidden"]');
    const valor = row.querySelector('[data-peso-texto]');
    const vacio = valor.textContent;
    const pinta = (p) => {
      row.style.setProperty('--lleno', p);
      row.classList.toggle('is-lleno', p >= .45);  // con la pesa sobre la mitad, «KG» va en blanco
    };
    rango.addEventListener('input', () => {
      const p = Number(rango.value) / Number(rango.max);
      const kg = redondea(kilos(p));
      const t = texto(kg);
      const enTramo = kg < MAX ? tramo(kg) : '';  // «Más de 20 toneladas» ya dice su tramo
      campo.value = enTramo ? `${t} (${enTramo})` : t;
      valor.textContent = t;
      if (enTramo) valor.dataset.tramo = enTramo; else delete valor.dataset.tramo;
      valor.classList.remove('is-empty');
      rango.setAttribute('aria-valuetext', t);
      pinta(p);
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    /* Mientras se arrastra, la pesa sigue al dedo sin retraso; con teclado o un toque, se llena con transición */
    rango.addEventListener('pointerdown', () => row.classList.add('is-arrastrando'));
    addEventListener('pointerup', () => row.classList.remove('is-arrastrando'));
    row.closest('form')?.addEventListener('reset', () => setTimeout(() => {
      if (campo.value) return;
      rango.value = 0; valor.textContent = vacio; valor.classList.add('is-empty'); delete valor.dataset.tramo;
      rango.setAttribute('aria-valuetext', 'Sin elegir'); pinta(0);
    }));
    pinta(campo.value ? Number(rango.value) / Number(rango.max) : 0);
  });
})();

/* Resumen de la ficha: al presionar «Enviar» (abre WhatsApp con el texto), Don Reco y Lola Lata agradecen sobre el
   resumen. Se esconden de nuevo al editar o al preparar otra ficha. */
(() => {
  document.querySelectorAll('[data-ficha-enviada]').forEach((gracias) => {
    const resumen = gracias.closest('.summary');
    const form = resumen && document.querySelector(`form[data-summary="${resumen.id}"]`);
    resumen?.querySelector('[data-send]')?.addEventListener('click', () => { gracias.hidden = false; });
    form?.addEventListener('submit', () => { gracias.hidden = true; });
    resumen?.querySelector('[data-edit]')?.addEventListener('click', () => { gracias.hidden = true; });
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
