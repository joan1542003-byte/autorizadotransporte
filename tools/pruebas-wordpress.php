<?php
/**
 * Pruebas del plugin de WordPress (wordpress/campanas-sitio) sin WordPress: funciones mínimas de reemplazo, la
 * transformación de las páginas con distintos ajustes y el panel dibujado en un HTML para revisarlo en el navegador.
 *
 *   php tools/pruebas-wordpress.php [carpeta-de-salida]
 *
 * Sale con 1 si algo falla. La salida (panel.html y páginas transformadas) queda en la carpeta indicada.
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'CR_SITIO_PRUEBAS', true );
define( 'CR_SITIO_VERSION', '1.0.0' );
define( 'CR_SITIO_ARCHIVO', dirname( __DIR__ ) . '/wordpress/campanas-sitio/campanas-sitio.php' );
define( 'CR_SITIO_DIR', dirname( __DIR__ ) . '/wordpress/campanas-sitio/' );
define( 'CR_SITIO_URL', '../wordpress/campanas-sitio/' );
$RAIZ   = dirname( __DIR__ );
$SALIDA = $argv[1] ?? sys_get_temp_dir() . '/cr-pruebas';
@mkdir( $SALIDA, 0777, true );
$GLOBALS['cr_opcion'] = array();

/* ---------- Reemplazos de WordPress ---------- */
function get_option( $k, $d = false ) { return 'cr_sitio' === $k ? $GLOBALS['cr_opcion'] : $d; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_textarea( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url_raw( $u ) { return filter_var( $u, FILTER_VALIDATE_URL ) ? $u : ''; }
function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
function untrailingslashit( $s ) { return rtrim( $s, '/\\' ); }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_textarea_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_title( $s ) { return strtolower( preg_replace( '/[^a-z0-9-]+/i', '-', (string) $s ) ); }
function sanitize_key( $s ) { return strtolower( preg_replace( '/[^a-z0-9_-]/i', '', (string) $s ) ); }
function sanitize_html_class( $s ) { return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $s ); }
function absint( $n ) { return abs( (int) $n ); }
function wp_attachment_is_image( $id ) { return 42 === $id; }
function wp_generate_password( $n ) { return str_repeat( 'x', $n ); }
function add_action() {}
function add_filter() {}
function register_activation_hook() {}
function register_deactivation_hook() {}
function plugin_dir_path( $f ) { return dirname( $f ) . '/'; }
function plugin_dir_url( $f ) { return '../wordpress/campanas-sitio/'; }
function plugin_basename( $f ) { return 'campanas-sitio/campanas-sitio.php'; }
function home_url( $p = '' ) { return 'https://campanas.ejemplo.cl' . $p; }
function admin_url( $p = '' ) { return 'https://campanas.ejemplo.cl/wp-admin/' . $p; }
function add_query_arg( $a, $u ) { return $u . ( false === strpos( $u, '?' ) ? '?' : '&' ) . http_build_query( (array) $a ); }
function current_user_can() { return true; }
function get_transient() { return array(); }
function delete_transient() {}
function get_current_user_id() { return 1; }
function wp_get_attachment_image_url() { return ''; }
function checked( $v ) { if ( $v ) { echo 'checked'; } }
function cr_sitio_url_vista( $c = false ) { return home_url( '/campanas-vista/' ); }
function wp_nonce_field() { echo '<input type="hidden" name="_wpnonce" value="prueba">'; }

require $RAIZ . '/wordpress/campanas-sitio/inc/opciones.php';
require $RAIZ . '/wordpress/campanas-sitio/inc/transformar.php';
require $RAIZ . '/wordpress/campanas-sitio/inc/panel.php';

$fallas = 0;
function ok( $cond, $que ) { global $fallas; echo ( $cond ? '  ok    ' : '  FALLA ' ) . $que . "\n"; if ( ! $cond ) { $fallas++; } }
$indice = file_get_contents( $RAIZ . '/index.html' );
$ctx    = array( 'privado' => true, 'home' => 'https://campanas.ejemplo.cl/', 'pagina' => 'index.html', 'imagen' => null );

echo "\n1. Sin ajustes: la página sale igual\n";
$GLOBALS['cr_opcion'] = array();
ok( cr_sitio_transformar( $indice, cr_sitio_opciones(), $ctx ) === $indice, 'privado y sin cambios, el HTML no cambia' );

echo "\n2. Servicios apagados\n";
$GLOBALS['cr_opcion'] = array( 'servicios' => array( 'retiro' => 0, 'reutilizacion' => 0, 'plazo' => 0, 'buscador' => 0, 'hds' => 0 ) );
$h = cr_sitio_transformar( $indice, cr_sitio_opciones(), $ctx );
ok( false !== strpos( $h, 'data-cr-off="retiro reutilizacion plazo buscador hds"' ), '<html> dice qué está apagado' );
ok( false !== strpos( $h, '[data-cr-servicio~="retiro"]' ) && false !== strpos( $h, '[data-cr-grupo~="adicionales"]' ), 'se ocultan los servicios y, con los dos apagados, el bloque de adicionales' );
ok( false === strpos( $h, '[data-cr-grupo~="relacionados"]' ), 'relacionados sigue (Transporte está encendido)' );
ok( false === strpos( $h, 'Retiro domiciliario asistido|' ) && false === strpos( $h, '|Equipos reutilizables' ), 'la ficha y los temas ya no ofrecen esos servicios' );
file_put_contents( $SALIDA . '/index-apagados.html', $h );

echo "\n3. WhatsApp, enlaces, portada y aviso\n";
$GLOBALS['cr_opcion'] = array( 'whatsapp' => '56912345678', 'urls' => array( 'transporte' => 'https://otro.cl' ), 'hero_titulo' => 'Recicla tus aparatos <b>ya</b>', 'hero_texto' => 'Texto nuevo.', 'aviso' => 'Cerrado el 18 de septiembre', 'aviso_tono' => 'importante' );
$h = cr_sitio_transformar( $indice, cr_sitio_opciones(), $ctx );
ok( false === strpos( $h, '56986067930' ) && false !== strpos( $h, '56912345678' ), 'el número nuevo reemplaza al original' );
ok( false === strpos( $h, '+56 9 8606 7930' ) && false !== strpos( $h, '+56 9 1234 5678' ), 'y también como se muestra' );
ok( false === strpos( $h, 'href="https://transporteautorizado.cl"' ) && false !== strpos( $h, 'href="https://otro.cl"' ), 'Transporte con su dirección nueva' );
ok( false !== strpos( $h, '<span class="is-base">Recicla tus aparatos &lt;b&gt;ya&lt;/b&gt;</span>' ), 'título del hero cambiado y escapado' );
ok( false !== strpos( $h, '<span class="is-base">Texto nuevo.</span>' ), 'texto del hero cambiado' );
ok( 1 === substr_count( $h, 'class="cr-aviso is-importante"' ), 'aviso arriba del hero' );
file_put_contents( $SALIDA . '/index-ajustes.html', $h );

echo "\n4. Foto del hero\n";
$h = cr_sitio_transformar( $indice, cr_sitio_opciones(), array_merge( $ctx, array( 'imagen' => array( 'src' => 'https://campanas.ejemplo.cl/wp-content/uploads/foto.jpg', 'srcset' => 'https://campanas.ejemplo.cl/wp-content/uploads/foto-768x512.jpg 768w, https://campanas.ejemplo.cl/wp-content/uploads/foto.jpg 1600w', 'ancho' => 1600, 'alto' => 1067, 'alt' => 'Foto' ) ) ) );
ok( false === strpos( $h, 'campanas-punto-entrega' ), 'sin la foto ni las precargas originales' );
ok( 1 === substr_count( $h, 'wp-content/uploads/foto.jpg 1600w" sizes' ) && false !== strpos( $h, 'rel="preload" as="image" imagesrcset="https://campanas.ejemplo.cl/wp-content/uploads/foto-768x512.jpg' ), 'con la nueva y su precarga' );

echo "\n5. Publicado\n";
$GLOBALS['cr_opcion'] = array( 'google' => 'abcdefgh12345', 'bing' => 'ABCDEF1234567890' );
$h = cr_sitio_transformar( $indice, cr_sitio_opciones(), array_merge( $ctx, array( 'privado' => false ) ) );
ok( false !== strpos( $h, '<meta name="robots" content="index,follow,max-image-preview:large">' ), 'se puede indexar' );
ok( false === strpos( $h, 'https://campanasdereciclaje.cl/' ) && false !== strpos( $h, 'https://campanas.ejemplo.cl/' ), 'el canónico es el dominio de WordPress' );
ok( false !== strpos( $h, 'google-site-verification" content="abcdefgh12345"' ) && false !== strpos( $h, 'msvalidate.01" content="ABCDEF1234567890"' ), 'etiquetas de Google y Bing' );

echo "\n6. Limpieza del formulario\n";
list( $op, $av ) = cr_sitio_limpiar( array( 'modo' => 'publicado', 'ruta' => 'wp-admin', 'whatsapp' => '9 1234 5678', 'servicios' => array( 'retiro' => '1' ), 'urls' => array( 'hds' => 'no es una url' ), 'google' => '<meta name="google-site-verification" content="CODIGO_valido-123">', 'bing' => 'x' ), cr_sitio_omision() );
ok( 'publicado' === $op['modo'] && 'campanas-vista' === $op['ruta'], 'modo publicado; una ruta reservada vuelve a la de omisión' );
ok( '56912345678' === $op['whatsapp'], '«9 1234 5678» queda como 56912345678' );
ok( 1 === $op['servicios']['retiro'] && 0 === $op['servicios']['plazo'], 'casillas sin marcar = apagado' );
ok( 'https://hds.cl' === $op['urls']['hds'] && count( $av ) >= 2, 'dirección inválida: queda la anterior, con aviso' );
ok( 'CODIGO_valido-123' === $op['google'] && '' === $op['bing'], 'de la etiqueta pegada se toma el código; uno inválido se vacía' );

echo "\n7. Panel\n";
$GLOBALS['cr_opcion'] = array( 'servicios' => array( 'plazo' => 0 ), 'aviso' => 'Aviso de prueba' );
ob_start();
cr_sitio_pagina_panel();
$panel = ob_get_clean();
ok( substr_count( $panel, 'role="switch"' ) === 10, '10 interruptores (8 servicios y 2 sitios relacionados)' );
ok( 7 === substr_count( $panel, 'class="cr-seccion"' ), '7 secciones' );
file_put_contents( $SALIDA . '/panel.html', '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel</title><link rel="stylesheet" href="' . $RAIZ . '/wordpress/campanas-sitio/admin/panel.css"><style>body{margin:0;background:#f0f0f1;padding:20px}.dashicons{display:inline-block;width:18px;height:18px}</style></head><body>' . $panel . '<script src="' . $RAIZ . '/wordpress/campanas-sitio/admin/panel.js"></script></body></html>' );

echo $fallas ? "\n$fallas fallas.\n" : "\nTodo bien.\n";
exit( $fallas ? 1 : 0 );
