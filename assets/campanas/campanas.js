/* Campañas solo en la Región Metropolitana: el selector de comuna (filas.js, copia sin cambios) muestra solo esa región */
if (window.PICK) window.PICK.REGION_NAMES = ['Metropolitana'];

/* Mes estimado de la campaña ([data-meses]): doce meses desde el primero posible. La solicitud sanitaria va al menos
   40 días hábiles antes del inicio (DS 29/2024, arts. 24 y 39); se cuentan de lunes a viernes, sin feriados, así que es
   aproximado. Si ese primer día cae después del 10, el mes parte desde el siguiente. */
(() => {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dia = new Date();
  for (let habiles = 0; habiles < 40;) { dia.setDate(dia.getDate() + 1); if (dia.getDay() % 6) habiles++; }
  const desde = new Date(dia.getFullYear(), dia.getMonth() + (dia.getDate() > 10 ? 1 : 0), 1);
  document.querySelectorAll('[data-meses] select').forEach((sel) => {
    const no = sel.querySelector('option[value="Aún no lo sé"]');
    for (let i = 0; i < 12; i++) {
      const m = new Date(desde.getFullYear(), desde.getMonth() + i, 1);
      const texto = `${MESES[m.getMonth()]} de ${m.getFullYear()}`;
      sel.insertBefore(new Option(texto, texto), no);
    }
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
