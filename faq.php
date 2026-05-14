<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Preguntas Frecuentes - SuperCambios JVV</title>
	<meta name="description" content="Respuestas a todas tus preguntas sobre transferencias de dinero desde Europa a Venezuela con SuperCambios JVV.">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.4.0/css/all.css">
	<link rel="stylesheet" href="css/clean.css">
	<?php INCLUDE('root.php'); ?>
	<style>
		.hero-faq {
			background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
			padding: 80px 0;
			text-align: center;
		}

		.hero-faq h1 {
			font-size: 48px;
			margin-bottom: 20px;
		}

		.faq-container {
			max-width: 900px;
			margin: 60px auto;
		}

		.faq-item {
			background: white;
			border-radius: 12px;
			margin-bottom: 20px;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
			overflow: hidden;
			border-left: 4px solid #ff6b35;
			transition: all 0.3s;
		}

		.faq-item:hover {
			box-shadow: 0 8px 25px rgba(255, 107, 53, 0.12);
		}

		.faq-question {
			padding: 24px;
			background: #ffffff;
			cursor: pointer;
			display: flex;
			justify-content: space-between;
			align-items: center;
			transition: all 0.3s;
			font-weight: 700;
			color: #1f2937;
		}

		.faq-question:hover {
			background: #f9fafb;
		}

		.faq-question.active {
			background: linear-gradient(135deg, #fff8f3 0%, #fffbf5 100%);
			color: #ff6b35;
		}

		.faq-icon {
			font-size: 18px;
			transition: transform 0.3s;
			color: #ff6b35;
			flex-shrink: 0;
			margin-left: 20px;
		}

		.faq-question.active .faq-icon {
			transform: rotate(180deg);
		}

		.faq-answer {
			padding: 0 24px;
			max-height: 0;
			overflow: hidden;
			transition: all 0.3s ease;
			background: #fafafa;
		}

		.faq-answer.open {
			padding: 24px;
			max-height: 1000px;
		}

		.faq-answer p {
			margin-bottom: 15px;
			line-height: 1.8;
		}

		.faq-answer p:last-child {
			margin-bottom: 0;
		}

		.faq-answer a {
			color: #ff6b35;
			font-weight: 700;
			text-decoration: none;
		}

		.faq-answer a:hover {
			text-decoration: underline;
		}

		.faq-search {
			margin: 40px 0;
		}

		.search-input {
			width: 100%;
			padding: 16px 20px;
			border: 2px solid #e5e7eb;
			border-radius: 10px;
			font-size: 16px;
			font-family: 'Poppins', sans-serif;
			transition: all 0.3s;
		}

		.search-input:focus {
			outline: none;
			border-color: #ff6b35;
			box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.1);
		}

		@media (max-width: 768px) {
			.hero-faq h1 {
				font-size: 32px;
			}

			.faq-question {
				padding: 16px;
				font-size: 14px;
			}

			.faq-answer.open {
				padding: 16px;
			}

			.faq-icon {
				margin-left: 10px;
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
	<section class="hero-faq">
		<div class="container">
			<h1>Preguntas Frecuentes</h1>
			<p class="hero-subtitle">Todo lo que necesitas saber sobre SuperCambios JVV</p>
		</div>
	</section>

	<!-- SEARCH -->
	<section class="section">
		<div class="container">
			<div class="faq-search">
				<input type="text" class="search-input" id="searchInput" placeholder="🔍 Busca tu pregunta...">
			</div>

			<!-- FAQ ITEMS -->
			<div class="faq-container">
				<!-- Q1 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Tienen un monto mínimo?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><b>Si, nuestro monto mínimo es de</b> <b style="color:#ff6b35;">40€</b></p>
					</div>
				</div>

				<!-- Q2 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Es necesario tener cuenta bancaria para enviar con ustedes?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>Si, es <b>ESTRICTAMENTE</b> necesario, <b>NO</b> recibimos pago de terceros o de personas que no podamos identificar, y para ello debes tener cuenta bancaria.</p>
					</div>
				</div>

				<!-- Q3 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿En qué horario trabajan?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>Nuestro horario comercial y de atención es:<br><b>TODOS LOS DÍAS DEL AÑO; SIN LOS DOMINGOS</b><br><b>VERANO:</b> de <b>15:00</b> a <b>22:00</b><br><b>INVIERNO:</b> de <b>14:00</b> a <b>21:00</b><br><br><i>¡Si algún día en específico no estaremos prestando servicio se indicará con múltiples avisos!</i></p>
					</div>
				</div>

				<!-- Q4 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Dónde puedo ver y como funciona su tasa de cambio?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><b>Puedes verla siempre que estemos disponibles en nuestra página web, la tasa de cambio puede variar sin previo aviso durante el día, debido a lo volátil que es el Bolívar. Antes de enviar tu remesa, se te indicará a que tasa se ha registrado (la misma que podrás observar en nuestra página al momento de solicitar tu envío).</b></p>
					</div>
				</div>

				<!-- Q5 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Qué tiempo demora en llegar los Bolívares?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>Siempre y cuando sea uno de nuestros bancos afiliados, recibirás tus bolívares en un lapso de <b>5 a 180 minutos</b> después de habernos efectuado el pago.</p>
					</div>
				</div>

				<!-- Q6 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Cuáles son sus bancos afiliados en Venezuela?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><b>Banesco, Mercantil y Provincial</b><br><i>ó Cualquier banco que pueda recibir transferencias inmediatas</i></p>
					</div>
				</div>

				<!-- Q10 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Cómo realizo mi primera transacción?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><b>Luego de mirar la tasa, si te interesa, el siguiente paso es contactarnos por WhatsApp ya que es el único medio de comunicación para gestionar las remesas.</b></p>
					</div>
				</div>

				<!-- Q11 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Desde qué países puedo enviar a Venezuela utilizando sus servicios?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>Puedes enviar desde cualquier país que tenga convenio SEPA de transferencias, o cuya moneda sea el Euro.<br><i>¡Eso pone en la lista a casi cualquier país de la Unión Europea!</i></p>
					</div>
				</div>

				<!-- Q12 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Me pueden enviar dinero desde Venezuela estando yo en Europa?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><b>¡Claro que sí!</b><br><b>Somos una de las pocas casas de cambio que procesamos Bolivares y los convertimos en Euros de manera segura.</b><br><br>Consulta la tasa para esas transacciones escribiendonos por WhatsApp</p>
					</div>
				</div>

				<!-- Q13 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Por qué enviar con ustedes?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>Somos una Empresa con trayectoria impecable, con más de 5 años prestando este servicio.<br><b>¡NUESTRA META ES LA EXCELENCIA Y NUESTROS CLIENTES LO RATIFICAN!</b></p>
					</div>
				</div>

				<!-- Q14 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Es SuperCambios JVV completamente seguro?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p>¡Sí, 100% seguro! Implementamos:<br>🔒 Encriptación de nivel militar<br>🔒 Cumplimiento total de regulaciones SEPA (Europa)<br>🔒 Verificación de identidad rigurosa<br>🔒 Protección anti-fraude<br>🔒 Registros auditables de todas las transacciones</p>
					</div>
				</div>

				<!-- Q15 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Cómo puedo saber si mi dinero llegó a Venezuela?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><strong>Te confirmamos en cada paso:</strong><br>1️⃣ Cuando recibimos tu transferencia<br>2️⃣ Cuando iniciamos el envío a Venezuela<br>3️⃣ Cuando el dinero se deposita en el banco<br>Puedes verificar directamente con el receptor o contactar con nosotros en WhatsApp.</p>
					</div>
				</div>

				<!-- Q16 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Qué pasa si hay un problema con mi transferencia?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><strong>Garantía de resolución 24h:</strong><br>✅ Disponibles 24/7 en WhatsApp<br>✅ Seguimiento personalizado de tu caso<br>✅ Reembolso garantizado si es necesario<br>✅ Sin largos tiempos de espera<br>Tu confianza es nuestro activo más importante.</p>
					</div>
				</div>

				<!-- Q17 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Están regulados o registrados?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><strong>Sí, cumplimos con todas las regulaciones:</strong><br>📋 Operamos en España bajo leyes españolas<br>📋 Cumplimiento SEPA (Single Euro Payments Area)<br>📋 Verificación de identidad conforme a normativa AML<br>📋 Protección de datos según GDPR<br>📋 Registros auditables para todas las transacciones</p>
					</div>
				</div>

				<!-- Q18 -->
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Por qué NO aceptan dinero de terceros?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><strong>Es por tu seguridad y la nuestra:</strong><br>🔒 Cumplimiento de regulaciones anti-lavado de dinero (AML)<br>🔒 Protección contra fraude y estafas<br>🔒 Verificación de origen lícito del dinero<br>🔒 Garantía de que no financiamos actividades ilícitas<br>Esta política protege a nuestros clientes y mantiene nuestro servicio seguro y legal.</p>
					</div>
				</div>
				<div class="faq-item">
					<div class="faq-question" onclick="toggleFaq(this)">
						<span>¿Cuál es el máximo que puedo transferir?</span>
						<i class="fas fa-chevron-down faq-icon"></i>
					</div>
					<div class="faq-answer">
						<p><strong>Manejamos transferencias desde €50 hasta €100,000 y más.</strong><br><br>No nos limita el monto. Ya sea para una emergencia médica, una inversión en negocio, la compra de una casa o cualquier sueño grande que tengas en Venezuela, podemos procesarlo de forma segura y profesional.<br><br>Para montos superiores a €50,000, recomendamos contactarnos previamente por WhatsApp para coordinar los detalles y tiempos exactos.</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CONTACT CTA -->
	<section class="section bg-gradient-light text-center">
		<div class="container">
			<h2>¿Aún tienes preguntas?</h2>
			<p style="font-size: 18px; margin: 20px 0; color: #6b7280;">Nuestro equipo está disponible 24/7 para ayudarte</p>
			<a href="//wa.me/34624442673" class="btn">
				<i class="fab fa-whatsapp"></i> Habla con Nosotros por WhatsApp
			</a>
		</div>
	</section>

	<!-- MOBILE STICKY CTA -->
	<div class="mobile-sticky-cta">
		<a href="//wa.me/34624442673">
			<i class="fab fa-whatsapp"></i> ENVÍA AHORA
		</a>
	</div>

	<!-- FOOTER -->
	<footer>
		<?php INCLUDE('footermenu.php'); ?>
		<p>&copy; 2024 SuperCambios JVV. Todos los derechos reservados.</p>
		<p><a href="faq.php">Preguntas Frecuentes</a> | <a href="aboutus.php">Quiénes Somos</a> | <a href="contact.php">Contacto</a></p>
	</footer>

	<script>
		function toggleFaq(element) {
			const question = element;
			const answer = element.nextElementSibling;

			// Close all others
			document.querySelectorAll('.faq-question.active').forEach(q => {
				if (q !== question) {
					q.classList.remove('active');
					q.nextElementSibling.classList.remove('open');
				}
			});

			// Toggle current
			question.classList.toggle('active');
			answer.classList.toggle('open');
		}

		// Search functionality
		document.getElementById('searchInput').addEventListener('input', function(e) {
			const searchTerm = e.target.value.toLowerCase();
			document.querySelectorAll('.faq-item').forEach(item => {
				const question = item.querySelector('.faq-question span').textContent.toLowerCase();
				const answer = item.querySelector('.faq-answer').textContent.toLowerCase();

				if (question.includes(searchTerm) || answer.includes(searchTerm)) {
					item.style.display = 'block';
				} else {
					item.style.display = 'none';
				}
			});
		});
	</script>
</body>
</html>
