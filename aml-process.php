<?php
require_once __DIR__ . '/root.php';

// Clean up old temp files (older than 1 hour)
$tempDir = __DIR__ . '/temp/';
foreach (glob($tempDir . 'AML_*.docx') as $f) {
    if (filemtime($f) < time() - 3600) {
        @unlink($f);
    }
}

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /formularioaml');
    exit;
}

// Helper: XML escape
function xmlEscape($s) {
    return str_replace(
        ['&', '<', '>', '"', "'"],
        ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;'],
        $s
    );
}

// Helper: sanitize text input
function sanitizeText($val) {
    $val = trim($val);
    return mb_substr($val, 0, 255, 'UTF-8');
}

// Helper: calculate age from birth date
function calculateAge($dateStr) {
    $dob = new DateTime($dateStr);
    $today = new DateTime();
    return $today->diff($dob)->y;
}

// Helper: validate DNI/NIE format (Spanish)
function validateDNI($dni) {
    return preg_match('/^[0-9XYZ][0-9]{6,7}[A-Z0-9]$/i', $dni);
}

// Helper: validate phone
function validatePhone($phone) {
    return preg_match('/^\+?[0-9\s\-\.]{9,20}$/', $phone);
}

// Helper: validate email
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Collect POST data
$data = [
    'nombre'         => sanitizeText($_POST['nombre'] ?? ''),
    'dni'            => sanitizeText($_POST['dni'] ?? ''),
    'fecha_nacimiento' => sanitizeText($_POST['fecha_nacimiento'] ?? ''),
    'nacionalidad'   => sanitizeText($_POST['nacionalidad'] ?? ''),
    'direccion'      => sanitizeText($_POST['direccion'] ?? ''),
    'telefono'       => sanitizeText($_POST['telefono'] ?? ''),
    'email'          => sanitizeText($_POST['email'] ?? ''),
    'ocupacion'      => sanitizeText($_POST['ocupacion'] ?? ''),
    'empleador'      => sanitizeText($_POST['empleador'] ?? ''),
    'dir_empleador'  => sanitizeText($_POST['dir_empleador'] ?? ''),
    'ingresos'       => sanitizeText($_POST['ingresos'] ?? '0'),
    'periodo_ingresos' => sanitizeText($_POST['periodo_ingresos'] ?? 'anual'),
    'monto'          => sanitizeText($_POST['monto'] ?? '0'),
];

// Validate all fields
$errors = [];

if (empty($data['nombre']) || strlen($data['nombre']) < 5) {
    $errors[] = 'El nombre debe tener al menos 5 caracteres';
}
if (empty($data['dni']) || !validateDNI($data['dni'])) {
    $errors[] = 'DNI/NIE inválido. Formato: 12345678A o Y1234567X';
}
if (empty($data['fecha_nacimiento'])) {
    $errors[] = 'La fecha de nacimiento es requerida';
} else {
    try {
        $age = calculateAge($data['fecha_nacimiento']);
        if ($age < 18) {
            $errors[] = 'Debes tener al menos 18 años';
        }
    } catch (Exception $e) {
        $errors[] = 'Fecha de nacimiento inválida';
    }
}
if (empty($data['nacionalidad'])) {
    $errors[] = 'La nacionalidad es requerida';
}
if (empty($data['direccion'])) {
    $errors[] = 'La dirección es requerida';
}
if (empty($data['telefono']) || !validatePhone($data['telefono'])) {
    $errors[] = 'Teléfono inválido';
}
if (empty($data['email']) || !validateEmail($data['email'])) {
    $errors[] = 'Email inválido';
}
if (empty($data['ocupacion'])) {
    $errors[] = 'La ocupación es requerida';
}
if (empty($data['empleador'])) {
    $errors[] = 'El nombre del empleador es requerido';
}
if (empty($data['dir_empleador'])) {
    $errors[] = 'La dirección del empleador es requerida';
}
if (!is_numeric($data['ingresos']) || (float)$data['ingresos'] <= 0 || (float)$data['ingresos'] > 10000000) {
    $errors[] = 'Los ingresos deben ser un número válido';
}
if (!in_array($data['periodo_ingresos'], ['mensual', 'anual'])) {
    $errors[] = 'Período de ingresos inválido';
}
if (!is_numeric($data['monto']) || (float)$data['monto'] <= 0 || (float)$data['monto'] > 1000000) {
    $errors[] = 'El monto debe ser un número válido';
}

// If validation failed, redirect back to form
if (!empty($errors)) {
    $_SESSION['aml_form_error'] = $errors[0];
    $_SESSION['aml_form_data'] = $data;
    header('Location: /formularioaml?error=1');
    exit;
}

// Process income
$ingresos_anuales = (float)$data['ingresos'];
if ($data['periodo_ingresos'] === 'mensual') {
    $ingresos_anuales *= 12;
}
$data['ingresos_anuales'] = number_format($ingresos_anuales, 0, ',', '.');

// Generate auto fields
$nameHash = crc32(mb_strtolower($data['nombre'], 'UTF-8'));
$dniHash = crc32(mb_strtoupper($data['dni'], 'UTF-8'));

$descripciones = [
    "Ahorros acumulados durante 8 meses de trabajar como {$data['ocupacion']}",
    "Fondo de ahorro personal generado a lo largo de mi actividad laboral como {$data['ocupacion']}",
    "Ahorros personales procedentes de ingresos anuales de {$data['ingresos_anuales']}€ como {$data['ocupacion']}"
];

$documentaciones = [
    "Extractos bancarios de los últimos 6 meses disponibles para verificación",
    "Nóminas de los últimos 3 meses y extractos bancarios correspondientes",
    "Documentación bancaria completa disponible bajo requerimiento"
];

$autoFields = [
    'naturaleza_fondos' => 'Ahorros personales de salario',
    'descripcion_fondos' => $descripciones[abs($nameHash) % 3],
    'documentacion' => $documentaciones[abs($dniHash) % 3],
    'transaccion' => "Compra de USDT por {$data['monto']}€",
    'fecha_hoy' => date('d/m/Y')
];

// Merge all data
$allData = array_merge($data, $autoFields);

// Generate DOCX
$templatePath = __DIR__ . '/BLANK-WAYLLET-AML.docx';
if (!file_exists($templatePath)) {
    $_SESSION['aml_form_error'] = 'Error interno: Template DOCX no encontrado';
    header('Location: /formularioaml?error=1');
    exit;
}

// Delete old temp file if editing
if (!empty($_SESSION['aml_temp_file']) && file_exists($_SESSION['aml_temp_file'])) {
    @unlink($_SESSION['aml_temp_file']);
}

try {
    // Auto-create temp directory if it doesn't exist
    if (!is_dir($tempDir)) {
        if (!mkdir($tempDir, 0755, true)) {
            throw new Exception('Could not create temp/ directory: ' . $tempDir);
        }
    }
    if (!is_writable($tempDir)) {
        throw new Exception('temp/ directory is not writable. Check permissions.');
    }

    // Generate unique output filename
    $sanitizedName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $data['nombre']);
    $outputName = 'AML_' . $sanitizedName . '_' . $data['dni'] . '_' . date('Ymd_His') . '.docx';
    $outputPath = $tempDir . $outputName;

    // Read template
    if (!class_exists('ZipArchive')) {
        throw new Exception('ZipArchive class not available - PHP extension missing');
    }

    $zip = new ZipArchive();
    $zipOpenResult = $zip->open($templatePath);
    if ($zipOpenResult !== true) {
        throw new Exception('No se pudo abrir el template DOCX (error code: ' . $zipOpenResult . ')');
    }

    // Extract document.xml
    $xml = $zip->getFromName('word/document.xml');
    if ($xml === false) {
        throw new Exception('No se encontró document.xml en el template');
    }

    // Apply replacements in order (longest first)
    // Step 1: 43-char transaction blank
    $xml = str_replace(
        '___________________________________________',
        xmlEscape($allData['transaccion']),
        $xml
    );

    // Step 2: 38-char nombre blank (appears 3 times)
    $xml = str_replace(
        '______________________________________',
        xmlEscape($allData['nombre']),
        $xml
    );

    // Step 3: 30-char DNI blank (appears 3 times)
    $xml = str_replace(
        '______________________________',
        xmlEscape($allData['dni']),
        $xml
    );

    // Step 4: Field labels + values
    $fieldReplacements = [
        'Fecha de nacimiento:' => 'Fecha de nacimiento: ' . xmlEscape($allData['fecha_nacimiento']),
        'Nacionalidad:' => 'Nacionalidad: ' . xmlEscape($allData['nacionalidad']),
        'Dirección de residencia:' => 'Dirección de residencia: ' . xmlEscape($allData['direccion']),
        'Información de contacto (teléfono, correo electrónico):' => 'Información de contacto (teléfono, correo electrónico): ' . xmlEscape($allData['telefono']) . ' / ' . xmlEscape($allData['email']),
        'Ocupación / cargo:' => 'Ocupación / cargo: ' . xmlEscape($allData['ocupacion']),
        'Nombre y dirección del empleador:' => 'Nombre y dirección del empleador: ' . xmlEscape($allData['empleador']) . ' - ' . xmlEscape($allData['dir_empleador']),
        'Ingresos anuales:' => 'Ingresos anuales: ' . xmlEscape($allData['ingresos_anuales']) . '€',
        'Fuentes adicionales de ingresos, si aplica:' => 'Fuentes adicionales de ingresos, si aplica: No aplica',
        'Naturaleza de los fondos (por ejemplo, salario, rendimientos de inversión, herencia):' => 'Naturaleza de los fondos (por ejemplo, salario, rendimientos de inversión, herencia): ' . xmlEscape($allData['naturaleza_fondos']),
        'Importe de los fondos: €' => 'Importe de los fondos: ' . xmlEscape($allData['monto']) . '€',
        'Descripción de los fondos (detalle el origen de los fondos, por ejemplo, ahorros, venta de propiedad, etc.):' => 'Descripción de los fondos (detalle el origen de los fondos, por ejemplo, ahorros, venta de propiedad, etc.): ' . xmlEscape($allData['descripcion_fondos']),
        'Documentación justificativa (adjuntar documentos relevantes, tales como extractos bancarios, documentos de herencia, etc.):' => 'Documentación justificativa (adjuntar documentos relevantes, tales como extractos bancarios, documentos de herencia, etc.): ' . xmlEscape($allData['documentacion']),
    ];

    foreach ($fieldReplacements as $find => $replace) {
        $xml = str_replace($find, $replace, $xml);
    }

    // Step 5: Signature blocks (3 each, all identical)
    $xml = str_replace('FIRMA:', 'FIRMA: ' . xmlEscape($allData['nombre']), $xml);
    $xml = str_replace('DOCUMENTO DE IDENTIDAD:', 'DOCUMENTO DE IDENTIDAD: ' . xmlEscape($allData['dni']), $xml);
    $xml = str_replace('FECHA:', 'FECHA: ' . xmlEscape($allData['fecha_hoy']), $xml);

    // Create output ZIP
    $outZip = new ZipArchive();
    if ($outZip->open($outputPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new Exception('No se pudo crear el archivo DOCX de salida');
    }

    // Copy all files from template, except document.xml
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if ($name === 'word/document.xml') {
            $outZip->addFromString($name, $xml);
        } else {
            $outZip->addFromString($name, $zip->getFromIndex($i));
        }
    }

    $zip->close();
    $outZip->close();

    // Verify file was created
    if (!file_exists($outputPath) || filesize($outputPath) === 0) {
        throw new Exception('Output file was not created or is empty: ' . $outputPath);
    }

    // Store in session
    $_SESSION['aml_data'] = $allData;
    $_SESSION['aml_temp_file'] = $outputPath;
    $_SESSION['aml_filename'] = 'AML_' . $sanitizedName . '_' . $data['dni'] . '.docx';
    $_SESSION['aml_nonce'] = bin2hex(random_bytes(16));
    $_SESSION['aml_submitted'] = false;

    // Redirect to review
    header('Location: /aml-review.php');
    exit;

} catch (Exception $e) {
    $_SESSION['aml_form_error'] = 'Error al generar documento: ' . $e->getMessage();
    $_SESSION['aml_form_data'] = $data;
    header('Location: /formularioaml?error=1');
    exit;
}
