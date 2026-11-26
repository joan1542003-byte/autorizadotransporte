/* Carrusel infinito con perspectiva de los aparatos (26-11-2026; reemplaza la galería 3D). Las tarjetas van por dentro
   de un cilindro: la del centro queda al fondo y las de los lados giran hacia quien mira, con su borde exterior más
   cerca (más alto). Es infinito: cada tarjeta se ubica según su distancia a la del centro, dando la vuelta.
   - Se mueve arrastrando (con inercia), con la rueda o el trackpad en horizontal, con las flechas del teclado (con el
     foco en el carrusel), con los botones o tocando una tarjeta del lado.
   - Avanza solo cada 4,5 s mientras está a la vista; se detiene con el puntero encima, con el foco, con la pestaña
     oculta o al usarlo, y tiene su botón de pausa. Con «reducir movimiento» no avanza solo y los cambios son directos.
   - Sin JavaScript (o mientras carga) es una fila con desplazamiento horizontal: el HTML ya trae todas las tarjetas. */
(() => {
  const raiz = document.querySelector('[data-carrusel]');
  if (!raiz) return;
  const escena = raiz.querySelector('.carrusel-escena');
  const items = [...raiz.querySelectorAll('.carrusel-item')];
  const N = items.length;
  if (N < 3) return;
  const $ = (s) => raiz.querySelector(s);
  const info = $('[data-carrusel-info]');
  const btnPausa = $('[data-carrusel-pausa]');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const PASO = (30 * Math.PI) / 180; /* ángulo entre tarjetas en el cilindro */
  const VISIBLE = 2.7; /* más allá de esta distancia (en tarjetas) no se dibuja */
  let pos = 0; let meta = 0; let paso = 300; let radio = 600; let raf = 0; let antes = 0; let actual = -1;

  const envuelve = (t) => ((((t + N / 2) % N) + N) % N) - N / 2;
  const mide = () => {
    const w = items[0].offsetWidth || 300;
    paso = w * 1.1;
    radio = paso / PASO;
  };
  const pinta = () => {
    items.forEach((el, i) => {
      const t = envuelve(i - pos);
      const a = Math.abs(t);
      if (a > VISIBLE) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; return; }
      const f = t * PASO;
      el.style.visibility = '';
      el.style.opacity = a > 2.2 ? String(Math.max(0, (VISIBLE - a) / (VISIBLE - 2.2))) : '';
      el.style.transform = `translate3d(${(radio * Math.sin(f)).toFixed(2)}px, 0, ${(radio * (1 - Math.cos(f))).toFixed(2)}px) rotateY(${(-f).toFixed(4)}rad)`;
      el.classList.toggle('is-centro', a < 0.5);
    });
    const c = ((Math.round(pos) % N) + N) % N;
    if (c !== actual) cambia(c);
  };
  const cambia = (c) => {
    const primera = actual < 0;
    actual = c;
    const d = items[c].dataset;
    const pon = () => {
      $('[data-carrusel-n]').textContent = String(c + 1);
      $('[data-carrusel-grupo]').textContent = d.grupo;
      $('[data-carrusel-nombre]').textContent = d.nombre;
      $('[data-carrusel-texto]').textContent = d.texto;
      $('[data-carrusel-nota]').textContent = d.nota;
      const med = $('[data-carrusel-medida]');
      med.hidden = !d.medida;
      med.textContent = d.medida ? `Medida típica: ${d.medida}` : '';
      const add = $('[data-carrusel-add]');
      add.dataset.add = `aparatos=${d.grupo}`;
      add.textContent = `Incluir «${d.grupo}» en la ficha`;
      items.forEach((el, i) => el.toggleAttribute('aria-current', i === c));
    };
    if (primera || quieto.matches) { pon(); return; }
    info.classList.add('is-saliendo');
    clearTimeout(cambia.t);
    cambia.t = setTimeout(() => { pon(); info.classList.remove('is-saliendo'); }, 140);
  };

  /* Movimiento: se acerca a la meta con un resorte amortiguado (sin rebote) */
  let arrastrando = false;
  const anima = (ahora) => {
    const dt = Math.min(0.05, (ahora - antes) / 1000 || 0.016);
    antes = ahora;
    if (!arrastrando) {
      pos += (meta - pos) * (1 - Math.exp(-dt * 8));
      if (Math.abs(meta - pos) < 0.0008) pos = meta;
    }
    pinta();
    raf = arrastrando || pos !== meta ? requestAnimationFrame(anima) : 0;
  };
  const arranca = () => { if (!raf) { antes = performance.now(); raf = requestAnimationFrame(anima); } };
  const ir = (m) => {
    meta = m;
    if (quieto.matches) { pos = meta; pinta(); } else arranca();
  };

  /* Avance automático */
  let auto = !quieto.matches; let aLaVista = false; let encima = false; let conFoco = false; let reloj = 0;
  const programa = () => {
    clearTimeout(reloj);
    info.setAttribute('aria-live', auto ? 'off' : 'polite');
    if (auto && aLaVista && !encima && !conFoco && !arrastrando && !document.hidden) reloj = setTimeout(() => { ir(Math.round(meta) + 1); programa(); }, 4500);
  };
  const ponAuto = (v) => {
    auto = v;
    btnPausa.setAttribute('aria-pressed', String(!v));
    btnPausa.setAttribute('aria-label', v ? 'Pausar el carrusel' : 'Reproducir el carrusel');
    raiz.classList.toggle('is-pausado', !v);
    programa();
  };
  /* Quien lo usa toma el control: deja de avanzar solo */
  const toma = () => { if (auto) ponAuto(false); };

  /* Arrastre con inercia; un toque sin arrastre en una tarjeta del lado la trae al centro */
  let x0 = 0; let p0 = 0; let xAnt = 0; let tAnt = 0; let vel = 0; let movio = false; let idPuntero = null;
  escena.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    arrastrando = true; movio = false; idPuntero = e.pointerId;
    x0 = xAnt = e.clientX; tAnt = e.timeStamp; p0 = pos; vel = 0;
    meta = pos;
    arranca();
  });
  escena.addEventListener('pointermove', (e) => {
    if (!arrastrando || e.pointerId !== idPuntero) return;
    const dx = e.clientX - x0;
    if (!movio && Math.abs(dx) > 6) { movio = true; escena.setPointerCapture(e.pointerId); raiz.classList.add('is-arrastrando'); toma(); }
    if (!movio) return;
    pos = p0 - dx / paso;
    const dt = e.timeStamp - tAnt;
    if (dt > 0) vel = 0.7 * (((xAnt - e.clientX) / paso / dt) * 1000) + 0.3 * vel;
    xAnt = e.clientX; tAnt = e.timeStamp;
  });
  const suelta = (e) => {
    if (!arrastrando || (e && e.pointerId !== idPuntero)) return;
    arrastrando = false;
    raiz.classList.remove('is-arrastrando');
    if (movio) ir(Math.round(pos + Math.max(-2, Math.min(2, vel * 0.22))));
    else ir(meta);
  };
  escena.addEventListener('pointerup', suelta);
  escena.addEventListener('pointercancel', suelta);
  /* Con el dedo, la tarjeta tocada tiene la captura implícita y la pierde al pasarla a la escena: solo cuenta la de la escena */
  escena.addEventListener('lostpointercapture', (e) => { if (e.target === escena) suelta(e); });
  escena.addEventListener('click', (e) => {
    if (movio) { e.preventDefault(); return; }
    const li = e.target.closest('.carrusel-item');
    if (!li) return;
    const t = Math.round(envuelve(items.indexOf(li) - meta));
    if (t) { toma(); ir(Math.round(meta) + t); }
  });
  escena.addEventListener('dragstart', (e) => e.preventDefault());

  /* Rueda o trackpad en horizontal (la vertical sigue moviendo la página) */
  let ruedaFin = 0;
  escena.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    toma();
    pos += e.deltaX / paso;
    meta = pos;
    pinta();
    clearTimeout(ruedaFin);
    ruedaFin = setTimeout(() => ir(Math.round(pos)), 130);
  }, { passive: false });

  /* Teclado y botones */
  escena.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    toma();
    ir(Math.round(meta) + d);
  });
  $('[data-carrusel-prev]').addEventListener('click', () => { toma(); ir(Math.round(meta) - 1); });
  $('[data-carrusel-next]').addEventListener('click', () => { toma(); ir(Math.round(meta) + 1); });
  btnPausa.addEventListener('click', () => ponAuto(!auto));

  raiz.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { encima = true; programa(); } });
  raiz.addEventListener('pointerleave', () => { encima = false; programa(); });
  raiz.addEventListener('focusin', () => { conFoco = true; programa(); });
  raiz.addEventListener('focusout', (e) => { if (!raiz.contains(e.relatedTarget)) { conFoco = false; programa(); } });
  document.addEventListener('visibilitychange', programa);
  quieto.addEventListener?.('change', () => { if (quieto.matches) ponAuto(false); });

  /* Las fotos se piden cuando el carrusel se acerca a la pantalla, todas juntas (si no, aparecerían al girar) */
  new IntersectionObserver((es) => es.forEach((x) => {
    if (x.isIntersecting) items.forEach((el) => { const img = el.querySelector('img'); if (img.loading === 'lazy') img.loading = 'eager'; });
  }), { rootMargin: '600px 0px' }).observe(raiz);
  new IntersectionObserver((es) => es.forEach((x) => { aLaVista = x.isIntersecting; programa(); }), { threshold: 0.35 }).observe(escena);

  raiz.classList.add('is-3d');
  btnPausa.hidden = quieto.matches;
  mide();
  pinta();
  ponAuto(auto);
  if ('ResizeObserver' in window) new ResizeObserver(() => { mide(); pinta(); }).observe(escena);
})();
