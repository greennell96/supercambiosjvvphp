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

		.contact-icon-img {
			width: 38px;
			height: 38px;
			object-fit: contain;
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

		.social-link img {
			width: 34px;
			height: 34px;
			object-fit: contain;
		}

		.social-link:nth-child(1) {
			background: white;
			border: 1.5px solid #e5e7eb;
		}

		.social-link:nth-child(1):hover {
			transform: translateY(-5px);
			box-shadow: 0 10px 25px rgba(37, 211, 102, 0.35);
		}

		.social-link:nth-child(2) {
			background: white;
			border: 1.5px solid #e5e7eb;
		}

		.social-link:nth-child(2):hover {
			transform: translateY(-5px);
			box-shadow: 0 10px 25px rgba(225, 48, 108, 0.35);
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
						<svg class="ico-whatsapp" viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> ENVÍA AHORA
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
							<svg class="ico-inline" viewBox="0 0 512 512" aria-hidden="true"><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/></svg> Enviar Mensaje
						</button>
					</form>
				</div>

				<!-- CONTACT INFO -->
				<div class="contact-info">
					<div class="contact-card">
						<div class="contact-icon">
							<img src="images/icons/whatsapp.png" alt="WhatsApp" class="contact-icon-img">
						</div>
						<div class="contact-title">WhatsApp</div>
						<div class="contact-detail">
							La forma más rápida de contactarnos<br>
							<a href="//wa.me/34624442673" target="_blank">+34 624 44 26 73</a>
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<svg class="ico-inline" viewBox="0 0 512 512" aria-hidden="true"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>
						</div>
						<div class="contact-title">Email</div>
						<div class="contact-detail">
							Para consultas detalladas<br>
							<a href="mailto:info@supercambiosjvv.com">info@supercambiosjvv.com</a>
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<svg class="ico-inline" viewBox="0 0 384 512" aria-hidden="true"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>
						</div>
						<div class="contact-title">Ubicación</div>
						<div class="contact-detail">
							Barcelona, España<br>
							Operando en toda la Unión Europea
						</div>
					</div>

					<div class="contact-card">
						<div class="contact-icon">
							<svg class="ico-inline" viewBox="0 0 512 512" aria-hidden="true"><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>
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
					<img src="images/icons/whatsapp.png" alt="WhatsApp">
				</a>
				<a href="//instagram.com/supercambiosjvv" class="social-link" title="Instagram">
					<img src="images/icons/instagram.png" alt="Instagram">
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
				<svg class="ico-whatsapp" viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> Abrir WhatsApp Ahora
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
