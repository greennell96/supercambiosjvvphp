<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Contacto - SuperCambios JVV</title>
	<meta name="description" content="Contacta con SuperCambios JVV. Especializados en cambio de Cripto a EUR/BS y transferencias seguras.">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.4.0/css/all.css">
	<link rel="stylesheet" href="css/clean.css">
	<?php INCLUDE('root.php'); ?>
	<style>
		.hero-contact {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 80px 0;
			text-align: center;
		}

		.hero-contact h1 {
			font-size: 48px;
			margin-bottom: 20px;
		}

		.contact-content {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 50px;
			margin: 60px 0;
			align-items: center;
		}

		.contact-form {
			background: white;
			padding: 40px;
			border-radius: 16px;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
			border-top: 4px solid #ff6b35;
		}

		.contact-info {
			display: grid;
			gap: 30px;
		}

		.contact-card {
			background: white;
			padding: 30px;
			border-radius: 16px;
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
			border-left: 4px solid #ff6b35;
			transition: all 0.3s;
		}

		.contact-card:hover {
			transform: translateY(-8px);
			box-shadow: 0 15px 45px rgba(255, 107, 53, 0.12);
		}

		.contact-icon {
			font-size: 32px;
			color: #ff6b35;
			margin-bottom: 15px;
		}

		.contact-title {
			font-size: 18px;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 10px;
		}

		.contact-detail {
			color: #6b7280;
			font-size: 14px;
			line-height: 1.6;
		}

		.contact-detail a {
			color: #ff6b35;
			text-decoration: none;
			font-weight: 700;
		}

		.contact-detail a:hover {
			text-decoration: underline;
		}

		.form-group {
			margin-bottom: 25px;
		}

		.form-label {
			display: block;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 10px;
			font-size: 14px;
		}

		.form-input {
			width: 100%;
			padding: 14px 16px;
			border: 2px solid #e5e7eb;
			border-radius: 10px;
			font-family: 'Poppins', sans-serif;
			font-size: 16px;
			transition: all 0.3s;
			resize: vertical;
		}

		.form-input:focus {
			outline: none;
			border-color: #ff6b35;
			box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.1);
		}

		textarea.form-input {
			min-height: 140px;
		}

		.submit-btn {
			width: 100%;
			padding: 16px;
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			color: white;
			border: none;
			border-radius: 10px;
			font-size: 16px;
			font-weight: 700;
			cursor: pointer;
			transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
			box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.submit-btn:hover {
			transform: translateY(-3px);
			box-shadow: 0 10px 30px rgba(255, 107, 53, 0.4);
		}

		.response-time {
			background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
			padding: 30px;
			border-radius: 12px;
			border-left: 4px solid #10b981;
			margin-bottom: 30px;
			text-align: center;
		}

		.response-time-icon {
			font-size: 32px;
			margin-bottom: 10px;
		}

		.response-time-text {
			font-weight: 700;
			color: #10b981;
			font-size: 18px;
			margin-bottom: 8px;
		}

		.response-time-subtext {
			color: #6b7280;
			font-size: 14px;
		}

		.social-links {
			display: flex;
			gap: 15px;
			justify-content: center;
			margin: 40px 0;
		}

		.social-link {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 60px;
			height: 60px;
			color: white;
			border-radius: 50%;
			text-decoration: none;
			font-size: 28px;
			transition: all 0.3s;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
		}

		.social-link:nth-child(1) {
			background: linear-gradient(135deg, #25d366 0%, #20ba58 100%);
		}

		.social-link:nth-child(1):hover {
			transform: translateY(-5px);
			box-shadow: 0 10px 25px rgba(37, 211, 102, 0.4);
		}

		.social-link:nth-child(2) {
			background: linear-gradient(135deg, #e1306c 0%, #c13584 100%);
		}

		.social-link:nth-child(2):hover {
			transform: translateY(-5px);
			box-shadow: 0 10px 25px rgba(225, 48, 108, 0.4);
		}

		.social-link:nth-child(3) {
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
		}

		.social-link:nth-child(3):hover {
			transform: translateY(-5px);
			box-shadow: 0 10px 25px rgba(255, 107, 53, 0.4);
		}

		@media (max-width: 768px) {
			.contact-content {
				grid-template-columns: 1fr;
				gap: 30px;
			}

			.hero-contact h1 {
				font-size: 32px;
			}

			.contact-form {
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
					<a href="//wa.me/34624442673" class="btn-whatsapp-header">
						<i class="fab fa-whatsapp"></i> ENVÍA AHORA
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- HERO -->
	<section class="hero-contact">
		<div class="container">
			<h1>Contáctanos</h1>
			<p class="hero-subtitle">Estamos aquí para ayudarte. Respuesta rápida garantizada</p>
		</div>
	</section>

	<!-- RESPONSE TIME BANNER -->
	<section class="section">
		<div class="container">
			<div class="response-time">
				<div class="response-time-icon">⚡</div>
				<div class="response-time-text">Tiempo de Respuesta Garantizado</div>
				<div class="response-time-subtext">Respondemos en menos de 30 minutos • Especializados en Cripto → EUR/BS</div>
			</div>
		</div>
	</section>

	<!-- CONTACT SECTION -->
	<section class="section bg-gradient-light">
		<div class="container">
			<div class="contact-content">
				<!-- CONTACT FORM -->
				<div class="contact-form">
					<h2 style="margin-bottom: 30px;">Envía tu Mensaje</h2>
					<form onsubmit="handleSubmit(event)">
						<div class="form-group">
							<label class="form-label">Nombre Completo *</label>
							<input type="text" class="form-input" required>
						</div>
						<div class="form-group">
							<label class="form-label">Email *</label>
							<input type="email" class="form-input" required>
						</div>
						<div class="form-group">
							<label class="form-label">Teléfono</label>
							<input type="tel" class="form-input">
						</div>
						<div class="form-group">
							<label class="form-label">Asunto *</label>
							<input type="text" class="form-input" required>
						</div>
						<div class="form-group">
							<label class="form-label">Mensaje *</label>
							<textarea class="form-input" required></textarea>
						</div>
						<button type="submit" class="submit-btn">
							<i class="fas fa-paper-plane"></i> Enviar Mensaje
						</button>
					</form>
				</div>

				<!-- CONTACT INFO -->
				<div class="contact-info">
					<div class="contact-card">
						<div class="contact-icon">
							<i class="fab fa-whatsapp"></i>
						</div>
						<div class="contact-title">WhatsApp</div>
						<div class="contact-detail">
							La forma más rápida de contactarnos<br>
							<a href="//wa.me/34624442673" target="_blank">+34 624 44 26 73</a>
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<i class="fas fa-envelope"></i>
						</div>
						<div class="contact-title">Email</div>
						<div class="contact-detail">
							Para consultas detalladas<br>
							<a href="mailto:info@supercambiosjvv.com">info@supercambiosjvv.com</a>
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<i class="fas fa-map-marker-alt"></i>
						</div>
						<div class="contact-title">Ubicación</div>
						<div class="contact-detail">
							Barcelona, España<br>
							Operando en toda la Unión Europea
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<i class="fas fa-clock"></i>
						</div>
						<div class="contact-title">Horario</div>
						<div class="contact-detail">
							WhatsApp: Según horario comercial<br>
							Email: Respondemos en máximo 24 horas
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- SOCIAL LINKS -->
	<section class="section text-center">
		<div class="container">
			<h2 style="margin-bottom: 30px;">Síguenos en Redes Sociales</h2>
			<div class="social-links">
				<a href="//wa.me/34624442673" class="social-link" title="WhatsApp">
					💬
				</a>
				<a href="//instagram.com/supercambiosjvv" class="social-link" title="Instagram">
					📷
				</a>
				<a href="mailto:info@supercambiosjvv.com" class="social-link" title="Email">
					✉️
				</a>
			</div>
		</div>
	</section>

	<!-- WHY CHOOSE US -->
	<section class="section bg-gradient-light">
		<div class="container">
			<h2 class="section-title">¿Por Qué Elegirnos?</h2>
			<div class="grid grid-3">
				<div class="card">
					<div style="font-size: 36px; margin-bottom: 15px;">🚀</div>
					<div class="card-title">Respuesta Rápida</div>
					<div class="card-text">Nos contactas y en minutos te damos una solución. No hay esperas innecesarias.</div>
				</div>
				<div class="card">
					<div style="font-size: 36px; margin-bottom: 15px;">👥</div>
					<div class="card-title">Equipo Experto</div>
					<div class="card-text">7+ años de experiencia. Resolvemos cualquier problema con profesionalismo.</div>
				</div>
				<div class="card">
					<div style="font-size: 36px; margin-bottom: 15px;">💙</div>
					<div class="card-title">Atención Personal</div>
					<div class="card-text">No somos un call center. Hablamos directamente con María y José cuando lo necesitas.</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="section text-center">
		<div class="container">
			<h2>¿Prefieres Contactarnos por WhatsApp?</h2>
			<p style="font-size: 18px; margin: 20px 0; color: #6b7280;">Es nuestra forma de comunicación más rápida y efectiva</p>
			<a href="//wa.me/34624442673" class="btn">
				<i class="fab fa-whatsapp"></i> Abrir WhatsApp Ahora
			</a>
		</div>
	</section>

		</a>
	</div>

	<!-- FOOTER -->
	<footer>
		<?php INCLUDE('footermenu.php'); ?>
		<p>&copy; 2024 SuperCambios JVV. Todos los derechos reservados.</p>
		<p><a href="faq.php">Preguntas Frecuentes</a> | <a href="aboutus.php">Quiénes Somos</a> | <a href="contact.php">Contacto</a></p>
	</footer>

	<script>
		function handleSubmit(event) {
			event.preventDefault();
			const form = event.target;
			const name = form.querySelector('input[type="text"]').value;
			const email = form.querySelector('input[type="email"]').value;
			const subject = form.querySelectorAll('input[type="text"]')[1].value;
			const message = form.querySelector('textarea').value;

			const whatsappMessage = encodeURIComponent(
				`👋 Hola, mi nombre es ${name}.\n\nAsunto: ${subject}\n\nMensaje: ${message}\n\nMi email: ${email}`
			);

			window.location.href = `https://wa.me/34624442673?text=${whatsappMessage}`;
		}
	</script>
</body>
</html>
