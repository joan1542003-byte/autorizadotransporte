/* Carrusel de aparatos, plano y al estilo de Apple (27-11-2026; reemplaza al de perspectiva). La fila se desplaza sola
   con el dedo, el trackpad o el teclado (desplazamiento nativo con imán por tarjeta); las flechas mueven de a una
   pantalla y se apagan en los extremos. El «+» de cada tarjeta muestra su información sobre la foto (Esc la cierra);
   con una abierta, abrir otra cierra la anterior. Sin JavaScript se ve la fila igual, sin flechas ni «+». */
(() => {
  const raiz = document.querySelector('[data-carrusel]');
  if (!raiz) return;
  const pista = raiz.querySelector('.carrusel-pista');
  const prev = raiz.querySelector('[data-carrusel-prev]');
  const next = raiz.querySelector('[data-carrusel-next]');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  raiz.classList.add('is-listo');

  /* Flechas: avanzan lo que se ve, de a tarjetas enteras */
  const paso = () => {
    const t = pista.querySelector('.carrusel-item');
    const ancho = t.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || 0);
    return Math.max(1, Math.floor(pista.clientWidth / ancho)) * ancho;
  };
  const mueve = (d) => pista.scrollBy({ left: d * paso(), behavior: quieto.matches ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => mueve(-1));
  next.addEventListener('click', () => mueve(1));
  let cuadro = 0;
  const extremos = () => {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      const max = pista.scrollWidth - pista.clientWidth - 2;
      prev.disabled = pista.scrollLeft <= 2;
      next.disabled = pista.scrollLeft >= max;
      raiz.classList.toggle('sin-flechas', max <= 2);
    });
  };
  pista.addEventListener('scroll', extremos, { passive: true });
  addEventListener('resize', extremos);
  extremos();

  /* «+»: información sobre la foto */
  let abierta = null;
  const cierra = (b, foco) => {
    if (!b) return;
    const d = document.getElementById(b.getAttribute('aria-controls'));
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', b.getAttribute('aria-label').replace('Cerrar la información de', 'Más sobre'));
    d.classList.remove('is-abierto');
    const fin = () => { if (b.getAttribute('aria-expanded') === 'false') d.hidden = true; };
    if (quieto.matches) fin(); else setTimeout(fin, 220);
    if (foco) b.focus();
    if (abierta === b) abierta = null;
  };
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('.carrusel-mas');
    if (!b) return;
    if (b.getAttribute('aria-expanded') === 'true') { cierra(b); return; }
    cierra(abierta);
    const d = document.getElementById(b.getAttribute('aria-controls'));
    d.hidden = false;
    requestAnimationFrame(() => d.classList.add('is-abierto'));
    b.setAttribute('aria-expanded', 'true');
    b.setAttribute('aria-label', b.getAttribute('aria-label').replace('Más sobre', 'Cerrar la información de'));
    abierta = b;
  });
  raiz.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta) { e.preventDefault(); cierra(abierta, true); } });
})();
