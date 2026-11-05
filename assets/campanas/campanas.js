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

/* Peso total estimado ([data-peso]): un deslizador por rangos y una pesa que se llena según el rango. Mientras no se
   mueve, el peso queda sin informar; el campo oculto lleva el texto del rango al resumen. */
(() => {
  const RANGOS = ['Menos de 500 kg', '500 kg a 1 tonelada', '1 a 3 toneladas', '3 a 10 toneladas', 'Más de 10 toneladas'];
  document.querySelectorAll('[data-peso]').forEach((row) => {
    const rango = row.querySelector('input[type="range"]');
    const campo = row.querySelector('input[type="hidden"]');
    const texto = row.querySelector('[data-peso-texto]');
    const vacio = texto.textContent;
    const pinta = () => {
      const v = campo.value;
      const i = RANGOS.indexOf(v);
      if (i >= 0) rango.value = i;
      row.style.setProperty('--lleno', i >= 0 ? (i + 1) / RANGOS.length : 0);
      row.classList.toggle('is-lleno', i >= 2);  // con la pesa sobre la mitad, «KG» va en blanco
      texto.textContent = v || vacio;
      texto.classList.toggle('is-empty', !v);
      rango.setAttribute('aria-valuetext', v || 'Sin elegir');
    };
    rango.addEventListener('input', () => {
      campo.value = RANGOS[Number(rango.value)];
      pinta();
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    row.closest('form')?.addEventListener('reset', () => setTimeout(pinta));
    pinta();
  });
})();

/* Campañas de reciclaje: lo propio de estas páginas que no está en el sistema de Transporte.
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
