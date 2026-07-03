<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Quiénes Somos - SuperCambios JVV</title>
	<meta name="description" content="Conoce la historia de SuperCambios JVV. María y José crearon esta empresa para proporcionar transferencias seguras desde Europa a Venezuela.">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.4.0/css/all.css">
	<link rel="stylesheet" href="css/clean.css">
	<?php INCLUDE('root.php'); ?>
	<style>
		.hero-about {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 80px 0;
			text-align: center;
		}

		.hero-about h1 {
			font-size: 48px;
			margin-bottom: 20px;
		}

		.about-intro {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 50px;
			align-items: center;
			margin: 60px 0;
		}

		.about-intro-image {
			border-radius: 16px;
			overflow: hidden;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
		}

		.about-intro-image img {
			width: 100%;
			height: auto;
			display: block;
		}

		.about-intro-text h2 {
			margin-bottom: 20px;
		}

		.about-intro-text p {
			font-size: 16px;
			line-height: 1.8;
			margin-bottom: 20px;
			color: #6b7280;
		}

		.founders {
			background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 107, 53, 0.05) 100%);
			padding: 60px 0;
			margin: 80px 0;
		}

		.founder-card {
			background: white;
			border-radius: 16px;
			padding: 40px 30px;
			text-align: center;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
			transition: all 0.3s;
		}

		.founder-card:hover {
			transform: translateY(-8px);
			box-shadow: 0 15px 50px rgba(255, 107, 53, 0.15);
		}

		.founder-name {
			font-size: 24px;
			font-weight: 800;
			color: #1f2937;
			margin-bottom: 8px;
		}

		.founder-role {
			color: #ff6b35;
			font-weight: 700;
			font-size: 14px;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 15px;
		}

		.founder-desc {
			color: #6b7280;
			line-height: 1.6;
		}

		.values-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 30px;
			margin: 60px 0;
		}

		.value-card {
			background: white;
			padding: 35px 25px;
			border-radius: 16px;
			text-align: center;
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
			border-top: 4px solid #ff6b35;
			transition: all 0.3s;
		}

		.value-card:hover {
			transform: translateY(-8px);
			box-shadow: 0 15px 45px rgba(255, 107, 53, 0.12);
		}

		.value-icon {
			font-size: 40px;
			margin-bottom: 15px;
		}

		.value-title {
			font-size: 18px;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 12px;
		}

		.value-desc {
			font-size: 14px;
			color: #6b7280;
			line-height: 1.6;
		}

		.services-list {
			background: linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%);
			padding: 40px;
			border-radius: 16px;
			margin: 40px 0;
			border-left: 5px solid #ff6b35;
		}

		.services-list h3 {
			margin-bottom: 25px;
		}

		.services-list ul {
			list-style: none;
			padding: 0;
		}

		.services-list li {
			padding: 12px 0;
			border-bottom: 1px solid rgba(255, 107, 53, 0.2);
			display: flex;
			align-items: center;
			gap: 15px;
			font-size: 16px;
		}

		.services-list li:last-child {
			border-bottom: none;
		}

		.services-list i {
			color: #ff6b35;
			font-size: 18px;
			flex-shrink: 0;
		}

		.trust-badges {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
			gap: 25px;
			margin: 60px 0;
		}

		.trust-badge {
			background: white;
			padding: 25px;
			border-radius: 12px;
			border-left: 4px solid #10b981;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
			display: flex;
			align-items: center;
			gap: 15px;
			font-weight: 600;
			color: #1f2937;
		}

		.trust-badge i {
			color: #10b981;
			font-size: 24px;
			flex-shrink: 0;
		}

		.timeline {
			position: relative;
			padding: 40px 0;
		}

		.timeline::before {
			content: '';
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
			width: 4px;
			height: 100%;
			background: linear-gradient(to bottom, #ff6b35, #f7931e);
		}

		.timeline-item {
			margin-bottom: 50px;
			width: 48%;
		}

		.timeline-item:nth-child(odd) {
			margin-left: 0;
			text-align: right;
			padding-right: 50px;
		}

		.timeline-item:nth-child(even) {
			margin-left: 52%;
			padding-left: 50px;
		}

		.timeline-item-content {
			background: white;
			padding: 25px;
			border-radius: 12px;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		}

		.timeline-year {
			font-size: 18px;
			font-weight: 800;
			color: #ff6b35;
			margin-bottom: 8px;
		}

		.timeline-text {
			color: #6b7280;
			font-size: 14px;
			line-height: 1.6;
		}

		@media (max-width: 768px) {
			.about-intro {
				grid-template-columns: 1fr;
				gap: 30px;
			}

			.timeline::before {
				left: 0;
			}

			.timeline-item {
				width: 100%;
			}

			.timeline-item:nth-child(odd) {
				text-align: left;
				padding-right: 0;
				padding-left: 40px;
			}

			.timeline-item:nth-child(even) {
				margin-left: 0;
				padding-left: 40px;
			}

			.hero-about h1 {
				font-size: 32px;
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
	<section class="hero-about">
		<div class="container">
			<h1>Sobre SuperCambios JVV</h1>
			<p class="hero-subtitle">Confianza, experiencia y excelencia en transferencias internacionales</p>
		</div>
	</section>

	<!-- MAIN CONTENT -->
	<section class="section">
		<div class="container">
			<div class="about-intro">
				<div class="about-intro-image">
					<img src="images/trust-medal.png" alt="SuperCambios JVV">
				</div>
				<div class="about-intro-text">
					<h2>Nuestra Historia</h2>
					<p><strong>María y José</strong> crearon SuperCambios JVV en 2017 con un objetivo simple: proporcionar transferencias seguras, confiables y rápidas desde Europa a Venezuela.</p>
					<p>Identificamos la necesidad de casas de cambio confiables en Barcelona, España, y decidimos crear una solución. Hoy, después de más de 7 años, nuestros miles de clientes satisfechos respaldan nuestra excelencia.</p>
					<p>Nos especializamos en convertir Euros a Bolívares desde cualquier país de la Unión Europea, con transferencias a cualquier banco en Venezuela. También ofrecemos cambio de Dólares Americanos en efectivo (disponible en Valencia).</p>
				</div>
			</div>
		</div>
	</section>

	<!-- FOUNDERS -->
	<section class="founders">
		<div class="container">
			<h2 class="section-title">Nuestro Equipo</h2>
			<div class="grid grid-2">
				<div class="founder-card">
					<div style="font-size: 48px; margin-bottom: 15px;">👩‍💼</div>
					<div class="founder-name">María</div>
					<div class="founder-role">Co-Fundadora</div>
					<div class="founder-desc">7+ años de experiencia en transferencias internacionales. Especialista en regulaciones europeas y atención al cliente de excelencia.</div>
				</div>
				<div class="founder-card">
					<div style="font-size: 48px; margin-bottom: 15px;">👨‍💼</div>
					<div class="founder-name">José</div>
					<div class="founder-role">Co-Fundador</div>
					<div class="founder-desc">Experto en operaciones y seguridad. Garantiza que cada transacción sea protegida con los más altos estándares de encriptación.</div>
				</div>
			</div>
		</div>
	</section>

	<!-- VALUES -->
	<section class="section bg-gradient-light">
		<div class="container">
			<h2 class="section-title">Nuestros Valores</h2>
			<div class="values-grid">
				<div class="value-card">
					<div class="value-icon">🔒</div>
					<div class="value-title">Seguridad</div>
					<div class="value-desc">Encriptación de datos de nivel militar y cumplimiento total de regulaciones internacionales.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">⚡</div>
					<div class="value-title">Velocidad</div>
					<div class="value-desc">Procesos ágiles. Transferencias confirmadas en minutos, dinero entregado en horas.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">💯</div>
					<div class="value-title">Transparencia</div>
					<div class="value-desc">Tasa real, sin comisiones ocultas. Sabes exactamente qué recibirá tu familia.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">💰</div>
					<div class="value-title">Montos Sin Límites</div>
					<div class="value-desc">€50 a €100,000+. Casas, negocios, sueños. Manejamos tu cantidad sin limitaciones.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">📈</div>
					<div class="value-title">Confiabilidad</div>
					<div class="value-desc">10,000+ transferencias exitosas avalan nuestro compromiso con la excelencia.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">🌍</div>
					<div class="value-title">Alcance Global</div>
					<div class="value-desc">Conectamos Europa y América Latina de forma segura y confiable.</div>
				</div>
				<div class="value-card">
					<div class="value-icon">⭐</div>
					<div class="value-title">Únicos en el Mercado</div>
					<div class="value-desc">Una de las pocas casas de cambio que procesamos Bolivares en Euros de forma segura y legal.</div>
				</div>
			</div>
		</div>
	</section>

	<!-- SERVICES -->
	<section class="section">
		<div class="container">
			<h2 class="section-title">Nuestros Servicios</h2>
			<div class="services-list">
				<h3>Tipos de Cambio que Ofrecemos:</h3>
				<ul>
					<li><i class="fas fa-check-circle"></i> <strong>Euros y Bolívares</strong> - Desde cualquier país de la UE a cualquier banco en Venezuela</li>
					<li><i class="fas fa-check-circle"></i> <strong>Bolívares a Euros</strong> - De las únicas casas de cambio que permiten envíos desde Venezuela a Europa</li>
					<li><i class="fas fa-check-circle"></i> <strong>Dólares a Euros</strong> - Dólares solo recibimos en efectivo en Valencia Venezuela - entregamos Euros en España (servicio a distancia)</li>
					<li><i class="fas fa-check-circle"></i> <strong>Euros y Dólares</strong> - Cotización actualizada en tiempo real</li>
					<li><i class="fas fa-check-circle"></i> <strong>Cambios con Criptomonedas</strong> - Recibimos criptomonedas como parte de pago para cualquiera de nuestros servicios</li>
					<li><i class="fas fa-check-circle"></i> <strong>Garantía de Entrega</strong> - Si tu envío está confirmado, siempre llegará el mismo día</li>
					<li><i class="fas fa-check-circle"></i> <strong>Montos Sin Límites</strong> - Desde €50 hasta €100,000+. Casas, negocios, sueños grandes. Los procesamos con total profesionalismo y seguridad</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- WHY TRUST US -->
	<section class="section bg-gradient-light">
		<div class="container">
			<h2 class="section-title">Por Qué Confiar en Nosotros</h2>
			<div class="trust-badges">
				<div class="trust-badge">
					<i class="fas fa-shield-alt"></i>
					<span>100% Seguro y Encriptado</span>
				</div>
				<div class="trust-badge">
					<i class="fas fa-gavel"></i>
					<span>Operamos según leyes españolas e internacionales</span>
				</div>
				<div class="trust-badge">
					<i class="fas fa-check"></i>
					<span>10,000+ transferencias exitosas desde 2017</span>
				</div>
				<div class="trust-badge">
					<i class="fas fa-coins"></i>
					<span>Cambiamos Cripto a EUR/BS de forma segura</span>
				</div>
			</div>
		</div>
	</section>

	<!-- TIMELINE -->
	<section class="section">
		<div class="container">
			<h2 class="section-title">Nuestro Camino</h2>
			<div class="timeline">
				<div class="timeline-item">
					<div class="timeline-item-content">
						<div class="timeline-year">2017</div>
						<div class="timeline-text"><strong>Nace SuperCambios JVV</strong> - María y José crean la empresa en Barcelona.</div>
					</div>
				</div>
				<div class="timeline-item">
					<div class="timeline-item-content">
						<div class="timeline-year">2018-2019</div>
						<div class="timeline-text"><strong>Crecimiento Rápido</strong> - Alcanzamos 1,000+ clientes satisfechos a través de recomendaciones.</div>
					</div>
				</div>
				<div class="timeline-item">
					<div class="timeline-item-content">
						<div class="timeline-year">2020-2021</div>
						<div class="timeline-text"><strong>Expansión Digital</strong> - Lanzamos plataforma online segura para simplificar las transferencias.</div>
					</div>
				</div>
				<div class="timeline-item">
					<div class="timeline-item-content">
						<div class="timeline-year">2022-2024</div>
						<div class="timeline-text"><strong>Consolidación</strong> - Alcanzamos 10,000+ transferencias exitosas y nos posicionamos como líderes en confianza.</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="section bg-gradient-light text-center">
		<div class="container">
			<h2>¿Listo para Enviar Dinero Seguro?</h2>
			<p style="font-size: 18px; margin: 20px 0; color: #6b7280;">Únete a miles de familias que ya confían en SuperCambios JVV</p>
			<a href="//wa.me/34624442673" class="btn">
				<svg class="ico-whatsapp" viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> Habla con Nosotros Ahora
			</a>
		</div>
	</section>
			<svg class="ico-whatsapp" viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg> ENVÍA AHORA
		</a>
	</div>

	<!-- FOOTER -->
	<footer>
		<?php INCLUDE('footermenu.php'); ?>
		<p>&copy; 2024 SuperCambios JVV. Todos los derechos reservados.</p>
		<p><a href="faq.php">Preguntas Frecuentes</a> | <a href="aboutus.php">Quiénes Somos</a> | <a href="contact.php">Contacto</a></p>
	</footer>
</body>
</html>
