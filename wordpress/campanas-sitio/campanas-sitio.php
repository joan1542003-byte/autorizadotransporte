<?php
/**
 * Plugin Name:       Campañas de recolección – Sitio
 * Description:       Sirve el sitio de Campañas de recolección de RAEE desde WordPress (en una dirección privada o publicado en la portada) y lo ajusta desde un panel: contacto, servicios, textos de la portada, imágenes, sitios relacionados y buscadores.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Campañas de recolección
 * Text Domain:       campanas-sitio
 */

defined( 'ABSPATH' ) || exit;

define( 'CR_SITIO_VERSION', '1.0.0' );
define( 'CR_SITIO_ARCHIVO', __FILE__ );
define( 'CR_SITIO_DIR', plugin_dir_path( __FILE__ ) );
define( 'CR_SITIO_URL', plugin_dir_url( __FILE__ ) );

require_once CR_SITIO_DIR . 'inc/opciones.php';
require_once CR_SITIO_DIR . 'inc/transformar.php';
require_once CR_SITIO_DIR . 'inc/sitio.php';
require_once CR_SITIO_DIR . 'inc/panel.php';

register_activation_hook( __FILE__, 'cr_sitio_activar' );
register_deactivation_hook( __FILE__, 'cr_sitio_desactivar' );
