# Campañas de recolección de RAEE — vista previa

Página estática (HTML/CSS/JS, sin build) de `campanasdereciclaje.cl`, enfocada solo en RAEE (residuos de aparatos eléctricos y electrónicos), según lo pedido por el cliente el 27-10-2026. Es una vista previa: `noindex` y `robots.txt` bloquean la indexación.

- `index.html`: la landing (hero con la ficha, para quién, servicios adicionales, cómo funciona, galería 3D de aparatos, preguntas frecuentes, cierre). `campanas-reciclaje.html` redirige a ella.
- SEO y GEO: título, descripción, canónica en `https://campanasdereciclaje.cl/`, imagen para redes (`assets/campanas/og-campanas-raee.jpg`, 1200 × 630, Open Graph y Twitter) y datos estructurados JSON-LD (Organization, WebSite, Service con sus fases y servicios, WebPage, FAQPage con las preguntas visibles, BreadcrumbList y los decretos como Legislation). `sitemap.xml` y `llms.txt` (resumen para buscadores con IA, con artículos y fuentes). Al publicar en el dominio se cambia `PRODUCCION = True` en el generador: las páginas pasan a `index,follow` y `robots.txt` deja pasar y apunta al sitemap; `creditos.html` sigue con `noindex`.
- Pie: logo de Yo Reciclo (`assets/campanas/yoreciclo.svg`, enlace a yoreciclo.cl) en «Sitios relacionados».
- `creditos.html`: tipografía, íconos, visor 3D y modelos, con autor y licencia. Enlazada al fondo de `preguntas.html` y en el pie. Lleva `noindex,follow` también en producción; las demás páginas llevan `noindex` solo mientras son vista previa.
- `preguntas.html`: todas las preguntas y los requisitos del DS 29/2024 (`#requisitos`), con el formato de las guías de Transporte (`ayuda/`); la ficha se abre flotando sobre ella. `requisitos-ds-29.html` redirige a esa sección.
- Galería de aparatos (`assets/campanas/galeria3d.js`): galería infinita con modelos 3D reales en una sola escena WebGL (three.js 0.170.0, MIT, copia local en `assets/campanas/vendor/three/`; en `GLTFLoader.js` se ajustó la ruta de `BufferGeometryUtils.js`). El 3D es lo último en cargar: espera el evento `load` de la página, un momento libre del navegador (`requestIdleCallback`) y que la galería se acerque a la pantalla; luego baja los modelos de a uno, compila sus shaders en segundo plano (`compileAsync`) y solo dibuja mientras algo se mueve y está a la vista. Mientras carga cada modelo se ve una órbita fina con un trazo que la recorre; al llegar, el modelo entra con un fundido. Sin WebGL se ve una lista de respaldo.
- Modelos (`assets/campanas/modelos/`, unos 2 MB en total): siete modelos de Sketchfab con licencia CC BY 4.0 (celular, notebook, televisor, refrigerador, audífonos, lavadora y microondas; autores y enlaces en `MODELOS` del generador y en `creditos.html`), descargados con texturas de 1024 px y comprimidos con gltf-transform (`optimize --compress meshopt --texture-compress webp --texture-size 1024`; el notebook también con `--simplify-ratio 0.35`). Al televisor, al celular y al notebook se les quitó la imagen de la pantalla (queda apagada). Después se aligeraron para PC de 1 a 2 GB de RAM sin cambiar lo que se ve: las texturas de más de 512 px que se podían achicar con PSNR ≥ 42 dB pasaron a 512 (memoria de video estimada de 176 a 126 MB), y en `galeria3d.js` cada textura se sube a la tarjeta de video y se suelta su copia decodificada en la RAM.
- Movimiento: el aparato del centro está quieto; mira hacia el cursor cuando pasa cerca y vuelve a quedarse quieto; con un clic se voltea despacio, muestra la parte de atrás unos segundos y regresa. Los laterales quedan más chicos y alejados; sin sombra. La categoría va en una píldora sobre la galería.
- Hero: `campanas-punto-entrega` en AVIF (`-720`, `-1100` y `-1536.avif`, calidad 50) con WebP de respaldo (`-720`, `-1100` y `-1536.webp`); el teléfono toma 720 o 1100 según su densidad y el escritorio 1100 o 1536, y la precarga pide la misma (`imagesrcset`). La foto: vecinos entregando aparatos en toldos verdes, con el camión tolva al fondo y sin contenedores, sobre el fondo de color `.stage-color`. En el teléfono el hero ocupa la pantalla bajo la barra y la foto toma el alto que sobra. En escritorio, al pasar por «¿Qué aparatos se reciben?» se ve `raee-aparatos-1672.webp` y por «¿Prefieres conversar?», `raee-conversar-1672.webp`.
- Nombre del sitio: «Campañas de recolección». Logo: `assets/campanas/logo.svg` (100 × 31, entregado el 05-11-2026; en CSS va como `logo.svg?v=2`); favicon: `favicon.svg`, y `apple-touch-icon.png` se generó desde él. El logo se pinta con una máscara y, como en Transporte, cambia de color mientras el puntero está encima (`assets/campanas/campanas.js`; morado, naranjo, rojo y negro).
- Fotos de servicios adicionales: `assets/campanas/raee-retiro-domiciliario-1448.webp` y `raee-reutilizacion-1448.webp` (1448 × 1086, del cliente).
- `assets/site/`: copia sin cambios del sistema de diseño de Transporte Autorizado (`joan1542003-byte/ambientalia-vistas-previas`, commit `258849f`): `site.css`, `transporte.css`, `site.js`, `pickers.js`, `seleccion.js`, `filas.js`, `transporte-ui.js`, `ayuda.js`, `geo.js`, `mapa.js`, la fuente Nunito (`fonts/`), Leaflet y NumberFlow (`vendor/`) y la licencia de Lucide. Los datos del mapa (calles, puntos, comunas y direcciones de OpenStreetMap) van en `assets/transporte/`, con la misma ruta que en Transporte. No incluye el chat ni el agente. Si se actualiza el sistema en el otro repositorio, cópialo de nuevo aquí y sube la versión `?v=` en el HTML.
- `assets/campanas/`: imágenes de Campañas y `campanas.css`, con lo propio de estas páginas (ficha en tres pasos, brillo verde del hero, portadas de «para quién», galería y requisitos en preguntas).
- Acento verde de Campañas: `<body data-site="campanas">`.

La ficha no envía datos a ningún servidor: arma un resumen y abre WhatsApp (`56986067930`). Las fotos que se adjuntan no viajan por el enlace de WhatsApp: el resumen y el «¡Gracias!» ofrecen «Compartir fotos» (menú del sistema) o copiarlas para pegarlas en el mismo chat.

## Normativa citada (verificada el 29-10-2026)

- DS 29/2024 Minsal (Ley Chile, idNorma 1220286): publicado el 14-01-2026, vigente seis meses después (art. 45). Definición de campaña (art. 3 c), solicitud con 40 días hábiles de anticipación y antecedentes a) a k) (art. 24), condiciones con residuos peligrosos (art. 25) y de los lugares de recepción (art. 26), reporte RETC un mes después del término (art. 7), evaluación y observaciones (arts. 39 y 40), notificaciones (art. 42).
- DS 22/2025 MMA (Diario Oficial 07-05-2026, CVE 2805526): metas y obligaciones de pilas y AEE; sus Títulos III y IV rigen 24 meses después de la publicación (art. 49).
- DS 148/2003 Minsal (Ley Chile, idNorma 226458): manejo de residuos peligrosos.

## Cambios del 05-11-2026

- Solo RAEE y solo la Región Metropolitana: el selector de comuna muestra solo esa región (`campanas.js` reduce `PICK.REGION_NAMES`; `filas.js` sigue sin cambios). Título, descripción, JSON-LD (`areaServed`) y `llms.txt` lo dicen.
- Plazo a la vista: la autorización sanitaria se pide con al menos dos meses de anticipación, 40 días hábiles antes del inicio (DS 29/2024, arts. 24 y 39). Al abrir «Quiero organizar una campaña», el título y la bajada del hero cambian al plazo (`.hero-cambia`, según `data-view` del hero); también va en la ficha, «Cómo funciona», las preguntas y los requisitos.
- Ficha: se elige el mes de la campaña, no el día (`[data-meses]`, que abre `campanas.js`: doce meses desde el primero posible, contando 40 días hábiles de lunes a viernes, sin feriados, agrupados bajo su año). «Cantidades estimadas» pasó a «Peso total estimado», un deslizador por rangos con una pesa que se llena (`[data-peso]`), para todos los aparatos en conjunto (los tipos y cantidades se precisan en la reunión). Se quitaron «Estado predominante» y «Estado sanitario». «Más información» pide «Condiciones del lugar».
- Servicios adicionales: son para municipalidades, no vienen incluidos en la campaña, se cotizan aparte y se prestan durante ella. En la ficha solo aparecen con «Municipalidad», y «Consultar» la preselecciona.
- `preguntas.html` ya no lista los antecedentes de la solicitud (art. 24, letras a a k) ni el plan de contingencia (art. 24 h), que es parte de ellos.
- El generador de las páginas (fuera del repositorio) ya no está: desde ahora se edita el HTML directamente.

## Cambios del 05-11-2026 (2)

- El panel del hero usa siempre todo el alto disponible, para no cambiar de tamaño entre pasos.
- El resumen dice «Enviar» (sin «por WhatsApp»); por ahora sigue abriendo WhatsApp. Queda por confirmar que la ficha llegue por correo: `site.js` ya muestra «Enviar por correo» si el formulario declara `data-mail`, pero falta la dirección y decidir si se envía sin pasar por el programa de correo de la persona.
- Fondo de todo el sitio: papel verde sutil (`body[data-site="campanas"]` en `campanas.css`), igual en todas las secciones; tarjetas y paneles siguen blancos.
- El cierre «Cuéntanos tu idea» pasó a «¿Tu campaña es en los próximos meses?», con el plazo de dos meses y la reunión para definir aparatos, cantidades y lugares.

## Cambios del 05-11-2026 (3)

- Imágenes del cliente (05-11-2026), en WebP: el camión con toldo en la imagen para redes (`og-campanas-raee.jpg`, 1200 × 630); vecinos, oficina y bodega en las portadas de «Una campaña para cada organización» (`campanas-municipalidad`, `-empresa`, `-sistema-gestion`, 960 × 720); la reunión en el cierre (`campanas-reunion-1200.webp`). Todas con texto alternativo descriptivo, en el JSON-LD (`image` del Service y del WebPage) y en `sitemap.xml`.
- Peso total estimado: deslizador continuo de 100 kg a 20 toneladas en escala logarítmica, con marcas (100 kg, 1 t, 5 t, 20 t o más). Dice el peso aproximado del punto, redondeado, y su tramo; la pesa se llena según la posición y sigue al dedo sin retraso.
- Movimiento: entradas de secciones, pasos, ventanas y tarjeta del hero con desplazamiento, escala y un leve desenfoque; los botones y opciones se hunden al presionar y vuelven con un rebote corto; tarjetas que se elevan al pasar el puntero. Todo se apaga con «reducir movimiento».

## Cambios del 05-11-2026 (4)

- Personajes: Don Reco (el perro) y Lola Lata (la gata). Al presionar «Enviar» en el resumen de la ficha, aparecen en grande cubriendo el panel, con «¡Gracias!», «Ver resumen» (vuelve al resumen) y «Volver» (cierra el panel, como la X) (`[data-ficha-enviada]`, `campanas.js`). Son un WebP animado de 400 × 400 (`campanas-reco-lola.webp`, 222 KB; el GIF pesaba 1,7 MB) que se pide al preparar la ficha, no al cargar la página; con «reducir movimiento», un cuadro quieto.
- Fondo blanco en todo el sitio; el verde queda en detalles (raya bajo los títulos de sección, «+» de las preguntas, selección de texto, borde de las tarjetas al pasar el puntero y línea del pie). La barra superior lleva la sombra oscura del sistema.
- Con un solo fondo, el espacio entre secciones bajó a la mitad (`.section` en `campanas.css`).
- La ficha dice «Campaña» (no «La campaña»); «Empresas» es «Para equipos en desuso».
- Material interno (informes, notas de reuniones, prompts de imágenes) no va en este repositorio: GitHub Pages publica todos sus archivos, README incluido.

## Normativa (05-11-2026)

- `normativa.html` y una página por norma: `ds-29-2024-minsal.html`, `ds-22-2025-mma.html` y `ley-20920.html`. Cada una trae lo que exige a una campaña de RAEE en simple (con la cita a su artículo), los artículos que aplican tal como los publica la fuente oficial, preguntas frecuentes y datos estructurados (Legislation, WebPage, BreadcrumbList, FAQPage). Están en el menú, en el pie y en `sitemap.xml` y `llms.txt`; las citas de `preguntas.html` llevan al artículo en el sitio.
- Las genera `python3 tools/normativa.py`, con `preguntas.html` como plantilla (cabecera, ficha flotante, pie y scripts): si cambia el diseño de `preguntas.html`, se vuelve a correr. Los textos están en `tools/cache/`: el XML de Ley Chile del DS 29/2024 y de la Ley 20.920 (`--actualizar` los vuelve a descargar y avisa si cambiaron) y el texto del DS 22/2025 extraído del PDF del Diario Oficial (CVE 2805526), que no está en Ley Chile como XML. Revisados el 05-11-2026: iguales a la versión vigente.
- El formato de los artículos es el de la biblioteca de normativa de Transporte Autorizado (`tools/normativa.py` de ese repositorio).

## Cambios del 13-11-2026

- Guías y checklists (`python3 tools/ayuda.py`, que también vuelve a generar la normativa): `paso-a-paso.html`, `tamano-de-los-aparatos.html` y `autorizacion-sanitaria.html`, y un checklist por etapa (`checklist-planificacion`, `-autorizacion-sanitaria`, `-preparacion-ejecucion`, `-cierre-reporte`). Las preguntas salen de la guía rápida del cliente, revisadas contra el DS 29/2024 (cada una cita su artículo). Se responde Sí, No o No sé; con No o No sé aparece qué hacer (por ejemplo, cómo obtener la autorización sanitaria), y la respuesta se quita tocándola de nuevo o con «Quitar respuesta». Las respuestas quedan en el dispositivo (`assets/campanas/checklist.js`); «Tus pendientes» las reúne y se puede imprimir o guardar en PDF.
- Menú «Ayuda» con el mismo diseño que el de Transporte (guías, checklists y normativa); reemplaza el enlace «Normativa» de la barra. Lo arma `tools/ayuda.py` entre `<!-- ayuda:menu:inicio -->` y `<!-- ayuda:menu:fin -->`.
- «Cómo funciona una campaña»: solo el título de cada etapa; al tocarlo se despliega su resumen, con el checklist y el paso a paso (entre `<!-- ayuda:etapas:inicio -->` y `<!-- ayuda:etapas:fin -->`).
- Tamaño de los aparatos: ni la Ley 20.920 ni el DS 22/2025 definen «pequeño» o «grande»; el DS 22 agrupa en intercambio de temperatura, paneles fotovoltaicos y otros. Para organizar la campaña se usa la referencia europea (Directiva 2012/19/UE): pequeño si ninguna medida supera 50 cm. Se dice así en la guía, con ejemplos, y en las tarjetas de «¿Qué aparatos se reciben?».
- Servicios adicionales: dicen lo que hacen (no lo que no incluyen), con la tarjeta de Transporte (foto y texto; «Sumar a mi campaña» y «Cómo funciona» debajo).
- Ficha: «¿Dónde será la campaña?» abre el mapa de OpenStreetMap con las calles de la comuna elegida (`data-mapa` en la fila de texto; el punto viaja como enlace en «Ubicación en el mapa»), y en «Aparatos» se pueden adjuntar hasta 6 fotos (el componente de Transporte, `[data-adjuntos]`).
- Carga: en la portada solo `site.js` va con `defer`; los demás scripts se piden después de pintar la foto del hero (`data-tarde-src`), y un toque que llega antes se repite al cargarlos. Las fotos de abajo llevan `srcset` (480/720/960 en las portadas, 720/1448 en los servicios) y `data-tarde-img`; las secciones bajo la primera pantalla, `content-visibility: auto`. La galería 3D pregunta por WebGL recién al acercarse.
- Lighthouse 13.6 simulando producción (sin `noindex`): escritorio 100 en rendimiento, accesibilidad, prácticas recomendadas, SEO y navegación con agentes; teléfono 99 en rendimiento (LCP 2,1 s) y 100 en lo demás. Guías, checklists y preguntas: 100 en todo.
- Créditos: Leaflet y OpenStreetMap.
- Pendiente: la dirección de correo para «Enviar por correo» (`data-mail` en el formulario) y, si se quiere confirmación automática por correo o recibir las fotos en un servidor, un servicio que reciba la ficha.

## Cambios del 13-11-2026 (2)

- Colores: cada categoría de «Ayuda» tiene el suyo, sin rojos (paso a paso azul, tamaño violeta, autorización petróleo, checklists ámbar, normativa índigo), en el menú y en sus páginas (`data-tema` en el `<body>`, `campanas.css`). El verde queda para la marca y la acción principal.
- Guías más livianas: sin íconos en las listas (un punto del color del tema), el comienzo de cada paso en negrita, citas legales discretas, «Al terminar esta etapa» en gris y «Etapa N de 4» sobre cada título del paso a paso. Checklists sin rojo: «No» en gris oscuro, «No sé» y «Qué hacer» en ámbar.
- «Cómo funciona una campaña»: cada etapa dice qué se hace, quién, cuándo y su resultado, con enlaces al checklist y al paso a paso.
- Ficha: «Peso total estimado» es una fila opcional con tramos (antes, un deslizador); «Aparatos» muestra bajo cada tipo su tamaño y ejemplos, la ventana trae plegada «¿Qué tamaño tiene cada tipo?» y la fila tiene un «?» con la misma tabla de medidas aproximadas (`tools/ayuda.py`, entre `<!-- ayuda:tamanos:inicio -->` y `<!-- ayuda:tamanos:fin -->`). La galería 3D pone el microondas en «Pequeños aparatos».
- Mapa: una calle con número en el nombre («Ruta 68») ya no repite el número al mover el punto (`geo.js`, `seleccion.js`; también en Transporte).
- `creditos.html` toma la ficha flotante de `preguntas.html` al correr `tools/ayuda.py` (tenía una versión antigua).

## Cambios del 13-11-2026 (3)

- Cierre de cada checklist: «Guardar en PDF» y «Cotizar mi campaña», uno al lado del otro, y la etapa siguiente como enlace (en la etapa 4 había dos «Organizar una campaña»).
- Checklists en la ficha: cada checklist deja su resumen en el navegador (`cr-res-<etapa>`, `checklist.js`); si hay alguno, el paso «Campaña» de la ficha muestra «Incluir mis checklists» (marcado) y cada etapa va al resumen y a WhatsApp con cuántas se respondieron y, textuales, las preguntas que quedaron en No o No sé. Lo arma `tools/ayuda.py` entre `<!-- ayuda:ck-ficha:inicio -->` y `<!-- ayuda:ck-ficha:fin -->`.

## Pulido con referencias de diseño (26-11-2026)

Referencias del cliente: Vercel Web Interface Guidelines, las 13 reglas de tipografía de Lucas, cuándo poner íconos en botones (Caleb Porzio), Anti UI Slop (uizze), Taste Skill, Impeccable, el skill frontend-design de Anthropic y Emil Kowalski (además de shadcn, Radix, Vaul, Sonner y las demás librerías de la lista, como patrones).
- Texto corrido en líneas de hasta unos 68 caracteres (antes, hasta 130); cifras de ancho fijo en conteos y medidas; espacios que no se cortan entre número y unidad y en «art. 24» o «DS 29/2024» (`nbsp()` en `tools/ayuda.py`).
- Títulos en 700 (antes 800) y sin punto final en los títulos de sección.
- Una sola acción rellena por pantalla: «Sumar a mi campaña» pasa a botón secundario. Sin flecha en los botones que abren la ficha (la flecha queda para los enlaces que llevan a otra página); «Ver más preguntas» pasa a «Todas las preguntas».
- Fuera lo que se lee como plantilla: la píldora «Para municipalidades · Durante la campaña» (repetía el título de la sección), la raya verde bajo las fotos de los servicios, la barra lateral de «Qué hacer» en los checklists y el degradado de la raya bajo los títulos.
- Movimiento: sin entradas al hacer scroll (todas las secciones entraban igual); transiciones de paneles, pasos y ventanas más cortas y sin desenfoque; acercamiento de las fotos al pasar el puntero de 1,05 a 1,03 y solo con puntero.
- Tacto: enlaces sueltos de al menos 24 px de alto; campos a 16 px en pantallas táctiles (el iPhone ya no acerca la página al escribir); en el teléfono, el hero deja libre el espacio del botón de ayuda flotante (tapaba «¿Prefieres conversar?»).
- Enlaces: 919 internos revisados; la guía de tamaños citaba el art. 2 del DS 22/2025, que faltaba en su página y se agregó desde el texto oficial. Externos, todos responden salvo yoreciclo.cl, que no tiene DNS configurado (el dominio está registrado).

## Componentes e interacciones nuevos (26-11-2026)

- Buscador de la ayuda, como cmdk (`campanas.js`): ⌘K o Ctrl+K, o «Buscar…» arriba del panel «Ayuda». Busca en guías (y sus secciones), cada pregunta de los checklists, las preguntas frecuentes de todas las páginas, los artículos de las normas y las medidas de aparatos; agrupa, marca lo buscado y se maneja con flechas, Enter y Esc. El índice (`assets/campanas/ayuda-indice.json`) lo arma `tools/ayuda.py` y se descarga al abrir el buscador.
- «¿Hasta cuándo pedir la autorización?» (#plazo, en «Cómo funciona»): se elige el primer día de la campaña y una línea de tiempo muestra el último día para presentar la solicitud (40 días hábiles antes, de lunes a viernes; dice que es aproximado por los feriados), la revisión de la SEREMI y el inicio. «Organizar esta campaña» abre la ficha con ese mes.
- Avisos como Sonner: se apilan, se despliegan al pasar el puntero, duran 4 s (se pausan con el puntero, el foco o la pestaña oculta) y se cierran con su botón o deslizándolos. Reemplazan `window.SITE.toast` solo en Campañas.
- Preguntas con dirección propia: cada pregunta desplegable tiene id (`#p-…`, y `#como-funciona-N` en la portada); al abrirla, la URL la lleva y se puede compartir; al llegar con ese enlace, se abre.
- Portadas de «Una campaña para cada organización»: la foto real con una sombra abajo (antes, teñida de verde) y el texto alineado a la izquierda.

## Pulido sin errores (26-11-2026, 2)

- Sin trazos verticales decorativos: el índice de artículos de las normas marca el actual con un fondo (sin la barra que se deslizaba), el «Cómo funciona» de los servicios y el resultado marcado del buscador van sin raya al lado. Guías y checklists sin la etiqueta sobre el título (las migas ya dicen dónde se está); el menú «Ayuda» sin cadenas «8 preguntas · …».
- Buscador: lupa en la cabecera (también en el teléfono); entiende sinónimos y formas comunes (refri, tele, precio, fecha, permiso, municipio…) y plurales; busca también en el texto de cada sección de las guías, en el «Qué hacer» de cada pregunta de los checklists, en los puntos «en simple» de las normas y en los aparatos de la galería (130 entradas); los grupos se ordenan por su mejor resultado.
- Portadas de «para quién»: sombra más firme y sombra en el texto; el texto sobre las fotos queda en 7,6:1 o más (medido sobre los píxeles reales).
- Revisión: axe-core (WCAG 2.2 A/AA y buenas prácticas) en todas las páginas y con el menú «Ayuda», el buscador, la ficha y un selector abiertos, en escritorio y teléfono: 0 problemas; sin errores de consola.

## Fotos del cliente y buscador con respuestas (26-11-2026)

- Fotos en `assets/campanas/guias/` (720/1280 y recorte de cabecera `-cab-`) y `assets/campanas/aparatos/` (categorías y aparatos). Las ubica `tools/ayuda.py` (`foto()`, `FOTOS`, `MEDIDA_FOTO`). En el teléfono, la franja de cabecera es 4:1 para que el título siga siendo lo principal (Lighthouse 100).
- Buscador (`campanas.js`): recomendaciones sin texto (avance de checklists, lo más buscado, búsquedas recientes en este dispositivo), miniaturas y respuestas rápidas con gráfico (plazo, medida contra 50 cm, avance, pilas, costo, retiro domiciliario).
- `filas.js` (compartido): opciones con foto (`data-img` / `data-imgs`). Falta llevarlo a Transporte.
- Anclas: con `#destino` las secciones se dibujan completas (antes `#plazo` quedaba corrido).

## Carrusel de aparatos y buscador que se agranda (26-11-2026)

- La galería 3D (three.js y siete modelos .glb, unos 2 MB) se reemplazó por un carrusel infinito con perspectiva (`assets/campanas/carrusel.js`): ocho fotos del cliente por dentro de un cilindro; arrastre con inercia, rueda horizontal, flechas, toque en una tarjeta lateral y avance automático con pausa. Su HTML lo genera `tools/ayuda.py` (`APARATOS`, `carrusel_html()`) y es también el grupo «Aparatos» del buscador. Créditos actualizados.
- Buscador: las filas son compactas y la marcada (puntero o flechas) se agranda con su foto, título y descripción, sin que la lista salte bajo el puntero.
- Etapas del checklist: todas del mismo alto.
- Carrusel (segunda versión): las tarjetas de los lados se curvan (cada una se dibuja en 16 franjas sobre el cilindro; la curva crece al alejarse del centro) y la del centro queda plana. Al tocar la del centro (o Enter) se voltea y muestra su grupo, medida típica y nota. El alto de la escena se calcula para que nada se corte abajo. Se arma recién cuando el carrusel se acerca a la pantalla.

## Estándar Apple, búsqueda inteligente y checklists en la ficha (26-11-2026)

- Acordeones (`assets/site/site.js`, compartido): se pueden abrir y cerrar rápido sin que el texto y las fotos queden encima de lo de abajo.
- Buscador: atajos «Ir directo» para lo que alguien puede escribir (Transporte Autorizado, HDS, WhatsApp, cotizar, normativa, retiro domiciliario…), corrección de errores de tipeo, y el avance de los checklists con barras que se llenan y opción de ocultarlo.
- Las respuestas de los checklists van solas en la ficha (campos ocultos), sin opción en el formulario.
- Toques: lo que se toca se hunde al presionar y vuelve con resorte; nada se eleva, acerca ni gira al pasar el puntero. Degradados sutiles en vez de colores planos. Esquinas continuas (squircle) con `corner-shape`, nativo y sin JavaScript.
- Sin degradados en superficies blancas. Squircle más marcado: `tools/squircle.py` reescribe al final de `campanas.css` todas las reglas con `border-radius` (mismo orden y selectores) con los radios ×1,5, dentro de `@supports (corner-shape: squircle)`; correrlo después de cambiar radios. Animaciones más suaves (toques sin rebote, volteo, carrusel, acordeones a 520 ms con `--acordeon-ms`).

## Esquinas concéntricas, ficha con teclado en iPhone y fotos nuevas de aparatos (27-11-2026)

- `tools/squircle.py` lleva una lista de ajustes concéntricos (radio de adentro = de afuera − separación): burbuja «?» abierta (sus opciones y el botón redondo) y el bloque de opciones del hero en el teléfono. Prueba: `concentricos.mjs`.
- Ficha en el teléfono con el teclado abierto: el cuerpo con campos ocupa solo lo que queda (base 0) y se desplaza por dentro; los botones quedan justo sobre el teclado; sin el relleno de 55vh; el campo activo se centra cuando el teclado termina de abrirse (`campanas.js`).
- Fotos de aparatos con fondos de color (entregadas el 27-11-2026), en 160, 400 y 800 px.

## Plugin de WordPress «Campañas de recolección – Sitio» (27-11-2026)

- Código en `wordpress/campanas-sitio/` (basado en el de Transporte). Se arma con `python3 tools/wordpress.py`: deja `../wordpress/campanas-sitio.zip`, fuera del repositorio. Se instala en Plugins → Añadir nuevo → Subir plugin.
- Sirve el sitio en una vista privada (`/campanas-vista/`, con sesión o con un enlace para compartir) o publicado en la portada, con cabeceras de seguridad, `/sitemap-sitio.xml` y robots.txt.
- Panel «Campañas» (secciones como los ajustes de un teléfono, interruptores y barra de cambios sin guardar): Resumen, Publicación, Contacto (WhatsApp), Servicios (retiro domiciliario, reutilización, tarjetas por público, calculadora del plazo, aparatos, buscador), Portada (título, texto, foto de la biblioteca y aviso, con vista previa), Sitios relacionados (Transporte y HDS, con su dirección) y Buscadores (Google y Bing).
- Los servicios se apagan con las marcas `data-cr-servicio` y `data-cr-grupo` del HTML: el plugin agrega `<html data-cr-off>` y una regla que los oculta, y quita sus opciones de la ficha; `campanas.js` deja de sugerirlos en el buscador. Si agregas un bloque que dependa de un servicio, márcalo.
- Pruebas sin WordPress: `php tools/pruebas-wordpress.php [salida]` (PHP 8.2 de Local en este computador).

## Hero sin texto que desaparece, movimiento sutil y sin adornos (27-11-2026)

- Hero: al cambiar de opción, el título y el texto se funden uno después del otro (0,18 s y 0,3 s), sin desenfoque ni movimiento: ya no se ven los dos a medias ni «desaparecen». Prueba: `hero4.mjs` (la suma de opacidades nunca pasa de 1).
- Animaciones sutiles: desplazamientos de 4 a 8 px, sin escala, desenfoque, giro ni rebote.
- Sin eyebrows (el rótulo chico sobre los títulos de preguntas, normativa, normas y créditos; «Etapa N de 4» pasa al título: «1. Planificación») ni la raya verde bajo los títulos de sección.

## Carrusel plano al estilo de Apple (27-11-2026)

- Reemplaza al de perspectiva: una fila con desplazamiento nativo e imán por tarjeta (dedo, trackpad, teclado), alineada con el contenido y con la siguiente asomándose; flechas abajo a la derecha que se apagan en los extremos. Cada tarjeta: la foto cuadrada y debajo su nombre y grupo; el «+» muestra su información sobre la foto (medida típica, descripción, nota e «Incluir en la ficha»), Esc la cierra. `carrusel.js` pasó de ~280 a ~70 líneas. Prueba: `carrusel2.mjs`.

## Tipografía Allo (27-11-2026)

- Campañas usa Allo 1.1.0 (Josh Puckett, OFL 1.1), versión «Friendly», recortada al español (U+0000-00FF y puntuación), pesos 400–800 y tamaño óptico de texto: `assets/campanas/fonts/allo-latin.woff2` (50 KB; Nunito pesaba 40 KB), con su licencia al lado. Mientras carga, Arial ajustada a sus medidas («Allo fallback»). Títulos grandes a 650 y con −0,022 em. Transporte sigue con Nunito (`assets/site/`).
- Para rehacer el recorte (fontTools): subset primero y después `instancer` con `wght (400, 800)` y `opsz 14`; el tamaño óptico de titulares costaba 65 KB más.
