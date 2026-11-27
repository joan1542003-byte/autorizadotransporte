/* Panel de Campañas de recolección: secciones sin recargar (la dirección guarda la sección), barra de cambios sin
   guardar, vista previa de la portada mientras se escribe, foto desde la biblioteca de medios y copiar el enlace. */
(() => {
  const panel = document.querySelector('.cr-panel');
  if (!panel) return;
  panel.classList.add('js-cr');
  const form = panel.querySelector('.cr-form');
  const secciones = [...panel.querySelectorAll('.cr-seccion')];
  const enlaces = [...panel.querySelectorAll('.cr-nav [data-ir]')];
  const campoPestana = panel.querySelector('[data-pestana-campo]');

  /* Secciones */
  const ir = (clave, empuja) => {
    if (!secciones.some((s) => s.dataset.seccion === clave)) clave = 'resumen';
    secciones.forEach((s) => s.classList.toggle('is-activa', s.dataset.seccion === clave));
    enlaces.forEach((a) => (a.dataset.ir === clave ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    campoPestana.value = clave;
    if (empuja) {
      const url = new URL(location.href);
      url.searchParams.set('pestana', clave);
      url.searchParams.delete('guardado');
      history.replaceState(null, '', url);
    }
  };
  panel.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ir]');
    if (!a) return;
    e.preventDefault();
    ir(a.dataset.ir, true);
    if (a.closest('.cr-tiles')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  ir(panel.dataset.pestana, false);

  /* Cambios sin guardar */
  const barra = panel.querySelector('[data-guardar]');
  const texto = panel.querySelector('[data-guardar-texto]');
  const inicial = new URLSearchParams(new FormData(form)).toString();
  let enviando = false;
  const revisa = () => {
    const cambio = new URLSearchParams(new FormData(form)).toString() !== inicial;
    barra.classList.toggle('is-cambios', cambio);
    texto.textContent = cambio ? 'Tienes cambios sin guardar.' : 'Todo guardado.';
    return cambio;
  };
  form.addEventListener('input', revisa);
  form.addEventListener('change', revisa);
  form.addEventListener('submit', () => { enviando = true; });
  addEventListener('beforeunload', (e) => { if (!enviando && revisa()) { e.preventDefault(); e.returnValue = ''; } });

  /* Vista previa de la portada */
  const vista = (clave) => panel.querySelector(`[data-vista-${clave}]`);
  panel.querySelectorAll('[data-vista]').forEach((campo) => {
    const destino = vista(campo.dataset.vista);
    if (!destino) return;
    const pinta = () => {
      const v = campo.value.trim();
      if (campo.dataset.vista === 'aviso') { destino.textContent = v; destino.hidden = !v; return; }
      destino.textContent = v || destino.dataset.original;
    };
    campo.addEventListener('input', pinta);
  });

  /* Foto desde la biblioteca de medios */
  const id = panel.querySelector('[data-imagen-id]');
  const quitar = panel.querySelector('[data-imagen-quitar]');
  const foto = vista('foto');
  let marco = null;
  panel.querySelector('[data-imagen-elegir]')?.addEventListener('click', () => {
    if (!window.wp?.media) return;
    if (!marco) {
      marco = window.wp.media({ title: 'Foto de la portada', button: { text: 'Usar esta foto' }, library: { type: 'image' }, multiple: false });
      marco.on('select', () => {
        const a = marco.state().get('selection').first().toJSON();
        id.value = a.id;
        foto.style.backgroundImage = `url("${(a.sizes?.large || a.sizes?.full || a).url}")`;
        quitar.hidden = false;
        revisa();
      });
    }
    marco.open();
  });
  quitar?.addEventListener('click', () => {
    id.value = '0';
    foto.style.backgroundImage = `url("${foto.dataset.original}")`;
    quitar.hidden = true;
    revisa();
  });

  /* Copiar el enlace para compartir */
  panel.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    const t = b.querySelector('[data-copiar-texto]');
    try { await navigator.clipboard.writeText(b.dataset.copiar); t.textContent = 'Enlace copiado'; } catch { t.textContent = 'No se pudo copiar'; }
    setTimeout(() => { t.textContent = 'Copiar enlace para compartir'; }, 1800);
  }));
})();
