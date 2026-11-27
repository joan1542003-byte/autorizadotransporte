<?php
/**
 * Aplica los ajustes a una página del sitio al entregarla (sin tocar los archivos). Es una función pura: recibe el
 * HTML, los ajustes y el contexto, y devuelve el HTML (se prueba sin WordPress: tools/pruebas-wordpress.php).
 *
 * Lo que hace, en orden:
 * - Servicios apagados: <html data-cr-off="…"> (el buscador de campanas.js deja de sugerirlos) y una regla que oculta
 *   todo lo marcado con data-cr-servicio (y los bloques data-cr-grupo cuando se apagan todos los suyos). En la ficha,
 *   las opciones de los servicios apagados salen de la lista.
 * - Sitios relacionados con otra dirección, número de WhatsApp, textos y foto del hero, aviso en la portada.
 * - Publicado: se puede indexar, el dominio canónico es el de WordPress y van las etiquetas de Google y Bing.
 */

defined( 'ABSPATH' ) || exit;

/** Bloques que se van solo si se apagan todos sus servicios. */
function cr_sitio_grupos() {
	return array(
		'adicionales'  => array( 'retiro', 'reutilizacion' ),
		'publicos'     => array( 'municipal', 'empresa', 'sistema' ),
		'relacionados' => array( 'transporte', 'hds' ),
	);
}

/** Opciones de la ficha que dependen de un servicio: [servicio => [texto en data-options o data-temas]]. */
function cr_sitio_opciones_ficha() {
	return array(
		'retiro'        => array( 'Retiro domiciliario asistido' ),
		'reutilizacion' => array( 'Área de equipos potencialmente reutilizables', 'Equipos reutilizables' ),
	);
}

/** Quita valores de una lista «a|b|c» dentro de un atributo data-*. */
function cr_sitio_quitar_de_lista( $html, $atributo, array $quitar ) {
	return (string) preg_replace_callback(
		'#' . preg_quote( $atributo, '#' ) . '="([^"]*)"#',
		static function ( $m ) use ( $quitar, $atributo ) {
			$items = explode( '|', $m[1] );
			$resto = array_values( array_diff( $items, $quitar ) );
			return $atributo . '="' . implode( '|', $resto ) . '"';
		},
		$html
	);
}

/**
 * @param string $html   La página.
 * @param array  $op     Ajustes (cr_sitio_opciones()).
 * @param array  $ctx    privado (bool), home (dirección de la portada, con barra final), pagina (nombre del archivo),
 *                       imagen (null o [src, srcset, ancho, alto, alt]): la foto del hero elegida en la biblioteca.
 */
function cr_sitio_transformar( $html, array $op, array $ctx ) {
	$apagados = cr_sitio_apagados( $op );
	$portada  = 'index.html' === ( $ctx['pagina'] ?? '' );
	$estilos  = array();

	// Servicios apagados
	if ( $apagados ) {
		$sel = array();
		foreach ( $apagados as $k ) {
			$sel[] = '[data-cr-servicio~="' . $k . '"]';
			$sel[] = 'li:has(> [data-cr-servicio~="' . $k . '"])';
		}
		foreach ( cr_sitio_grupos() as $grupo => $miembros ) {
			if ( ! array_diff( $miembros, $apagados ) ) {
				$sel[] = '[data-cr-grupo~="' . $grupo . '"]';
			}
		}
		$estilos[] = implode( ',', $sel ) . '{display:none!important}';
		$html      = (string) preg_replace( '#<html\b([^>]*)>#i', '<html$1 data-cr-off="' . esc_attr( implode( ' ', $apagados ) ) . '">', $html, 1 );
		$quitar    = array();
		foreach ( cr_sitio_opciones_ficha() as $k => $textos ) {
			if ( in_array( $k, $apagados, true ) ) {
				$quitar = array_merge( $quitar, $textos );
			}
		}
		if ( $quitar ) {
			$html = cr_sitio_quitar_de_lista( $html, 'data-options', $quitar );
			$html = cr_sitio_quitar_de_lista( $html, 'data-temas', $quitar );
		}
	}

	// Sitios relacionados con otra dirección
	$base = cr_sitio_omision()['urls'];
	foreach ( (array) $op['urls'] as $k => $url ) {
		if ( isset( $base[ $k ] ) && $url !== $base[ $k ] ) {
			$html = str_replace( 'href="' . $base[ $k ] . '"', 'href="' . esc_url( $url ) . '"', $html );
		}
	}

	// WhatsApp: el número (enlaces y textos de los scripts) y cómo se muestra
	$html = cr_sitio_whatsapp( $html, $op );

	// Portada: textos y foto del hero, y aviso
	if ( $portada ) {
		if ( '' !== $op['hero_titulo'] ) {
			$html = (string) preg_replace( '#(<h1\b[^>]*id="hero-title"[^>]*><span class="is-base">).*?(</span>)#s', '$1' . esc_html( $op['hero_titulo'] ) . '$2', $html, 1 );
		}
		if ( '' !== $op['hero_texto'] ) {
			$html = (string) preg_replace( '#(<p class="lead hero-cambia"><span class="is-base">).*?(</span>)#s', '$1' . esc_html( $op['hero_texto'] ) . '$2', $html, 1 );
		}
		if ( ! empty( $ctx['imagen'] ) ) {
			$html = cr_sitio_foto_hero( $html, $ctx['imagen'] );
		}
		if ( '' !== $op['aviso'] ) {
			$tono      = 'importante' === $op['aviso_tono'] ? 'is-importante' : '';
			$estilos[] = '.cr-aviso{margin:0 0 12px}.cr-aviso p{padding:12px 16px;border:1px solid #d6e4dc;border-radius:16px;background:#f3f8f5;color:#173b2a;font-weight:600;line-height:1.45}.cr-aviso.is-importante p{border-color:#f1d9a6;background:#fff8ea;color:#5b3d00}';
			// Arriba de la foto del hero, dentro de su contenedor
			$html = (string) preg_replace( '#(<section class="hero"[^>]*>\s*<div class="container">)#', '$1' . "\n" . '<div class="cr-aviso ' . $tono . '" role="note"><p>' . esc_html( $op['aviso'] ) . '</p></div>', $html, 1 );
		}
	}

	if ( $estilos ) {
		$html = (string) preg_replace( '#</head>#i', '<style id="cr-ajustes">' . implode( '', $estilos ) . "</style>\n</head>", $html, 1 );
	}

	// Publicado: se indexa, con el dominio de WordPress como canónico, y con las etiquetas de los buscadores
	if ( empty( $ctx['privado'] ) ) {
		$html = (string) preg_replace( '#<meta name="robots" content="[^"]*">#i', '<meta name="robots" content="index,follow,max-image-preview:large">', $html, 1 );
		$home = (string) ( $ctx['home'] ?? '' );
		if ( '' !== $home && 'https://campanasdereciclaje.cl/' !== $home ) {
			$html = str_replace( 'https://campanasdereciclaje.cl/', $home, $html );
		}
		$metas = '';
		if ( $portada && '' !== $op['google'] ) {
			$metas .= '<meta name="google-site-verification" content="' . esc_attr( $op['google'] ) . '">' . "\n";
		}
		if ( $portada && '' !== $op['bing'] ) {
			$metas .= '<meta name="msvalidate.01" content="' . esc_attr( $op['bing'] ) . '">' . "\n";
		}
		if ( '' !== $metas ) {
			$html = (string) preg_replace( '#</head>#i', $metas . '</head>', $html, 1 );
		}
	}
	return $html;
}

/** El número de WhatsApp de los ajustes en un texto (HTML, scripts o JSON). */
function cr_sitio_whatsapp( $texto, array $op ) {
	$base = cr_sitio_omision()['whatsapp'];
	if ( $op['whatsapp'] === $base ) {
		return $texto;
	}
	$texto = str_replace( $base, $op['whatsapp'], $texto );
	return str_replace( cr_sitio_numero_visible( $base ), cr_sitio_numero_visible( $op['whatsapp'] ), $texto );
}

/** Cambia la foto del hero por la elegida: sin las versiones AVIF ni la precarga de la original. */
function cr_sitio_foto_hero( $html, array $img ) {
	$html = (string) preg_replace( '#<link rel="preload" as="image"[^>]*campanas-punto-entrega[^>]*>\s*#i', '', $html );
	$pre  = '<link rel="preload" as="image" imagesrcset="' . esc_attr( $img['srcset'] ) . '" imagesizes="(max-width: 860px) calc(100vw - 32px), 960px" fetchpriority="high">';
	$html = (string) preg_replace( '#(<meta name="viewport"[^>]*>)#i', '$1' . "\n" . $pre, $html, 1 );
	$foto = '<picture class="stage-media stage-color"><img src="' . esc_url( $img['src'] ) . '" srcset="' . esc_attr( $img['srcset'] ) . '" sizes="(max-width: 860px) calc(100vw - 32px), 960px" width="' . (int) $img['ancho'] . '" height="' . (int) $img['alto'] . '" alt="' . esc_attr( $img['alt'] ) . '" fetchpriority="high"></picture>';
	$html = (string) preg_replace( '#<picture class="stage-media stage-color">.*?</picture>#s', $foto, $html, 1 );
	// Los datos estructurados (JSON-LD) nombran la foto de la portada: también la nueva
	return (string) preg_replace( '#https://campanasdereciclaje\.cl/assets/campanas/campanas-punto-entrega-\d+\.(?:webp|avif)#', $img['src'], $html );
}
