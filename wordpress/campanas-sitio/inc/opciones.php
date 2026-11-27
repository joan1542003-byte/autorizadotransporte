<?php
/**
 * Ajustes del sitio (una sola opción, «cr_sitio»): valores por omisión, lectura, limpieza y guardado.
 *
 * Todo lo que el panel cambia vive aquí; inc/transformar.php lo aplica a cada página al entregarla, sin tocar los
 * archivos del sitio (carpeta sitio/ del plugin).
 */

defined( 'ABSPATH' ) || exit;

/** Servicios y secciones que se pueden apagar: [clave => [nombre, descripción, grupo]]. */
function cr_sitio_servicios() {
	return array(
		'retiro'        => array( 'Retiro domiciliario asistido', 'Servicio adicional para municipalidades: la tarjeta, su opción en la ficha y su pregunta frecuente.', 'Servicios adicionales' ),
		'reutilizacion' => array( 'Área de equipos reutilizables', 'Servicio adicional para municipalidades: la tarjeta y su opción en la ficha.', 'Servicios adicionales' ),
		'municipal'     => array( 'Municipalidades', 'Tarjeta «Municipalidades» en «Una campaña para cada organización».', 'Para quién' ),
		'empresa'       => array( 'Empresas', 'Tarjeta «Empresas».', 'Para quién' ),
		'sistema'       => array( 'Sistemas de gestión', 'Tarjeta «Sistemas de gestión».', 'Para quién' ),
		'plazo'         => array( 'Calculadora del plazo', '«¿Hasta cuándo pedir la autorización?» en «Cómo funciona».', 'Herramientas' ),
		'aparatos'      => array( 'Aparatos que se reciben', 'La sección con el carrusel de fotos y su enlace en el menú.', 'Herramientas' ),
		'buscador'      => array( 'Buscador', 'La lupa de la cabecera, «Buscar…» en «Ayuda» y el atajo ⌘K.', 'Herramientas' ),
		'transporte'    => array( 'Transporte Autorizado', 'En «Servicios relacionados», en el pie y en los atajos del buscador.', 'Sitios relacionados' ),
		'hds'           => array( 'HDS', 'En «Servicios relacionados», en el pie y en los atajos del buscador.', 'Sitios relacionados' ),
	);
}

/** Valores por omisión: el sitio tal como viene. */
function cr_sitio_omision() {
	return array(
		'modo'        => 'privado',
		'ruta'        => 'campanas-vista',
		'clave'       => '',
		'whatsapp'    => '56986067930',
		'servicios'   => array_fill_keys( array_keys( cr_sitio_servicios() ), 1 ),
		'urls'        => array( 'transporte' => 'https://transporteautorizado.cl', 'hds' => 'https://hds.cl' ),
		'hero_titulo' => '',
		'hero_texto'  => '',
		'hero_imagen' => 0,
		'aviso'       => '',
		'aviso_tono'  => 'info',
		'google'      => '',
		'bing'        => '',
	);
}

/** Los ajustes guardados, completados con los valores por omisión. */
function cr_sitio_opciones() {
	static $cache = null;
	if ( null !== $cache && ! defined( 'CR_SITIO_PRUEBAS' ) ) {
		return $cache;
	}
	$base  = cr_sitio_omision();
	$g     = (array) get_option( 'cr_sitio', array() );
	$op    = array_merge( $base, array_intersect_key( $g, $base ) );
	$op['servicios'] = array_merge( $base['servicios'], array_intersect_key( (array) ( $g['servicios'] ?? array() ), $base['servicios'] ) );
	$op['urls']      = array_merge( $base['urls'], array_intersect_key( (array) ( $g['urls'] ?? array() ), $base['urls'] ) );
	$cache = $op;
	return $op;
}

/** Servicios apagados, en una lista (p. ej., ['retiro', 'plazo']). */
function cr_sitio_apagados( array $op ) {
	return array_keys(
		array_filter(
			(array) $op['servicios'],
			static function ( $v ) {
				return ! $v;
			}
		)
	);
}

/** Número de WhatsApp como se muestra: +56 9 8606 7930 (Chile) o +NN… tal cual. */
function cr_sitio_numero_visible( $numero ) {
	$n = preg_replace( '/\D/', '', (string) $numero );
	if ( preg_match( '/^569(\d{4})(\d{4})$/', $n, $m ) ) {
		return '+56 9 ' . $m[1] . ' ' . $m[2];
	}
	if ( preg_match( '/^56(\d)(\d{4})(\d{4})$/', $n, $m ) ) {
		return '+56 ' . $m[1] . ' ' . $m[2] . ' ' . $m[3];
	}
	return '+' . $n;
}

/** Dirección como se guarda: http(s) con dominio, sin barra final. Vacía si no cumple. */
function cr_sitio_url_valida( $valor ) {
	$url = esc_url_raw( trim( (string) $valor ), array( 'https', 'http' ) );
	$p   = $url ? wp_parse_url( $url ) : false;
	return is_array( $p ) && ! empty( $p['host'] ) && false !== strpos( $p['host'], '.' ) ? untrailingslashit( $url ) : '';
}

/** Limpia lo que llega del formulario del panel. Devuelve [ajustes, avisos]. */
function cr_sitio_limpiar( array $in, array $antes ) {
	$base   = cr_sitio_omision();
	$avisos = array();
	$op     = $antes;

	$op['modo'] = isset( $in['modo'] ) && 'publicado' === $in['modo'] ? 'publicado' : 'privado';
	$ruta       = trim( sanitize_title( (string) ( $in['ruta'] ?? '' ) ), '-' );
	$op['ruta'] = '' !== $ruta && ! in_array( $ruta, array( 'wp-admin', 'wp-content', 'wp-includes', 'assets', 'feed' ), true ) ? $ruta : $base['ruta'];
	if ( ! empty( $in['nueva_clave'] ) ) {
		$op['clave'] = wp_generate_password( 24, false );
	} elseif ( ! empty( $in['sin_clave'] ) ) {
		$op['clave'] = '';
	}

	$numero = preg_replace( '/\D/', '', (string) ( $in['whatsapp'] ?? '' ) );
	if ( 8 === strlen( $numero ) ) {
		$numero = '569' . $numero;  // 8 dígitos: un celular chileno sin el 56 9
	} elseif ( 9 === strlen( $numero ) && '9' === $numero[0] ) {
		$numero = '56' . $numero;
	}
	if ( strlen( $numero ) >= 10 && strlen( $numero ) <= 15 ) {
		$op['whatsapp'] = $numero;
	} else {
		$avisos[] = 'El número de WhatsApp no parece válido: quedó el anterior. Escríbelo con el código de país, p. ej., +56 9 8606 7930.';
	}

	foreach ( array_keys( $base['servicios'] ) as $k ) {
		$op['servicios'][ $k ] = empty( $in['servicios'][ $k ] ) ? 0 : 1;
	}
	foreach ( array_keys( $base['urls'] ) as $k ) {
		$url = cr_sitio_url_valida( $in['urls'][ $k ] ?? '' );
		if ( '' !== $url ) {
			$op['urls'][ $k ] = $url;
		} elseif ( '' !== trim( (string) ( $in['urls'][ $k ] ?? '' ) ) ) {
			$avisos[] = 'Una dirección de sitio relacionado no es válida: quedó la anterior.';
		} else {
			$op['urls'][ $k ] = $base['urls'][ $k ];
		}
	}

	$op['hero_titulo'] = mb_substr( sanitize_text_field( (string) ( $in['hero_titulo'] ?? '' ) ), 0, 90 );
	$op['hero_texto']  = mb_substr( sanitize_textarea_field( (string) ( $in['hero_texto'] ?? '' ) ), 0, 220 );
	$imagen            = absint( $in['hero_imagen'] ?? 0 );
	$op['hero_imagen'] = $imagen && wp_attachment_is_image( $imagen ) ? $imagen : 0;
	$op['aviso']       = mb_substr( sanitize_text_field( (string) ( $in['aviso'] ?? '' ) ), 0, 160 );
	$op['aviso_tono']  = in_array( $in['aviso_tono'] ?? '', array( 'info', 'importante' ), true ) ? $in['aviso_tono'] : 'info';

	foreach ( array( 'google', 'bing' ) as $k ) {
		$v = trim( (string) ( $in[ $k ] ?? '' ) );
		if ( preg_match( '/content="([^"]+)"/', $v, $m ) ) {
			$v = $m[1];  // se puede pegar la etiqueta completa: se toma solo el código
		}
		$op[ $k ] = preg_match( '/^[A-Za-z0-9_-]{8,80}$/', $v ) ? $v : '';
		if ( '' !== $v && '' === $op[ $k ] ) {
			$avisos[] = 'El código de ' . ( 'google' === $k ? 'Google' : 'Bing' ) . ' no tiene el formato esperado: se dejó vacío.';
		}
	}
	return array( $op, $avisos );
}

/* Guardado: un solo formulario para todas las pestañas */
add_action(
	'admin_post_cr_sitio_guardar',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'No tienes permiso para hacer esto.' );
		}
		check_admin_referer( 'cr_sitio_guardar' );
		$antes = cr_sitio_opciones();
		list( $op, $avisos ) = cr_sitio_limpiar( (array) wp_unslash( $_POST['cr'] ?? array() ), $antes ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- se limpia campo por campo en cr_sitio_limpiar().
		update_option( 'cr_sitio', $op, true );
		if ( $op['modo'] !== $antes['modo'] || $op['ruta'] !== $antes['ruta'] ) {
			cr_sitio_reglas();
			flush_rewrite_rules( false );
		}
		cr_sitio_purgar();
		set_transient( 'cr_sitio_avisos_' . get_current_user_id(), $avisos, 60 );
		$pestana = sanitize_key( (string) ( $_POST['pestana'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing -- verificado arriba.
		wp_safe_redirect( add_query_arg( array( 'page' => 'cr-sitio', 'guardado' => 1, 'pestana' => $pestana ), admin_url( 'admin.php' ) ) );
		exit;
	}
);

/** Vacía las cachés de páginas conocidas (LiteSpeed, WP Rocket, W3TC, WP Super Cache) después de guardar. */
function cr_sitio_purgar() {
	do_action( 'litespeed_purge_all' );
	if ( function_exists( 'rocket_clean_domain' ) ) {
		rocket_clean_domain();
	}
	if ( function_exists( 'w3tc_flush_all' ) ) {
		w3tc_flush_all();
	}
	if ( function_exists( 'wp_cache_clear_cache' ) ) {
		wp_cache_clear_cache();
	}
}

function cr_sitio_activar() {
	if ( false === get_option( 'cr_sitio', false ) ) {
		add_option( 'cr_sitio', cr_sitio_omision(), '', true );
	}
	cr_sitio_reglas();
	flush_rewrite_rules( false );
}

function cr_sitio_desactivar() {
	flush_rewrite_rules( false );
}
