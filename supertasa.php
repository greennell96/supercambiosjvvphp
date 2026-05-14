<?php
// --- AUTH GATE ---
if (session_status() === PHP_SESSION_NONE) session_start();

define('SUPERTASA_PASSWORD_HASH', '$2y$10$12l4uQbPAGXpzr0D.PUZZukB9jYQ5TKpHnp0NiBFMF7SwzvmMAynO');
// Default password: jvv2024
// To change: php -r "echo password_hash('nueva_clave', PASSWORD_DEFAULT);"

if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    unset($_SESSION['supertasa_auth']);
    header('Location: /supertasa.php');
    exit;
}

if (empty($_SESSION['supertasa_auth'])) {
    $loginError = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['st_password'])) {
        if (password_verify($_POST['st_password'], SUPERTASA_PASSWORD_HASH)) {
            $_SESSION['supertasa_auth'] = true;
            header('Location: /supertasa.php');
            exit;
        } else {
            $loginError = 'Contraseña incorrecta';
        }
    }
    ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SuperTasa Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Poppins',sans-serif;background:linear-gradient(135deg,#f0fdf4,#eff6ff);min-height:100vh;display:flex;align-items:center;justify-content:center}
        .box{background:white;padding:50px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.1);width:100%;max-width:380px;border-top:4px solid #10b981}
        h1{text-align:center;color:#1f2937;margin-bottom:8px;font-size:24px}
        p{text-align:center;color:#6b7280;margin-bottom:28px;font-size:14px}
        label{display:block;font-weight:600;color:#1f2937;margin-bottom:8px;font-size:14px}
        input{width:100%;padding:12px 15px;border:1px solid #e5e7eb;border-radius:8px;font-family:'Poppins',sans-serif;font-size:14px}
        input:focus{outline:none;border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.1)}
        .err{background:#fee2e2;color:#991b1b;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px;border-left:4px solid #ef4444}
        button{width:100%;padding:12px;margin-top:16px;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:8px;font-family:'Poppins',sans-serif;font-weight:600;font-size:15px;cursor:pointer}
    </style>
</head>
<body>
    <div class="box">
        <h1>⚙️ SuperTasa</h1>
        <p>Panel de administración</p>
        <?php if ($loginError): ?><div class="err"><?php echo htmlspecialchars($loginError); ?></div><?php endif; ?>
        <form method="POST">
            <label for="st_password">Contraseña</label>
            <input type="password" id="st_password" name="st_password" required autofocus>
            <button type="submit">Acceder</button>
        </form>
    </div>
</body>
</html>
    <?php
    exit;
}
// --- END AUTH GATE ---
?>
<!DOCTYPE html>
<html class="wide wow-animation" lang="en">
	<head>
		<title>Admin</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link rel="icon" href="images/favicon.ico" type="image/x-icon">
		<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Poppins:300,300i,400,500,600,700,800,900,900i%7CPT+Serif:400,700">
		<link rel="stylesheet" href="css/bootstrap.css">
		<link rel="stylesheet" href="css/fonts.css">
		<link rel="stylesheet" href="css/style3.css">
		<link rel="stylesheet" href="css/modern-style.css">
		<script src="js/sweetalert2.all.min.js"></script>
		<script src="https://cdn.ckeditor.com/ckeditor5/35.0.1/decoupled-document/ckeditor.js"></script>
		<script src="https://cdn.rawgit.com/zenorocha/clipboard.js/v1.5.3/dist/clipboard.min.js"></script>
<style>

.contenedor {
display: inline-block;
cursor: pointer;
}

.texto-flotante {
position: absolute;
top: 65%;
left: 50%;
transform: translate(-50%, -50%);
opacity: 0;
transition: opacity 0.3s ease-in-out;
background-color: white;
display: inline-block;
}
.contenedor:hover .texto-flotante {
opacity: 1;
}
	
:root {
--color-green: #00FF00;
--color-red: #FF0000;
--color-button: #fdffff;
--color-black: #000;
}
.switch-button {
display: inline-block;
}
.switch-button .switch-button__checkbox {
display: none;
}
.switch-button .switch-button__label {
background-color: var(--color-red);
width: 5rem;
height: 3rem;
border-radius: 3rem;
display: inline-block;
position: relative;
}
.switch-button .switch-button__label:before {
transition: .2s;
display: block;
position: absolute;
width: 3rem;
height: 3rem;
background-color: var(--color-button);
content: '';
border-radius: 50%;
box-shadow: inset 0px 0px 0px 1px var(--color-black);
}
.switch-button .switch-button__checkbox:checked + .switch-button__label {
background-color: var(--color-green);
}
.switch-button .switch-button__checkbox:checked + .switch-button__label:before {
transform: translateX(2rem);
}

/* Supertasa Admin Header Styling */
.rd-navbar-main {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 30px;
}

.rd-navbar-main-element {
	flex: 1;
	display: flex;
	justify-content: center;
}

.rd-navbar-nav-wrap {
	display: flex;
	justify-content: center;
}

.rd-navbar-nav {
	display: flex;
	gap: 0;
	margin: 0;
	padding: 0;
	list-style: none;
	justify-content: center;
	flex-wrap: wrap;
}

.rd-nav-item {
	margin: 0;
}

.rd-nav-link {
	display: block;
	padding: 12px 18px;
	font-weight: 600;
	font-size: 14px;
	color: #1f2937;
	text-decoration: none;
	transition: all 0.3s;
	border-bottom: 3px solid transparent;
	white-space: nowrap;
}

.rd-nav-link:hover {
	color: #10b981;
	border-bottom-color: #10b981;
}

.rd-navbar-brand {
	flex-shrink: 0;
}

.rd-navbar-brand button {
	font-weight: 700;
	font-size: 13px;
	height: 44px;
	padding: 0 20px;
}

@media (max-width: 992px) {
	.rd-navbar-nav {
		gap: 5px;
	}

	.rd-nav-link {
		padding: 10px 12px;
		font-size: 12px;
	}
}

@media (max-width: 768px) {
	.rd-navbar-main {
		gap: 15px;
	}

	.rd-navbar-main-element {
		flex: 1;
		min-width: 200px;
	}

	.rd-nav-link {
		padding: 8px 10px;
		font-size: 11px;
	}
}

</style>

		<style>.ie-panel{display: none;background: #212121;padding: 10px 0;box-shadow: 3px 3px 5px 0 rgba(0,0,0,.3);clear: both;text-align:center;position: relative;z-index: 1;} html.ie-10 .ie-panel, html.lt-ie-10 .ie-panel {display: block;}</style>
		<?php
			INCLUDE('root.php');

			// Check database connection
			if (!$db) {
				echo '</head><body>';
				echo '<script>document.addEventListener("DOMContentLoaded",function(){Swal.fire("Error","No hay conexión a la base de datos","error").then(function(){window.location.href="/"});});</script>';
				echo '</body></html>';
				exit;
			}

			$actualDB = 1;
			$config1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB ");
			$config2 = $config1->num_rows;
			if (!EMPTY($config2)) {
				$config3 = $config1->fetch_array(MYSQLI_ASSOC);
				$status = $config3['status'];$countdownOn = $config3['countdown'];$workTime = $config3['work'];$feeEur = $config3['fee'];$feeDate = $config3['date'];
				$feeVes = $config3['ves2eur'];$feeUsd = $config3['usd2eur'];$feeUsd2 = $config3['eur2usd'];
				$season = isset($config3['season']) ? $config3['season'] : 0;
				$overrideStart = isset($config3['override_start']) ? $config3['override_start'] : '';
				$overrideEnd = isset($config3['override_end']) ? $config3['override_end'] : '';
				$overrideDate = isset($config3['override_date']) ? $config3['override_date'] : '';
			}
			// TIMER
			$countTime = $config3['countdown_time'];
			// ALERTA
			$alertStatus = $config3['alertOn'];$alertIcon = $config3['alertIcon'];
			$alertTittle = $config3['alertTittle'];$alertColor = $config3['alertColor'];
			$alertText = $config3['alertText']; 
			// MOD
			if (ISSET($_GET['mod'])) { 
				$mod = $_GET['mod'];
				// CANJE
			} else { $mod = 'status'; }
			// SUBMOD
			if (ISSET($_GET['submod'])) { $submod = $_GET['submod']; } else { $submod = ''; }
			// EFECTOS
			$efsnow = $config3['ef_snow'];
			// SEASON
			$season = isset($config3['season']) ? $config3['season'] : 0;
		?>
	</head>
	<?php
		$alertMessage = '';
		$alertType = '';

		if (ISSET($_POST['seasonSave'])) {
			if (!$db) {
				$alertMessage = 'Sin conexión a BD';
				$alertType = 'error';
			} else {
				$newSeason = intval($_POST['season']);
				$query = "UPDATE config SET season = $newSeason WHERE id = $actualDB";
				$result = MYSQLI_QUERY($db, $query);
				if ($result) {
					$alertMessage = 'Estación actualizada a ' . ($newSeason == 1 ? 'VERANO' : 'INVIERNO');
					$alertType = 'success';
					// Reload config after update
					$config1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB");
					if ($config1->num_rows > 0) {
						$config3 = $config1->fetch_array(MYSQLI_ASSOC);
						$season = $config3['season'];
					}
				} else {
					$alertMessage = 'DB Error: ' . $db->error;
					$alertType = 'error';
				}
			}
		}
		if (ISSET($_POST['overrideSave'])) {
			if (!$db) {
				$alertMessage = 'Sin conexión a BD';
				$alertType = 'error';
			} else {
				$overrideStart = $_POST['override_start'] ?? '';
				$overrideEnd = $_POST['override_end'] ?? '';
				$today = date('Y-m-d');

				if (!empty($overrideStart) && !empty($overrideEnd)) {
					$query = "UPDATE config SET
						override_start = '$overrideStart',
						override_end = '$overrideEnd',
						override_date = '$today'
					WHERE id = $actualDB";
					$result = MYSQLI_QUERY($db, $query);
					if ($result) {
						$alertMessage = 'Excepción guardada para hoy ('.$overrideStart.' - '.$overrideEnd.')';
						$alertType = 'success';
						// Reload config after update
						$config1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB");
						if ($config1->num_rows > 0) {
							$config3 = $config1->fetch_array(MYSQLI_ASSOC);
							$overrideStart = $config3['override_start'];
							$overrideEnd = $config3['override_end'];
							$overrideDate = $config3['override_date'];
						}
					} else {
						$alertMessage = 'DB Error: ' . $db->error;
						$alertType = 'error';
					}
				} else {
					$alertMessage = 'Completa ambos horarios';
					$alertType = 'error';
				}
			}
		}

		if (ISSET($_POST['overrideClear'])) {
			if (!$db) {
				$alertMessage = 'Sin conexión a BD';
				$alertType = 'error';
			} else {
				$query = "UPDATE config SET
					override_start = NULL,
					override_end = NULL,
					override_date = NULL
				WHERE id = $actualDB";
				$result = MYSQLI_QUERY($db, $query);
				if ($result) {
					$alertMessage = 'Excepción eliminada. Horario normal restaurado';
					$alertType = 'success';
					// Reload config after update
					$config1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB");
					if ($config1->num_rows > 0) {
						$config3 = $config1->fetch_array(MYSQLI_ASSOC);
						$overrideStart = '';
						$overrideEnd = '';
						$overrideDate = '';
					}
				} else {
					$alertMessage = 'DB Error: ' . $db->error;
					$alertType = 'error';
				}
			}
		}
		if (ISSET($_POST['statusSave'])) {
			$fee = $_POST['fee'];
			$ves2eur = $_POST['v2e'];
			$usd2eur = $_POST['u2e'];
			$eur2usd = $_POST['e2u'];
			$date = $_POST['feeDate'];
			$dateves = $_POST['dateves'];

			MYSQLI_QUERY($db, "UPDATE config SET
				fee = $fee ,
				ves2eur = $ves2eur ,
				usd2eur = $usd2eur ,
				eur2usd = $eur2usd ,
				date = '$date' ,
				date_ves = '$dateves'
			WHERE id = $actualDB ");
			ECHO '<script type="text/javascript">window.location="";</script>';
		}
		if (ISSET($_POST['alertSave'])) {
			$tittle = $_POST['tittle1'];
			$text = $_POST['text1'];
			$icon = $_POST['icon'];
			MYSQLI_QUERY($db, "UPDATE config SET 
				alertIcon = '$icon' , 
				alertTittle = '$tittle' , 
				alertText = '$text' 
			WHERE 
				id = $actualDB
			");
			ECHO '<script type="text/javascript">window.location="";</script>';
		}
	?>

	<header class="section page-header">
		<!-- RD Navbar-->
		<div class="rd-navbar-wrap">
			<nav class="rd-navbar rd-navbar-classic" data-layout="rd-navbar-fixed" data-sm-layout="rd-navbar-fixed" data-md-layout="rd-navbar-fixed" data-md-device-layout="rd-navbar-fixed" data-lg-layout="rd-navbar-static" data-lg-device-layout="rd-navbar-static" data-xl-layout="rd-navbar-static" data-xl-device-layout="rd-navbar-static" data-lg-stick-up-offset="46px" data-xl-stick-up-offset="46px" data-xxl-stick-up-offset="46px" data-lg-stick-up="true" data-xl-stick-up="true" data-xxl-stick-up="true">
				<div class="rd-navbar-main-outer">
					<div class="rd-navbar-main">
						<!-- RD Navbar Panel-->
						<div class="rd-navbar-panel">
							<!-- RD Navbar Toggle-->
							<button class="rd-navbar-toggle" data-rd-navbar-toggle=".rd-navbar-nav-wrap"><span></span></button>
							<!-- RD Navbar Brand-->
							<div class="rd-navbar-brand">
								<div><a href=""><button class="button button-lg button-gray-600" style="width: 100%;">ACTUALIZAR</button></a></div>
							</div>
						</div>
						<div class="rd-navbar-main-element">
							<div class="rd-navbar-nav-wrap">
								<ul class="rd-navbar-nav">
									<li class="rd-nav-item active"><a class="rd-nav-link" href="?mod=status">SuperTasa</a></li>
									<li class="rd-nav-item active"><a class="rd-nav-link" href="?mod=horarios">Horarios</a></li>
									<li class="rd-nav-item active"><a class="rd-nav-link" href="?mod=alert">Ventana Flotante</a></li>
									<li class="rd-nav-item active"><a class="rd-nav-link" href="aml-admin.php">Formularios AML</a></li>
									<li class="rd-nav-item active"><a class="rd-nav-link" href="?action=logout" style="color:#ef4444;">Salir</a></li>
								</ul>
								<!--
								<a class="brand-logo-light icon icon-sm icon-circle icon-circle-md fa-instagram" href="//instagram.com/supercambiosjvv"></a>
								<a class="brand-logo-light icon icon-sm icon-circle icon-circle-md fa-whatsapp" href="//wa.me/34624442673"></a>
								-->
							</div>
						</div>
					</div>
				</div>
			</nav>
		</div>
	</header>
	<br>
	<!-- ESTADO -->
	<?php if ($mod == 'status'): ?>
		<section class="section section-lg bg-gray-1 text-center"><div class="container"><div class="row justify-content-md-center"><div class="col-md-9 col-lg-10">
			<h3>ESTADO DE OPERACIÓN</h3>
			<form method="post" action="?mod=status">
				<div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
					<p class="booking-title" style="margin-bottom: 20px;">🟢 Estado del Sistema</p>
					<center><div class="switch-button" style="margin-bottom: 30px;">
						<input type="checkbox" name="statusBtn" id="statusBtn" class="switch-button__checkbox" <?php if ($status == 1) { ECHO 'checked'; } ?> onChange="changeBtn('status')">
						<label for="statusBtn" class="switch-button__label"></label>
					</div></center>
					<p style="font-size: 14px; color: #6b7280;">Activa o desactiva el sistema de cambios</p>
				</div>

				<div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
					<p class="booking-title" style="margin-bottom: 25px;">💱 Tasas de Cambio</p>

					<div style="margin-bottom: 20px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px; text-align: left;">Euro a Bolívares</p>
						<input class="form-input" type="number" step="0.01" id="fee" name="fee" placeholder="Ej: 45.50">
					</div>

					<div style="margin-bottom: 20px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px; text-align: left;">Bolívares a Euro</p>
						<input class="form-input" type="number" step="0.01" id="v2e" name="v2e" placeholder="Ej: 0.022">
					</div>

					<div style="margin-bottom: 20px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px; text-align: left;">Dólar a Euro</p>
						<input class="form-input" type="number" step="0.01" id="u2e" name="u2e" placeholder="Ej: 0.92">
					</div>

					<div style="margin-bottom: 20px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px; text-align: left;">Euro a Dólar</p>
						<input class="form-input" type="number" step="0.01" id="e2u" name="e2u" placeholder="Ej: 1.09">
					</div>

					<div style="margin-bottom: 20px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px; text-align: left;">📅 Fecha de Actualización</p>
						<input class="form-input" id="feeDate" type="text" name="feeDate" data-constraints="@Required" data-time-picker="date" placeholder="Selecciona una fecha">
						<input type="hidden" name="dateves" value="<?php echo date('Y-m-d H:i:s', strtotime('now +2 hours')); ?>">
					</div>

					<button class="button button-lg button-primary" type="submit" name="statusSave" onClick="resetStatus()">Guardar Cambios</button>
				</div>
			</form>
		</div></div></div></section>
	<?php endif ?>

	<!-- HORARIOS -->
	<?php if ($mod == 'horarios'): ?>
		<section class="section section-lg bg-gray-1 text-center"><div class="container"><div class="row justify-content-md-center"><div class="col-md-9 col-lg-10">
			<h3>HORARIOS DE OPERACIÓN</h3>
			<form method="post" action="?mod=horarios">
				<div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
					<p class="booking-title" style="margin-bottom: 20px;">📅 Selecciona Estación Actual</p>
					<div style="margin-bottom: 30px;">
						<label style="margin-right: 30px; font-size: 16px;"><input type="radio" name="season" value="0" <?php if ($season == 0) { ECHO 'checked'; } ?> required> ❄️ INVIERNO</label>
						<label style="font-size: 16px;"><input type="radio" name="season" value="1" <?php if ($season == 1) { ECHO 'checked'; } ?> required> ☀️ VERANO</label>
					</div>
					<button class="button button-lg button-primary" type="submit" name="seasonSave">Cambiar Estación</button>
				</div>

				<div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
					<p class="booking-title" style="margin-bottom: 25px;">⏰ Horarios por Defecto</p>
					<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f9fafb;">
						<tr style="background: #f3f4f6; font-weight: bold;">
							<th style="padding: 12px; border: 1px solid #e5e7eb;">Día</th>
							<th style="padding: 12px; border: 1px solid #e5e7eb;">Invierno</th>
							<th style="padding: 12px; border: 1px solid #e5e7eb;">Verano</th>
						</tr>
						<tr>
							<td style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600;">Lunes a Viernes</td>
							<td style="padding: 12px; border: 1px solid #e5e7eb;">2:00 PM - 9:00 PM</td>
							<td style="padding: 12px; border: 1px solid #e5e7eb;">3:00 PM - 10:00 PM</td>
						</tr>
						<tr style="background: white;">
							<td style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600;">Sábados</td>
							<td style="padding: 12px; border: 1px solid #e5e7eb;">2:00 PM - 6:00 PM</td>
							<td style="padding: 12px; border: 1px solid #e5e7eb;">3:00 PM - 7:00 PM</td>
						</tr>
						<tr>
							<td style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600;">Domingos</td>
							<td colspan="2" style="padding: 12px; border: 1px solid #e5e7eb; color: #ff6b35; font-weight: bold;">CERRADO</td>
						</tr>
					</table>
					<p style="font-size: 14px; color: #6b7280; margin-top: 15px;">💡 Estos son los horarios predeterminados. Para cambiarlos, contacta con soporte.</p>
				</div>

				<div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
					<p class="booking-title" style="margin-bottom: 25px;">📍 Excepción de Hoy</p>
					<p style="font-size: 14px; color: #6b7280; margin-bottom: 25px;">¿Trabajando en horario especial hoy?<br><small>(ej: Feriado, cambio excepcional)</small></p>

					<div style="margin-bottom: 25px;">
						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px;">⏰ Apertura</p>
						<input class="form-input" type="time" name="override_start" placeholder="ej: 14:00" value="<?php echo $overrideStart; ?>" style="margin-bottom: 15px;">

						<p class="booking-title" style="margin-bottom: 12px; font-size: 14px;">🔐 Cierre</p>
						<input class="form-input" type="time" name="override_end" placeholder="ej: 22:00" value="<?php echo $overrideEnd; ?>">
					</div>

					<p style="font-size: 12px; color: #10b981; margin-bottom: 20px; padding: 10px; background: #f0fdf4; border-radius: 8px;">✅ Dejar vacío para usar horario normal del día</p>

					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; grid-auto-flow: row;">
						<button class="button button-lg button-primary" type="submit" name="overrideSave" style="margin: 0;">Guardar</button>
						<button class="button button-lg" type="submit" name="overrideClear" style="background: #ef4444; margin: 0;">Limpiar</button>
					</div>
				</div>

				<div style="background: white; padding: 30px; border-radius: 12px;">
					<p class="booking-title" style="margin-bottom: 25px;">🧪 Herramientas de Testing</p>
					<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Fuerza que el sitio aparezca como ABIERTO para testing, sin importar la hora actual</p>
					<button class="button button-lg button-primary" type="button" onclick="toggleTestingMode()" style="margin-bottom: 15px;">Activar/Desactivar Modo Testing</button>
					<div id="testingStatus" style="padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 14px; border: 1px solid #e5e7eb;"></div>
				</div>
			</form>
		</div></div></div></section>
	<?php endif ?>

	<!-- VENTANA FLOTANTE -->
	<?php if ($mod == 'alert'): ?>
		<section class="section section-lg bg-gray-1 text-center"><div class="container"><div class="row justify-content-md-center"><div class="col-md-9 col-lg-7">
			<h3>VENTANA FLOTANTE</h3>
			<center><div class="switch-button">
				<input type="checkbox" name="alertBtn" id="alertBtn" class="switch-button__checkbox" <?php if ($alertStatus == 1) { ECHO 'checked'; } ?> onChange="changeBtn('alert')">
				<label for="alertBtn" class="switch-button__label"></label>
			</div></center>
			<form class="" data-form-output="form-output-global" data-form-type="contact" method="post" action="?mod=alert">
				<div class="form-wrap">
					<p class="booking-title">Icono</p>
					<div class="form-wrap"><select id="icon" name="icon" style="width:50%;">
						<option <?php if ($alertIcon == 'question') { ECHO 'selected'; } ?> value="question">❔</option>
						<option <?php if ($alertIcon == 'error') { ECHO 'selected'; } ?> value="error">❌</option>
						<option <?php if ($alertIcon == 'info') { ECHO 'selected'; } ?> value="info">ℹ️</option>
						<option <?php if ($alertIcon == 'success') { ECHO 'selected'; } ?> value="success">✅</option>
						<option <?php if ($alertIcon == 'warning') { ECHO 'selected'; } ?> value="warning">⚠️</option>
					</select></div>
				</div>
				<div class="form-wrap">
					<p class="booking-title">Titulo y Mensaje</p>
					<!-- <textarea class="form-input" id="tittle1" name="tittle1"><?php ECHO $alertTittle; ?></textarea> -->
					<textarea class="form-input" id="text1" name="text1" data-constraints="@Required"><?php ECHO $alertText; ?></textarea>
					<h2 class="button" id="h0Btn" onclick="actionBtn('h0')"><b>H0</b></h2>
					<x class="button" id="boldBtn" onclick="actionBtn('bold')"><b>N</b></x>
					<x class="button" id="italicBtn" onclick="actionBtn('italic')"><i>I</i></x>
					<x class="button" id="subtextBtn" onclick="actionBtn('subtext')"><s>S</s></x>
					<x class="button" id="ulineBtn" onclick="actionBtn('uline')"><u>U</u></x>
					<x class="button" id="enterBtn" onclick="actionBtn('enter')"><u>↩</u></x>
					<x class="button" id="colorBtnY" onclick="actionBtn('colorr')"><b style="color:red;">Y</b></x>
					<x class="button" id="hrefBtn" onclick="actionBtn('href')"><b>🌐</b></x>
				</div>
				<div class="row justify-content-center"><div class="col-12 col-sm-7 col-lg-5">
					<a class="button button-block button-lg button-primary" name="alertPreview" onclick="previewAlert()">Vista Previa</a>
					<button class="button button-block button-lg button-primary" type="submit" name="alertSave">Confirmar cambios</button>
				</div></div>
			</form>
		</div></div></div></section>
	<?php endif ?>

	<!-- USUARIOS -->

	<!-- TAREAS -->
	<!-- CUPONES -->

	<!-- CORRECTOR SELECT -->
	<div style="display: none;"><select id="icon"></select><select id="color"></select></div>

	<script src="js/core.min.js"></script>
	<script src="js/script.js"></script>

<script>

document.getElementById("fee").value="<?php ECHO $feeEur; ?>";
document.getElementById("v2e").value="<?php ECHO $feeVes; ?>";
document.getElementById("u2e").value="<?php ECHO $feeUsd; ?>";
document.getElementById("e2u").value="<?php ECHO $feeUsd2; ?>";
var timerEl = document.getElementById("timer");
if (timerEl) timerEl.value = "<?php ECHO $countTime; ?>";

function changeBtn ( id ) {
	$.ajax({
		method: 'GET',
		url: "/ajax.php",
		data: {statusChange: "<?php ECHO $actualDB; ?>", stype: ""+id+""},
		success: (responseText) => {
			var ajaxText = responseText;
			if (ajaxText == 'Correcto') {
				Swal.fire(
					'Guardado!',
					'Se ha cambiado el estado de la página correctamente!',
					'success'
				)
			} else {
				Swal.fire(
					'Error!',
					'Ha ocurrido un error! Por favor contactar al soporte.',
					'error'
				)
			}
		}
	})
}

function deleteCode ( id ) {
	$.ajax({
		method: 'GET',
		url: "/ajax.php",
		data: {deleteCode: id},
		success: (responseText) => {
			var ajaxText = responseText;
			if (ajaxText == 'Correcto') {
				Swal.fire(
					'Borrado!',
					'El código ha sido borrado!',
					'success'
				)
			} else {
				Swal.fire(
					'Error!',
					'Ha ocurrido un error! Por favor contactar al soporte.',
					'error'
				)
			}
		}
	})
}

function deleteCodes ( ) {
	$.ajax({
		method: 'GET',
		url: "/ajax.php",
		data: {deleteCodes: 'true'},
		success: (responseText) => {
			var ajaxText = responseText;
			if (ajaxText == 'Correcto') {
				Swal.fire(
					'Borrados!',
					'Los códigos vencidos o usados han sido borrados!',
					'success'
				)
			} else {
				Swal.fire(
					'Información',
					'<b>'+ajaxText+'</b>',
					'info'
				)
			}
		}
	})
}

function actionBtn( action ) {
	let desde = text1.selectionStart; 
	let hasta = text1.selectionEnd;
	let elTexto = text1.value;
	let sel = elTexto.substring(desde, hasta);
		switch (action) {
			case 'h0':
				text1.setRangeText(`<h0>${sel}</h0>`,desde,hasta,'select');
				break;
			case 'bold':
				text1.setRangeText(`<b>${sel}</b>`,desde,hasta,'select');
				break;
			case 'italic':
				text1.setRangeText(`<i>${sel}</i>`,desde,hasta,'select');
				break;
			case 'subtext':
				text1.setRangeText(`<s>${sel}</s>`,desde,hasta,'select');
				break;
			case 'uline':
				text1.setRangeText(`<u>${sel}</u>`,desde,hasta,'select');
				break;
			case 'colorr':
				text1.setRangeText(`<x style="color:RED">${sel}</x style="color:">`,desde,hasta,'select');
				break;
			case 'enter':
				text1.setRangeText(`${sel}<br>`,desde,hasta,'select');
				break;
			case 'href':
				text1.setRangeText(`<a href="SITIO WEB">${sel}</a>`,desde,hasta,'select');
				break;
			default: break;
		}
		resultado.innerHTML = text1.value;
}

function previewAlert () {
	// var previewTittle = document.getElementById('tittle1').value;
	var previewIcon = document.getElementById('icon').value;
	var previewText = document.getElementById('text1').value;
	Swal.fire({
		// title: '<h0>'+previewTittle+'<h0>',
		icon: previewIcon,
		html: previewText,
		footer: '<a href="">A que se debe esto?</a>',
		showCloseButton: true,
		showCancelButton: true,
		focusConfirm: false,
		confirmButtonText:
		'<i class="fa fa-thumbs-up"></i> OK',
		confirmButtonAriaLabel: 'Thumbs up, great!',
		cancelButtonText:
		'<i class="fa fa-thumbs-down"></i>',
		cancelButtonAriaLabel: 'Thumbs down'
	});
}

function udtaskc ( tid , uid ) {
	$.ajax({
		method: 'GET',
		url: "/ajax.php",
		data: {udtaskc: "<?php ECHO $actualDB; ?>", taskid: ""+tid+"", userid: ""+uid+""},
		success: (responseText) => {
			var ajaxText = responseText;
			if (ajaxText == 'Correcto') {
				Swal.fire(
					'Guardado!',
					'Se ha modificado la tarea!',
					'success'
				)
				var elemento = document.getElementById(tid+'x'+uid);
				var nuevoColor = elemento.style.borderColor === 'green' ? 'red' : 'green';
				elemento.style.borderColor = nuevoColor;
			} else {
				Swal.fire(
					'Error!',
					'Ha ocurrido un error! Por favor contactar al soporte. ERNOR-874. '+responseText,
					'error'
				)
			}
		}
	})
}

// bold.addEventListener("click",(bold=>{etiquetaStrong()}));

</script>

<script>
function mostrarTexto(elemento) {
var textoFlotante = elemento.querySelector('.texto-flotante');
textoFlotante.style.opacity = 1;
}

function ocultarTexto(elemento) {
var textoFlotante = elemento.querySelector('.texto-flotante');
textoFlotante.style.opacity = 0;
}

function toggleTestingMode() {
	if (!document.getElementById('testingStatus')) return; // Exit if not on HORARIOS page

	const isTestingOn = localStorage.getItem('forceOpen') === 'true';
	if (isTestingOn) {
		localStorage.removeItem('forceOpen');
		alert('✓ Modo Testing DESACTIVADO');
	} else {
		localStorage.setItem('forceOpen', 'true');
		alert('✓ Modo Testing ACTIVADO - El sitio aparecerá como abierto en la página principal');
	}
	updateTestingStatus();
}

function updateTestingStatus() {
	const statusEl = document.getElementById('testingStatus');
	if (!statusEl) return; // Exit if element doesn't exist on this page

	const isTestingOn = localStorage.getItem('forceOpen') === 'true';
	if (isTestingOn) {
		statusEl.innerHTML = '<strong style="color: #10b981;">✅ Modo Testing ACTIVO</strong><br><small>El sitio aparecerá como ABIERTO en el índice principal, sin importar la hora.</small>';
	} else {
		statusEl.innerHTML = '<strong style="color: #6b7280;">⭕ Modo Testing INACTIVO</strong><br><small>El sitio mostrará su estado real según el horario.</small>';
	}
}

document.addEventListener('DOMContentLoaded', updateTestingStatus);

// Show alert if there's a message from form submission
<?php if (!empty($alertMessage)): ?>
	document.addEventListener('DOMContentLoaded', function() {
		Swal.fire({
			title: "<?php echo $alertType === 'success' ? 'Éxito' : 'Error'; ?>",
			text: "<?php echo addslashes($alertMessage); ?>",
			icon: "<?php echo $alertType; ?>"
		});
	});
<?php endif; ?>
</script>

</html>