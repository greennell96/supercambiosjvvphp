<?php
require_once __DIR__ . '/root.php';

// Validate request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /formularioaml');
    exit;
}

// Validate session and nonce
if (empty($_SESSION['aml_data']) || empty($_SESSION['aml_temp_file']) || empty($_SESSION['aml_nonce'])) {
    header('Location: /formularioaml?error=session');
    exit;
}

if (empty($_POST['nonce']) || $_POST['nonce'] !== $_SESSION['aml_nonce']) {
    header('Location: /formularioaml?error=nonce');
    exit;
}

// Check if already submitted in this session
if (!empty($_SESSION['aml_submitted'])) {
    header('Location: /formularioaml?error=duplicate');
    exit;
}

// Verify temp file exists
if (!file_exists($_SESSION['aml_temp_file'])) {
    header('Location: /formularioaml?error=file');
    exit;
}

$tempFilePath = $_SESSION['aml_temp_file'];
$data = $_SESSION['aml_data'];
$submissionsDir = __DIR__ . '/submissions/';

// Auto-create submissions directory if it doesn't exist
if (!is_dir($submissionsDir)) {
    mkdir($submissionsDir, 0755, true);
}

try {
    // Generate permanent filename
    $sanitizedName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $data['nombre']);
    $permanentFilename = 'AML_' . $sanitizedName . '_' . $data['dni'] . '_' . date('Ymd_His') . '.docx';
    $permanentFilePath = $submissionsDir . $permanentFilename;

    // Move file
    if (!rename($tempFilePath, $permanentFilePath)) {
        throw new Exception('No se pudo guardar el archivo');
    }

    // Prepare metadata
    $metadata = [
        'id' => bin2hex(random_bytes(8)),
        'nombre' => $data['nombre'],
        'dni' => $data['dni'],
        'email' => $data['email'],
        'telefono' => $data['telefono'],
        'fecha_submit' => date('Y-m-d H:i:s'),
        'filename' => $permanentFilename,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];

    // Load/create submissions log
    $logFile = $submissionsDir . 'index.json';
    $submissions = [];

    if (file_exists($logFile)) {
        $logContent = file_get_contents($logFile);
        $decoded = json_decode($logContent, true);
        if (is_array($decoded)) {
            $submissions = $decoded;
        }
    }

    // Append metadata
    $submissions[] = $metadata;

    // Write log with file locking
    $fh = fopen($logFile, 'w');
    if (!$fh) {
        throw new Exception('No se pudo escribir el log');
    }
    flock($fh, LOCK_EX);
    fwrite($fh, json_encode($submissions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    flock($fh, LOCK_UN);
    fclose($fh);

    // Mark as submitted and clear temp data
    $_SESSION['aml_submitted'] = true;
    unset($_SESSION['aml_data']);
    unset($_SESSION['aml_temp_file']);
    unset($_SESSION['aml_filename']);
    unset($_SESSION['aml_nonce']);
    unset($_SESSION['aml_form_data']);
    unset($_SESSION['aml_form_error']);

    // Render confirmation page
    ?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Documento Enviado - SuperCambios JVV</title>
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<link rel="stylesheet" href="css/clean.css">
	<style>
		.confirmation {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 100px 0;
			text-align: center;
			min-height: calc(100vh - 200px);
			display: flex;
			align-items: center;
		}

		.confirmation-content {
			max-width: 600px;
			background: white;
			padding: 50px 40px;
			border-radius: 16px;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
			border-top: 4px solid #10b981;
			margin: 0 auto;
		}

		.success-icon {
			font-size: 64px;
			color: #10b981;
			margin-bottom: 20px;
			animation: scaleIn 0.5s ease-out;
		}

		@keyframes scaleIn {
			0% {
				transform: scale(0);
				opacity: 0;
			}
			100% {
				transform: scale(1);
				opacity: 1;
			}
		}

		.confirmation-content h1 {
			font-size: 36px;
			color: #1f2937;
			margin-bottom: 15px;
		}

		.confirmation-content p {
			color: #6b7280;
			font-size: 16px;
			line-height: 1.6;
			margin-bottom: 30px;
		}

		.confirmation-details {
			background: #f9fafb;
			padding: 25px;
			border-radius: 8px;
			margin-bottom: 30px;
			text-align: left;
		}

		.detail-row {
			display: flex;
			justify-content: space-between;
			padding: 10px 0;
			border-bottom: 1px solid #e5e7eb;
			font-size: 14px;
		}

		.detail-row:last-child {
			border-bottom: none;
		}

		.detail-label {
			font-weight: 700;
			color: #6b7280;
		}

		.detail-value {
			color: #1f2937;
			text-align: right;
		}

		.back-btn {
			display: inline-block;
			padding: 14px 40px;
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-weight: 600;
			transition: all 0.3s;
		}

		.back-btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
		}

		@media (max-width: 768px) {
			.confirmation {
				padding: 40px 20px;
			}

			.confirmation-content {
				padding: 30px 20px;
			}

			.confirmation-content h1 {
				font-size: 24px;
			}

			.detail-row {
				flex-direction: column;
				text-align: left;
			}

			.detail-value {
				text-align: left;
				margin-top: 5px;
			}
		}
	</style>
</head>
<body>
	<!-- HEADER -->
	<header>
		<div class="container">
			<div class="header-content">
				<a href="/" class="logo">
					<img src="images/logo-default1-140x57.png" alt="SuperCambios JVV" style="height: 45px; width: auto;">
				</a>
				<nav>
					<a href="faq.php">Preguntas Frecuentes</a>
					<a href="aboutus.php">Quiénes Somos</a>
					<a href="contact.php">Contacto</a>
				</nav>
				<div class="header-cta">
					<a href="https://wa.me/34624442673?text=Hola%20SuperCambios%20JVV" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" style="display: flex; align-items: center; gap: 8px;">
						<i class="fab fa-whatsapp"></i> WhatsApp
					</a>
				</div>
			</div>
		</div>
	</header>

	<section class="confirmation">
		<div class="confirmation-content">
			<div class="success-icon">
				<i class="fas fa-check-circle"></i>
			</div>
			<h1>¡Documento Enviado!</h1>
			<p>Tu declaración AML ha sido enviada exitosamente a SuperCambios JVV.</p>

			<div class="confirmation-details">
				<div class="detail-row">
					<span class="detail-label">Nombre:</span>
					<span class="detail-value"><?php echo htmlspecialchars($data['nombre'], ENT_QUOTES, 'UTF-8'); ?></span>
				</div>
				<div class="detail-row">
					<span class="detail-label">DNI:</span>
					<span class="detail-value"><?php echo htmlspecialchars($data['dni'], ENT_QUOTES, 'UTF-8'); ?></span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Monto:</span>
					<span class="detail-value"><?php echo htmlspecialchars($data['monto'], ENT_QUOTES, 'UTF-8'); ?>€</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Fecha Envío:</span>
					<span class="detail-value"><?php echo date('d/m/Y H:i'); ?></span>
				</div>
			</div>

			<p style="font-size: 14px; color: #10b981; margin-bottom: 30px;">
				<i class="fas fa-check"></i> Nos pondremos en contacto contigo pronto
			</p>

			<a href="/" class="back-btn">Volver al Inicio</a>
		</div>
	</section>

	<!-- FOOTER -->
	<footer>
		<div class="container">
			<div class="footer-content">
				<p>&copy; 2026 SuperCambios JVV. Todos los derechos reservados.</p>
				<?php include('footermenu.php'); ?>
			</div>
		</div>
	</footer>
</body>
</html>
    <?php

} catch (Exception $e) {
    // If something fails, preserve session for retry
    $_SESSION['aml_form_error'] = 'Error al enviar documento: ' . $e->getMessage();
    header('Location: /formularioaml?error=submit');
    exit;
}
