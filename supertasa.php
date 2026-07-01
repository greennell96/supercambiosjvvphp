<?php
// --- AUTH GATE ---
if (session_status() === PHP_SESSION_NONE) session_start();

define('SUPERTASA_PASSWORD_HASH', '$2y$10$wN3NPf0N8BS6e8JQ2lsgR.1qMfhqwnffhkN3vKX1TnRnEkG/Os1Ru');
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
<html lang="es">
<head>
	<title>SuperTasa · Admin</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="icon" href="images/favicon.ico" type="image/x-icon">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
	<script src="js/sweetalert2.all.min.js"></script>
	<script src="https://cdn.rawgit.com/zenorocha/clipboard.js/v1.5.3/dist/clipboard.min.js"></script>
	<style>
	*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

	body {
		font-family: 'Inter', sans-serif;
		background: #f1f5f9;
		color: #1e293b;
		min-height: 100vh;
	}

	/* ---- navbar ---- */
	.nav {
		background: #0f172a;
		position: sticky; top: 0; z-index: 100;
		display: flex; align-items: center; justify-content: space-between;
		padding: 0 24px; height: 54px;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.nav-brand {
		font-weight: 700; font-size: 15px; color: #f8fafc;
		letter-spacing: 0.2px; flex-shrink: 0;
	}
	.nav-brand span { color: #10b981; }
	.nav-links {
		display: flex; gap: 2px; align-items: center;
	}
	.nav-link {
		padding: 6px 13px; border-radius: 6px; font-size: 13px; font-weight: 500;
		color: #94a3b8; text-decoration: none; transition: all 0.15s; white-space: nowrap;
	}
	.nav-link:hover { color: #f1f5f9; background: rgba(255,255,255,0.07); }
	.nav-link.active { color: #f1f5f9; background: rgba(255,255,255,0.1); }
	.nav-link.danger { color: #f87171; }
	.nav-link.danger:hover { background: rgba(248,113,113,0.1); color: #fca5a5; }
	.nav-end { display: flex; align-items: center; flex-shrink: 0; }
	.fx-chip {
		font-size: 12px; font-weight: 600; color: #10b981;
		background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.2);
		padding: 4px 10px; border-radius: 20px; white-space: nowrap;
	}

	/* ---- mobile nav strip ---- */
	.nav-mobile {
		display: none;
		background: #0f172a;
		padding: 8px 16px 10px;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		gap: 4px; flex-wrap: wrap; align-items: center;
		justify-content: space-between;
	}

	/* ---- page layout ---- */
	.page { max-width: 780px; margin: 0 auto; padding: 28px 20px 60px; }
	.page-title {
		font-size: 17px; font-weight: 700; color: #0f172a;
		margin-bottom: 20px; letter-spacing: -0.2px;
	}

	/* ---- card ---- */
	.card {
		background: white; border-radius: 12px; padding: 22px 24px;
		border: 1px solid #e2e8f0; margin-bottom: 14px;
	}
	.card-label {
		font-size: 11px; font-weight: 600; color: #94a3b8;
		text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 16px;
	}

	/* ---- toggle ---- */
	:root { --sw-on: #10b981; --sw-off: #ef4444; }
	.switch-wrap { display: flex; align-items: center; gap: 14px; }
	.switch-button { display: inline-flex; }
	.switch-button .switch-button__checkbox { display: none; }
	.switch-button .switch-button__label {
		background: var(--sw-off); width: 52px; height: 26px;
		border-radius: 26px; display: block; position: relative; cursor: pointer; transition: background .2s;
	}
	.switch-button .switch-button__label::before {
		content: ''; position: absolute;
		width: 20px; height: 20px; background: white;
		border-radius: 50%; top: 3px; left: 3px;
		transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.25);
	}
	.switch-button .switch-button__checkbox:checked + .switch-button__label { background: var(--sw-on); }
	.switch-button .switch-button__checkbox:checked + .switch-button__label::before { transform: translateX(26px); }
	.switch-text { font-size: 14px; font-weight: 500; color: #475569; }

	/* ---- form fields ---- */
	.field { margin-bottom: 14px; }
	.field:last-of-type { margin-bottom: 0; }
	.field label {
		display: block; font-size: 11px; font-weight: 600; color: #64748b;
		text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;
	}
	.field input, .field select, .field textarea {
		width: 100%; padding: 9px 11px; font-family: 'Inter', sans-serif;
		font-size: 14px; color: #1e293b; background: #f8fafc;
		border: 1px solid #e2e8f0; border-radius: 8px;
		transition: border-color .15s, box-shadow .15s;
		appearance: auto;
	}
	.field input:focus, .field select:focus, .field textarea:focus {
		outline: none; border-color: #10b981;
		box-shadow: 0 0 0 3px rgba(16,185,129,0.1); background: white;
	}
	.field textarea { resize: vertical; min-height: 90px; }

	/* ---- grid ---- */
	.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
	.g2-btn { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }

	/* ---- buttons ---- */
	.btn {
		display: inline-flex; align-items: center; justify-content: center;
		padding: 9px 18px; border-radius: 8px; font-family: 'Inter', sans-serif;
		font-size: 13px; font-weight: 600; cursor: pointer; border: none;
		transition: all .15s; white-space: nowrap; text-decoration: none;
	}
	.btn-primary { background: #10b981; color: white; }
	.btn-primary:hover { background: #059669; }
	.btn-danger  { background: #ef4444; color: white; }
	.btn-danger:hover  { background: #dc2626; }
	.btn-ghost   { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.btn-ghost:hover   { background: #e2e8f0; }
	.btn-block   { width: 100%; margin-top: 16px; padding: 11px; font-size: 14px; }

	/* ---- season radio cards ---- */
	.radio-cards { display: flex; gap: 12px; }
	.radio-card  { flex: 1; position: relative; cursor: pointer; }
	.radio-card input { position: absolute; opacity: 0; width: 0; height: 0; }
	.radio-card-inner {
		border: 2px solid #e2e8f0; border-radius: 10px; padding: 16px 12px;
		text-align: center; transition: all .15s; background: #f8fafc;
	}
	.radio-card input:checked + .radio-card-inner {
		border-color: #10b981; background: #f0fdf4;
	}
	.radio-card-icon  { font-size: 22px; display: block; margin-bottom: 5px; }
	.radio-card-label { font-size: 13px; font-weight: 600; color: #1e293b; }

	/* ---- schedule table ---- */
	.sched-table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.sched-table th {
		background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.5px;
		padding: 9px 14px; border-bottom: 1px solid #e2e8f0; text-align: left;
	}
	.sched-table td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; color: #475569; }
	.sched-table tr:last-child td { border-bottom: none; }
	.day { font-weight: 600; color: #1e293b !important; }
	.badge-closed {
		font-size: 11px; font-weight: 700; color: #ef4444;
		background: #fee2e2; padding: 2px 8px; border-radius: 4px;
	}

	/* ---- override badge ---- */
	.override-badge {
		display: inline-flex; align-items: center; gap: 6px;
		font-size: 12px; color: #065f46; background: #d1fae5;
		border: 1px solid #a7f3d0; border-radius: 6px;
		padding: 6px 12px; margin-bottom: 14px;
	}

	/* ---- alert toolbar ---- */
	.toolbar { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
	.tool-btn {
		padding: 4px 9px; background: #f1f5f9; border: 1px solid #e2e8f0;
		border-radius: 5px; font-size: 12px; cursor: pointer;
		font-family: 'Inter', sans-serif; transition: background .1s; line-height: 1.5;
	}
	.tool-btn:hover { background: #e2e8f0; }

	/* ---- testing status ---- */
	#testingStatus {
		font-size: 13px; padding: 12px; background: #f8fafc;
		border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px;
	}

	/* ---- responsive ---- */
	@media (max-width: 600px) {
		.nav-links { display: none; }
		.nav-end   { display: none; }
		.nav-mobile { display: flex; }
		.g2 { grid-template-columns: 1fr; }
		.radio-cards { flex-direction: column; }
		.g2-btn { grid-template-columns: 1fr; }
		.page { padding: 20px 14px 50px; }
	}
	</style>
	<?php
		INCLUDE('root.php');

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
		$countTime = $config3['countdown_time'];
		$alertStatus = $config3['alertOn'];$alertIcon = $config3['alertIcon'];
		$alertTittle = $config3['alertTittle'];$alertColor = $config3['alertColor'];
		$alertText = $config3['alertText'];
		if (ISSET($_GET['mod'])) { $mod = $_GET['mod']; } else { $mod = 'status'; }
		if (ISSET($_GET['submod'])) { $submod = $_GET['submod']; } else { $submod = ''; }
		$efsnow = $config3['ef_snow'];
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
		WHERE id = $actualDB
		");
		ECHO '<script type="text/javascript">window.location="";</script>';
	}

	if (ISSET($_POST['testimonioUpload'])) {
		if (!$db) {
			$alertMessage = 'Sin conexión a BD';
			$alertType = 'error';
		} elseif (empty($_FILES['imagen']['name'])) {
			$alertMessage = 'Selecciona una imagen';
			$alertType = 'error';
		} else {
			$file = $_FILES['imagen'];
			$allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
			$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
			$maxSize = 5 * 1024 * 1024;

			if ($file['error'] !== UPLOAD_ERR_OK) {
				$alertMessage = 'Error al subir el archivo';
				$alertType = 'error';
			} elseif (!in_array($ext, $allowedExt, true)) {
				$alertMessage = 'Formato no permitido. Usa JPG, PNG o WEBP';
				$alertType = 'error';
			} elseif ($file['size'] > $maxSize) {
				$alertMessage = 'La imagen supera el límite de 5MB';
				$alertType = 'error';
			} elseif (@getimagesize($file['tmp_name']) === false) {
				$alertMessage = 'El archivo no es una imagen válida';
				$alertType = 'error';
			} else {
				$testimoniosDir = __DIR__ . '/images/testimonios/';
				if (!is_dir($testimoniosDir)) {
					mkdir($testimoniosDir, 0755, true);
				}
				$filename = 'testimonio_' . uniqid() . '.' . $ext;
				if (move_uploaded_file($file['tmp_name'], $testimoniosDir . $filename)) {
					$nombre = $db->real_escape_string($_POST['nombre'] ?? '');
					MYSQLI_QUERY($db, "INSERT INTO testimonios (imagen, nombre) VALUES ('$filename', '$nombre')");
					$alertMessage = 'Testimonio subido correctamente';
					$alertType = 'success';
				} else {
					$alertMessage = 'No se pudo guardar el archivo';
					$alertType = 'error';
				}
			}
		}
	}

	if (ISSET($_POST['testimonioSave'])) {
		if (!$db) {
			$alertMessage = 'Sin conexión a BD';
			$alertType = 'error';
		} else {
			$tid = intval($_POST['id']);
			$orden = intval($_POST['orden']);
			$activo = isset($_POST['activo']) ? 1 : 0;
			MYSQLI_QUERY($db, "UPDATE testimonios SET orden = $orden, activo = $activo WHERE id = $tid");
			$alertMessage = 'Testimonio actualizado';
			$alertType = 'success';
		}
	}

	if (ISSET($_POST['testimonioDelete'])) {
		if (!$db) {
			$alertMessage = 'Sin conexión a BD';
			$alertType = 'error';
		} else {
			$tid = intval($_POST['id']);
			$row1 = MYSQLI_QUERY($db, "SELECT imagen FROM testimonios WHERE id = $tid");
			if ($row1 && $row1->num_rows > 0) {
				$row2 = $row1->fetch_array(MYSQLI_ASSOC);
				$imgPath = __DIR__ . '/images/testimonios/' . $row2['imagen'];
				if (is_file($imgPath)) {
					unlink($imgPath);
				}
				MYSQLI_QUERY($db, "DELETE FROM testimonios WHERE id = $tid");
			}
			$alertMessage = 'Testimonio eliminado';
			$alertType = 'success';
		}
	}
?>
<body>

<!-- NAV -->
<nav class="nav">
	<div class="nav-brand">Super<span>Tasa</span></div>
	<div class="nav-links">
		<a class="nav-link <?php echo $mod == 'status'      ? 'active' : ''; ?>" href="?mod=status">Tasas</a>
		<a class="nav-link <?php echo $mod == 'horarios'    ? 'active' : ''; ?>" href="?mod=horarios">Horarios</a>
		<a class="nav-link <?php echo $mod == 'alert'       ? 'active' : ''; ?>" href="?mod=alert">Alerta</a>
		<a class="nav-link <?php echo $mod == 'testimonios' ? 'active' : ''; ?>" href="?mod=testimonios">Testimonios</a>
		<a class="nav-link" href="aml-admin.php">AML</a>
		<a class="nav-link danger" href="?action=logout">Salir</a>
	</div>
	<div class="nav-end">
		<span class="fx-chip" id="fx-topbar"></span>
	</div>
</nav>
<div class="nav-mobile">
	<a class="nav-link <?php echo $mod == 'status'      ? 'active' : ''; ?>" href="?mod=status">Tasas</a>
	<a class="nav-link <?php echo $mod == 'horarios'    ? 'active' : ''; ?>" href="?mod=horarios">Horarios</a>
	<a class="nav-link <?php echo $mod == 'alert'       ? 'active' : ''; ?>" href="?mod=alert">Alerta</a>
	<a class="nav-link <?php echo $mod == 'testimonios' ? 'active' : ''; ?>" href="?mod=testimonios">Testimonios</a>
	<a class="nav-link" href="aml-admin.php">AML</a>
	<a class="nav-link danger" href="?action=logout">Salir</a>
	<span class="fx-chip" id="fx-topbar-m"></span>
</div>

<!-- TASAS -->
<?php if ($mod == 'status'): ?>
<main class="page">
	<form method="post" action="?mod=status">

		<div class="card">
			<div class="card-label">Sistema</div>
			<div class="switch-wrap">
				<div class="switch-button">
					<input type="checkbox" name="statusBtn" id="statusBtn" class="switch-button__checkbox" <?php if ($status == 1) ECHO 'checked'; ?> onChange="changeBtn('status')">
					<label for="statusBtn" class="switch-button__label"></label>
				</div>
				<span class="switch-text">Cambios <?php echo $status == 1 ? 'activos' : 'desactivados'; ?></span>
			</div>
		</div>

		<div class="card">
			<div class="card-label">Tasas de Cambio</div>
			<div class="g2">
				<div class="field">
					<label>EUR → Bs</label>
					<input type="number" step="0.01" id="fee" name="fee" placeholder="45.50">
				</div>
				<div class="field">
					<label>Bs → EUR</label>
					<input type="number" step="0.01" id="v2e" name="v2e" placeholder="0.022">
				</div>
				<div class="field">
					<label>USD → EUR</label>
					<input type="number" step="0.01" id="u2e" name="u2e" placeholder="0.92">
				</div>
				<div class="field">
					<label>EUR → USD</label>
					<input type="number" step="0.01" id="e2u" name="e2u" placeholder="1.09">
				</div>
			</div>
			<div class="field" style="margin-top:14px;">
				<label>Fecha de actualización</label>
				<input type="date" id="feeDate" name="feeDate" value="<?php echo $feeDate ? date('Y-m-d', strtotime($feeDate)) : date('Y-m-d'); ?>">
				<input type="hidden" name="dateves" value="<?php echo date('Y-m-d H:i:s', strtotime('now +2 hours')); ?>">
			</div>
			<button class="btn btn-primary btn-block" type="submit" name="statusSave" onclick="resetStatus()">Guardar</button>
		</div>

	</form>
</main>
<?php endif ?>

<!-- HORARIOS -->
<?php if ($mod == 'horarios'): ?>
<main class="page">
	<div class="page-title">Horarios de Operación</div>
	<form method="post" action="?mod=horarios">

		<div class="card">
			<div class="card-label">Estación</div>
			<div class="radio-cards">
				<label class="radio-card">
					<input type="radio" name="season" value="0" <?php if ($season == 0) echo 'checked'; ?> required>
					<div class="radio-card-inner">
						<span class="radio-card-icon">❄️</span>
						<span class="radio-card-label">Invierno</span>
					</div>
				</label>
				<label class="radio-card">
					<input type="radio" name="season" value="1" <?php if ($season == 1) echo 'checked'; ?> required>
					<div class="radio-card-inner">
						<span class="radio-card-icon">☀️</span>
						<span class="radio-card-label">Verano</span>
					</div>
				</label>
			</div>
			<button class="btn btn-primary" type="submit" name="seasonSave" style="margin-top:16px;">Guardar estación</button>
		</div>

		<div class="card">
			<div class="card-label">Horario por Defecto</div>
			<table class="sched-table">
				<thead>
					<tr>
						<th>Día</th>
						<th>Invierno</th>
						<th>Verano</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="day">Lun — Vie</td>
						<td>14:00 — 21:00</td>
						<td>15:00 — 22:00</td>
					</tr>
					<tr>
						<td class="day">Sábado</td>
						<td>14:00 — 18:00</td>
						<td>15:00 — 19:00</td>
					</tr>
					<tr>
						<td class="day">Domingo</td>
						<td colspan="2"><span class="badge-closed">CERRADO</span></td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="card">
			<div class="card-label">Excepción de Hoy</div>
			<?php if (!empty($overrideDate) && $overrideDate === date('Y-m-d') && $overrideStart && $overrideEnd): ?>
			<div class="override-badge">✅ Activa: <?php echo $overrideStart; ?> — <?php echo $overrideEnd; ?></div>
			<?php endif; ?>
			<div class="g2">
				<div class="field">
					<label>Apertura</label>
					<input type="time" name="override_start" value="<?php echo $overrideStart; ?>">
				</div>
				<div class="field">
					<label>Cierre</label>
					<input type="time" name="override_end" value="<?php echo $overrideEnd; ?>">
				</div>
			</div>
			<div class="g2-btn">
				<button class="btn btn-primary" type="submit" name="overrideSave">Guardar</button>
				<button class="btn btn-danger"  type="submit" name="overrideClear">Limpiar</button>
			</div>
		</div>

		<div class="card">
			<div class="card-label">Modo Testing</div>
			<p style="font-size:13px;color:#64748b;margin-bottom:12px;">Fuerza el sitio como ABIERTO sin importar el horario.</p>
			<button class="btn btn-ghost" type="button" onclick="toggleTestingMode()">Activar / Desactivar</button>
			<div id="testingStatus"></div>
		</div>

	</form>
</main>
<?php endif ?>

<!-- ALERTA -->
<?php if ($mod == 'alert'): ?>
<main class="page">
	<div class="page-title">Ventana Flotante</div>

	<div class="card">
		<div class="card-label">Estado</div>
		<div class="switch-wrap">
			<div class="switch-button">
				<input type="checkbox" name="alertBtn" id="alertBtn" class="switch-button__checkbox" <?php if ($alertStatus == 1) ECHO 'checked'; ?> onChange="changeBtn('alert')">
				<label for="alertBtn" class="switch-button__label"></label>
			</div>
			<span class="switch-text">Alerta <?php echo $alertStatus == 1 ? 'visible en el sitio' : 'oculta'; ?></span>
		</div>
	</div>

	<form method="post" action="?mod=alert">
		<div class="card">
			<div class="card-label">Contenido</div>
			<div class="field">
				<label>Icono</label>
				<select id="icon" name="icon">
					<option <?php if ($alertIcon == 'question') echo 'selected'; ?> value="question">❔ Pregunta</option>
					<option <?php if ($alertIcon == 'error')    echo 'selected'; ?> value="error">❌ Error</option>
					<option <?php if ($alertIcon == 'info')     echo 'selected'; ?> value="info">ℹ️ Info</option>
					<option <?php if ($alertIcon == 'success')  echo 'selected'; ?> value="success">✅ Éxito</option>
					<option <?php if ($alertIcon == 'warning')  echo 'selected'; ?> value="warning">⚠️ Aviso</option>
				</select>
			</div>
			<div class="field">
				<label>Mensaje</label>
				<textarea id="text1" name="text1"><?php ECHO $alertText; ?></textarea>
				<div class="toolbar">
					<button class="tool-btn" type="button" id="h0Btn"      onclick="actionBtn('h0')"><b>H0</b></button>
					<button class="tool-btn" type="button" id="boldBtn"    onclick="actionBtn('bold')"><b>N</b></button>
					<button class="tool-btn" type="button" id="italicBtn"  onclick="actionBtn('italic')"><i>I</i></button>
					<button class="tool-btn" type="button" id="subtextBtn" onclick="actionBtn('subtext')"><s>S</s></button>
					<button class="tool-btn" type="button" id="ulineBtn"   onclick="actionBtn('uline')"><u>U</u></button>
					<button class="tool-btn" type="button" id="enterBtn"   onclick="actionBtn('enter')">↩</button>
					<button class="tool-btn" type="button" id="colorBtnY"  onclick="actionBtn('colorr')" style="color:red;"><b>Y</b></button>
					<button class="tool-btn" type="button" id="hrefBtn"    onclick="actionBtn('href')">🌐</button>
				</div>
			</div>
			<input type="hidden" name="tittle1" value="<?php echo htmlspecialchars($alertTittle); ?>">
			<div class="g2-btn">
				<button class="btn btn-ghost"   type="button" name="alertPreview" onclick="previewAlert()">Vista Previa</button>
				<button class="btn btn-primary" type="submit"  name="alertSave">Guardar</button>
			</div>
		</div>
	</form>
</main>
<?php endif ?>

<!-- TESTIMONIOS -->
<?php if ($mod == 'testimonios'): ?>
<main class="page">
	<div class="page-title">Testimonios</div>

	<form method="post" action="?mod=testimonios" enctype="multipart/form-data">
		<div class="card">
			<div class="card-label">Subir Nuevo Testimonio</div>
			<div class="field">
				<label>Captura de WhatsApp</label>
				<input type="file" name="imagen" accept="image/jpeg,image/png,image/webp" required>
			</div>
			<div class="field">
				<label>Nombre (opcional)</label>
				<input type="text" name="nombre" placeholder="Ej: Andrea M.">
			</div>
			<button class="btn btn-primary btn-block" type="submit" name="testimonioUpload">Subir</button>
		</div>
	</form>

	<?php
		$testimonios = [];
		if ($db) {
			$tRes = MYSQLI_QUERY($db, "SELECT * FROM testimonios ORDER BY orden ASC, id ASC");
			if ($tRes) {
				while ($tRow = $tRes->fetch_array(MYSQLI_ASSOC)) {
					$testimonios[] = $tRow;
				}
			}
		}
	?>

	<?php if (empty($testimonios)): ?>
		<div class="card" style="text-align:center;color:#94a3b8;font-size:13px;">Aún no hay testimonios subidos.</div>
	<?php else: ?>
		<?php foreach ($testimonios as $t): ?>
		<form method="post" action="?mod=testimonios">
			<input type="hidden" name="id" value="<?php echo (int)$t['id']; ?>">
			<div class="card" style="display:flex;gap:16px;align-items:center;">
				<img src="images/testimonios/<?php echo htmlspecialchars($t['imagen']); ?>" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;">
				<div style="flex:1;min-width:0;">
					<div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:8px;"><?php echo htmlspecialchars($t['nombre'] !== '' ? $t['nombre'] : '(sin nombre)'); ?></div>
					<div class="g2">
						<div class="field">
							<label>Orden</label>
							<input type="number" name="orden" value="<?php echo (int)$t['orden']; ?>">
						</div>
						<div class="field">
							<label>Visible</label>
							<div class="switch-wrap">
								<div class="switch-button">
									<input type="checkbox" name="activo" value="1" class="switch-button__checkbox" id="activo<?php echo (int)$t['id']; ?>" <?php echo $t['activo'] ? 'checked' : ''; ?>>
									<label for="activo<?php echo (int)$t['id']; ?>" class="switch-button__label"></label>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
					<button class="btn btn-primary" type="submit" name="testimonioSave">Guardar</button>
					<button class="btn btn-danger" type="submit" name="testimonioDelete" onclick="return confirm('¿Eliminar este testimonio?');">Eliminar</button>
				</div>
			</div>
		</form>
		<?php endforeach; ?>
	<?php endif; ?>
</main>
<?php endif ?>

<div style="display:none;"><select id="color"></select></div>

<script src="js/core.min.js"></script>
<script src="js/script.js"></script>

<script>
var feeEl = document.getElementById("fee");
if (feeEl) feeEl.value = "<?php ECHO $feeEur; ?>";
var v2eEl = document.getElementById("v2e");
if (v2eEl) v2eEl.value = "<?php ECHO $feeVes; ?>";
var u2eEl = document.getElementById("u2e");
if (u2eEl) u2eEl.value = "<?php ECHO $feeUsd; ?>";
var e2uEl = document.getElementById("e2u");
if (e2uEl) e2uEl.value = "<?php ECHO $feeUsd2; ?>";
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
				Swal.fire('Guardado!', 'Se ha cambiado el estado de la página correctamente!', 'success')
			} else {
				Swal.fire('Error!', 'Ha ocurrido un error! Por favor contactar al soporte.', 'error')
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
				Swal.fire('Borrado!', 'El código ha sido borrado!', 'success')
			} else {
				Swal.fire('Error!', 'Ha ocurrido un error! Por favor contactar al soporte.', 'error')
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
				Swal.fire('Borrados!', 'Los códigos vencidos o usados han sido borrados!', 'success')
			} else {
				Swal.fire('Información', '<b>'+ajaxText+'</b>', 'info')
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
		case 'h0':      text1.setRangeText(`<h0>${sel}</h0>`,desde,hasta,'select'); break;
		case 'bold':    text1.setRangeText(`<b>${sel}</b>`,desde,hasta,'select'); break;
		case 'italic':  text1.setRangeText(`<i>${sel}</i>`,desde,hasta,'select'); break;
		case 'subtext': text1.setRangeText(`<s>${sel}</s>`,desde,hasta,'select'); break;
		case 'uline':   text1.setRangeText(`<u>${sel}</u>`,desde,hasta,'select'); break;
		case 'colorr':  text1.setRangeText(`<x style="color:RED">${sel}</x style="color:">`,desde,hasta,'select'); break;
		case 'enter':   text1.setRangeText(`${sel}<br>`,desde,hasta,'select'); break;
		case 'href':    text1.setRangeText(`<a href="SITIO WEB">${sel}</a>`,desde,hasta,'select'); break;
		default: break;
	}
	var resEl = document.getElementById('resultado');
	if (resEl) resEl.innerHTML = text1.value;
}

function previewAlert () {
	var previewIcon = document.getElementById('icon').value;
	var previewText = document.getElementById('text1').value;
	Swal.fire({
		icon: previewIcon,
		html: previewText,
		footer: '<a href="">¿A qué se debe esto?</a>',
		showCloseButton: true,
		showCancelButton: true,
		focusConfirm: false,
		confirmButtonText: '<i class="fa fa-thumbs-up"></i> OK',
		cancelButtonText: '<i class="fa fa-thumbs-down"></i>'
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
				Swal.fire('Guardado!', 'Se ha modificado la tarea!', 'success')
				var elemento = document.getElementById(tid+'x'+uid);
				var nuevoColor = elemento.style.borderColor === 'green' ? 'red' : 'green';
				elemento.style.borderColor = nuevoColor;
			} else {
				Swal.fire('Error!', 'Ha ocurrido un error! Por favor contactar al soporte. ERNOR-874. '+responseText, 'error')
			}
		}
	})
}

function toggleTestingMode() {
	if (!document.getElementById('testingStatus')) return;
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
	if (!statusEl) return;
	const isTestingOn = localStorage.getItem('forceOpen') === 'true';
	if (isTestingOn) {
		statusEl.innerHTML = '<strong style="color:#10b981;">✅ Modo Testing ACTIVO</strong><br><small>El sitio aparecerá como ABIERTO en el índice principal, sin importar la hora.</small>';
	} else {
		statusEl.innerHTML = '<strong style="color:#6b7280;">⭕ Modo Testing INACTIVO</strong><br><small>El sitio mostrará su estado real según el horario.</small>';
	}
}

document.addEventListener('DOMContentLoaded', updateTestingStatus);

// Live EUR/USD rate (ECB via Frankfurter)
fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD')
	.then(r => r.json())
	.then(data => {
		const rate = data.rates.USD.toFixed(4);
		const text = '1 EUR = ' + rate + ' USD';
		var el  = document.getElementById('fx-topbar');
		var elm = document.getElementById('fx-topbar-m');
		if (el)  el.textContent  = text;
		if (elm) elm.textContent = text;
	})
	.catch(() => {});

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

</body>
</html>
