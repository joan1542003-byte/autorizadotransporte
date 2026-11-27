<?php
/** Al borrar el plugin se van sus ajustes (el sitio y las imágenes de la biblioteca quedan). */
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;
delete_option( 'cr_sitio' );
