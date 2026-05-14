<?php

## CONEXION A LA BASE DE DATOS
## Copy this file to root.php and fill in your real credentials.
try {
	if (extension_loaded('mysqli')) {
		$db = new MYSQLI("localhost", "DB_USER", "DB_PASSWORD", "DB_NAME");
		if ($db->connect_errno) {
			throw new Exception("Fallo al conectar a MySQL: (" . $db->connect_errno . ") " . $db->connect_error);
		}
	} else {
		$db = null;
	}
} catch (Exception $e) {
	$db = null;
}

if ($db) {
	@$db->query("ALTER TABLE config ADD COLUMN season INT DEFAULT 0");
	@$db->query("ALTER TABLE config ADD COLUMN override_start TIME");
	@$db->query("ALTER TABLE config ADD COLUMN override_end TIME");
	@$db->query("ALTER TABLE config ADD COLUMN override_date DATE");
}

error_reporting(E_ALL ^ E_NOTICE);
SESSION_START();

$IP = $_SERVER['REMOTE_ADDR'];
$local = $_SERVER["SERVER_NAME"];
$php = $_SERVER["PHP_SELF"];
$main = $_SERVER["REQUEST_URI"];
$addr = $_SERVER["SERVER_ADDR"];

date_default_timezone_set('Europe/Madrid');
