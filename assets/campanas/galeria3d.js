/* Aparatos que se reciben: galería infinita con modelos 3D reales (three.js 0.170, MIT, copia local en vendor/three).
   Una sola escena y un solo <canvas>: el aparato del centro queda de frente y quieto; mira sutilmente hacia el cursor
   cuando este pasa cerca y vuelve a quedarse quieto; al hacerle clic se voltea despacio, muestra la parte de atrás unos
   segundos y regresa a su posición. Los
   demás esperan a los lados, más atrás y difuminados por la niebla. Se cambia deslizando, con la rueda o el trackpad
   en horizontal, con las flechas (pantalla y teclado), con los puntos o tocando un aparato lateral; al llegar al final
   vuelve a empezar. Al cambiar se actualizan el texto y «Incluir en la ficha» (data-add de filas.js).
   Optimización: three.js y los modelos (GLB con meshopt y texturas WebP de 1024 px, de Sketchfab, CC BY 4.0) se descargan
   recién cuando la galería se acerca a la pantalla; se dibuja solo mientras algo se mueve, está a la vista y la pestaña
   está activa;
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
    add: g.querySelector('[data-galeria-add]'),
  };
  const N = datos.length;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const movil = matchMedia('(max-width: 760px)');
  const base = g.dataset.modelos;
  /* Espera a un momento libre del navegador (con tope, para que no se quede esperando para siempre) */
  const libre = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 2000 }) : setTimeout(r, 200)));
  let objetivo = 0;   // índice entero al que se va (sin límite: la galería no tiene fin)
  let actual = 0;     // el que se muestra en el texto
  let en3d = false;    // con el 3D cargado, el texto lo actualiza cada cuadro

  /* Texto e indicadores: funcionan aunque el 3D no cargue */
  const mod = (n) => ((n % N) + N) % N;
  /* El texto cambia con un fundido: se desvanece, se reemplaza y vuelve a aparecer. Si se pasa rápido por varios
     aparatos, solo se escribe el último (no parpadea en cada uno). */
  let cambio = 0;
  const escribir = (j) => {
    const it = datos[j];
    out.cat.textContent = it.categoria;
    out.nombre.textContent = it.nombre;
    out.texto.textContent = it.texto;
    out.add.dataset.add = `aparatos=${it.categoria}`;
    puntos.forEach((b, i) => (i === j ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  };
  const mostrar = (k) => {
    const j = mod(k);
    if (j === actual) return;
    actual = j;
    clearTimeout(cambio);
    if (quieto.matches) { escribir(j); return; }
    g.classList.add('is-saliendo');
    cambio = setTimeout(() => { escribir(actual); g.classList.remove('is-saliendo'); }, 220);
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
    await libre();
    const pmrem = new THREE.PMREMGenerator(renderer);
    escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(2.5, 4, 5);
    escena.add(luz);
    /* La niebla toma el fondo de la sección: los aparatos de los lados se difuminan hacia él */
    const fondoDe = (el) => {
      for (; el; el = el.parentElement) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') return c;
      }
      return '#ffffff';
    };
    const fondo = new THREE.Color(fondoDe(g));
    escena.fog = new THREE.Fog(fondo, 5.6, 9.2);
    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camara.position.set(0, 0.38, 5.3);
    camara.lookAt(0, 0.05, 0);

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
    /* Carga de cada modelo: una órbita fina e inclinada en el verde del sitio, con un trazo que la recorre y un punto de
       luz en la punta, y un punto que late al centro. Cada una va desfasada y las de los lados quedan chicas y
       difuminadas por la niebla, así varias a la vez no se amontonan. Al llegar el modelo, la órbita se desvanece y el
       aparato entra con un fundido, subiendo apenas. Geometrías y materiales compartidos: cuestan casi nada. */
    const VERDE = 0x1c7a4b;
    const geoAnillo = new THREE.TorusGeometry(0.62, 0.0035, 6, 96);
    const geoTrazo = new THREE.TorusGeometry(0.62, 0.009, 6, 48, Math.PI * 0.55);
    const geoPunto = new THREE.SphereGeometry(0.028, 16, 12);
    const geoNucleo = new THREE.SphereGeometry(0.045, 20, 14);
    const crearCarga = (fase) => {
      const mat = (o) => new THREE.MeshBasicMaterial({ color: VERDE, transparent: true, opacity: o, depthWrite: false });
      const carga = new THREE.Group();
      carga.position.y = PISO + 0.8;
      const orbita = new THREE.Group();
      orbita.rotation.set(1.15, 0.35, 0);
      const anillo = new THREE.Mesh(geoAnillo, mat(0.16));
      const trazo = new THREE.Mesh(geoTrazo, mat(0.55));
      const punto = new THREE.Mesh(geoPunto, mat(0.95));
      punto.position.set(0.62, 0, 0);
      const giroTrazo = new THREE.Group();
      giroTrazo.add(trazo, punto);
      trazo.rotation.z = -Math.PI * 0.55;
      orbita.add(anillo, giroTrazo);
      const nucleo = new THREE.Mesh(geoNucleo, mat(0.35));
      carga.add(orbita, nucleo);
      carga.userData = { giroTrazo, nucleo, fase, mats: [anillo, trazo, punto, nucleo].map((m) => [m.material, m.material.opacity]) };
      return carga;
    };
    const ENTRADA = 900;  // ms
    const entrar = (s, avance) => {
      const e = Math.min(1, avance);
      const k = 1 - (1 - e) ** 3;  // sale rápido y frena suave
      s.userData.modelo.position.y = s.userData.y0 - 0.12 * (1 - k);
      s.userData.fundidos.forEach(([m, o]) => { m.opacity = o * k; });
      const c = s.userData.carga;
      if (c) c.userData.mats.forEach(([m, o]) => { m.opacity = o * Math.max(0, 1 - e * 2.2); });
      if (e >= 1) {
        s.userData.fundidos.forEach(([m, o, tr]) => { m.opacity = o; m.transparent = tr; });
        if (c) { c.removeFromParent(); c.userData.mats.forEach(([m]) => m.dispose()); s.userData.carga = null; }
        s.userData.entrada = 0;
      }
    };
    const soportes = datos.map((it) => {
      const soporte = new THREE.Group();
      const giro = new THREE.Group();   // mirada hacia el cursor y vuelta al hacer clic
      soporte.add(giro);
      const carga = crearCarga(Math.random() * Math.PI * 2);
      soporte.add(carga);
      soporte.userData = { giro, base: it.giro || 0, listo: false, it, carga };
      escena.add(soporte);
      return soporte;
    });
    /* De a un modelo y en tiempo libre: se descarga, se decodifica (las texturas fuera del hilo principal), se compilan
       sus shaders en segundo plano (compileAsync) y recién entonces entra a la escena. Así el resto de la página sigue
       fluida mientras llegan. Primero el del centro y sus vecinos; después el resto. */
    const cargarModelo = async (j) => {
      const s = soportes[j];
      try {
        const gltf = await loader.loadAsync(base + s.userData.it.modelo);
        const obj = gltf.scene;
        obj.rotation.set(s.userData.it.incl || 0, s.userData.base, 0);
        ajustar(obj, s.userData.it.alto || 1.55);
        await libre();
        if (renderer.compileAsync) await renderer.compileAsync(obj, camara, escena);
        subirYLiberar(obj);
        /* Fundido de entrada: los materiales pasan a transparentes mientras dura y después vuelven a como venían */
        const fundidos = [];
        obj.traverse((o) => {
          if (!o.isMesh) return;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (fundidos.some(([x]) => x === m)) return;
            fundidos.push([m, m.opacity, m.transparent]);
            m.transparent = true;
            m.opacity = 0;
          });
        });
        Object.assign(s.userData, { modelo: obj, y0: obj.position.y, fundidos, entrada: performance.now() });
        s.userData.giro.add(obj);
        g.classList.add('is-lista');
        pedir();
      } catch (err) {
        console.warn('Galería 3D:', s.userData.it.modelo, err);
      }
    };
    /* Memoria (pensado para PC con 1 a 2 GB de RAM): cada textura se sube a la tarjeta de video y enseguida se suelta la
       copia decodificada que queda en la RAM (ImageBitmap). three.js no la vuelve a leer mientras la textura no cambie;
       solo la necesitaría si se pierde el contexto de WebGL, y en ese caso se muestra la lista de respaldo. */
    const MAPAS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap',
      'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'specularIntensityMap',
      'specularColorMap', 'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap'];
    const subirYLiberar = (obj) => {
      const texturas = new Set();
      obj.traverse((o) => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => MAPAS.forEach((k) => m[k] && texturas.add(m[k])));
      });
      texturas.forEach((t) => {
        renderer.initTexture(t);
        const img = t.source.data;
        if (!img || !img.width) return;
        t.source.data = { width: img.width, height: img.height };
        if (typeof img.close === 'function') img.close();
      });
    };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); g.classList.add('sin-3d'); });

    const orden = [0, 1, N - 1, 2, N - 2, ...datos.keys()].filter((v, i, a) => a.indexOf(v) === i && v < N);
    (async () => { for (const j of orden) { await libre(); await cargarModelo(j); } })();

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
      /* La niebla empieza justo detrás del aparato central: solo difumina los de los lados */
      escena.fog.near = camara.position.z + 0.5;
      escena.fog.far = camara.position.z + 5;
      camara.updateProjectionMatrix();
      pedir();
    };
    new ResizeObserver(medir).observe(lienzo);
    g.classList.add('is-lista');  // el lienzo aparece ya con las órbitas de carga

    /* Cursor: inclinación del aparato central; arrastre para pasar al siguiente */
    let inclX = 0, inclY = 0, metaX = 0, metaY = 0;
    let arrastre = null;
    const ancho = () => lienzo.clientWidth * (movil.matches ? 0.38 : 0.28);
    lienzo.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      if (e.pointerType === 'mouse' && !arrastre) {
        metaY = ((e.clientX - r.left) / r.width - 0.5) * 0.85;
        metaX = ((e.clientY - r.top) / r.height - 0.5) * 0.34;
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
      const { movio, desde } = arrastre;
      arrastre = null;
      if (movio) {
        /* Al soltar: un gesto corto ya pasa al siguiente (o al anterior); uno largo puede saltar más de uno */
        const delta = objetivo - desde;
        objetivo = Math.round(desde) + (Math.abs(delta) < 0.1 ? 0 : Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta))));
        pedir();
        return;
      }
      /* Un toque sin arrastre: si cae sobre un aparato lateral, va a él */
      const r = lienzo.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
      const hit = ray.intersectObjects(soportes.filter((s) => s.visible), true)[0];
      if (!hit) return;
      let o = hit.object;
      while (o && !soportes.includes(o)) o = o.parent;
      const rel = o?.userData.rel;
      if (rel === undefined) return;
      if (Math.abs(rel) > 0.5) ir(Math.round(objetivo + rel));
      else if (!quieto.matches && !o.userData.vuelta) { o.userData.vuelta = performance.now(); pedir(); }
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
    /* Clic: se voltea (media vuelta), se queda unos segundos mostrando la parte de atrás y vuelve a su posición */
    const IDA = 1800, PAUSA = 2600, VUELTA = IDA * 2 + PAUSA;  // ms
    const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    pedir = () => { if (!raf && visible && !d.hidden) raf = requestAnimationFrame(cuadro); };
    function cuadro(t) {
      raf = 0;
      const dt = Math.min(0.05, (t - antes) / 1000);
      antes = t;
      const lento = quieto.matches;
      pos = lento ? objetivo : pos + (objetivo - pos) * (1 - Math.exp(-dt * 7));
      if (Math.abs(objetivo - pos) < 0.0005) pos = objetivo;
      inclX += (metaX - inclX) * (1 - Math.exp(-dt * 9));
      inclY += (metaY - inclY) * (1 - Math.exp(-dt * 9));
      const sep = lienzo.clientWidth < 520 ? 1.95 : 2.75;
      let girando = false;
      soportes.forEach((s, j) => {
        let rel = mod(j - pos + N / 2) - N / 2;
        s.userData.rel = rel;
        const a = Math.abs(rel);
        s.visible = a < 2.6;
        if (!s.visible) return;
        s.position.set(rel * sep, 0, -a * 2.3);
        const k = Math.max(0, 1 - a);  // 1 en el centro, 0 a partir del vecino
        s.scale.setScalar(1 - Math.min(a, 2) * 0.27);
        s.rotation.y = -rel * 0.42;
        const c = s.userData.carga;
        if (c && !s.userData.entrada) {
          /* Esperando el modelo: el trazo recorre la órbita y el núcleo late (quieto si se pidió menos movimiento) */
          if (!lento) {
            const u = t / 1000 + c.userData.fase;
            c.userData.giroTrazo.rotation.z = -u * 2.4;
            c.userData.nucleo.scale.setScalar(1 + Math.sin(u * 2.2) * 0.18);
          }
          girando = true;
        }
        if (s.userData.entrada) { entrar(s, lento ? 1 : (t - s.userData.entrada) / ENTRADA); girando = true; }
        const giro = s.userData.giro;
        let vuelta = 0;
        if (s.userData.vuelta) {
          const ms = t - s.userData.vuelta;
          if (ms >= VUELTA) s.userData.vuelta = 0;
          else {
            const ida = Math.min(1, ms / IDA);
            const regreso = Math.max(0, (ms - IDA - PAUSA) / IDA);
            vuelta = (suave(ida) - suave(regreso)) * Math.PI;
            girando = true;
          }
        }
        giro.rotation.y = k * inclY + vuelta;
        giro.rotation.x = k * inclX;
      });
      renderer.render(escena, camara);
      const r = Math.round(pos);
      if (mod(r) !== actual) mostrar(r);
      const moviendo = pos !== objetivo || Math.abs(metaX - inclX) > 0.0005 || Math.abs(metaY - inclY) > 0.0005 || girando;
      if (moviendo) pedir();
    }

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; antes = performance.now(); pedir(); }).observe(lienzo);
    d.addEventListener('visibilitychange', () => { antes = performance.now(); pedir(); });
    medir();
  };

  /* El 3D es lo último del sitio: espera a que la página termine de cargar (imágenes y demás), a que el navegador esté
     libre y a que la galería se acerque a la pantalla. Recién ahí descarga three.js y los modelos. */
  const cargada = new Promise((r) => (d.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    await cargada;
    await libre();
    g.classList.add('is-cargando');
    /* «Cargando…» se ve hasta que entra el primer modelo (is-lista) */
    cargar().catch((err) => { console.warn('Galería 3D:', err); g.classList.add('sin-3d'); });
  }, { rootMargin: '300px 0px' });
  io.observe(lienzo);
})();
