/* Carrusel infinito con perspectiva de los aparatos (26-11-2026; reemplaza la galería 3D).
   - Las tarjetas van por dentro de un cilindro: la del centro queda plana y al fondo; las de los lados se curvan hacia
     quien mira (su borde exterior queda más cerca y más alto). Para curvarlas, cada tarjeta se dibuja en franjas
     verticales (TIRAS), cada una con su propio giro; la curva crece a medida que la tarjeta se aleja del centro.
   - Al tocar la tarjeta del centro (o Enter con el foco en el carrusel) se voltea y muestra su información; otro toque
     la devuelve. La del centro (quieta o volteada) se dibuja entera, no en franjas.
   - Es infinito: cada tarjeta se ubica según su distancia a la del centro, dando la vuelta.
   - Se mueve arrastrando (con inercia), con la rueda o el trackpad en horizontal, con las flechas del teclado, con los
     botones o tocando una tarjeta del lado. Avanza solo cada 4,5 s mientras está a la vista; se detiene con el puntero
     encima, con el foco, con la pestaña oculta, con una tarjeta volteada o al usarlo, y tiene su botón de pausa.
     Con «reducir movimiento» no avanza solo y los cambios son directos.
   - El alto de la escena se calcula para que las tarjetas de los lados (más altas por la perspectiva) no se corten.
   - Sin JavaScript (o mientras carga) es una fila con desplazamiento horizontal: el HTML ya trae todas las tarjetas. */
(() => {
  const raiz = document.querySelector('[data-carrusel]');
  if (!raiz) return;
  const escena = raiz.querySelector('.carrusel-escena');
  const pista = raiz.querySelector('.carrusel-pista');
  const items = [...raiz.querySelectorAll('.carrusel-item')];
  const N = items.length;
  if (N < 3) return;
  const $ = (s) => raiz.querySelector(s);
  const info = $('[data-carrusel-info]');
  const btnPausa = $('[data-carrusel-pausa]');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const TIRAS = 16; /* franjas por tarjeta (más = curva más suave) */
  const PASO = (34 * Math.PI) / 180; /* ángulo entre tarjetas en el cilindro */
  const VISIBLE = 2.7; /* más allá de esta distancia (en tarjetas) no se dibuja */
  let pos = 0; let meta = 0; let w = 300; let h = 375; let paso = 330; let radio = 600; let curva = 260; let persp = 1000;
  let raf = 0; let antes = 0; let actual = -1; let volteada = -1; let listo = false; /* listo: ya armado (inicia) */

  /* Franjas: cada una muestra su parte de una copia del frente de la tarjeta (se arman en inicia()) */
  const capa = document.createElement('div');
  capa.className = 'carrusel-tiras';
  capa.setAttribute('aria-hidden', 'true');
  let tiras = [];
  const armaTiras = () => items.map((el, i) => {
    const frente = el.querySelector('.is-frente');
    return Array.from({ length: TIRAS }, (_, k) => {
      const t = document.createElement('div');
      t.className = 'carrusel-tira';
      t.dataset.i = String(i);
      t.style.setProperty('--k', String(k));
      const dentro = document.createElement('div');
      dentro.className = 'carrusel-tira-in';
      const copia = frente.cloneNode(true);
      copia.querySelector('img')?.removeAttribute('loading');
      dentro.append(copia);
      t.append(dentro);
      capa.append(t);
      return t;
    });
  });

  const envuelve = (t) => ((((t + N / 2) % N) + N) % N) - N / 2;
  const suave = (x) => x * x * (3 - 2 * x);
  /* Posición (x, z) y giro de un punto a la distancia u del centro de la tarjeta que está a t tarjetas del centro */
  const punto = (t, u) => {
    const c = t * PASO; const cs = Math.cos(c); const sn = Math.sin(c);
    const cx = radio * sn; const cz = radio * (1 - cs);
    const b = suave(Math.min(1, Math.abs(t)));
    if (b < 1e-4) return [cx + u * cs, cz + u * sn, c];
    const r = curva / b; const a = u / r; const s1 = r * Math.sin(a); const s2 = r * (1 - Math.cos(a));
    return [cx + s1 * cs - s2 * sn, cz + s1 * sn + s2 * cs, c + a];
  };
  const mide = () => {
    w = items[0].offsetWidth || 300;
    h = items[0].offsetHeight || w * 1.25;
    paso = w * 1.1;
    radio = paso / PASO;
    curva = w * 0.85;
    persp = w * 3.3;
    escena.style.perspective = `${persp}px`;
    /* Alto extra arriba y abajo: la mitad de lo que crece la franja más cercana que queda dentro del ancho visible */
    const mitad = escena.clientWidth / 2;
    let escala = 1;
    for (let t = -VISIBLE; t <= VISIBLE; t += 0.1) {
      for (let k = 0; k <= TIRAS; k++) {
        const [x, z] = punto(t, (k / TIRAS - 0.5) * w);
        const e = persp / Math.max(1, persp - z);
        if (Math.abs(x * e) < mitad) escala = Math.max(escala, e);
      }
    }
    escena.style.setProperty('--extra', `${Math.ceil(((Math.min(escala, 1.9) - 1) * h) / 2)}px`);
  };
  const pinta = () => {
    if (!listo) return;
    items.forEach((el, i) => {
      const t = envuelve(i - pos);
      const a = Math.abs(t);
      const op = a > 2.2 ? Math.max(0, (VISIBLE - a) / (VISIBLE - 2.2)) : 1;
      const [x, z, g] = punto(t, 0);
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${(-g).toFixed(4)}rad)`;
      el.classList.toggle('is-centro', a < 0.5);
      /* La del centro, quieta o volteada, se dibuja entera: sin las uniones de las franjas */
      const plana = i === volteada || a < 0.06;
      el.classList.toggle('is-plana', plana);
      tiras[i].forEach((s, k) => {
        if (a > VISIBLE || plana) { if (s.style.visibility !== 'hidden') s.style.visibility = 'hidden'; return; }
        const [sx, sz, sg] = punto(t, ((k + 0.5) / TIRAS - 0.5) * w);
        s.style.visibility = '';
        s.style.opacity = op < 1 ? op.toFixed(3) : '';
        s.style.transform = `translate3d(${sx.toFixed(2)}px, 0, ${sz.toFixed(2)}px) rotateY(${(-sg).toFixed(4)}rad)`;
      });
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
      $('[data-carrusel-nombre]').textContent = d.nombre;
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
    if (auto && aLaVista && !encima && !conFoco && !arrastrando && volteada < 0 && !document.hidden) reloj = setTimeout(() => { ir(Math.round(meta) + 1); programa(); }, 4500);
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

  /* Volteo de la tarjeta del centro */
  const GIRO = 520;
  const voltea = (i) => {
    if (volteada >= 0 || pos !== meta) return;
    volteada = i;
    pinta();
    requestAnimationFrame(() => requestAnimationFrame(() => items[i].classList.add('is-volteada')));
    programa();
  };
  /* Vuelve al frente y, al terminar de girar, sigue (despues). Con «inmediato», sin esperar el giro. */
  const desvoltea = (despues, inmediato) => {
    if (volteada < 0) { despues?.(); return; }
    items[volteada].classList.remove('is-volteada');
    const fin = () => { volteada = -1; pinta(); programa(); despues?.(); };
    if (inmediato || quieto.matches) fin(); else setTimeout(fin, GIRO);
  };
  const navega = (d) => { toma(); desvoltea(() => ir(Math.round(meta) + d)); };

  /* Arrastre con inercia; un toque sin arrastre voltea la del centro o trae al centro una del lado */
  let x0 = 0; let p0 = 0; let xAnt = 0; let tAnt = 0; let vel = 0; let movio = false; let idPuntero = null;
  escena.addEventListener('pointerdown', (e) => {
    if (!listo || e.button !== 0) return;
    arrastrando = true; movio = false; idPuntero = e.pointerId;
    x0 = xAnt = e.clientX; tAnt = e.timeStamp; p0 = pos; vel = 0;
    meta = pos;
    arranca();
  });
  escena.addEventListener('pointermove', (e) => {
    if (!arrastrando || e.pointerId !== idPuntero) return;
    const dx = e.clientX - x0;
    if (!movio && Math.abs(dx) > 6) {
      movio = true;
      escena.setPointerCapture(e.pointerId);
      raiz.classList.add('is-arrastrando');
      toma();
      desvoltea(null, true);
    }
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
  /* Con el dedo, lo tocado tiene la captura implícita y la pierde al pasarla a la escena: solo cuenta la de la escena */
  escena.addEventListener('lostpointercapture', (e) => { if (e.target === escena) suelta(e); });
  escena.addEventListener('click', (e) => {
    if (!listo) return;
    if (movio) { e.preventDefault(); return; }
    if (volteada >= 0) { desvoltea(); return; }
    const s = e.target.closest('.carrusel-tira, .carrusel-item');
    if (!s) return;
    const i = s.dataset.i != null ? Number(s.dataset.i) : items.indexOf(s);
    const t = Math.round(envuelve(i - meta));
    toma();
    if (t) ir(Math.round(meta) + t);
    else voltea(i);
  });
  escena.addEventListener('dragstart', (e) => e.preventDefault());

  /* Rueda o trackpad en horizontal (la vertical sigue moviendo la página) */
  let ruedaFin = 0;
  escena.addEventListener('wheel', (e) => {
    if (!listo || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    toma();
    desvoltea(null, true);
    pos += e.deltaX / paso;
    meta = pos;
    pinta();
    clearTimeout(ruedaFin);
    ruedaFin = setTimeout(() => ir(Math.round(pos)), 130);
  }, { passive: false });

  /* Teclado y botones */
  escena.addEventListener('keydown', (e) => {
    if (!listo) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toma();
      if (volteada >= 0) desvoltea(); else voltea(actual);
      return;
    }
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    navega(d);
  });
  $('[data-carrusel-prev]').addEventListener('click', () => navega(-1));
  $('[data-carrusel-next]').addEventListener('click', () => navega(1));
  btnPausa.addEventListener('click', () => ponAuto(!auto));

  raiz.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { encima = true; programa(); } });
  raiz.addEventListener('pointerleave', () => { encima = false; programa(); });
  raiz.addEventListener('focusin', () => { conFoco = true; programa(); });
  raiz.addEventListener('focusout', (e) => { if (!raiz.contains(e.relatedTarget)) { conFoco = false; programa(); } });
  document.addEventListener('visibilitychange', programa);
  quieto.addEventListener?.('change', () => { if (quieto.matches) ponAuto(false); });

  /* Se arma cuando el carrusel se acerca a la pantalla (no durante la carga de la página): fotos, franjas y cilindro */
  const inicia = () => {
    items.forEach((el) => { const img = el.querySelector('img'); if (img.loading === 'lazy') img.loading = 'eager'; });
    tiras = armaTiras();
    listo = true;
    raiz.classList.add('is-3d');
    pista.append(capa);
    btnPausa.hidden = quieto.matches;
    mide();
    pinta();
    ponAuto(auto);
    new IntersectionObserver((es) => es.forEach((x) => { aLaVista = x.isIntersecting; programa(); }), { threshold: 0.35 }).observe(escena);
    if ('ResizeObserver' in window) {
      let ancho0 = escena.clientWidth;
      new ResizeObserver(() => { if (escena.clientWidth === ancho0 && items[0].offsetWidth === w) return; ancho0 = escena.clientWidth; mide(); pinta(); }).observe(escena);
    }
  };
  const cerca = new IntersectionObserver((es) => {
    if (!es.some((x) => x.isIntersecting)) return;
    cerca.disconnect();
    (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(inicia, { timeout: 400 });
  }, { rootMargin: '700px 0px' });
  cerca.observe(raiz);
})();
