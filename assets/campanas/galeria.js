/* Aparatos que se reciben: galería en 3D. Uno al centro; los demás, a los lados, girados y difuminados.
   La pista es un carrusel con scroll-snap (se desliza con el dedo, el trackpad o las flechas del teclado); en cada cuadro
   se calcula la distancia de cada aparato al centro (--d, con signo, y --ad, absoluta) y el CSS gira, achica y difumina
   según ella. Al cambiar el aparato del centro se actualiza el texto y el botón «Incluir en la ficha» (data-add de
   filas.js). Sin bibliotecas ni modelos: solo transform, opacity y filter. */
(() => {
  const d = document;
  const g = d.querySelector('[data-galeria]');
  if (!g) return;
  const pista = g.querySelector('.galeria-pista');
  const items = [...pista.children];
  const puntos = [...g.querySelectorAll('[data-galeria-puntos] button')];
  const out = {
    nombre: g.querySelector('[data-galeria-nombre]'),
    texto: g.querySelector('[data-galeria-texto]'),
    nota: g.querySelector('[data-galeria-nota]'),
    add: g.querySelector('[data-galeria-add]'),
  };
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let actual = Number(g.dataset.inicio) || 0;  // el HTML ya trae el texto de este aparato
  let raf = 0;

  const mostrar = (k) => {
    if (k === actual) return;
    actual = k;
    const it = items[k].dataset;
    out.nombre.textContent = it.nombre;
    out.texto.textContent = it.texto;
    out.nota.textContent = it.nota;
    out.add.dataset.add = `aparatos=${it.nombre}`;
    [...items, ...puntos].forEach((el, j) => (j % items.length === k ? el.setAttribute('aria-current', 'true') : el.removeAttribute('aria-current')));
    g.classList.remove('is-cambio');
    void g.offsetWidth;  // reinicia la entrada suave del texto
    g.classList.add('is-cambio');
  };

  const pintar = () => {
    raf = 0;
    const centro = pista.scrollLeft + pista.clientWidth / 2;
    let mejor = 0;
    let menor = Infinity;
    items.forEach((el, j) => {
      const dist = (el.offsetLeft + el.offsetWidth / 2 - centro) / el.offsetWidth;
      const c = Math.max(-3, Math.min(3, dist));
      el.style.setProperty('--d', c.toFixed(3));
      el.style.setProperty('--ad', Math.abs(c).toFixed(3));
      el.style.zIndex = String(10 - Math.round(Math.abs(c) * 2));
      if (Math.abs(dist) < menor) { menor = Math.abs(dist); mejor = j; }
    });
    mostrar(mejor);
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };

  const ir = (k) => {
    const j = Math.max(0, Math.min(items.length - 1, k));
    const el = items[j];
    pista.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - pista.clientWidth / 2, behavior: motion.matches ? 'smooth' : 'auto' });
  };

  pista.addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir, { passive: true });
  items.forEach((el, j) => el.querySelector('button').addEventListener('click', () => ir(j)));
  puntos.forEach((b, j) => b.addEventListener('click', () => ir(j)));
  g.querySelector('[data-galeria-prev]').addEventListener('click', () => ir(actual - 1));
  g.querySelector('[data-galeria-next]').addEventListener('click', () => ir(actual + 1));
  pista.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      ir(actual + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });

  g.classList.add('is-lista');
  const ini = items[actual];
  pista.scrollLeft = ini.offsetLeft + ini.offsetWidth / 2 - pista.clientWidth / 2;
  pintar();
})();
