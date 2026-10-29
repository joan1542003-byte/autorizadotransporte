# Campañas de recolección de RAEE — vista previa

Página estática (HTML/CSS/JS, sin build) de `campanasdereciclaje.cl`, enfocada solo en RAEE (residuos de aparatos eléctricos y electrónicos), según lo pedido por el cliente el 27-10-2026. Es una vista previa: `noindex` y `robots.txt` bloquean la indexación.

- `campanas-reciclaje.html`: la landing (hero con la ficha, galería 3D de aparatos, para quién, fases, servicios adicionales, preguntas frecuentes, cierre). `index.html` solo redirige a ella.
- `creditos.html`: tipografía, íconos, visor 3D y modelos, con autor y licencia. Enlazada al fondo de `preguntas.html` y en el pie. Lleva `noindex,follow` también en producción; las demás páginas llevan `noindex` solo mientras son vista previa.
- `preguntas.html`: todas las preguntas y los requisitos del DS 29/2024 (`#requisitos`), con el formato de las guías de Transporte (`ayuda/`); la ficha se abre flotando sobre ella. `requisitos-ds-29.html` redirige a esa sección.
- Galería de aparatos (`assets/campanas/galeria3d.js`): galería infinita con modelos 3D reales en una sola escena WebGL (three.js 0.170.0, MIT, copia local en `assets/campanas/vendor/three/`; en `GLTFLoader.js` se ajustó la ruta de `BufferGeometryUtils.js`). El visor y los modelos se descargan solo cuando la galería se acerca a la pantalla y se dibuja solo mientras está a la vista. Sin WebGL se ve una lista de respaldo.
- Modelos (`assets/campanas/modelos/`, unos 2 MB en total): siete modelos de Sketchfab con licencia CC BY 4.0 (celular, notebook, televisor, refrigerador, audífonos, lavadora y microondas; autores y enlaces en `MODELOS` del generador y en `creditos.html`), descargados con texturas de 1024 px y comprimidos con gltf-transform (`optimize --compress meshopt --texture-compress webp --texture-size 1024`; el notebook también con `--simplify-ratio 0.35`). Al televisor, al celular y al notebook se les quitó la imagen de la pantalla (queda apagada).
- Movimiento: el aparato del centro está quieto; mira hacia el cursor cuando pasa cerca y vuelve a quedarse quieto; con un clic se voltea despacio, muestra la parte de atrás unos segundos y regresa. Los laterales quedan más chicos y alejados; sin sombra. La categoría va en una píldora sobre la galería.
- Fotos de servicios adicionales: `assets/campanas/raee-retiro-domiciliario-1200.webp` y `raee-reutilizacion-1200.webp` (1200 × 800); mientras no existan, la tarjeta muestra su ícono.
- `assets/site/`: copia sin cambios del sistema de diseño de Transporte Autorizado (`joan1542003-byte/ambientalia-vistas-previas`, commit `fb4c3cf`): `site.css`, `transporte.css`, `site.js`, `pickers.js`, `seleccion.js`, `filas.js`, `transporte-ui.js` y la licencia de Lucide. No incluye el chat ni el agente. Si se actualiza el sistema en el otro repositorio, cópialo de nuevo aquí y sube la versión `?v=` en el HTML.
- `assets/campanas/`: imágenes de Campañas y `campanas.css`, con lo propio de estas páginas (ficha en tres pasos, brillo verde del hero, portadas de «para quién», galería y requisitos en preguntas).
- Acento verde de Campañas: `<body data-site="campanas">`.

La ficha no envía datos a ningún servidor: arma un resumen y abre WhatsApp (`56986067930`).

## Normativa citada (verificada el 29-10-2026)

- DS 29/2024 Minsal (Ley Chile, idNorma 1220286): publicado el 14-01-2026, vigente seis meses después (art. 45). Definición de campaña (art. 3 c), solicitud con 40 días hábiles de anticipación y antecedentes a) a k) (art. 24), condiciones con residuos peligrosos (art. 25) y de los lugares de recepción (art. 26), reporte RETC un mes después del término (art. 7), evaluación y observaciones (arts. 39 y 40), notificaciones (art. 42).
- DS 22/2025 MMA (Diario Oficial 07-05-2026, CVE 2805526): metas y obligaciones de pilas y AEE; sus Títulos III y IV rigen 24 meses después de la publicación (art. 49).
- DS 148/2003 Minsal (Ley Chile, idNorma 226458): manejo de residuos peligrosos.

El informe técnico del cliente cita el reporte RETC como «Art. 5»; el texto oficial lo pone en el art. 7. Su plan de contingencia omite «Sistema de comunicación», que sí está en el art. 24 h).
