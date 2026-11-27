<?php
/**
 * Sirve el sitio (carpeta sitio/ del plugin) desde WordPress. Basado en el plugin de Transporte Autorizado.
 *
 * - Privado: solo en la dirección de vista previa (/campanas-vista/ por omisión), con sesión iniciada o con la clave del
 *   enlace para compartir. Para todos los demás esa dirección no existe (404 del tema). Nada se indexa.
 * - Publicado: la portada del dominio muestra el sitio, y también sus páginas (/preguntas.html, /paso-a-paso.html…),
 *   /assets/ y llms.txt.
 *
 * Las páginas pasan por inc/transformar.php (ajustes del panel) y llevan cabeceras de seguridad. Los archivos (CSS, JS,
 * imágenes, datos) los entrega el servidor directamente gracias a una regla en .htaccess; sin esa regla, los entrega
 * este mismo código.
 */

defined( 'ABSPATH' ) || exit;

/** Reglas externas (.htaccess): los archivos del sitio los sirve el servidor web, sin pasar por PHP. */
function cr_sitio_reglas() {
	$op      = cr_sitio_opciones();
	$destino = ltrim( str_replace( wp_normalize_path( ABSPATH ), '', wp_normalize_path( CR_SITIO_DIR . 'sitio/assets/' ) ), '/' );
	add_rewrite_rule( '^' . preg_quote( trim( $op['ruta'], '/' ), '#' ) . '/assets/(.*)$', $destino . '$1', 'top' );
	if ( 'publicado' === $op['modo'] ) {
		add_rewrite_rule( '^assets/(.*)$', $destino . '$1', 'top' );
	}
}
add_action( 'init', 'cr_sitio_reglas', 5 );

/** Ruta pedida, relativa a la portada del sitio y sin la consulta. */
function cr_sitio_ruta_pedida() {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	$ruta = (string) wp_parse_url( $uri, PHP_URL_PATH );
	$base = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
	if ( '' !== $base && '/' !== $base && 0 === strpos( $ruta, $base ) ) {
		$ruta = substr( $ruta, strlen( $base ) );
	}
	return ltrim( rawurldecode( $ruta ), '/' );
}

/** Archivo del sitio que corresponde a una ruta interna, o null si no existe o la ruta no es válida. */
function cr_sitio_archivo( $interna ) {
	if ( ! preg_match( '#^[A-Za-z0-9][A-Za-z0-9._/-]*$#', $interna ) || false !== strpos( $interna, '..' ) ) {
		return null;
	}
	$base = realpath( CR_SITIO_DIR . 'sitio' );
	$ruta = $base ? realpath( $base . '/' . $interna ) : false;
	if ( ! $ruta || 0 !== strpos( wp_normalize_path( $ruta ), wp_normalize_path( $base ) . '/' ) || ! is_file( $ruta ) ) {
		return null;
	}
	return $ruta;
}

/** Dirección de la vista privada. */
function cr_sitio_url_vista( $con_clave = false ) {
	$op  = cr_sitio_opciones();
	$url = home_url( '/' . trim( $op['ruta'], '/' ) . '/' );
	return $con_clave && '' !== $op['clave'] ? add_query_arg( 'clave', rawurlencode( $op['clave'] ), $url ) : $url;
}

/** ¿Puede esta visita ver la vista privada? Sesión con permiso de edición, o la clave del enlace para compartir. */
function cr_sitio_puede_ver() {
	if ( current_user_can( 'edit_posts' ) ) {
		return true;
	}
	$op = cr_sitio_opciones();
	if ( '' === $op['clave'] ) {
		return false;
	}
	$firma  = hash_hmac( 'sha256', $op['clave'], wp_salt( 'auth' ) );
	$cookie = isset( $_COOKIE['cr_vista'] ) ? sanitize_text_field( wp_unslash( $_COOKIE['cr_vista'] ) ) : '';
	if ( '' !== $cookie && hash_equals( $firma, $cookie ) ) {
		return true;
	}
	$clave = isset( $_GET['clave'] ) ? sanitize_text_field( wp_unslash( $_GET['clave'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( '' !== $clave && hash_equals( $op['clave'], $clave ) ) {
		// La clave queda en una cookie y sale de la dirección, para que no viaje en enlaces ni en el historial.
		setcookie( 'cr_vista', $firma, array( 'expires' => time() + 30 * DAY_IN_SECONDS, 'path' => COOKIEPATH ? COOKIEPATH : '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax' ) );
		nocache_headers();
		wp_safe_redirect( remove_query_arg( 'clave' ) );
		exit;
	}
	return false;
}

/** Marca la respuesta para que ninguna caché de páginas la guarde (LiteSpeed Cache y las que respetan DONOTCACHEPAGE). */
function cr_sitio_no_guardar() {
	if ( ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
	do_action( 'litespeed_control_set_nocache', 'vista privada de Campañas de recolección' );
	if ( ! headers_sent() ) {
		header( 'X-LiteSpeed-Cache-Control: no-cache' );
	}
}

/** Decide si la visita es del sitio y la atiende. Corre temprano: si no es suya, WordPress sigue como siempre. */
function cr_sitio_despachar() {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || ( defined( 'WP_CLI' ) && WP_CLI ) || ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ) {
		return;
	}
	$metodo = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
	if ( 'GET' !== $metodo && 'HEAD' !== $metodo ) {
		return;
	}
	$op    = cr_sitio_opciones();
	$ruta  = cr_sitio_ruta_pedida();
	$vista = trim( $op['ruta'], '/' );

	// Vista privada: /campanas-vista/…
	if ( '' !== $vista && ( $ruta === $vista || 0 === strpos( $ruta, $vista . '/' ) ) ) {
		$interna = (string) substr( $ruta, strlen( $vista ) + 1 );
		$es_dato = 0 === strpos( $interna, 'assets/' );  // los archivos no llevan sesión ni clave: solo las páginas son privadas
		if ( ! $es_dato ) {
			cr_sitio_no_guardar();
		}
		if ( ! $es_dato && ! cr_sitio_puede_ver() ) {
			return;  // para quien no tiene acceso, la dirección no existe
		}
		if ( $ruta === $vista ) {
			nocache_headers();
			wp_safe_redirect( home_url( '/' . $vista . '/' ) );  // con barra final, para que las rutas relativas funcionen
			exit;
		}
		cr_sitio_entregar( '' === $interna ? 'index.html' : $interna, true );
		return;
	}

	if ( 'publicado' !== $op['modo'] ) {
		return;
	}
	if ( '' === $ruta ) {
		$propias = array_filter(
			isset( $_GET ) ? array_keys( $_GET ) : array(), // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			static function ( $k ) {
				return ! preg_match( '/^(utm_|fbclid$|gclid$|gad_|msclkid$|ref$)/', (string) $k );
			}
		);
		if ( $propias ) {
			return;  // ?p=, ?s=, vista previa de un editor…: es de WordPress
		}
		cr_sitio_entregar( 'index.html', false );
		return;
	}
	if ( 'index.html' === $ruta ) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
	if ( 'sitemap-sitio.xml' === $ruta ) {
		cr_sitio_mapa();
	}
	if ( 'llms.txt' === $ruta || 0 === strpos( $ruta, 'assets/' ) || ( false === strpos( $ruta, '/' ) && '.html' === substr( $ruta, -5 ) ) ) {
		cr_sitio_entregar( $ruta, false );
	}
}
add_action( 'init', 'cr_sitio_despachar', 20 );

/** Entrega una página o un archivo del sitio. Si no existe, no hace nada (WordPress responde su 404). */
function cr_sitio_entregar( $interna, $privado ) {
	$archivo = cr_sitio_archivo( $interna );
	if ( null === $archivo ) {
		return;
	}
	$ext = strtolower( pathinfo( $archivo, PATHINFO_EXTENSION ) );
	if ( 'html' === $ext ) {
		cr_sitio_pagina( $archivo, $privado );
	}
	$tipos = array(
		'css'   => 'text/css; charset=utf-8',
		'js'    => 'text/javascript; charset=utf-8',
		'json'  => 'application/json; charset=utf-8',
		'svg'   => 'image/svg+xml',
		'webp'  => 'image/webp',
		'avif'  => 'image/avif',
		'jpg'   => 'image/jpeg',
		'png'   => 'image/png',
		'glb'   => 'model/gltf-binary',
		'woff2' => 'font/woff2',
		'txt'   => 'text/plain; charset=utf-8',
		'xml'   => 'application/xml; charset=utf-8',
	);
	if ( ! isset( $tipos[ $ext ] ) ) {
		return;
	}
	$fecha     = (int) filemtime( $archivo );
	$op        = cr_sitio_opciones();
	$contenido = null;
	// Con otro número de WhatsApp, los scripts, los datos y llms.txt salen con ese número
	if ( in_array( $ext, array( 'js', 'json', 'txt' ), true ) && $op['whatsapp'] !== cr_sitio_omision()['whatsapp'] ) {
		$contenido = cr_sitio_whatsapp( (string) file_get_contents( $archivo ), $op ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	}
	// Con el contenido cambiado, la etiqueta depende de él: otro ajuste da otra etiqueta y el navegador no usa la guardada
	$etiqueta = '"' . md5( $archivo . '|' . $fecha . '|' . filesize( $archivo ) . ( null === $contenido ? '' : '|' . md5( $contenido ) ) ) . '"';
	header( 'Content-Type: ' . $tipos[ $ext ] );
	header( 'X-Content-Type-Options: nosniff' );
	header( 'ETag: ' . $etiqueta );
	header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s', $fecha ) . ' GMT' );
	header( 'Cache-Control: public, max-age=' . ( isset( $_GET['v'] ) ? YEAR_IN_SECONDS . ', immutable' : DAY_IN_SECONDS ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( $privado ) {
		header( 'X-Robots-Tag: noindex, nofollow' );
	}
	$pedida = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	if ( $pedida === $etiqueta ) {
		status_header( 304 );
		exit;
	}
	status_header( 200 );
	header( 'Content-Length: ' . ( null === $contenido ? filesize( $archivo ) : strlen( $contenido ) ) );
	if ( isset( $_SERVER['REQUEST_METHOD'] ) && 'HEAD' !== $_SERVER['REQUEST_METHOD'] ) {
		if ( null === $contenido ) {
			readfile( $archivo ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		} else {
			echo $contenido; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- archivo del propio sitio, con el número cambiado.
		}
	}
	exit;
}

/** La foto del hero elegida en los ajustes, lista para la página (o null). */
function cr_sitio_imagen_hero( array $op ) {
	$id = (int) $op['hero_imagen'];
	if ( ! $id ) {
		return null;
	}
	$src = wp_get_attachment_image_src( $id, 'full' );
	if ( ! $src ) {
		return null;
	}
	$srcset = wp_get_attachment_image_srcset( $id, 'full' );
	return array(
		'src'    => $src[0],
		'srcset' => $srcset ? $srcset : $src[0] . ' ' . (int) $src[1] . 'w',
		'ancho'  => (int) $src[1],
		'alto'   => (int) $src[2],
		'alt'    => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
	);
}

/** Entrega una página: ajustes del panel, estado de indexación y cabeceras de seguridad. */
function cr_sitio_pagina( $archivo, $privado ) {
	$op   = cr_sitio_opciones();
	$html = cr_sitio_transformar(
		(string) file_get_contents( $archivo ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$op,
		array(
			'privado' => $privado,
			'home'    => home_url( '/' ),
			'pagina'  => basename( $archivo ),
			'imagen'  => 'index.html' === basename( $archivo ) ? cr_sitio_imagen_hero( $op ) : null,
		)
	);

	// Seguridad: el navegador solo ejecuta los scripts del propio sitio y los escritos en la página (por su sello).
	$sellos = array();
	if ( preg_match_all( '#<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)(?![^>]*application/json)(?![^>]*text/plain)[^>]*>(.*?)</script>#is', $html, $m ) ) {
		foreach ( $m[1] as $codigo ) {
			$sellos[] = "'sha256-" . base64_encode( hash( 'sha256', $codigo, true ) ) . "'"; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}
	}
	$csp = array(
		"default-src 'self'",
		"script-src 'self' " . implode( ' ', array_unique( $sellos ) ),
		"style-src 'self' 'unsafe-inline'",
		"font-src 'self'",
		"img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
		"connect-src 'self'",
		"frame-ancestors 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'",
	);
	// La misma política va dentro de la página (hay servidores que reemplazan la cabecera); sin frame-ancestors.
	$en_pagina = array_filter(
		$csp,
		static function ( $regla ) {
			return 0 !== strpos( $regla, 'frame-ancestors' );
		}
	);
	$html = (string) preg_replace( '#(<meta charset="[^"]*">)#i', '$1' . "\n" . '<meta http-equiv="Content-Security-Policy" content="' . esc_attr( implode( '; ', $en_pagina ) ) . '">', $html, 1 );

	status_header( 200 );
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'Content-Security-Policy: ' . implode( '; ', $csp ) );
	header( 'X-Content-Type-Options: nosniff' );
	header( 'X-Frame-Options: SAMEORIGIN' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );
	header( 'Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()' );
	if ( $privado ) {
		header( 'X-Robots-Tag: noindex, nofollow' );
		header( 'Cache-Control: no-store, private' );
		cr_sitio_no_guardar();
	} else {
		header( 'Cache-Control: public, max-age=300' );
	}
	if ( ! isset( $_SERVER['REQUEST_METHOD'] ) || 'HEAD' !== $_SERVER['REQUEST_METHOD'] ) {
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- página estática del propio plugin.
	}
	exit;
}

/** Páginas del sitio con su fecha (las de redirección, con noindex, no van). */
function cr_sitio_paginas() {
	$paginas = array();
	foreach ( (array) glob( CR_SITIO_DIR . 'sitio/*.html' ) as $archivo ) {
		$cabeza = (string) file_get_contents( $archivo, false, null, 0, 2000 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		if ( false !== strpos( $cabeza, 'http-equiv="refresh"' ) ) {
			continue;
		}
		$nombre             = basename( $archivo );
		$paginas[ 'index.html' === $nombre ? '' : $nombre ] = (int) filemtime( $archivo );
	}
	return $paginas;
}

/** /sitemap-sitio.xml (solo publicado). */
function cr_sitio_mapa() {
	status_header( 200 );
	header( 'Content-Type: application/xml; charset=utf-8' );
	header( 'X-Robots-Tag: noindex' );
	echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
	foreach ( cr_sitio_paginas() as $ruta => $fecha ) {
		echo "\t<url><loc>" . esc_url( home_url( '/' . $ruta ) ) . '</loc><lastmod>' . esc_html( gmdate( 'Y-m-d', $fecha ) ) . "</lastmod></url>\n";
	}
	echo '</urlset>';
	exit;
}

/** robots.txt: publicado, anuncia el mapa del sitio. La vista privada no se nombra ahí: delataría su dirección. */
add_filter(
	'robots_txt',
	static function ( $texto ) {
		return 'publicado' === cr_sitio_opciones()['modo'] ? $texto . "\nSitemap: " . home_url( '/sitemap-sitio.xml' ) . "\n" : $texto;
	},
	20
);
