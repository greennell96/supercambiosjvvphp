<?php
// Maintenance / notice page — served for every public request via .htaccess (MAINTENANCE MODE block).
// 503 + Retry-After so search engines keep the old pages indexed and come back later.
http_response_code(503);
header('Retry-After: 86400');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="robots" content="noindex, nofollow">
	<title>Aviso importante — Super Cambios JVV</title>
	<link rel="icon" href="images/favicon.ico">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: #f9fafb;
			color: #1f2937;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 32px 16px;
			text-align: center;
		}

		main { max-width: 680px; width: 100%; }

		.logo { height: 46px; width: auto; margin-bottom: 28px; opacity: 0.9; }

		.alert-mark {
			width: 76px;
			height: 76px;
			margin: 0 auto 20px;
			display: block;
			color: #dc2626;
		}
		.alert-mark .pulse { animation: pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
		@keyframes pulse {
			0%, 100% { opacity: 0.18; transform: scale(1); }
			50%      { opacity: 0.05; transform: scale(1.12); }
		}

		h1 {
			font-size: clamp(1.35rem, 4.2vw, 1.85rem);
			font-weight: 800;
			letter-spacing: 0.02em;
			text-transform: uppercase;
			color: #dc2626;
			margin-bottom: 26px;
		}

		.notice {
			background: #ffffff;
			border: 1px solid #fecaca;
			border-top: 4px solid #dc2626;
			border-radius: 14px;
			padding: 30px 26px;
			box-shadow: 0 4px 20px rgba(17, 24, 39, 0.06);
			text-align: left;
			margin-bottom: 30px;
		}

		.notice p {
			font-size: clamp(0.98rem, 2.5vw, 1.05rem);
			line-height: 1.7;
			color: #374151;
		}
		.notice p + p { margin-top: 16px; }
		.notice strong { color: #111827; font-weight: 700; }

		.number-block {
			background: #fef2f2;
			border: 1px dashed #fca5a5;
			border-radius: 10px;
			padding: 18px 16px;
			margin: 22px 0;
			text-align: center;
		}
		.number-block .lead {
			display: block;
			font-size: 0.9rem;
			color: #6b7280;
			line-height: 1.5;
		}
		.number-block .number {
			display: block;
			font-size: clamp(1.3rem, 5vw, 1.6rem);
			font-weight: 800;
			letter-spacing: 0.04em;
			color: #dc2626;
			margin: 8px 0;
			white-space: nowrap;
		}

		.back {
			font-size: 1rem;
			line-height: 1.6;
			color: #4b5563;
			margin-bottom: 26px;
		}

		.ig-label {
			font-size: 0.9rem;
			color: #6b7280;
			margin-bottom: 12px;
		}
		.ig-label strong { color: #1f2937; text-transform: uppercase; letter-spacing: 0.03em; }

		.ig-btn {
			display: inline-flex;
			align-items: center;
			gap: 10px;
			background: linear-gradient(90deg, #ff6b35, #f7931e);
			color: #fff;
			font-size: 1.02rem;
			font-weight: 700;
			text-decoration: none;
			padding: 13px 26px;
			border-radius: 999px;
			box-shadow: 0 8px 22px rgba(255, 107, 53, 0.28);
			transition: transform 0.15s ease, box-shadow 0.15s ease;
		}
		.ig-btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 12px 28px rgba(255, 107, 53, 0.38);
		}
		.ig-btn svg { flex-shrink: 0; }

		@media (prefers-reduced-motion: reduce) {
			.alert-mark .pulse { animation: none; }
		}
	</style>
</head>
<body>
	<main>
		<img class="logo" src="images/logo-default1-140x57.png" alt="Super Cambios JVV">

		<svg class="alert-mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aviso importante">
			<circle class="pulse" cx="50" cy="52" r="46" fill="currentColor"/>
			<path d="M50 14 L92 84 H8 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/>
			<rect x="46" y="38" width="8" height="24" rx="4" fill="currentColor"/>
			<circle cx="50" cy="71" r="4.6" fill="currentColor"/>
		</svg>

		<h1>Aviso importante</h1>

		<div class="notice">
			<p>
				Super Cambios JVV fue durante años un negocio administrado por <strong>María</strong> y
				<strong>José</strong>. Esa etapa ha terminado y cada uno ha tomado caminos separados, por
				lo que el servicio queda temporalmente suspendido.
			</p>

			<div class="number-block">
				<span class="lead">El número de WhatsApp</span>
				<span class="number">+34 624 44 26 73</span>
				<span class="lead">queda en manos de María, no de José.</span>
			</div>

			<p>
				<strong>Quien escriba a ese número estará hablando con María, no con José.</strong>
				Cualquier cambio, envío, cobro o transacción que se realice por ese contacto es
				responsabilidad exclusiva de María. José no tiene participación, control, responsabilidad
				ni garantía alguna sobre esas operaciones, ni sobre el dinero que se entregue a través de
				ellas.
			</p>

			<p>
				Le pedimos a nuestros clientes tenerlo presente y verificar siempre con quién están
				operando antes de enviar cualquier cantidad.
			</p>

			<p>
				La marca <strong>Super Cambios JVV</strong>, este sitio web y la cuenta de Instagram
				<strong>@supercambiosjvv</strong> continúan bajo la dirección de José, su fundador.
			</p>
		</div>

		<p class="back">
			José estará de vuelta muy pronto,<br>
			con el mismo servicio y la misma seriedad de siempre.
		</p>

		<p class="ig-label">Nuestro <strong>único canal oficial</strong> por ahora:</p>

		<a class="ig-btn" href="https://www.instagram.com/supercambiosjvv" target="_blank" rel="noopener">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<rect x="2" y="2" width="20" height="20" rx="5"/>
				<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
				<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
			</svg>
			@supercambiosjvv
		</a>
	</main>
</body>
</html>
