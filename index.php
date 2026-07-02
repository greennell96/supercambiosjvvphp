<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>SuperCambios JVV - Envía Dinero Seguro a Venezuela</title>
	<meta property="og:title" content="SuperCambios JVV - Envía Dinero Seguro a Venezuela" />
	<meta property="og:description" content="Transferencias seguras de Europa a Venezuela. Cambiamos Cripto a EUR/BS. 10,000+ clientes satisfechos." />
	<meta property="og:image" content="https://supercambiosjvv.com/images/logo-default1-140x57.png">
	<meta name="description" content="SuperCambios JVV: Envía dinero seguro desde Europa a Venezuela. Cambiamos Cripto a EUR/BS. Tasa real, sin comisiones ocultas.">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Caveat:wght@700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.4.0/css/all.css">
	<script src="js/sweetalert2.all.min.js"></script>
	<?php INCLUDE('root.php'); ?>
	<?php
		$status = 1;
		$statusT = '¡ENVIOS DISPONIBLES!💸';
		$statusTC = '#10b981';
		$feeEur = 2650.00;
		$feeVes = 2650.00;
		$feeUsd = 42.50;
		$feeUsd2 = 42.50;
		$dateves = date('Y-m-d H:i:s');
		$countdownTimer = '24:00:00';
		$season = 0;
		$overrideStart = '';
		$overrideEnd = '';
		$overrideDate = '';

		if ($db) {
			$actualDB = 1;
			$config1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB ");
			$config2 = $config1->num_rows;
			if (!EMPTY($config2)) {
				$config3 = $config1->fetch_array(MYSQLI_ASSOC);
				$status = $config3['status'];
				$countdownOn = $config3['countdown'];
				$feeEur = $config3['fee'];
				$feeDate = $config3['date'];
				$feeVes = $config3['ves2eur'];
				$feeUsd = $config3['usd2eur'];
				$feeUsd2 = $config3['eur2usd'];
				$dateves = $config3['date_ves'];
				$season = isset($config3['season']) ? $config3['season'] : 0;
				$overrideStart = isset($config3['override_start']) ? $config3['override_start'] : '';
				$overrideEnd = isset($config3['override_end']) ? $config3['override_end'] : '';
				$overrideDate = isset($config3['override_date']) ? $config3['override_date'] : '';
				if ($status == 0) {
					$statusT = '⛔CERRADO';
					$statusTC = '#ef4444';
				} else {
					$statusT = '¡ENVIOS DISPONIBLES!';
					$statusTC = '#10b981';
				}
				if ($config3['alertOn'] == 1) {
					$alertStatus = 1;
					$alertIcon = $config3['alertIcon'];
					$alertTittle = $config3['alertTittle'];
					$alertColor = $config3['alertColor'];
					$alertText = $config3['alertText'];
				}
				$snowActive = ($config3['ef_snow'] == 1) ? TRUE : FALSE;
				$countdownTimer = $config3['countdown_time'];
			}
		}
		$basicEur = 20;
		$basicVes = $basicEur * $feeEur;
		$feeEur = number_format($feeEur, 2);

		$testimonios = [];
		if ($db) {
			$tRes = MYSQLI_QUERY($db, "SELECT * FROM testimonios WHERE activo = 1 ORDER BY orden ASC, id ASC");
			if ($tRes) {
				while ($tRow = $tRes->fetch_array(MYSQLI_ASSOC)) {
					$testimonios[] = $tRow;
				}
			}
		}
	?>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: 'Poppins', sans-serif;
			color: #1f2937;
			line-height: 1.6;
			background: #ffffff;
		}

		.container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 20px;
		}

		header {
			background: linear-gradient(135deg, #fff 0%, #f3f4f6 100%);
			padding: 20px 0;
			position: sticky;
			top: 0;
			z-index: 1000;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
		}

		.header-content {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.logo {
			font-size: 24px;
			font-weight: 800;
			color: #10b981;
			display: flex;
			align-items: center;
			gap: 10px;
			text-decoration: none;
		}

		.logo img {
			height: 40px;
			width: auto;
		}

		nav a {
			text-decoration: none;
			color: #4b5563;
			font-weight: 500;
			margin: 0 20px;
			transition: color 0.3s;
			display: inline-block;
		}

		nav a:hover {
			color: #ff6b35;
		}

		.header-cta {
			display: flex;
			gap: 10px;
			align-items: center;
		}

		.btn-whatsapp-header {
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			color: white;
			padding: 12px 24px;
			border-radius: 8px;
			text-decoration: none;
			font-weight: 700;
			font-size: 14px;
			transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
			box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3);
		}

		.btn-whatsapp-header:hover {
			transform: translateY(-3px);
			box-shadow: 0 10px 30px rgba(255, 107, 53, 0.4);
		}

		.hero {
			background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fef3c7 100%);
			padding: 80px 0;
			text-align: center;
			position: relative;
			overflow: hidden;
		}

		.hero::before {
			content: '';
			position: absolute;
			top: -50%;
			right: -10%;
			width: 500px;
			height: 500px;
			background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%);
			border-radius: 50%;
		}

		.hero::after {
			content: '';
			position: absolute;
			bottom: -50%;
			left: -10%;
			width: 400px;
			height: 400px;
			background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
			border-radius: 50%;
		}

		.hero-content {
			position: relative;
			z-index: 2;
		}

		.hero h1 {
			font-size: 52px;
			font-weight: 800;
			color: #1f2937;
			margin-bottom: 20px;
			line-height: 1.2;
		}

		.hero-subtitle {
			font-size: 18px;
			color: #6b7280;
			margin-bottom: 40px;
			font-weight: 500;
		}

		@keyframes softPulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.82; }
		}

		.rate-status {
			font-size: 12px;
			padding: 6px 14px;
			border-radius: 20px;
			font-weight: 700;
			display: inline-block;
			color: white;
			white-space: nowrap;
			animation: softPulse 4s ease-in-out infinite;
		}

		.status-open {
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		}

		.status-closed {
			background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		}

		.calc-header {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			margin-bottom: 14px;
			flex-wrap: wrap;
		}

		.currency-pill-wrap {
			position: relative;
			flex-shrink: 0;
		}

		.currency-pill {
			display: flex;
			align-items: center;
			gap: 8px;
			background: white;
			border: 1.5px solid #e5e7eb;
			color: #1f2937;
			font-weight: 700;
			font-size: 14px;
			padding: 8px 12px;
			border-radius: 999px;
			cursor: pointer;
			transition: all 0.15s;
			font-family: 'Poppins', sans-serif;
			box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
		}

		.currency-pill:hover {
			border-color: #ff6b35;
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
		}

		.currency-pill:active {
			transform: scale(0.96);
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}

		.currency-pill-flag {
			width: 22px;
			height: 22px;
			border-radius: 50%;
			object-fit: cover;
			flex-shrink: 0;
		}

		.currency-pill-arrow {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			background: #f3f4f6;
			color: #ff6b35;
			flex-shrink: 0;
			transition: all 0.2s;
		}

		.currency-pill-arrow i {
			font-size: 10px;
			transition: transform 0.2s;
		}

		.currency-pill:hover .currency-pill-arrow {
			background: #ff6b35;
			color: white;
		}

		.currency-pill-wrap.open .currency-pill-arrow {
			background: #ff6b35;
			color: white;
		}

		.currency-pill-wrap.open .currency-pill-arrow i {
			transform: rotate(90deg);
		}

		.currency-menu {
			display: none;
			position: absolute;
			top: calc(100% + 8px);
			right: 0;
			background: white;
			border: 1px solid #e5e7eb;
			border-radius: 12px;
			box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
			min-width: 230px;
			max-width: 85vw;
			z-index: 50;
			overflow: hidden;
		}

		.currency-pill-wrap.open .currency-menu {
			display: block;
		}

		.exchange-menu-item {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 2px;
			width: 100%;
			padding: 12px 16px;
			background: none;
			border: none;
			text-align: left;
			cursor: pointer;
			font-family: 'Poppins', sans-serif;
			transition: background 0.15s;
		}

		.exchange-menu-item:hover {
			background: #f9fafb;
		}

		.exchange-menu-item.active {
			background: #fff5ef;
		}

		.exchange-menu-item-main {
			font-weight: 700;
			font-size: 14px;
			color: #1f2937;
		}

		.exchange-menu-item-sub {
			font-size: 12px;
			color: #6b7280;
		}

		.rate-display-mid {
			display: flex;
			align-items: baseline;
			justify-content: center;
			gap: 8px;
			margin: 2px 0 18px;
			padding: 10px 20px;
			background: #f9fafb;
			border: 1px solid #eef0f2;
			border-radius: 14px;
			position: relative;
		}

		.rate-display-label {
			font-size: 15px;
			color: #6b7280;
			font-weight: 600;
		}

		.rate-display-value {
			font-size: 32px;
			font-weight: 800;
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		.section-title {
			font-size: 40px;
			font-weight: 800;
			text-align: center;
			margin-bottom: 60px;
			color: #1f2937;
		}

		.calculator-wrapper {
			background: white;
			border-radius: 20px;
			box-shadow: 0 25px 80px rgba(0, 0, 0, 0.08);
			padding: 50px;
			max-width: 600px;
			margin: 40px auto 0;
			border-top: 5px solid #ff6b35;
			text-align: left;
			position: relative;
		}

		.calc-hint {
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
			background: #1f2937;
			color: white;
			font-size: 13px;
			font-weight: 700;
			padding: 7px 15px;
			border-radius: 20px;
			white-space: nowrap;
			opacity: 0;
			pointer-events: none;
			transition: opacity 0.3s ease;
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
			z-index: 30;
		}

		.calc-hint.show.point-up {
			opacity: 1;
			animation: calcHintShakeUp 0.7s ease forwards;
		}

		.calc-hint.show.point-down {
			opacity: 1;
			animation: calcHintShakeDown 0.7s ease forwards;
		}

		@keyframes calcHintShakeUp {
			0% { transform: translateX(-50%) translateY(0) rotate(0deg); }
			15% { transform: translateX(-50%) translateY(0) rotate(-10deg); }
			30% { transform: translateX(-50%) translateY(0) rotate(10deg); }
			45% { transform: translateX(-50%) translateY(0) rotate(-8deg); }
			60% { transform: translateX(-50%) translateY(0) rotate(8deg); }
			75% { transform: translateX(-50%) translateY(0) rotate(-4deg); }
			100% { transform: translateX(-50%) translateY(-6px) rotate(0deg); }
		}

		@keyframes calcHintShakeDown {
			0% { transform: translateX(-50%) translateY(0) rotate(0deg); }
			15% { transform: translateX(-50%) translateY(0) rotate(-10deg); }
			30% { transform: translateX(-50%) translateY(0) rotate(10deg); }
			45% { transform: translateX(-50%) translateY(0) rotate(-8deg); }
			60% { transform: translateX(-50%) translateY(0) rotate(8deg); }
			75% { transform: translateX(-50%) translateY(0) rotate(-4deg); }
			100% { transform: translateX(-50%) translateY(6px) rotate(0deg); }
		}

		.calc-hint-serious {
			position: absolute;
			top: 50%;
			right: 90px;
			transform: translateY(-50%);
			color: #9ca3af;
			font-size: 13px;
			font-weight: 500;
			font-style: italic;
			white-space: nowrap;
			opacity: 0;
			pointer-events: none;
			user-select: none;
			-webkit-user-select: none;
			-moz-user-select: none;
			-webkit-touch-callout: none;
			transition: opacity 1.4s ease;
			z-index: 5;
		}

		.calc-hint-serious.show {
			opacity: 1;
			transition: opacity 0.3s ease;
		}

		.form-group {
			margin-bottom: 14px;
		}

		.label-text-swap {
			display: inline-block;
			transition: opacity 0.15s ease;
		}

		.form-label-text {
			font-size: 14px;
			font-weight: 700;
			color: #4b5563;
			margin-bottom: 12px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.form-label-text::before {
			content: '✓';
			color: #ff6b35;
			font-size: 18px;
		}

		.input-wrapper {
			position: relative;
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.form-input-modern {
			flex: 1;
			min-width: 0;
			padding: 16px 20px;
			border: 2px solid #e5e7eb;
			border-radius: 12px;
			font-size: 16px;
			font-weight: 600;
			transition: all 0.3s;
			font-family: 'Poppins', sans-serif;
		}

		.form-input-modern:focus {
			outline: none;
			border-color: #ff6b35;
			box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.1);
			background: #fafafa;
		}

		.submit-btn {
			width: 100%;
			padding: 18px;
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			color: white;
			border: none;
			border-radius: 12px;
			font-size: 16px;
			font-weight: 700;
			cursor: pointer;
			transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
			box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-top: 12px;
		}

		.submit-btn:hover {
			transform: translateY(-5px);
			box-shadow: 0 15px 45px rgba(255, 107, 53, 0.4);
		}

		.submit-btn:active {
			transform: translateY(-2px);
		}

		.testimonials-section {
			padding: 60px 0;
		}

		.testimonials-title {
			font-family: 'Caveat', cursive;
			font-size: 48px;
			font-weight: 700;
			text-align: center;
			color: #1f2937;
			margin-bottom: 30px;
		}

		.testimonials-scroll {
			display: flex;
			gap: 20px;
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			padding: 10px 4px 20px;
		}

		.testimonial-card {
			flex: 0 0 auto;
			scroll-snap-align: start;
			width: 220px;
			background: white;
			border-radius: 16px;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
			overflow: hidden;
			text-align: center;
		}

		.testimonial-card img {
			width: 100%;
			display: block;
		}

		.testimonial-name {
			padding: 12px 10px;
			font-size: 13px;
			font-weight: 600;
			color: #6b7280;
		}

		.trust-section {
			padding: 80px 0;
			background: linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(255, 107, 53, 0.02) 100%);
		}

		.trust-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
			gap: 30px;
			margin-top: 60px;
		}

		.trust-card {
			background: white;
			padding: 40px 30px;
			border-radius: 16px;
			text-align: center;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
			transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
			border-left: 5px solid #ff6b35;
			position: relative;
			overflow: hidden;
		}

		.trust-card::before {
			content: '';
			position: absolute;
			top: 0;
			left: -100%;
			width: 100%;
			height: 100%;
			background: linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.1), transparent);
			transition: left 0.6s;
			z-index: 0;
		}

		.trust-card:hover {
			transform: translateY(-12px);
			box-shadow: 0 20px 60px rgba(255, 107, 53, 0.15);
		}

		.trust-card:hover::before {
			left: 100%;
		}

		.trust-number {
			font-size: 48px;
			font-weight: 800;
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
			margin-bottom: 12px;
			display: block;
		}

		.trust-text {
			font-size: 16px;
			font-weight: 600;
			color: #4b5563;
			line-height: 1.6;
		}

		.features-section {
			padding: 80px 0;
		}

		.features-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 30px;
			margin-top: 50px;
		}

		.feature-card {
			padding: 30px;
			background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
			border-radius: 16px;
			border-left: 4px solid #ff6b35;
			transition: all 0.3s;
		}

		.feature-card:hover {
			transform: translateX(8px);
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
		}

		.feature-icon {
			font-size: 32px;
			margin-bottom: 15px;
		}

		.feature-title {
			font-size: 18px;
			font-weight: 700;
			color: #1f2937;
			margin-bottom: 10px;
		}

		.feature-desc {
			font-size: 14px;
			color: #6b7280;
			line-height: 1.6;
		}

		.cta-section {
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			padding: 60px 0;
			text-align: center;
			border-radius: 20px;
			margin: 80px 0;
		}

		.cta-section h2 {
			font-size: 36px;
			color: white;
			font-weight: 800;
			margin-bottom: 20px;
		}

		.cta-section p {
			font-size: 18px;
			color: rgba(255, 255, 255, 0.95);
			margin-bottom: 30px;
		}

		.cta-btn {
			background: white;
			color: #ff6b35;
			padding: 16px 40px;
			border-radius: 10px;
			text-decoration: none;
			font-weight: 700;
			font-size: 16px;
			display: inline-block;
			transition: all 0.3s;
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
		}

		.cta-btn:hover {
			transform: translateY(-3px);
			box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
		}

		footer {
			background: #1f2937;
			color: #d1d5db;
			padding: 50px 0 20px 0;
			text-align: center;
			margin-top: 100px;
		}

		footer p {
			margin-bottom: 10px;
			font-size: 14px;
		}

		.mobile-sticky-cta {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
			z-index: 999;
			display: none;
			box-shadow: 0 -5px 20px rgba(255, 107, 53, 0.3);
		}

		.mobile-sticky-cta a {
			display: block;
			padding: 16px;
			color: white;
			text-decoration: none;
			font-weight: 700;
			font-size: 15px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		@media (max-width: 768px) {
			.hero h1 {
				font-size: 36px;
			}

			nav {
				display: none;
			}

			.calculator-wrapper {
				padding: 30px 20px;
			}

			.mobile-sticky-cta {
				display: block;
			}

			body {
				padding-bottom: 65px;
			}

			.currency-menu {
				min-width: 200px;
			}

			.currency-pill {
				gap: 5px;
				padding: 6px 9px;
				font-size: 11px;
				background: #fff5ef;
				border-color: #ffb98a;
			}

			.currency-pill-flag {
				width: 18px;
				height: 18px;
			}

			.currency-pill-arrow {
				width: 16px;
				height: 16px;
			}

			.currency-pill-arrow i {
				font-size: 8px;
			}

			.rate-display-value {
				font-size: 26px;
			}
		}

		.info-icon {
			cursor: help;
			color: #ff6b35;
			transition: transform 0.3s;
		}

		.info-icon:hover {
			transform: scale(1.2);
		}

		#info-box {
			position: absolute;
			top: -55px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(0, 0, 0, 0.9);
			color: white;
			padding: 12px 16px;
			border-radius: 8px;
			font-size: 13px;
			white-space: nowrap;
			z-index: 100;
			display: none;
			box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
		}

		#info-box::after {
			content: '';
			position: absolute;
			bottom: -6px;
			left: 50%;
			transform: translateX(-50%);
			width: 0;
			height: 0;
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 6px solid rgba(0, 0, 0, 0.9);
		}

		.relative {
			position: relative;
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

	<!-- HERO + CALCULATOR SECTION -->
	<section class="hero">
		<div class="container">
			<div class="hero-content">
				<h1>Envía dinero a Venezuela<br>De forma segura</h1>
				<p class="hero-subtitle">Tasa real, sin comisiones ocultas</p>

				<div class="calculator-wrapper">
					<div class="calc-header">
						<?php if ($status == 1) { ?>
							<span class="rate-status status-open" id="rateStatus">
								<i class="fas fa-check-circle"></i> <?php echo $statusT; ?>
							</span>
						<?php } else { ?>
							<span class="rate-status status-closed" id="rateStatus">
								<i class="fas fa-times-circle"></i> <?php echo $statusT; ?>
							</span>
						<?php } ?>
					</div>

					<form onsubmit="return false;">
						<div class="form-group">
							<label class="form-label-text">
								<span id="labelSend" class="label-text-swap">¿Cuánto envías?</span>
								<i class="fas fa-info-circle info-icon relative" onmouseover="document.getElementById('info-box').style.display='block'" onmouseout="document.getElementById('info-box').style.display='none'"></i>
								<div id="info-box">Calcula mientras escribes</div>
							</label>
							<div class="input-wrapper">
								<div class="calc-hint-serious" id="writeHint">Escribe aquí..</div>
								<input class="form-input-modern" id="eurCash" type="text" inputmode="decimal" placeholder="Ingresa cantidad" oninput="setCash(1)" onfocus="setActiveField('send'); dismissWriteHint();">
								<div class="currency-pill-wrap" id="sendPillWrap">
									<button type="button" class="currency-pill" onclick="toggleCurrencyMenu('send')">
										<img src="images/flags/spain.png" class="currency-pill-flag" id="sendFlag" alt="">
										<span id="sendCode">EUR</span>
										<span class="currency-pill-arrow"><i class="fas fa-chevron-right"></i></span>
									</button>
									<div class="currency-menu" id="sendMenu">
										<button type="button" class="exchange-menu-item active" onclick="setNewCash(1)">
											<span class="exchange-menu-item-main">€ → Bs</span>
											<span class="exchange-menu-item-sub">Euros a Bolívares</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(2)">
											<span class="exchange-menu-item-main">Bs → €</span>
											<span class="exchange-menu-item-sub">Bolívares a Euros</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(3)">
											<span class="exchange-menu-item-main">$ → €</span>
											<span class="exchange-menu-item-sub">Dólares a Euros</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(4)">
											<span class="exchange-menu-item-main">€ → $</span>
											<span class="exchange-menu-item-sub">Euros a Dólares</span>
										</button>
									</div>
								</div>
							</div>
						</div>

						<div class="rate-display-mid">
							<div class="calc-hint point-up" id="calcHint">Toca ☝️</div>
							<span class="rate-display-label">Tasa:</span>
							<span class="rate-display-value" id="rateValue"><?php echo ($status == 1) ? $feeEur : '-'; ?></span>
						</div>

						<div class="form-group">
							<label class="form-label-text">
								<span id="labelReceive" class="label-text-swap">Recibirás:</span>
							</label>
							<div class="input-wrapper">
								<div class="calc-hint-serious" id="writeHint2">O aquí..</div>
								<input class="form-input-modern" id="vesCash" type="text" inputmode="decimal" placeholder="Resultado" oninput="setCash(2)" onfocus="setActiveField('receive'); dismissWriteHint();">
								<div class="currency-pill-wrap" id="receivePillWrap">
									<button type="button" class="currency-pill" onclick="toggleCurrencyMenu('receive')">
										<img src="images/flags/venezuela.png" class="currency-pill-flag" id="receiveFlag" alt="">
										<span id="receiveCode">VES</span>
										<span class="currency-pill-arrow"><i class="fas fa-chevron-right"></i></span>
									</button>
									<div class="currency-menu" id="receiveMenu">
										<button type="button" class="exchange-menu-item active" onclick="setNewCash(1)">
											<span class="exchange-menu-item-main">€ → Bs</span>
											<span class="exchange-menu-item-sub">Euros a Bolívares</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(2)">
											<span class="exchange-menu-item-main">Bs → €</span>
											<span class="exchange-menu-item-sub">Bolívares a Euros</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(3)">
											<span class="exchange-menu-item-main">$ → €</span>
											<span class="exchange-menu-item-sub">Dólares a Euros</span>
										</button>
										<button type="button" class="exchange-menu-item" onclick="setNewCash(4)">
											<span class="exchange-menu-item-main">€ → $</span>
											<span class="exchange-menu-item-sub">Euros a Dólares</span>
										</button>
									</div>
								</div>
							</div>
						</div>

						<input type="hidden" id="eurFee" value="<?php echo $feeEur; ?>">
						<input type="hidden" id="vesFee" value="<?php echo $feeVes; ?>">
						<input type="hidden" id="usdFee" value="<?php echo $feeUsd; ?>">
						<input type="hidden" id="usdFee2" value="<?php echo $feeUsd2; ?>">
						<input type="hidden" id="actualdate" value="<?php echo date('Y-m-d H:i:s', strtotime('now +2 hours')); ?>">
						<input type="hidden" id="dbStatus" value="<?php echo (int)$status; ?>">
						<input type="hidden" id="lastGuardar" value="<?php echo htmlspecialchars($dateves); ?>">
						<input type="hidden" id="seasonData" value="<?php echo $season; ?>">
						<input type="hidden" id="overrideStart" value="<?php echo $overrideStart; ?>">
						<input type="hidden" id="overrideEnd" value="<?php echo $overrideEnd; ?>">
						<input type="hidden" id="overrideDate" value="<?php echo $overrideDate; ?>">

						<a href="//wa.me/34624442673"><button type="button" class="submit-btn">
							<i class="fab fa-whatsapp"></i> Enviar Ahora por WhatsApp
						</button></a>
					</form>
				</div>
			</div>
		</div>
	</section>

	<!-- TESTIMONIOS SECTION -->
	<?php if (!empty($testimonios)): ?>
	<section class="testimonials-section">
		<div class="container">
			<h2 class="testimonials-title">Testimonios</h2>
			<div class="testimonials-scroll">
				<?php foreach ($testimonios as $t): ?>
				<div class="testimonial-card">
					<img src="images/testimonios/<?php echo htmlspecialchars($t['imagen']); ?>" alt="Testimonio<?php echo $t['nombre'] !== '' ? ' de ' . htmlspecialchars($t['nombre']) : ''; ?>" loading="lazy">
					<?php if ($t['nombre'] !== ''): ?>
					<div class="testimonial-name"><?php echo htmlspecialchars($t['nombre']); ?></div>
					<?php endif; ?>
				</div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<!-- TRUST SECTION -->
	<section class="trust-section">
		<div class="container">
			<div class="trust-grid">
				<div class="trust-card">
					<span class="trust-number">10,000+</span>
					<span class="trust-text">Transferencias Exitosas</span>
				</div>
				<div class="trust-card">
					<span class="trust-number">7+</span>
					<span class="trust-text">Años en el Mercado</span>
				</div>
				<div class="trust-card">
					<span class="trust-number">💰</span>
					<span class="trust-text">Crypto → EUR/BS</span>
				</div>
				<div class="trust-card">
					<span class="trust-number">100%</span>
					<span class="trust-text">Seguro & Encriptado</span>
				</div>
			</div>
		</div>
	</section>

	<!-- FEATURES SECTION -->
	<section class="features-section">
		<div class="container">
			<h2 class="section-title">¿Por Qué Somos Diferentes?</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">🎯</div>
					<div class="feature-title">Tasa Real</div>
					<div class="feature-desc">Sin comisiones ocultas. Lo que ves es lo que recibe tu familia.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">⚡</div>
					<div class="feature-title">Ultra Rápido</div>
					<div class="feature-desc">Respuesta en minutos, dinero en horas. No esperes días.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🔒</div>
					<div class="feature-title">100% Seguro</div>
					<div class="feature-desc">Encriptación de datos, cumplimiento legal, protección total.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">👥</div>
					<div class="feature-title">Equipo Profesional</div>
					<div class="feature-desc">Expertos en transferencias internacionales desde 2017.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🪙</div>
					<div class="feature-title">Cambiamos Cripto</div>
					<div class="feature-desc">Recibimos criptomonedas como parte de pago para cualquier servicio.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">✅</div>
					<div class="feature-title">Garantía de Entrega</div>
					<div class="feature-desc">Si algo falla, resolvemos en máximo 24 horas.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">💰</div>
					<div class="feature-title">Montos Sin Límites</div>
					<div class="feature-desc">Desde €50 hasta €100,000+. Casas, negocios, sueños grandes.</div>
				</div>
				<div class="feature-card">
					<div class="feature-icon">⭐</div>
					<div class="feature-title">Únicos en el Mercado</div>
					<div class="feature-desc">Una de las pocas casas de cambio que procesamos Bolivares en Euros de forma segura y legal.</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA SECTION -->
	<section class="cta-section">
		<div class="container">
			<h2>¿Listo para Enviar?</h2>
			<p>Miles de familias ya confían en nosotros</p>
			<a href="//wa.me/34624442673" class="cta-btn">
				<i class="fab fa-whatsapp"></i> Habla con Nosotros Ahora
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
		<p><a href="faq.php" style="color: #ff6b35; text-decoration: none;">Preguntas Frecuentes</a> | <a href="aboutus.php" style="color: #ff6b35; text-decoration: none;">Quiénes Somos</a> | <a href="contact.php" style="color: #ff6b35; text-decoration: none;">Contacto</a></p>
	</footer>

	<!-- CALCULATOR JAVASCRIPT -->
	<script>
		// Rules: toggle=intent, Guardar today=rate confirmation, time=gate
		function updateStatusDisplay() {
			const dbStatus  = parseInt(document.getElementById('dbStatus').value) || 0;
			const forceOpen = localStorage.getItem('forceOpen') === 'true';

			if (forceOpen) { applyStatus(true, '✅ ¡ABIERTO! (Modo Testing)'); return; }
			if (!dbStatus)  { applyStatus(false, '⛔ CERRADO'); return; }

			const ahora     = new Date();
			const horaEspaña = new Date(ahora.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
			const diaSemana = horaEspaña.getDay();
			const hora      = horaEspaña.getHours();
			const minutos   = horaEspaña.getMinutes();

			// Today's date in Spain timezone (avoid toISOString which gives UTC)
			const todayDate = horaEspaña.getFullYear() + '-' +
				String(horaEspaña.getMonth() + 1).padStart(2, '0') + '-' +
				String(horaEspaña.getDate()).padStart(2, '0');

			const season        = parseInt(document.getElementById('seasonData').value) || 0;
			const overrideStart = document.getElementById('overrideStart').value;
			const overrideEnd   = document.getElementById('overrideEnd').value;
			const overrideDate  = document.getElementById('overrideDate').value;

			// Override schedule takes priority (no Guardar requirement)
			if (overrideDate === todayDate && overrideStart && overrideEnd) {
				const currentTime = hora * 60 + minutos;
				const [sh, sm] = overrideStart.split(':').map(Number);
				const [eh, em] = overrideEnd.split(':').map(Number);
				const isOpen = currentTime >= (sh * 60 + sm) && currentTime < (eh * 60 + em);
				applyStatus(isOpen, isOpen ? '✅ ¡ABIERTO! (Horario Especial)' : '⛔ CERRADO');
				return;
			}

			// Regular schedule: Guardar must have been clicked today
			const lastGuardar     = document.getElementById('lastGuardar').value || '';
			const lastGuardarDate = lastGuardar.substring(0, 10); // "YYYY-MM-DD"
			if (lastGuardarDate !== todayDate) {
				applyStatus(false, '⛔ CERRADO');
				return;
			}

			// Toggle ON + Guardar today + within hours = open
			const openHour     = season === 1 ? 15 : 14;
			const closeHour    = season === 1 ? 22 : 21;
			const satCloseHour = season === 1 ? 19 : 18;
			const withinHours  =
				(diaSemana >= 1 && diaSemana <= 5 && hora >= openHour && hora < closeHour) ||
				(diaSemana === 6 && hora >= openHour && hora < satCloseHour);

			applyStatus(withinHours, withinHours ? '✅ ¡ABIERTO!' : '⛔ CERRADO');
		}

		function applyStatus(isOpen, statusMsg) {
			document.getElementById('rateStatus').innerHTML = `<i class="fas ${isOpen ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${statusMsg}`;
			document.getElementById('rateStatus').style.backgroundImage = isOpen
				? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
				: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

			const rateValueEl = document.getElementById('rateValue');
			if (!isOpen) {
				rateValueEl.textContent = '-';
			} else {
				const activeItem = document.querySelector('.exchange-menu-item.active');
				if (activeItem) {
					const itemIndex = Array.from(document.querySelectorAll('.exchange-menu-item')).indexOf(activeItem);
					if (itemIndex === 0) rateValueEl.textContent = document.getElementById('eurFee').value;
					else if (itemIndex === 1) rateValueEl.textContent = document.getElementById('vesFee').value;
					else if (itemIndex === 2) rateValueEl.textContent = document.getElementById('usdFee').value;
				}
			}
		}

		// Function to toggle force open for testing
		function toggleForceOpen() {
			const isForceOpen = localStorage.getItem('forceOpen') === 'true';
			if (isForceOpen) {
				localStorage.removeItem('forceOpen');
				alert('✓ Modo testing desactivado');
			} else {
				localStorage.setItem('forceOpen', 'true');
				alert('✓ Modo testing activado - El negocio aparecerá como abierto');
			}
			updateStatusDisplay();
		}

		updateStatusDisplay();
		setInterval(updateStatusDisplay, 60000);

		function toggleCurrencyMenu(which) {
			dismissCalcHint();
			const thisWrap = document.getElementById(which === 'send' ? 'sendPillWrap' : 'receivePillWrap');
			const otherWrap = document.getElementById(which === 'send' ? 'receivePillWrap' : 'sendPillWrap');
			otherWrap.classList.remove('open');
			thisWrap.classList.toggle('open');
		}

		document.addEventListener('click', function(e) {
			['sendPillWrap', 'receivePillWrap'].forEach((id) => {
				const wrap = document.getElementById(id);
				if (wrap && !wrap.contains(e.target)) {
					wrap.classList.remove('open');
				}
			});
		});

		const CURRENCY_INFO = {
			'€':  { code: 'EUR', flag: 'images/flags/spain.png' },
			'Bs': { code: 'VES', flag: 'images/flags/venezuela.png' },
			'$':  { code: 'USD', flag: 'images/flags/usa.png' }
		};

		function updateCurrencyPills() {
			const sendInfo = CURRENCY_INFO[symbol1];
			const receiveInfo = CURRENCY_INFO[symbol2];
			document.getElementById('sendFlag').src = sendInfo.flag;
			document.getElementById('sendCode').textContent = sendInfo.code;
			document.getElementById('receiveFlag').src = receiveInfo.flag;
			document.getElementById('receiveCode').textContent = receiveInfo.code;
		}

		function setActiveMenuItem(index) {
			['sendMenu', 'receiveMenu'].forEach((id) => {
				const items = document.querySelectorAll('#' + id + ' .exchange-menu-item');
				items.forEach((btn) => btn.classList.remove('active'));
				items[index].classList.add('active');
			});
		}

		function fadeSwapText(el, text) {
			if (el.textContent.trim() === text) return;
			el.style.opacity = '0';
			setTimeout(() => {
				el.textContent = text;
				el.style.opacity = '1';
			}, 150);
		}

		function setActiveField(field) {
			const labelSend = document.getElementById('labelSend');
			const labelReceive = document.getElementById('labelReceive');
			if (field === 'send') {
				fadeSwapText(labelSend, '¿Cuánto envías?');
				fadeSwapText(labelReceive, 'Recibirás:');
			} else {
				fadeSwapText(labelSend, 'Tendrías que enviar:');
				fadeSwapText(labelReceive, '¿Quieres recibir...?');
			}
		}

		let symbol1 = '€';
		let symbol2 = 'Bs';
		let fee_eur = parseFloat(document.getElementById('eurFee').value);

		function setNewCash(cash) {
			let newClasst = 'newText1';

			if (cash == 1) {
				fee_eur = parseFloat(document.getElementById('eurFee').value);
				symbol1 = '€';
				symbol2 = 'Bs';
				document.getElementById('rateValue').innerHTML = fee_eur;
				setActiveMenuItem(0);
			} else if (cash == 2) {
				fee_eur = 1 / parseFloat(document.getElementById('vesFee').value);
				symbol1 = 'Bs';
				symbol2 = '€';
				document.getElementById('rateValue').innerHTML = parseFloat(document.getElementById('vesFee').value);
				setActiveMenuItem(1);

				var fechaDada = new Date("<?php echo $dateves; ?>");
				let newdate = document.getElementById('actualdate').value;
				var fechaActual = new Date(newdate);
				var diferencia = fechaActual - fechaDada;
				var unaHoraEnMilisegundos = 10800000;

				if (diferencia >= unaHoraEnMilisegundos) {
					document.getElementById('rateValue').innerHTML = '-';
					Swal.fire({
						title: 'Tasa Desactualizada',
						html: 'La tasa expira cada 3 horas por la volatilidad del bolívar.<br><a href="https://wa.me/34624442673?text=Por%20favor%20actualizar%20tasa" style="color: #ff6b35; font-weight: bold;">Solicitar actualización →</a>',
						icon: 'warning'
					});
				}
			} else if (cash == 3) {
				fee_eur = parseFloat(document.getElementById('usdFee').value);
				symbol1 = '$';
				symbol2 = '€';
				document.getElementById('rateValue').innerHTML = fee_eur;
				setActiveMenuItem(2);
			} else if (cash == 4) {
				fee_eur = 1 / parseFloat(document.getElementById('usdFee2').value);
				symbol1 = '€';
				symbol2 = '$';
				document.getElementById('rateValue').innerHTML = parseFloat(document.getElementById('usdFee2').value);
				setActiveMenuItem(3);
			}

			updateCurrencyPills();
			document.getElementById('sendPillWrap').classList.remove('open');
			document.getElementById('receivePillWrap').classList.remove('open');
			setCash('x');
		}

		// Format number with thousand separators
		function formatNumber(num) {
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		function setCash(cash) {
			if (cash == 'x') {
				eur = 20;
				ves = parseFloat(eur*fee_eur);
				ves = ves.toFixed(2);
				document.getElementById('vesCash').value = formatNumber(ves)+' '+symbol2;
				eur = parseFloat(ves/fee_eur);
				eur = eur.toFixed(2);
				document.getElementById('eurCash').value = eur+' '+symbol1;
			}
			if (cash == 1) {
				eur = parseFloat(document.getElementById('eurCash').value);
				ves = parseFloat(eur*fee_eur);
				ves = ves.toFixed(2);
				document.getElementById('vesCash').value = formatNumber(ves)+' '+symbol2;
			}
			if (cash == 2) {
				ves = parseFloat(document.getElementById('vesCash').value);
				eur = parseFloat(ves/fee_eur);
				eur = eur.toFixed(2);
				document.getElementById('eurCash').value = eur+' '+symbol1;
			}
		}

		// Initialize with default values
		document.addEventListener('DOMContentLoaded', function() {
			setCash('x');
		});

		// Calc hint: small popup nudging people to try the currency chips.
		// Shows for 2.5s, hides for 2.5s, repeats, alternating which flag it points
		// at — position is measured against the actual flag chip each time, so it
		// stays accurate regardless of screen size. Stops for good once someone
		// actually opens a currency menu (remembered across visits).
		let calcHintInterval;
		let calcHintPointsUp = true;

		function positionCalcHint(pointsUp) {
			const hint = document.getElementById('calcHint');
			const pillWrap = document.getElementById(pointsUp ? 'sendPillWrap' : 'receivePillWrap');
			if (!hint || !pillWrap) return;
			const boxRect = hint.parentElement.getBoundingClientRect();
			const pillRect = pillWrap.getBoundingClientRect();
			const gap = 10;

			const offsetX = (pillRect.left + pillRect.width / 2) - boxRect.left;
			hint.style.left = offsetX + 'px';

			let offsetY;
			if (pointsUp) {
				// land just below the send pill, above the box
				offsetY = (pillRect.bottom + gap) - boxRect.top;
			} else {
				// land just above the receive pill, below the box
				const hintHeight = hint.offsetHeight || 30;
				offsetY = (pillRect.top - gap - hintHeight) - boxRect.top;
			}
			hint.style.top = offsetY + 'px';
		}

		function loopCalcHint() {
			const hint = document.getElementById('calcHint');
			if (!hint) return;
			const pointsUp = calcHintPointsUp;
			hint.textContent = pointsUp ? 'Toca ☝️' : 'Toca 👇';
			hint.classList.toggle('point-up', pointsUp);
			hint.classList.toggle('point-down', !pointsUp);
			positionCalcHint(pointsUp);
			calcHintPointsUp = !calcHintPointsUp;

			hint.classList.remove('show');
			void hint.offsetWidth;
			hint.classList.add('show');
			setTimeout(() => hint.classList.remove('show'), 2500);
		}

		function dismissCalcHint() {
			localStorage.setItem('calcHintDismissed', 'true');
			clearInterval(calcHintInterval);
			const hint = document.getElementById('calcHint');
			if (hint) hint.classList.remove('show');
		}

		if (localStorage.getItem('calcHintDismissed') !== 'true') {
			setTimeout(loopCalcHint, 1200);
			calcHintInterval = setInterval(loopCalcHint, 5000);
		}

		// Write hint: plain, serious, no shake — sits inside the send input itself,
		// near its right edge (before the flag chip). "Escribe aquí.." (send) and
		// "O aquí.." (receive) are a pair — both positioned against their real
		// input box each time, and shown/hidden in sync so they read as one
		// message ("write here.. or here.."). Un-selectable and click-through so
		// they never interfere with actually using the fields.
		let writeHintInterval;

		function positionOneWriteHint(hintId, inputId) {
			const hint = document.getElementById(hintId);
			const input = document.getElementById(inputId);
			if (!hint || !input) return;
			const wrapperRect = hint.parentElement.getBoundingClientRect();
			const inputRect = input.getBoundingClientRect();
			const insetFromInputEdge = 14;
			hint.style.right = (wrapperRect.right - inputRect.right + insetFromInputEdge) + 'px';
		}

		function loopWriteHint() {
			const hint1 = document.getElementById('writeHint');
			const hint2 = document.getElementById('writeHint2');
			if (!hint1 || !hint2) return;
			positionOneWriteHint('writeHint', 'eurCash');
			positionOneWriteHint('writeHint2', 'vesCash');
			hint1.classList.add('show');
			hint2.classList.add('show');
			setTimeout(() => {
				hint1.classList.remove('show');
				hint2.classList.remove('show');
			}, 2500);
		}

		function dismissWriteHint() {
			localStorage.setItem('writeHintDismissed', 'true');
			clearInterval(writeHintInterval);
			const hint1 = document.getElementById('writeHint');
			const hint2 = document.getElementById('writeHint2');
			if (hint1) hint1.classList.remove('show');
			if (hint2) hint2.classList.remove('show');
		}

		if (localStorage.getItem('writeHintDismissed') !== 'true') {
			setTimeout(loopWriteHint, 2600);
			writeHintInterval = setInterval(loopWriteHint, 5000);
		}

		// Ventana Flotante (Alert Display)
		<?php if ($alertStatus == 1) { ?>
			Swal.fire({
				icon: '<?php ECHO $alertIcon; ?>',
				html: '<?php ECHO $alertText; ?>'
			})
		<?php } ?>

		<?php if ($alertStatus == 2) { ?>
			Swal.fire({
				icon: '<?php ECHO $alertIcon; ?>',
				html: '<?php ECHO $alertText; ?>',
				footer: '<a href="">A que se debe esto?</a>',
				showCloseButton: true,
				showCancelButton: true,
				focusConfirm: false,
				confirmButtonText: '<i class="fa fa-thumbs-up"></i> OK',
				cancelButtonText: '<i class="fa fa-thumbs-down"></i>'
			})
		<?php } ?>
	</script>

	<?php if ($snowActive): ?>
		<script src="js/snow.js"></script>
	<?php endif; ?>
</body>
</html>
