<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Declaración AML - SuperCambios JVV</title>
	<meta name="description" content="Formulario de declaración AML/KYC para SuperCambios JVV">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<link rel="stylesheet" href="css/clean.css">
	<?php require_once('root.php'); ?>
	<style>
		.hero-aml {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 60px 0;
			text-align: center;
		}

		.hero-aml h1 {
			font-size: 48px;
			margin-bottom: 20px;
			color: #1f2937;
		}

		.hero-aml p {
			font-size: 18px;
			color: #6b7280;
			max-width: 700px;
			margin: 0 auto;
		}

		.aml-container {
			max-width: 800px;
			margin: 60px auto;
		}

		.info-banner {
			background: white;
			border-left: 4px solid #10b981;
			padding: 30px;
			border-radius: 12px;
			margin-bottom: 40px;
			box-shadow: 0 4px 15px rgba(16, 185, 129, 0.1);
		}

		.info-banner h3 {
			font-size: 18px;
			font-weight: 700;
			color: #10b981;
			margin-bottom: 15px;
		}

		.info-banner ul {
			list-style: none;
			padding: 0;
			margin: 0;
		}

		.info-banner li {
			padding: 8px 0;
			color: #4b5563;
			font-size: 14px;
			line-height: 1.6;
		}

		.info-banner li:before {
			content: "✓ ";
			color: #10b981;
			font-weight: 700;
			margin-right: 8px;
		}

		.aml-form {
			background: white;
			padding: 40px;
			border-radius: 16px;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
			border-top: 4px solid #10b981;
		}

		.form-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 25px;
			margin-bottom: 25px;
		}

		.form-row.full {
			grid-template-columns: 1fr;
		}

		.form-group {
			margin-bottom: 0;
			position: relative;
		}

		.form-label {
			display: block;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 8px;
			font-size: 14px;
		}

		.form-label .required {
			color: #ef4444;
		}

		.form-input, .form-select {
			width: 100%;
			padding: 12px 15px;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			font-family: 'Poppins', sans-serif;
			font-size: 14px;
			transition: all 0.3s;
		}

		.form-input:focus, .form-select:focus {
			outline: none;
			border-color: #10b981;
			box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
		}

		.form-input.error, .form-select.error {
			border-color: #ef4444;
		}

		.form-error {
			display: none;
			color: #ef4444;
			font-size: 12px;
			margin-top: 6px;
			font-weight: 500;
		}

		.form-error.show {
			display: block;
		}

		.income-section {
			background: #f9fafb;
			padding: 20px;
			border-radius: 8px;
			margin: 25px 0;
		}

		.income-toggle {
			display: flex;
			gap: 20px;
			margin-bottom: 15px;
			align-items: center;
		}

		.toggle-label {
			display: flex;
			align-items: center;
			font-weight: 500;
			color: #4b5563;
			cursor: pointer;
		}

		.toggle-label input[type="radio"] {
			margin-right: 8px;
			cursor: pointer;
		}

		.income-calculated {
			padding: 12px;
			background: white;
			border-left: 3px solid #10b981;
			border-radius: 4px;
			font-size: 13px;
			color: #6b7280;
		}

		.form-actions {
			display: flex;
			gap: 15px;
			margin-top: 40px;
			justify-content: center;
		}

		.btn {
			padding: 14px 40px;
			border: none;
			border-radius: 8px;
			font-family: 'Poppins', sans-serif;
			font-weight: 600;
			font-size: 16px;
			cursor: pointer;
			transition: all 0.3s;
			text-decoration: none;
			display: inline-block;
		}

		.btn-primary {
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			color: white;
			box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
		}

		.btn-primary:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
		}

		.btn-primary:disabled {
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
			margin-left: 8px;
			vertical-align: middle;
		}

		@keyframes spin {
			to { transform: rotate(360deg); }
		}

		.btn-primary.loading {
			opacity: 0.8;
		}

		.form-success {
			display: none;
			background: #d1fae5;
			color: #065f46;
			padding: 15px;
			border-radius: 8px;
			margin-bottom: 20px;
			border-left: 4px solid #10b981;
		}

		.form-success.show {
			display: block;
		}

		.form-error-banner {
			display: none;
			background: #fee2e2;
			color: #991b1b;
			padding: 15px;
			border-radius: 8px;
			margin-bottom: 20px;
			border-left: 4px solid #ef4444;
		}

		.form-error-banner.show {
			display: block;
		}

		@media (max-width: 768px) {
			.form-row {
				grid-template-columns: 1fr;
				gap: 20px;
			}

			.hero-aml h1 {
				font-size: 32px;
			}

			.aml-form {
				padding: 20px;
			}

			.info-banner {
				padding: 20px;
			}

			.form-actions {
				flex-direction: column;
			}

			.btn {
				width: 100%;
			}
		}
	</style>
</head>
<body>

	<!-- HERO -->
	<section class="hero-aml">
		<div class="container">
			<h1>Declaración AML/KYC</h1>
			<p>Formulario de cumplimiento antilavado de dinero. Completa la información requerida para procesar tu solicitud.</p>
		</div>
	</section>

	<!-- MAIN CONTENT -->
	<div class="container aml-container">
		<!-- INFO BANNER -->
		<div class="info-banner">
			<h3><i class="fas fa-info-circle"></i> Información Importante</h3>
			<ul>
				<li>Tus datos se utilizan únicamente para cumplimiento regulatorio AML/KYC</li>
				<li>Nunca compartimos tu información personal con terceros</li>
				<li>Solo las autoridades competentes pueden solicitar tus datos si lo requieren legalmente</li>
				<li>Podrás revisar el documento antes de enviárnoslo</li>
				<li>Tus datos se almacenan de forma segura y encriptada</li>
				<li>Tienes derecho a revisar, editar y descargar tu documento</li>
				<li><strong>📝 Solo tendrás que firmar este documento la primera vez que vayas a realizar una transferencia a nuestra cuenta de empresa</strong></li>
			</ul>
		</div>

		<!-- FORM -->
		<form id="amlForm" class="aml-form" method="POST" action="aml-process.php">
			<div class="form-error-banner" id="formErrorBanner"></div>

			<!-- Row 1: Nombre, DNI -->
			<div class="form-row">
				<div class="form-group">
					<label class="form-label">Nombre Completo <span class="required">*</span></label>
					<input type="text" name="nombre" class="form-input" placeholder="Juan García López" maxlength="255">
					<div class="form-error"></div>
				</div>
				<div class="form-group">
					<label class="form-label">DNI/NIE/Pasaporte <span class="required">*</span></label>
					<input type="text" name="dni" class="form-input" placeholder="12345678A" maxlength="20">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Row 2: Fecha, Nacionalidad -->
			<div class="form-row">
				<div class="form-group">
					<label class="form-label">Fecha de Nacimiento <span class="required">*</span></label>
					<input type="date" name="fecha_nacimiento" class="form-input">
					<div class="form-error"></div>
				</div>
				<div class="form-group">
					<label class="form-label">Nacionalidad <span class="required">*</span></label>
					<input type="text" name="nacionalidad" class="form-input" placeholder="Español/a">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Row 3: Dirección -->
			<div class="form-row full">
				<div class="form-group">
					<label class="form-label">Dirección de Residencia <span class="required">*</span></label>
					<input type="text" name="direccion" class="form-input" placeholder="Calle Principal, 123, 28001 Madrid">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Row 4: Teléfono, Email -->
			<div class="form-row">
				<div class="form-group">
					<label class="form-label">Teléfono <span class="required">*</span></label>
					<input type="tel" name="telefono" class="form-input" placeholder="+34 624 44 26 73">
					<div class="form-error"></div>
				</div>
				<div class="form-group">
					<label class="form-label">Email <span class="required">*</span></label>
					<input type="email" name="email" class="form-input" placeholder="correo@ejemplo.com">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Row 5: Ocupación, Empleador -->
			<div class="form-row">
				<div class="form-group">
					<label class="form-label">Ocupación / Cargo <span class="required">*</span></label>
					<input type="text" name="ocupacion" class="form-input" placeholder="Ingeniero, Contador, etc.">
					<div class="form-error"></div>
				</div>
				<div class="form-group">
					<label class="form-label">Nombre del Empleador <span class="required">*</span></label>
					<input type="text" name="empleador" class="form-input" placeholder="Empresa S.L.">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Row 6: Dirección del Empleador -->
			<div class="form-row full">
				<div class="form-group">
					<label class="form-label">Dirección del Empleador <span class="required">*</span></label>
					<input type="text" name="dir_empleador" class="form-input" placeholder="Calle Empresa, 456, 28002 Madrid">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Income Section -->
			<div class="income-section">
				<label class="form-label">Ingresos <span class="required">*</span></label>
				<div class="income-toggle">
					<label class="toggle-label">
						<input type="radio" name="periodo_ingresos" value="mensual" checked> Mensuales
					</label>
					<label class="toggle-label">
						<input type="radio" name="periodo_ingresos" value="anual"> Anuales
					</label>
				</div>
				<div class="form-group">
					<input type="number" name="ingresos" class="form-input" placeholder="0.00" min="0" step="0.01">
					<div class="form-error"></div>
				</div>
				<div class="income-calculated" id="incomeDisplay">Ingresos anuales: 0,00€</div>
			</div>

			<!-- Row 7: Monto a Invertir -->
			<div class="form-row full">
				<div class="form-group">
					<label class="form-label">Monto a Invertir (€) <span class="required">*</span></label>
					<input type="number" name="monto" class="form-input" placeholder="1000.00" min="0" step="0.01">
					<div class="form-error"></div>
				</div>
			</div>

			<!-- Actions -->
			<div class="form-actions">
				<button type="submit" class="btn btn-primary">
					Generar Documento
					<span class="loading-spinner"></span>
				</button>
			</div>
		</form>
	</div>


	<script>
		const form = document.getElementById('amlForm');
		const incomeInput = document.querySelector('input[name="ingresos"]');
		const periodRadios = document.querySelectorAll('input[name="periodo_ingresos"]');
		const incomeDisplay = document.getElementById('incomeDisplay');
		const errorBanner = document.getElementById('formErrorBanner');

		// Show session error if exists
		<?php if (!empty($_SESSION['aml_form_error'])): ?>
			errorBanner.textContent = '<?php echo htmlspecialchars($_SESSION['aml_form_error'], ENT_QUOTES, 'UTF-8'); ?>';
			errorBanner.classList.add('show');
			<?php unset($_SESSION['aml_form_error']); ?>
		<?php endif; ?>

		// Pre-fill form if editing
		<?php if (!empty($_SESSION['aml_form_data'])): ?>
			const formData = <?php echo json_encode($_SESSION['aml_form_data'], JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
			Object.keys(formData).forEach(key => {
				const input = form.querySelector(`[name="${key}"]`);
				if (input) input.value = formData[key];
			});
			<?php unset($_SESSION['aml_form_data']); ?>
		<?php endif; ?>

		// Update income display
		function updateIncomeDisplay() {
			const income = parseFloat(incomeInput.value) || 0;
			const isPeriodic = document.querySelector('input[name="periodo_ingresos"]:checked').value === 'mensual';
			const annual = isPeriodic ? income * 12 : income;
			const formatted = annual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			incomeDisplay.textContent = `Ingresos anuales: ${formatted}€`;
		}

		incomeInput.addEventListener('input', updateIncomeDisplay);
		periodRadios.forEach(r => r.addEventListener('change', updateIncomeDisplay));

		// Validators
		function validateNombre(val) {
			return val.trim().length >= 5;
		}

		function validateDNI(val) {
			return /^[0-9XYZ][0-9]{6,7}[A-Z0-9]$/i.test(val);
		}

		function validateFechaNacimiento(val) {
			if (!val) return false;
			const dob = new Date(val);
			const today = new Date();
			const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
			return dob <= cutoff;
		}

		function validateTelefono(val) {
			return /^\+?[0-9\s\-\.]{9,20}$/.test(val);
		}

		function validateEmail(val) {
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
		}

		function validateNumber(val) {
			const num = parseFloat(val);
			return !isNaN(num) && num > 0;
		}

		// Field validation rules
		const rules = {
			nombre: { validate: validateNombre, message: 'Mínimo 5 caracteres' },
			dni: { validate: validateDNI, message: 'Formato: 12345678A o Y1234567X' },
			fecha_nacimiento: { validate: validateFechaNacimiento, message: 'Debes tener al menos 18 años' },
			nacionalidad: { validate: v => v.trim().length > 0, message: 'Campo requerido' },
			direccion: { validate: v => v.trim().length > 0, message: 'Campo requerido' },
			telefono: { validate: validateTelefono, message: 'Formato inválido (min 9 dígitos)' },
			email: { validate: validateEmail, message: 'Email inválido' },
			ocupacion: { validate: v => v.trim().length > 0, message: 'Campo requerido' },
			empleador: { validate: v => v.trim().length > 0, message: 'Campo requerido' },
			dir_empleador: { validate: v => v.trim().length > 0, message: 'Campo requerido' },
			ingresos: { validate: validateNumber, message: 'Número válido requerido' },
			monto: { validate: validateNumber, message: 'Número válido requerido' }
		};

		// Real-time validation on blur
		Object.keys(rules).forEach(fieldName => {
			const input = form.querySelector(`[name="${fieldName}"]`);
			if (input) {
				input.addEventListener('blur', function() {
					const rule = rules[fieldName];
					const errorDiv = this.closest('.form-group').querySelector('.form-error');
					if (!rule.validate(this.value)) {
						this.classList.add('error');
						errorDiv.textContent = rule.message;
						errorDiv.classList.add('show');
					} else {
						this.classList.remove('error');
						errorDiv.classList.remove('show');
					}
				});
			}
		});

		// Form submit
		form.addEventListener('submit', function(e) {
			e.preventDefault();

			let isValid = true;
			let firstError = null;

			Object.keys(rules).forEach(fieldName => {
				const input = form.querySelector(`[name="${fieldName}"]`);
				const rule = rules[fieldName];
				const errorDiv = input.closest('.form-group').querySelector('.form-error');

				if (!rule.validate(input.value)) {
					input.classList.add('error');
					errorDiv.textContent = rule.message;
					errorDiv.classList.add('show');
					isValid = false;
					if (!firstError) firstError = input;
				} else {
					input.classList.remove('error');
					errorDiv.classList.remove('show');
				}
			});

			if (!isValid) {
				if (firstError) {
					firstError.focus();
					errorBanner.textContent = 'Por favor, completa todos los campos correctamente.';
					errorBanner.classList.add('show');
				}
				return;
			}

			// Show loading state
			const btn = form.querySelector('button[type="submit"]');
			btn.disabled = true;
			btn.querySelector('.loading-spinner').style.display = 'inline-block';

			// Submit form normally (PHP handles the rest)
			this.submit();
		});

		// Initialize income display
		updateIncomeDisplay();
	</script>
</body>
</html>
