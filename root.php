<?php

## CONEXION A LA BASE DE DATOS
require_once __DIR__ . '/db-config.php';

try {
	if (extension_loaded('mysqli')) {
		$db = new MYSQLI(DB_HOST, DB_USER, DB_PASS, DB_NAME);
		if ($db->connect_errno) {
			throw new Exception("Fallo al conectar a MySQL: (" . $db->connect_errno . ") " . $db->connect_error);
		}
	} else {
		$db = null;
	}
} catch (Exception $e) {
	$db = null;
}

// Ensure required columns exist in config table
if ($db) {
	@$db->query("ALTER TABLE config ADD COLUMN season INT DEFAULT 0");
	@$db->query("ALTER TABLE config ADD COLUMN override_start TIME");
	@$db->query("ALTER TABLE config ADD COLUMN override_end TIME");
	@$db->query("ALTER TABLE config ADD COLUMN override_date DATE");
}

error_reporting(E_ALL ^ E_NOTICE);
if (session_status() === PHP_SESSION_NONE) SESSION_START();

$IP = $_SERVER['REMOTE_ADDR'];
$local = $_SERVER["SERVER_NAME"];
$php = $_SERVER["PHP_SELF"];
$main = $_SERVER["REQUEST_URI"];
$addr = $_SERVER["SERVER_ADDR"];

date_default_timezone_set('Europe/Madrid');
