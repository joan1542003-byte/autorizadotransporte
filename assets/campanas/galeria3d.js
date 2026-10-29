/* Aparatos que se reciben: galería infinita con modelos 3D reales (three.js 0.170, MIT, copia local en vendor/three).
   Una sola escena y un solo <canvas>: el aparato del centro queda de frente, gira lento y se inclina hacia el cursor;
   los demás esperan a los lados, más atrás y difuminados por la niebla. Se cambia deslizando, con la rueda o el trackpad
   en horizontal, con las flechas (pantalla y teclado), con los puntos o tocando un aparato lateral; al llegar al final
   vuelve a empezar. Al cambiar se actualizan el texto y «Incluir en la ficha» (data-add de filas.js).
   Optimización: three.js y los modelos (GLB con meshopt y texturas WebP de 1024 px, de Sketchfab, CC BY 4.0) se descargan
   recién cuando la galería se acerca a la pantalla; se dibuja solo mientras está a la vista y la pestaña está activa;
   la densidad de píxeles queda en 2 como máximo (1,5 en el teléfono). Sin WebGL se ve la lista de respaldo. */
(() => {
  const d = document;
  const g = d.querySelector('[data-galeria3d]');
  if (!g) return;
  const datos = JSON.parse(g.querySelector('[data-galeria-datos]').textContent);
  const lienzo = g.querySelector('.galeria-lienzo');
  const canvas = lienzo.querySelector('canvas');
  const puntos = [...g.querySelectorAll('[data-galeria-puntos] button')];
  const out = {
    cat: g.querySelector('[data-galeria-cat]'),
    nombre: g.querySelector('[data-galeria-nombre]'),
    texto: g.querySelector('[data-galeria-texto]'),
    nota: g.querySelector('[data-galeria-nota]'),
    add: g.querySelector('[data-galeria-add]'),
  };
  const N = datos.length;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const movil = matchMedia('(max-width: 760px)');
  const base = g.dataset.modelos;
  let objetivo = 0;   // índice entero al que se va (sin límite: la galería no tiene fin)
  let actual = 0;     // el que se muestra en el texto
  let en3d = false;    // con el 3D cargado, el texto lo actualiza cada cuadro

  /* Texto e indicadores: funcionan aunque el 3D no cargue */
  const mod = (n) => ((n % N) + N) % N;
  const mostrar = (k) => {
    const j = mod(k);
    if (j === actual && out.nombre.textContent === datos[j].nombre) return;
    actual = j;
    const it = datos[j];
    out.cat.textContent = it.categoria;
    out.nombre.textContent = it.nombre;
    out.texto.textContent = it.texto;
    out.nota.textContent = it.nota;
    out.add.dataset.add = `aparatos=${it.categoria}`;
    puntos.forEach((b, i) => (i === j ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    g.classList.remove('is-cambio');
    void g.offsetWidth;  // reinicia la entrada suave del texto
    g.classList.add('is-cambio');
  };
  let pedir = () => {};
  const ir = (k) => { objetivo = k; if (en3d) pedir(); else mostrar(k); };
  const paso = (s) => ir(Math.round(objetivo) + s);

  g.querySelector('[data-galeria-prev]').addEventListener('click', () => paso(-1));
  g.querySelector('[data-galeria-next]').addEventListener('click', () => paso(1));
  puntos.forEach((b, i) => b.addEventListener('click', () => {
    const r = Math.round(objetivo);
    let delta = i - mod(r);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    ir(r + delta);
  }));
  lienzo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); paso(e.key === 'ArrowRight' ? 1 : -1); }
  });

  /* WebGL disponible: si no, queda la lista de respaldo */
  const gl = (() => { try { return !!canvas.getContext('webgl2'); } catch { return false; } })();
  if (!gl) { g.classList.add('sin-3d'); return; }

  const cargar = async () => {
    const [THREE, { GLTFLoader }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
      import('three'),
      import('./vendor/three/GLTFLoader.js'),
      import('./vendor/three/RoomEnvironment.js'),
      import('./vendor/three/meshopt_decoder.module.js'),
    ]);
    en3d = true;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const escena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(2.5, 4, 5);
    escena.add(luz);
    /* La niebla toma el fondo de la sección: los aparatos de los lados se difuminan hacia él */
    const fondo = new THREE.Color(getComputedStyle(g.closest('section')).backgroundColor);
    escena.fog = new THREE.Fog(fondo, 5.6, 9.2);
    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camara.position.set(0, 0.38, 5.3);
    camara.lookAt(0, 0.05, 0);

    /* Sombra de contacto: una mancha suave bajo cada aparato (más barata que sombras reales) */
    const sombraTex = (() => {
      const c = d.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(10,40,25,.42)');
      gr.addColorStop(1, 'rgba(10,40,25,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const sombraMat = new THREE.MeshBasicMaterial({ map: sombraTex, transparent: true, depthWrite: false });
    const PISO = -0.82;

    /* Cada aparato: un grupo «soporte» (posición en la galería) con el modelo centrado y escalado a un mismo tamaño */
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const ajustar = (obj, alto) => {
      /* Algunos modelos traen un piso: un plano horizontal de cuatro vértices que abarca casi todo el modelo. Se quita para
         que no cuente en el tamaño (las piezas chicas de cuatro vértices, como teclas o etiquetas, se quedan) */
      const pisos = [];
      obj.updateMatrixWorld(true);
      const total = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      obj.traverse((o) => {
        if (!o.isMesh || o.geometry.attributes.position.count > 4) return;
        const t = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
        if (t.y < Math.max(t.x, t.z) * 0.01 && Math.max(t.x, t.z) > Math.max(total.x, total.z) * 0.5) pisos.push(o);
      });
      pisos.forEach((o) => o.removeFromParent());
      const caja = new THREE.Box3().setFromObject(obj);
      const tam = caja.getSize(new THREE.Vector3());
      const s = alto / Math.max(tam.y, tam.x * 0.62, tam.z * 0.62);
      obj.scale.setScalar(s);
      const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      const min = new THREE.Box3().setFromObject(obj).min.y;
      obj.position.sub(new THREE.Vector3(c.x, 0, c.z));
      obj.position.y += PISO - min;
    };
    const soportes = datos.map((it) => {
      const soporte = new THREE.Group();
      const giro = new THREE.Group();   // giro lento del centro e inclinación hacia el cursor
      soporte.add(giro);
      const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.9), sombraMat);
      sombra.rotation.x = -Math.PI / 2;
      sombra.position.y = PISO + 0.002;
      soporte.add(sombra);
      soporte.userData = { giro, base: it.giro || 0, listo: false, it };
      escena.add(soporte);
      return soporte;
    });
    const cargarModelo = (j) => {
      const s = soportes[j];
      if (s.userData.listo || s.userData.cargando) return;
      s.userData.cargando = true;
      const poner = (obj) => {
        obj.rotation.set(s.userData.it.incl || 0, s.userData.base, 0);
        ajustar(obj, s.userData.it.alto || 1.55);
        s.userData.giro.add(obj);
        s.userData.listo = true;
        g.classList.add('is-lista');
        pedir();
      };
      loader.load(base + s.userData.it.modelo, (gltf) => poner(gltf.scene), undefined, (err) => { s.userData.cargando = false; console.warn('Galería 3D:', s.userData.it.modelo, err); });
    };
    /* Primero el del centro y sus vecinos; después el resto */
    const orden = [0, 1, N - 1, 2, N - 2, ...datos.keys()].filter((v, i, a) => a.indexOf(v) === i && v < N);
    orden.forEach((j, i) => setTimeout(() => cargarModelo(j), i * 120));

    /* Tamaño del lienzo */
    const medir = () => {
      const w = lienzo.clientWidth;
      const h = lienzo.clientHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio, movil.matches ? 1.5 : 2));
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      /* En pantallas angostas la cámara se aleja para que se vean los lados */
      camara.position.z = w < 520 ? 6.6 : 5.3;
      camara.fov = w < 520 ? 34 : 30;
      camara.updateProjectionMatrix();
      pedir();
    };
    new ResizeObserver(medir).observe(lienzo);

    /* Cursor: inclinación del aparato central; arrastre para pasar al siguiente */
    let inclX = 0, inclY = 0, metaX = 0, metaY = 0;
    let arrastre = null;
    const ancho = () => lienzo.clientWidth * (movil.matches ? 0.55 : 0.28);
    lienzo.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      if (e.pointerType === 'mouse' && !arrastre) {
        metaY = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
        metaX = ((e.clientY - r.top) / r.height - 0.5) * 0.45;
      }
      if (arrastre) {
        const dx = e.clientX - arrastre.x;
        if (Math.abs(dx) > 6) arrastre.movio = true;
        objetivo = arrastre.desde - dx / ancho();
      }
      pedir();
    });
    lienzo.addEventListener('pointerleave', () => { metaX = 0; metaY = 0; pedir(); });
    lienzo.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      arrastre = { x: e.clientX, desde: objetivo, movio: false };
      lienzo.setPointerCapture(e.pointerId);
    });
    const ray = new THREE.Raycaster();
    const soltar = (e) => {
      if (!arrastre) return;
      const { movio } = arrastre;
      arrastre = null;
      if (movio) { objetivo = Math.round(objetivo); pedir(); return; }
      /* Un toque sin arrastre: si cae sobre un aparato lateral, va a él */
      const r = lienzo.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
      const hit = ray.intersectObjects(soportes.filter((s) => s.visible), true)[0];
      if (!hit) return;
      let o = hit.object;
      while (o && !soportes.includes(o)) o = o.parent;
      const rel = o?.userData.rel;
      if (rel && Math.abs(rel) > 0.5) ir(Math.round(objetivo + rel));
    };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', () => { if (arrastre) { arrastre = null; objetivo = Math.round(objetivo); pedir(); } });
    /* Rueda o trackpad en horizontal: un paso por gesto */
    let acumulado = 0, espera = 0;
    lienzo.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      acumulado += e.deltaX;
      if (Math.abs(acumulado) > 40 && performance.now() > espera) {
        paso(acumulado > 0 ? 1 : -1);
        acumulado = 0;
        espera = performance.now() + 380;
      }
    }, { passive: false });

    /* Cuadro a cuadro: la posición se acerca al objetivo sin rebote; se dibuja solo si hace falta */
    let pos = objetivo;
    let visible = false;
    let raf = 0;
    let antes = performance.now();
    let spin = 0;
    pedir = () => { if (!raf && visible && !d.hidden) raf = requestAnimationFrame(cuadro); };
    function cuadro(t) {
      raf = 0;
      const dt = Math.min(0.05, (t - antes) / 1000);
      antes = t;
      const lento = quieto.matches;
      pos = lento ? objetivo : pos + (objetivo - pos) * (1 - Math.exp(-dt * 7));
      if (Math.abs(objetivo - pos) < 0.0005) pos = objetivo;
      inclX += (metaX - inclX) * (1 - Math.exp(-dt * 6));
      inclY += (metaY - inclY) * (1 - Math.exp(-dt * 6));
      if (!lento) spin += dt * 0.35;
      const sep = lienzo.clientWidth < 520 ? 1.7 : 2.3;
      soportes.forEach((s, j) => {
        let rel = mod(j - pos + N / 2) - N / 2;
        s.userData.rel = rel;
        const a = Math.abs(rel);
        s.visible = a < 2.6;
        if (!s.visible) return;
        s.position.set(rel * sep, 0, -a * 1.7);
        const k = Math.max(0, 1 - a);  // 1 en el centro, 0 a partir del vecino
        s.scale.setScalar(1 - Math.min(a, 2) * 0.16);
        s.rotation.y = -rel * 0.42;
        const giro = s.userData.giro;
        giro.rotation.y = k * (Math.sin(spin) * 0.55 + inclY);
        giro.rotation.x = k * inclX;
      });
      renderer.render(escena, camara);
      const r = Math.round(pos);
      if (mod(r) !== actual || out.nombre.textContent !== datos[mod(r)].nombre) mostrar(r);
      const moviendo = pos !== objetivo || Math.abs(metaX - inclX) > 0.001 || Math.abs(metaY - inclY) > 0.001 || !lento;
      if (moviendo) pedir();
    }

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; antes = performance.now(); pedir(); }).observe(lienzo);
    d.addEventListener('visibilitychange', () => { antes = performance.now(); pedir(); });
    medir();
  };

  /* Se descarga recién cuando la galería se acerca a la pantalla */
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    g.classList.add('is-cargando');
    cargar().catch((err) => { console.warn('Galería 3D:', err); g.classList.add('sin-3d'); }).finally(() => g.classList.remove('is-cargando'));
  }, { rootMargin: '400px 0px' });
  io.observe(lienzo);
})();
