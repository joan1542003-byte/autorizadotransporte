<?php
/**
 * Panel de Campañas de recolección en el escritorio de WordPress: un menú propio con una sola página, como los ajustes
 * de un teléfono: a la izquierda las secciones y a la derecha sus ajustes, agrupados en tarjetas con interruptores.
 *
 * Secciones: Resumen (todo en una mirada, cada tarjeta con su atajo), Publicación, Contacto, Servicios, Portada (textos,
 * foto y aviso, con vista previa), Sitios relacionados y Buscadores. Es un solo formulario: las secciones solo muestran
 * u ocultan (sin JavaScript se ven todas, una debajo de otra) y se guarda todo junto (inc/opciones.php). Una barra
 * avisa cuando hay cambios sin guardar.
 */

defined( 'ABSPATH' ) || exit;

/** Secciones del panel: [clave => [rótulo, dashicon]]. */
function cr_sitio_secciones() {
	return array(
		'resumen'      => array( 'Resumen', 'dashboard' ),
		'publicacion'  => array( 'Publicación', 'admin-site-alt3' ),
		'contacto'     => array( 'Contacto', 'whatsapp' ),
		'servicios'    => array( 'Servicios', 'screenoptions' ),
		'portada'      => array( 'Portada', 'cover-image' ),
		'relacionados' => array( 'Sitios relacionados', 'admin-links' ),
		'buscadores'   => array( 'Buscadores', 'search' ),
	);
}

/** Ícono del menú: el de reciclaje (Lucide «recycle»), en gris para que WordPress lo pinte con su color. */
function cr_sitio_icono_menu() {
	$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a7aaad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/></svg>';
	return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
}

add_action(
	'admin_menu',
	static function () {
		add_menu_page( 'Campañas de recolección', 'Campañas', 'manage_options', 'cr-sitio', 'cr_sitio_pagina_panel', cr_sitio_icono_menu(), 3 );
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $pagina ) {
		if ( 'toplevel_page_cr-sitio' !== $pagina ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_style( 'cr-sitio-panel', CR_SITIO_URL . 'admin/panel.css', array(), CR_SITIO_VERSION );
		wp_enqueue_script( 'cr-sitio-panel', CR_SITIO_URL . 'admin/panel.js', array(), CR_SITIO_VERSION, true );
	}
);

/** Enlace «Ajustes» en la lista de plugins. */
add_filter(
	'plugin_action_links_' . plugin_basename( CR_SITIO_ARCHIVO ),
	static function ( $enlaces ) {
		array_unshift( $enlaces, '<a href="' . esc_url( admin_url( 'admin.php?page=cr-sitio' ) ) . '">Ajustes</a>' );
		return $enlaces;
	}
);

/** Un interruptor (casilla con aspecto de interruptor). */
function cr_sitio_interruptor( $nombre, $activo, $titulo, $texto = '' ) {
	$id = 'cr-' . sanitize_html_class( str_replace( array( '[', ']' ), '-', $nombre ) );
	?>
	<div class="cr-fila">
		<label class="cr-fila-texto" for="<?php echo esc_attr( $id ); ?>">
			<strong><?php echo esc_html( $titulo ); ?></strong>
			<?php if ( '' !== $texto ) : ?><span><?php echo esc_html( $texto ); ?></span><?php endif; ?>
		</label>
		<span class="cr-interruptor">
			<input type="checkbox" role="switch" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $nombre ); ?>" value="1" <?php checked( (bool) $activo ); ?>>
			<span aria-hidden="true"></span>
		</span>
	</div>
	<?php
}

/** Un campo de texto en una fila. */
function cr_sitio_campo( $nombre, $valor, $titulo, $texto = '', array $extra = array() ) {
	$id   = 'cr-' . sanitize_html_class( str_replace( array( '[', ']' ), '-', $nombre ) );
	$tipo = $extra['tipo'] ?? 'text';
	?>
	<div class="cr-fila cr-fila-campo">
		<label class="cr-fila-texto" for="<?php echo esc_attr( $id ); ?>">
			<strong><?php echo esc_html( $titulo ); ?></strong>
			<?php if ( '' !== $texto ) : ?><span><?php echo esc_html( $texto ); ?></span><?php endif; ?>
		</label>
		<?php if ( 'textarea' === $tipo ) : ?>
			<textarea id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $nombre ); ?>" rows="3" maxlength="<?php echo (int) ( $extra['max'] ?? 220 ); ?>" placeholder="<?php echo esc_attr( $extra['placeholder'] ?? '' ); ?>" <?php echo isset( $extra['vista'] ) ? 'data-vista="' . esc_attr( $extra['vista'] ) . '"' : ''; ?>><?php echo esc_textarea( $valor ); ?></textarea>
		<?php else : ?>
			<input type="<?php echo esc_attr( $tipo ); ?>" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $nombre ); ?>" value="<?php echo esc_attr( $valor ); ?>" maxlength="<?php echo (int) ( $extra['max'] ?? 160 ); ?>" placeholder="<?php echo esc_attr( $extra['placeholder'] ?? '' ); ?>" <?php echo isset( $extra['vista'] ) ? 'data-vista="' . esc_attr( $extra['vista'] ) . '"' : ''; ?> <?php echo isset( $extra['modo'] ) ? 'inputmode="' . esc_attr( $extra['modo'] ) . '"' : ''; ?> spellcheck="false">
		<?php endif; ?>
	</div>
	<?php
}

/** Abre y cierra una sección del panel. */
function cr_sitio_seccion_abrir( $clave, $bajada ) {
	$s = cr_sitio_secciones()[ $clave ];
	echo '<section class="cr-seccion" id="cr-' . esc_attr( $clave ) . '" data-seccion="' . esc_attr( $clave ) . '" aria-labelledby="cr-t-' . esc_attr( $clave ) . '">';
	echo '<header class="cr-seccion-cab"><h2 id="cr-t-' . esc_attr( $clave ) . '">' . esc_html( $s[0] ) . '</h2><p>' . esc_html( $bajada ) . '</p></header>';
}

function cr_sitio_pagina_panel() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$op        = cr_sitio_opciones();
	$publicado = 'publicado' === $op['modo'];
	$servicios = cr_sitio_servicios();
	$activos   = count( array_filter( $op['servicios'] ) );
	$pestana   = sanitize_key( (string) ( $_GET['pestana'] ?? 'resumen' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$pestana   = isset( cr_sitio_secciones()[ $pestana ] ) ? $pestana : 'resumen';
	$avisos    = (array) get_transient( 'cr_sitio_avisos_' . get_current_user_id() );
	delete_transient( 'cr_sitio_avisos_' . get_current_user_id() );
	$imagen    = $op['hero_imagen'] ? wp_get_attachment_image_url( (int) $op['hero_imagen'], 'medium_large' ) : '';
	$original  = CR_SITIO_URL . 'sitio/assets/campanas/campanas-punto-entrega-720.webp';
	$ver       = $publicado ? home_url( '/' ) : cr_sitio_url_vista();
	?>
	<div class="wrap cr-panel" data-pestana="<?php echo esc_attr( $pestana ); ?>">
		<header class="cr-cab">
			<div class="cr-cab-marca">
				<span class="cr-cab-icono" aria-hidden="true"><img src="<?php echo esc_url( cr_sitio_icono_menu() ); ?>" alt=""></span>
				<div>
					<h1>Campañas de recolección</h1>
					<p>
						<span class="cr-estado <?php echo $publicado ? 'is-ok' : 'is-privado'; ?>"><?php echo $publicado ? 'Publicado en la portada' : 'Vista privada'; ?></span>
						<span class="cr-cab-version">Plugin <?php echo esc_html( CR_SITIO_VERSION ); ?></span>
					</p>
				</div>
			</div>
			<div class="cr-cab-acciones">
				<?php if ( ! $publicado && '' !== $op['clave'] ) : ?>
					<button type="button" class="cr-boton is-suave" data-copiar="<?php echo esc_attr( cr_sitio_url_vista( true ) ); ?>"><span class="dashicons dashicons-admin-links" aria-hidden="true"></span><span data-copiar-texto>Copiar enlace para compartir</span></button>
				<?php endif; ?>
				<a class="cr-boton" href="<?php echo esc_url( $ver ); ?>" target="_blank" rel="noopener"><span class="dashicons dashicons-external" aria-hidden="true"></span>Ver el sitio</a>
			</div>
		</header>

		<?php if ( isset( $_GET['guardado'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="cr-nota is-ok" role="status"><span class="dashicons dashicons-yes-alt" aria-hidden="true"></span>Cambios guardados. El sitio ya los muestra.</div>
		<?php endif; ?>
		<?php foreach ( array_filter( $avisos ) as $a ) : ?>
			<div class="cr-nota is-aviso" role="alert"><span class="dashicons dashicons-warning" aria-hidden="true"></span><?php echo esc_html( $a ); ?></div>
		<?php endforeach; ?>

		<div class="cr-cuerpo">
			<nav class="cr-nav" aria-label="Secciones del panel">
				<ul>
					<?php foreach ( cr_sitio_secciones() as $k => $s ) : ?>
						<li><a href="<?php echo esc_url( add_query_arg( array( 'page' => 'cr-sitio', 'pestana' => $k ), admin_url( 'admin.php' ) ) ); ?>" data-ir="<?php echo esc_attr( $k ); ?>" <?php echo $k === $pestana ? 'aria-current="page"' : ''; ?>><span class="dashicons dashicons-<?php echo esc_attr( $s[1] ); ?>" aria-hidden="true"></span><?php echo esc_html( $s[0] ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			</nav>

			<form class="cr-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="cr_sitio_guardar">
				<input type="hidden" name="pestana" value="<?php echo esc_attr( $pestana ); ?>" data-pestana-campo>
				<?php wp_nonce_field( 'cr_sitio_guardar' ); ?>

				<?php cr_sitio_seccion_abrir( 'resumen', 'Todo el sitio en una mirada. Toca una tarjeta para cambiarla.' ); ?>
					<div class="cr-tiles">
						<a class="cr-tile" href="#cr-publicacion" data-ir="publicacion">
							<span class="cr-tile-icono dashicons dashicons-admin-site-alt3" aria-hidden="true"></span>
							<strong><?php echo $publicado ? 'Publicado' : 'Privado'; ?></strong>
							<span><?php echo $publicado ? 'Se ve en la portada de ' . esc_html( wp_parse_url( home_url(), PHP_URL_HOST ) ) . '.' : 'Solo con sesión iniciada o con el enlace para compartir.'; ?></span>
						</a>
						<a class="cr-tile" href="#cr-contacto" data-ir="contacto">
							<span class="cr-tile-icono dashicons dashicons-whatsapp" aria-hidden="true"></span>
							<strong><?php echo esc_html( cr_sitio_numero_visible( $op['whatsapp'] ) ); ?></strong>
							<span>WhatsApp de la ficha, los botones y el pie.</span>
						</a>
						<a class="cr-tile" href="#cr-servicios" data-ir="servicios">
							<span class="cr-tile-icono dashicons dashicons-screenoptions" aria-hidden="true"></span>
							<strong><?php echo (int) $activos; ?> de <?php echo count( $servicios ); ?> activos</strong>
							<span><?php echo $activos === count( $servicios ) ? 'Se muestran todos los servicios y secciones.' : 'Apagados: ' . esc_html( implode( ', ', array_map( static fn( $k ) => $servicios[ $k ][0], cr_sitio_apagados( $op ) ) ) ) . '.'; ?></span>
						</a>
						<a class="cr-tile" href="#cr-portada" data-ir="portada">
							<span class="cr-tile-icono dashicons dashicons-cover-image" aria-hidden="true"></span>
							<strong><?php echo ( '' !== $op['hero_titulo'] || '' !== $op['hero_texto'] || $op['hero_imagen'] ) ? 'Portada personalizada' : 'Portada original'; ?></strong>
							<span><?php echo '' !== $op['aviso'] ? 'Con aviso: «' . esc_html( mb_strimwidth( $op['aviso'], 0, 60, '…' ) ) . '»' : 'Sin aviso.'; ?></span>
						</a>
						<a class="cr-tile" href="#cr-buscadores" data-ir="buscadores">
							<span class="cr-tile-icono dashicons dashicons-search" aria-hidden="true"></span>
							<strong><?php echo ( '' !== $op['google'] ? 'Google ✓' : 'Google —' ) . ' · ' . ( '' !== $op['bing'] ? 'Bing ✓' : 'Bing —' ); ?></strong>
							<span><?php echo $publicado ? 'Se puede indexar. Mapa del sitio: /sitemap-sitio.xml' : 'En privado no se indexa.'; ?></span>
						</a>
					</div>
				</section>

				<?php cr_sitio_seccion_abrir( 'publicacion', 'Dónde se ve el sitio. Primero revísalo en privado; cuando esté listo, publícalo en la portada.' ); ?>
					<div class="cr-grupo">
						<fieldset class="cr-fila cr-fila-opciones">
							<legend class="cr-fila-texto"><strong>Modo</strong><span>«Publicado» reemplaza la portada de este WordPress por el sitio.</span></legend>
							<div class="cr-segmentos">
								<label><input type="radio" name="cr[modo]" value="privado" <?php checked( ! $publicado ); ?>><span>Privado</span></label>
								<label><input type="radio" name="cr[modo]" value="publicado" <?php checked( $publicado ); ?>><span>Publicado</span></label>
							</div>
						</fieldset>
						<?php cr_sitio_campo( 'cr[ruta]', $op['ruta'], 'Dirección de la vista privada', home_url( '/' ) . '…/', array( 'max' => 60 ) ); ?>
						<div class="cr-fila">
							<div class="cr-fila-texto"><strong>Enlace para compartir</strong><span><?php echo '' !== $op['clave'] ? 'Quien lo tenga puede ver la vista privada sin iniciar sesión.' : 'Sin enlace: la vista privada solo se ve con sesión iniciada.'; ?></span></div>
							<div class="cr-acciones-fila">
								<label class="cr-boton is-suave"><input type="checkbox" name="cr[nueva_clave]" value="1" class="cr-oculta"><?php echo '' !== $op['clave'] ? 'Cambiar el enlace' : 'Crear un enlace'; ?></label>
								<?php if ( '' !== $op['clave'] ) : ?><label class="cr-boton is-suave is-peligro"><input type="checkbox" name="cr[sin_clave]" value="1" class="cr-oculta">Quitar</label><?php endif; ?>
							</div>
						</div>
					</div>
				</section>

				<?php cr_sitio_seccion_abrir( 'contacto', 'El número que reciben la ficha, los botones de WhatsApp y el pie de página.' ); ?>
					<div class="cr-grupo">
						<?php cr_sitio_campo( 'cr[whatsapp]', cr_sitio_numero_visible( $op['whatsapp'] ), 'WhatsApp', 'Con código de país. Se muestra como ' . cr_sitio_numero_visible( $op['whatsapp'] ) . '.', array( 'tipo' => 'tel', 'modo' => 'tel', 'max' => 24, 'placeholder' => '+56 9 1234 5678' ) ); ?>
					</div>
				</section>

				<?php cr_sitio_seccion_abrir( 'servicios', 'Lo que se apaga desaparece del sitio: su tarjeta, su opción en la ficha y su sugerencia en el buscador.' ); ?>
					<?php
					$grupos = array();
					foreach ( $servicios as $k => $s ) {
						$grupos[ $s[2] ][ $k ] = $s;
					}
					foreach ( $grupos as $titulo => $items ) :
						if ( 'Sitios relacionados' === $titulo ) {
							continue;  // van en su sección, con sus direcciones
						}
						?>
						<h3 class="cr-subtitulo"><?php echo esc_html( $titulo ); ?></h3>
						<div class="cr-grupo">
							<?php foreach ( $items as $k => $s ) { cr_sitio_interruptor( 'cr[servicios][' . $k . ']', $op['servicios'][ $k ], $s[0], $s[1] ); } ?>
						</div>
					<?php endforeach; ?>
				</section>

				<?php cr_sitio_seccion_abrir( 'portada', 'El título y el texto del hero, su foto y un aviso opcional arriba de la portada. Vacío, queda lo original.' ); ?>
					<div class="cr-vista" aria-hidden="true">
						<div class="cr-vista-foto" style="background-image:url('<?php echo esc_url( $imagen ? $imagen : $original ); ?>')" data-vista-foto data-original="<?php echo esc_url( $original ); ?>"></div>
						<div class="cr-vista-texto">
							<p class="cr-vista-aviso" data-vista-aviso <?php echo '' === $op['aviso'] ? 'hidden' : ''; ?>><?php echo esc_html( $op['aviso'] ); ?></p>
							<p class="cr-vista-titulo" data-vista-titulo data-original="Tu próxima campaña de RAEE comienza aquí."><?php echo esc_html( '' !== $op['hero_titulo'] ? $op['hero_titulo'] : 'Tu próxima campaña de RAEE comienza aquí.' ); ?></p>
							<p class="cr-vista-lead" data-vista-lead data-original="Organizamos campañas de recolección de aparatos eléctricos y electrónicos en desuso en la Región Metropolitana."><?php echo esc_html( '' !== $op['hero_texto'] ? $op['hero_texto'] : 'Organizamos campañas de recolección de aparatos eléctricos y electrónicos en desuso en la Región Metropolitana.' ); ?></p>
						</div>
					</div>
					<div class="cr-grupo">
						<?php cr_sitio_campo( 'cr[hero_titulo]', $op['hero_titulo'], 'Título', 'Hasta 90 caracteres.', array( 'max' => 90, 'placeholder' => 'Tu próxima campaña de RAEE comienza aquí.', 'vista' => 'titulo' ) ); ?>
						<?php cr_sitio_campo( 'cr[hero_texto]', $op['hero_texto'], 'Texto', 'Hasta 220 caracteres.', array( 'tipo' => 'textarea', 'max' => 220, 'placeholder' => 'Organizamos campañas de recolección de aparatos eléctricos y electrónicos en desuso en la Región Metropolitana.', 'vista' => 'lead' ) ); ?>
						<div class="cr-fila">
							<div class="cr-fila-texto"><strong>Foto</strong><span>Horizontal, de al menos 1600 px de ancho. Con personas a la derecha: el texto va a la izquierda.</span></div>
							<div class="cr-acciones-fila">
								<input type="hidden" name="cr[hero_imagen]" value="<?php echo (int) $op['hero_imagen']; ?>" data-imagen-id>
								<button type="button" class="cr-boton is-suave" data-imagen-elegir>Elegir de la biblioteca</button>
								<button type="button" class="cr-boton is-suave" data-imagen-quitar <?php echo $op['hero_imagen'] ? '' : 'hidden'; ?>>Usar la original</button>
							</div>
						</div>
					</div>
					<h3 class="cr-subtitulo">Aviso</h3>
					<div class="cr-grupo">
						<?php cr_sitio_campo( 'cr[aviso]', $op['aviso'], 'Texto del aviso', 'Arriba de la portada; vacío, no se muestra. Hasta 160 caracteres.', array( 'max' => 160, 'placeholder' => 'Ej.: Recibimos solicitudes para campañas de marzo hasta el 15 de enero.', 'vista' => 'aviso' ) ); ?>
						<fieldset class="cr-fila cr-fila-opciones">
							<legend class="cr-fila-texto"><strong>Tono</strong><span>«Importante» lo destaca en ámbar.</span></legend>
							<div class="cr-segmentos">
								<label><input type="radio" name="cr[aviso_tono]" value="info" <?php checked( 'importante' !== $op['aviso_tono'] ); ?>><span>Informativo</span></label>
								<label><input type="radio" name="cr[aviso_tono]" value="importante" <?php checked( 'importante' === $op['aviso_tono'] ); ?>><span>Importante</span></label>
							</div>
						</fieldset>
					</div>
				</section>

				<?php cr_sitio_seccion_abrir( 'relacionados', 'Los otros sitios que aparecen en «Servicios relacionados», en el pie y en el buscador.' ); ?>
					<?php foreach ( array( 'transporte', 'hds' ) as $k ) : ?>
						<div class="cr-grupo">
							<?php cr_sitio_interruptor( 'cr[servicios][' . $k . ']', $op['servicios'][ $k ], $servicios[ $k ][0], 'Mostrar en el sitio.' ); ?>
							<?php cr_sitio_campo( 'cr[urls][' . $k . ']', $op['urls'][ $k ], 'Dirección', '', array( 'tipo' => 'url', 'max' => 200, 'placeholder' => cr_sitio_omision()['urls'][ $k ] ) ); ?>
						</div>
					<?php endforeach; ?>
				</section>

				<?php cr_sitio_seccion_abrir( 'buscadores', 'Verificación en Google Search Console y Bing Webmaster Tools. Puedes pegar la etiqueta completa o solo su código.' ); ?>
					<div class="cr-grupo">
						<?php cr_sitio_campo( 'cr[google]', $op['google'], 'Google', 'google-site-verification', array( 'max' => 200, 'placeholder' => '<meta name="google-site-verification" content="…">' ) ); ?>
						<?php cr_sitio_campo( 'cr[bing]', $op['bing'], 'Bing', 'msvalidate.01', array( 'max' => 200, 'placeholder' => '<meta name="msvalidate.01" content="…">' ) ); ?>
					</div>
					<p class="cr-ayuda">Publicado, el sitio se puede indexar y anuncia su mapa en robots.txt: <code><?php echo esc_html( home_url( '/sitemap-sitio.xml' ) ); ?></code>. En privado, nada se indexa.</p>
				</section>

				<div class="cr-guardar" data-guardar>
					<p data-guardar-texto>Todo guardado.</p>
					<button type="submit" class="cr-boton is-primario">Guardar cambios</button>
				</div>
			</form>
		</div>
	</div>
	<?php
}
