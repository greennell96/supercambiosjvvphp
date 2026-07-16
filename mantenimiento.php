<?php
// Maintenance page — served for every public request via .htaccess (MAINTENANCE MODE block).
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
	<title>Volvemos pronto — Super Cambios JVV</title>
	<link rel="icon" href="images/favicon.ico">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: linear-gradient(180deg, #fff5ef 0%, #ffffff 55%, #fff5ef 100%);
			color: #1f2937;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 24px 16px;
			text-align: center;
		}

		main { max-width: 720px; width: 100%; }

		.logo { height: 52px; width: auto; margin-bottom: 18px; }

		.scene {
			width: 100%;
			max-width: 560px;
			height: auto;
			margin: 0 auto 8px;
			display: block;
		}

		h1 {
			font-size: clamp(1.5rem, 4.5vw, 2.1rem);
			font-weight: 800;
			margin-bottom: 14px;
			color: #1f2937;
		}
		h1 span {
			background: linear-gradient(90deg, #ff6b35, #f7931e);
			-webkit-background-clip: text;
			background-clip: text;
			-webkit-text-fill-color: transparent;
			color: #ff6b35;
		}

		.msg {
			font-size: clamp(1rem, 2.6vw, 1.15rem);
			line-height: 1.65;
			color: #4b5563;
			max-width: 600px;
			margin: 0 auto 26px;
		}

		.progress {
			width: min(320px, 80%);
			height: 6px;
			background: #f3f4f6;
			border-radius: 999px;
			margin: 0 auto 30px;
			overflow: hidden;
		}
		.progress::before {
			content: "";
			display: block;
			width: 40%;
			height: 100%;
			border-radius: 999px;
			background: linear-gradient(90deg, #ff6b35, #f7931e);
			animation: slide 1.8s ease-in-out infinite;
		}
		@keyframes slide {
			0%   { transform: translateX(-110%); }
			100% { transform: translateX(360%); }
		}

		.ig-label {
			font-size: 0.95rem;
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
			font-size: 1.05rem;
			font-weight: 700;
			text-decoration: none;
			padding: 13px 26px;
			border-radius: 999px;
			box-shadow: 0 8px 22px rgba(255, 107, 53, 0.35);
			transition: transform 0.15s ease, box-shadow 0.15s ease;
		}
		.ig-btn:hover {
			transform: translateY(-2px);
			box-shadow: 0 12px 28px rgba(255, 107, 53, 0.45);
		}
		.ig-btn svg { flex-shrink: 0; }

		/* ---- SVG scene animations ---- */
		.gear      { transform-box: fill-box; transform-origin: center; animation: spin 9s linear infinite; }
		.gear.ccw  { animation-direction: reverse; animation-duration: 12s; }
		@keyframes spin { to { transform: rotate(360deg); } }

		.float     { transform-box: fill-box; transform-origin: center; animation: bob 3.4s ease-in-out infinite; }
		.float.d2  { animation-delay: -1.7s; }
		@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

		.codeline  { transform-box: fill-box; transform-origin: left center; animation: type 4.8s steps(14) infinite; }
		@keyframes type {
			0%       { transform: scaleX(0); }
			45%,88%  { transform: scaleX(1); }
			100%     { transform: scaleX(1); opacity: 0; }
		}

		.cursor { animation: blink 0.9s steps(1) infinite; }
		@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

		.arm-l, .arm-r { transform-box: fill-box; transform-origin: center; animation: tap 0.42s ease-in-out infinite alternate; }
		.arm-r { animation-delay: -0.21s; }
		@keyframes tap { from { transform: translateY(0); } to { transform: translateY(2.5px); } }

		.head-nod { transform-box: fill-box; transform-origin: bottom center; animation: nod 5.5s ease-in-out infinite; }
		@keyframes nod {
			0%,86%,100% { transform: rotate(0deg); }
			90%,96%     { transform: rotate(3deg); }
		}

		.steam { animation: steam 2.6s ease-out infinite; }
		.steam.s2 { animation-delay: -1.3s; }
		@keyframes steam {
			0%   { transform: translateY(0);    opacity: 0; }
			30%  { opacity: 0.7; }
			100% { transform: translateY(-16px); opacity: 0; }
		}

		.screen-glow { animation: glow 3s ease-in-out infinite; }
		@keyframes glow { 0%,100% { opacity: 0.25; } 50% { opacity: 0.5; } }

		@media (prefers-reduced-motion: reduce) {
			.gear, .float, .codeline, .cursor, .arm-l, .arm-r, .head-nod, .steam, .screen-glow, .progress::before {
				animation: none;
			}
		}
	</style>
</head>
<body>
	<main>
		<img class="logo" src="images/logo-default1-140x57.png" alt="Super Cambios JVV">

		<svg class="scene" viewBox="0 0 880 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Equipo trabajando en mejoras del sitio">
			<!-- soft background blob -->
			<ellipse cx="440" cy="330" rx="380" ry="90" fill="#ffe9dd" opacity="0.55"/>

			<!-- floating gears + code symbols -->
			<g class="gear">
				<path fill="#f7931e" d="M120 70l6-14 16 1 5 14 14 6 12-9 11 11-8 13 6 14 14 4 0 16-14 5-5 14 9 12-11 11-13-8-14 6-4 14-16 0-5-14-14-5-12 9-11-11 8-13-6-14-14-4 0-16 14-5 5-14-9-12 11-11 13 8z" opacity="0.9"/>
				<circle cx="131" cy="86" r="17" fill="#fff5ef"/>
			</g>
			<g class="gear ccw">
				<path fill="#ffb98a" d="M745 45l5-11 13 1 4 11 11 5 10-7 9 9-7 10 5 11 11 3 0 13-11 4-4 11 7 10-9 9-10-7-11 5-3 11-13 0-4-11-11-4-10 7-9-9 7-10-5-11-11-3 0-13 11-4 4-11-7-10 9-9 10 7z" opacity="0.9"/>
				<circle cx="754" cy="58" r="13" fill="#fff5ef"/>
			</g>
			<g class="float">
				<rect x="230" y="30" rx="10" width="64" height="34" fill="#1f2937"/>
				<text x="262" y="53" font-family="monospace" font-size="18" font-weight="bold" fill="#ff6b35" text-anchor="middle">&lt;/&gt;</text>
			</g>
			<g class="float d2">
				<rect x="600" y="95" rx="10" width="56" height="34" fill="#10b981"/>
				<text x="628" y="118" font-family="monospace" font-size="17" font-weight="bold" fill="#ffffff" text-anchor="middle">{ }</text>
			</g>

			<!-- ============ central monitor with code ============ -->
			<g class="screen-glow"><ellipse cx="440" cy="200" rx="150" ry="110" fill="#f7931e"/></g>
			<rect x="330" y="105" width="220" height="150" rx="12" fill="#1f2937"/>
			<rect x="342" y="117" width="196" height="126" rx="6" fill="#111827"/>
			<!-- window dots -->
			<circle cx="356" cy="130" r="4" fill="#ef4444"/>
			<circle cx="370" cy="130" r="4" fill="#f7931e"/>
			<circle cx="384" cy="130" r="4" fill="#10b981"/>
			<!-- code lines (typing) -->
			<rect class="codeline" x="356" y="146" width="120" height="8" rx="4" fill="#ff6b35"/>
			<rect class="codeline" x="372" y="162" width="140" height="8" rx="4" fill="#6b7280" style="animation-delay:-3.6s"/>
			<rect class="codeline" x="372" y="178" width="90"  height="8" rx="4" fill="#10b981" style="animation-delay:-2.4s"/>
			<rect class="codeline" x="356" y="194" width="150" height="8" rx="4" fill="#e5e7eb" style="animation-delay:-1.2s"/>
			<rect class="codeline" x="372" y="210" width="110" height="8" rx="4" fill="#f7931e" style="animation-delay:-4.2s"/>
			<rect class="cursor"   x="356" y="224" width="10"  height="10" fill="#ff6b35"/>
			<!-- stand -->
			<rect x="428" y="255" width="24" height="26" fill="#374151"/>
			<rect x="400" y="281" width="80" height="10" rx="5" fill="#374151"/>

			<!-- ============ person 1 (left, laptop) ============ -->
			<g>
				<!-- torso -->
				<rect x="196" y="216" width="64" height="78" rx="26" fill="#ff6b35"/>
				<!-- head -->
				<g class="head-nod">
					<circle cx="228" cy="192" r="24" fill="#f4c793"/>
					<path d="M205 184 a23 18 0 0 1 46 0 z" fill="#1f2937"/>
					<circle cx="220" cy="192" r="2.6" fill="#1f2937"/>
					<circle cx="237" cy="192" r="2.6" fill="#1f2937"/>
					<path d="M223 203 q6 4 12 0" stroke="#1f2937" stroke-width="2" fill="none" stroke-linecap="round"/>
				</g>
				<!-- arms to laptop -->
				<g transform="rotate(18 240 248)"><rect class="arm-l" x="240" y="248" width="46" height="13" rx="6.5" fill="#f4c793"/></g>
				<!-- laptop -->
				<path d="M276 262 l58 0 8 29 -74 0 z" fill="#374151"/>
				<rect x="268" y="286" width="82" height="6" rx="3" fill="#1f2937"/>
				<rect x="284" y="267" width="42" height="17" rx="2" fill="#f7931e" opacity="0.85"/>
			</g>

			<!-- ============ person 2 (right, laptop + coffee) ============ -->
			<g>
				<!-- coffee -->
				<g>
					<rect x="668" y="268" width="26" height="23" rx="4" fill="#ef4444"/>
					<path d="M694 272 q12 2 0 14" stroke="#ef4444" stroke-width="4" fill="none"/>
					<path class="steam"    d="M676 260 q4 -6 0 -12" stroke="#9ca3af" stroke-width="2.5" fill="none" stroke-linecap="round"/>
					<path class="steam s2" d="M686 260 q-4 -6 0 -12" stroke="#9ca3af" stroke-width="2.5" fill="none" stroke-linecap="round"/>
				</g>
				<!-- torso -->
				<rect x="620" y="216" width="64" height="78" rx="26" fill="#10b981"/>
				<!-- head -->
				<g class="head-nod" style="animation-delay:-2.7s">
					<circle cx="652" cy="192" r="24" fill="#8d5524"/>
					<path d="M629 184 a23 18 0 0 1 46 0 z" fill="#111827"/>
					<circle cx="644" cy="192" r="2.6" fill="#111827"/>
					<circle cx="661" cy="192" r="2.6" fill="#111827"/>
					<path d="M647 203 q6 4 12 0" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
				</g>
				<!-- arms to laptop -->
				<g transform="rotate(-18 624 248)"><rect class="arm-r" x="578" y="248" width="46" height="13" rx="6.5" fill="#8d5524"/></g>
				<!-- laptop (facing left) -->
				<path d="M604 262 l-58 0 -8 29 74 0 z" fill="#374151"/>
				<rect x="530" y="286" width="82" height="6" rx="3" fill="#1f2937"/>
				<rect x="554" y="267" width="42" height="17" rx="2" fill="#10b981" opacity="0.85"/>
			</g>

			<!-- ============ desk (drawn last so people sit behind it) ============ -->
			<rect x="120" y="291" width="640" height="14" rx="7" fill="#1f2937"/>
			<rect x="160" y="305" width="14" height="80" fill="#374151"/>
			<rect x="706" y="305" width="14" height="80" fill="#374151"/>
		</svg>

		<h1>Estamos trabajando en <span>grandes novedades</span></h1>

		<p class="msg">
			Super Cambios JVV atraviesa tiempos de transición muy importantes.
			Esperamos volver muy pronto con novedades súper interesantes para todos nuestros clientes.
		</p>

		<div class="progress" aria-hidden="true"></div>

		<p class="ig-label">Atentos a nuestro Instagram — temporalmente nuestro <strong>único canal oficial</strong>:</p>

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
