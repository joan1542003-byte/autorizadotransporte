# Campañas de recolección de RAEE — vista previa

Página estática (HTML/CSS/JS, sin build) de `campanasdereciclaje.cl`, enfocada solo en RAEE (residuos de aparatos eléctricos y electrónicos), según lo pedido por el cliente el 27-10-2026. Es una vista previa: `noindex` y `robots.txt` bloquean la indexación.

- `campanas-reciclaje.html`: la landing (hero con la ficha, galería 3D de aparatos, para quién, fases, servicios adicionales, preguntas frecuentes, cierre). `index.html` solo redirige a ella.
- `preguntas.html`: todas las preguntas y los requisitos del DS 29/2024 (`#requisitos`), con el formato de las guías de Transporte (`ayuda/`); la ficha se abre flotando sobre ella. `requisitos-ds-29.html` redirige a esa sección.
- Galería de aparatos (`assets/campanas/galeria.js`): carrusel con scroll-snap; el aparato del centro queda de frente y los demás se giran y difuminan según su distancia al centro. Foto recortada con fondo transparente en `assets/campanas/raee-<tipo>-recorte.webp` (800 × 800): `raee-computadores`, `raee-pantallas`, `raee-pequenos`, `raee-grandes`. Mientras no exista, se ve el ícono.
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
