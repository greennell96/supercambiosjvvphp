<?php
require_once __DIR__ . '/root.php';

// Validate session
if (empty($_SESSION['aml_data']) || empty($_SESSION['aml_temp_file'])) {
    header('Location: /formularioaml');
    exit;
}

if (!file_exists($_SESSION['aml_temp_file'])) {
    unset($_SESSION['aml_data'], $_SESSION['aml_temp_file'], $_SESSION['aml_filename']);
    header('Location: /formularioaml?error=expired');
    exit;
}

$data = $_SESSION['aml_data'];
$filename = $_SESSION['aml_filename'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Revisa tu Declaración AML - SuperCambios JVV</title>
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<link rel="stylesheet" href="css/clean.css">
	<style>
		.hero-review {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 60px 0;
			text-align: center;
		}

		.hero-review h1 {
			font-size: 48px;
			margin-bottom: 20px;
			color: #1f2937;
		}

		.review-container {
			max-width: 900px;
			margin: 60px auto;
		}

		.summary-card {
			background: white;
			padding: 40px;
			border-radius: 16px;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
			border-top: 4px solid #10b981;
			margin-bottom: 40px;
		}

		.summary-section {
			margin-bottom: 35px;
		}

		.summary-section h3 {
			font-size: 16px;
			font-weight: 700;
			color: #10b981;
			margin-bottom: 20px;
			padding-bottom: 10px;
			border-bottom: 1px solid #e5e7eb;
		}

		.summary-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 25px;
		}

		.summary-item {
			display: flex;
			flex-direction: column;
		}

		.summary-label {
			font-size: 12px;
			font-weight: 700;
			color: #6b7280;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin-bottom: 5px;
		}

		.summary-value {
			font-size: 15px;
			color: #1f2937;
			word-break: break-word;
		}

		.summary-item.full {
			grid-column: 1 / -1;
		}

		.auto-fields {
			background: #f9fafb;
			padding: 20px;
			border-radius: 8px;
			margin-top: 20px;
		}

		.auto-fields h4 {
			font-size: 14px;
			font-weight: 700;
			color: #10b981;
			margin-bottom: 15px;
		}

		.auto-field {
			margin-bottom: 15px;
			padding-bottom: 15px;
			border-bottom: 1px solid #e5e7eb;
		}

		.auto-field:last-child {
			margin-bottom: 0;
			padding-bottom: 0;
			border-bottom: none;
		}

		.auto-field-name {
			font-size: 12px;
			font-weight: 700;
			color: #6b7280;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin-bottom: 5px;
		}

		.auto-field-value {
			font-size: 14px;
			color: #374151;
		}

		.actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
		}

		.action-btn {
			padding: 14px 24px;
			border: none;
			border-radius: 8px;
			font-family: 'Poppins', sans-serif;
			font-weight: 600;
			font-size: 14px;
			cursor: pointer;
			transition: all 0.3s;
			text-align: center;
			text-decoration: none;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.action-secondary {
			background: #e5e7eb;
			color: #374151;
		}

		.action-secondary:hover {
			background: #d1d5db;
		}

		.submit-btn {
			grid-column: 1 / -1;
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			color: white;
			font-size: 16px;
			padding: 16px;
			box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
		}

		.submit-btn:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
		}

		.submit-btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.loading-spinner {
			display: none;
			width: 16px;
			height: 16px;
			border: 2px solid rgba(255, 255, 255, 0.3);
			border-top-color: white;
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
		}

		@keyframes spin {
			to { transform: rotate(360deg); }
		}

		.submit-btn.loading {
			opacity: 0.8;
		}

		.info-box {
			background: #d1fae5;
			border-left: 4px solid #10b981;
			padding: 15px;
			border-radius: 8px;
			margin-bottom: 25px;
			color: #065f46;
			font-size: 14px;
		}

		@media (max-width: 768px) {
			.summary-grid {
				grid-template-columns: 1fr;
			}

			.actions {
				grid-template-columns: 1fr;
			}

			.submit-btn {
				grid-column: 1;
			}

			.hero-review h1 {
				font-size: 32px;
			}

			.summary-card {
				padding: 20px;
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

	<!-- HERO -->
	<section class="hero-review">
		<div class="container">
			<h1>Revisa tu Declaración</h1>
			<p>Verifica que todos los datos sean correctos. Puedes editarlos o descargar el borrador.</p>
		</div>
	</section>

	<!-- CONTENT -->
	<div class="container review-container">
		<div class="info-box">
			<i class="fas fa-check-circle"></i> Tu documento ha sido generado correctamente. Revísalo y envíalo cuando esté listo.
		</div>

		<!-- SUMMARY CARD -->
		<div class="summary-card">
			<!-- Personal Info -->
			<div class="summary-section">
				<h3>Información Personal</h3>
				<div class="summary-grid">
					<div class="summary-item">
						<span class="summary-label">Nombre Completo</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['nombre'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">DNI/NIE</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['dni'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Fecha de Nacimiento</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['fecha_nacimiento'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Nacionalidad</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['nacionalidad'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item full">
						<span class="summary-label">Dirección de Residencia</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['direccion'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Teléfono</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['telefono'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Email</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['email'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
				</div>
			</div>

			<!-- Employment Info -->
			<div class="summary-section">
				<h3>Información Laboral</h3>
				<div class="summary-grid">
					<div class="summary-item">
						<span class="summary-label">Ocupación / Cargo</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['ocupacion'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Ingresos Anuales</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['ingresos_anuales'], ENT_QUOTES, 'UTF-8'); ?>€</span>
					</div>
					<div class="summary-item full">
						<span class="summary-label">Nombre del Empleador</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['empleador'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
					<div class="summary-item full">
						<span class="summary-label">Dirección del Empleador</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['dir_empleador'], ENT_QUOTES, 'UTF-8'); ?></span>
					</div>
				</div>
			</div>

			<!-- Financial Info -->
			<div class="summary-section">
				<h3>Información Financiera</h3>
				<div class="summary-grid">
					<div class="summary-item full">
						<span class="summary-label">Monto a Invertir</span>
						<span class="summary-value"><?php echo htmlspecialchars($data['monto'], ENT_QUOTES, 'UTF-8'); ?>€</span>
					</div>
				</div>

				<!-- Auto-generated fields -->
				<div class="auto-fields">
					<h4><i class="fas fa-cogs"></i> Información Generada Automáticamente</h4>
					<div class="auto-field">
						<div class="auto-field-name">Naturaleza de Fondos</div>
						<div class="auto-field-value"><?php echo htmlspecialchars($data['naturaleza_fondos'], ENT_QUOTES, 'UTF-8'); ?></div>
					</div>
					<div class="auto-field">
						<div class="auto-field-name">Descripción de Fondos</div>
						<div class="auto-field-value"><?php echo htmlspecialchars($data['descripcion_fondos'], ENT_QUOTES, 'UTF-8'); ?></div>
					</div>
					<div class="auto-field">
						<div class="auto-field-name">Documentación</div>
						<div class="auto-field-value"><?php echo htmlspecialchars($data['documentacion'], ENT_QUOTES, 'UTF-8'); ?></div>
					</div>
					<div class="auto-field">
						<div class="auto-field-name">Transacción</div>
						<div class="auto-field-value"><?php echo htmlspecialchars($data['transaccion'], ENT_QUOTES, 'UTF-8'); ?></div>
					</div>
				</div>
			</div>
		</div>

		<!-- ACTIONS -->
		<div class="actions">
			<a href="/formularioaml.php?edit=1" class="action-btn action-secondary">
				<i class="fas fa-edit"></i> Editar Datos
			</a>
			<a href="/aml-download-temp.php" class="action-btn action-secondary" target="_blank">
				<i class="fas fa-download"></i> Descargar Borrador
			</a>
			<form method="POST" action="aml-submit.php" style="grid-column: 1 / -1;">
				<input type="hidden" name="nonce" value="<?php echo htmlspecialchars($_SESSION['aml_nonce'], ENT_QUOTES, 'UTF-8'); ?>">
				<button type="submit" class="action-btn submit-btn">
					<i class="fas fa-paper-plane"></i>
					Envia el documento a cambios jvv para avanzar en el proceso
					<span class="loading-spinner"></span>
				</button>
			</form>
		</div>
	</div>

	<!-- FOOTER -->
	<footer>
		<div class="container">
			<div class="footer-content">
				<p>&copy; 2026 SuperCambios JVV. Todos los derechos reservados.</p>
				<?php include('footermenu.php'); ?>
			</div>
		</div>
	</footer>

	<script>
		const submitForm = document.querySelector('form[action="aml-submit.php"]');
		const submitBtn = submitForm.querySelector('button[type="submit"]');

		submitForm.addEventListener('submit', function(e) {
			submitBtn.disabled = true;
			submitBtn.querySelector('.loading-spinner').style.display = 'inline-block';
		});
	</script>
</body>
</html>
