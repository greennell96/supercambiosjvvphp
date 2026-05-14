<?php
require_once __DIR__ . '/root.php';

// Validate session
if (empty($_SESSION['aml_temp_file']) || !file_exists($_SESSION['aml_temp_file'])) {
    header('HTTP/1.1 404 Not Found');
    header('Content-Type: text/plain');
    echo 'Archivo no encontrado o ha expirado';
    exit;
}

$filePath = $_SESSION['aml_temp_file'];
$fileName = $_SESSION['aml_filename'] ?? basename($filePath);

// Serve file
header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
header('Content-Disposition: attachment; filename="' . addslashes($fileName) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');

readfile($filePath);
exit;
