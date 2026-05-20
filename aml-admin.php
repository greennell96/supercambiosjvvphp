<?php
require_once __DIR__ . '/root.php';

// To change: php -r "echo password_hash('nueva_clave', PASSWORD_DEFAULT);"
define('ADMIN_PASSWORD_HASH', '$2y$10$sAVS3eeE2OlPJMN6dliuiehdQjvxlZhVa7ThOqODAGCgep55oX8fq');

// Anti-brute-force
$maxAttempts = 5;
$lockoutTime = 300; // 5 minutes

if (empty($_SESSION['aml_admin_auth'])) {
    // Check for logout
    if (isset($_GET['action']) && $_GET['action'] === 'logout') {
        unset($_SESSION['aml_admin_auth']);
        unset($_SESSION['admin_attempts']);
        unset($_SESSION['admin_lockout_time']);
        header('Location: /aml-admin.php');
        exit;
    }

    // Check lockout
    if (!empty($_SESSION['admin_lockout_time']) && time() < $_SESSION['admin_lockout_time']) {
        $remainingTime = $_SESSION['admin_lockout_time'] - time();
        ?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Acceso Denegado - SuperCambios JVV</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<style>
		body { font-family: 'Poppins', sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
		.lockout { max-width: 400px; margin: 100px auto; background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-top: 4px solid #ef4444; }
		.lockout h1 { color: #ef4444; font-size: 24px; margin-bottom: 15px; }
		.lockout p { color: #6b7280; margin-bottom: 20px; }
		.timer { font-size: 32px; font-weight: 700; color: #ef4444; margin: 20px 0; }
	</style>
</head>
<body>
	<div class="lockout">
		<h1><i class="fas fa-lock"></i> Acceso Bloqueado</h1>
		<p>Demasiados intentos fallidos. Intenta de nuevo en:</p>
		<div class="timer" id="timer"><?php echo $remainingTime; ?>s</div>
		<p style="font-size: 12px; color: #9ca3af;">La página se recargará automáticamente.</p>
	</div>
	<script>
		let time = <?php echo $remainingTime; ?>;
		const timer = document.getElementById('timer');
		setInterval(() => {
			time--;
			timer.textContent = time + 's';
			if (time <= 0) location.reload();
		}, 1000);
	</script>
</body>
</html>
        <?php
        exit;
    }

    // Handle login
    $loginError = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        $_SESSION['admin_attempts'] = ($_SESSION['admin_attempts'] ?? 0) + 1;

        if ($_SESSION['admin_attempts'] >= $maxAttempts) {
            $_SESSION['admin_lockout_time'] = time() + $lockoutTime;
            unset($_SESSION['admin_attempts']);
            header('Location: /aml-admin.php');
            exit;
        }

        if (password_verify($_POST['password'], ADMIN_PASSWORD_HASH)) {
            $_SESSION['aml_admin_auth'] = true;
            unset($_SESSION['admin_attempts']);
            unset($_SESSION['admin_lockout_time']);
            header('Location: /aml-admin.php');
            exit;
        } else {
            $loginError = 'Contraseña incorrecta (' . $_SESSION['admin_attempts'] . '/' . $maxAttempts . ')';
        }
    }

    // Show login form
    ?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Panel Administrativo - SuperCambios JVV</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
		.login-container { background: white; padding: 50px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); width: 100%; max-width: 400px; border-top: 4px solid #10b981; }
		.login-container h1 { text-align: center; color: #1f2937; margin-bottom: 10px; font-size: 28px; }
		.login-container p { text-align: center; color: #6b7280; margin-bottom: 30px; }
		.form-group { margin-bottom: 20px; }
		.form-group label { display: block; font-weight: 600; color: #1f2937; margin-bottom: 8px; }
		.form-group input { width: 100%; padding: 12px 15px; border: 1px solid #e5e7eb; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 14px; transition: all 0.3s; }
		.form-group input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
		.login-error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444; font-size: 13px; }
		.btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s; }
		.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16,185,129,0.4); }
	</style>
</head>
<body>
	<div class="login-container">
		<h1><i class="fas fa-lock"></i> Panel Administrativo</h1>
		<p>Acceso restringido</p>

		<?php if ($loginError): ?>
			<div class="login-error"><?php echo htmlspecialchars($loginError); ?></div>
		<?php endif; ?>

		<form method="POST">
			<div class="form-group">
				<label for="password">Contraseña</label>
				<input type="password" id="password" name="password" required autofocus>
			</div>
			<button type="submit" class="btn">Acceder</button>
		</form>
	</div>
</body>
</html>
    <?php
    exit;
}

// --- AUTHENTICATED ADMIN PANEL ---

// Handle actions
$submissionsDir = __DIR__ . '/submissions/';
$logFile = $submissionsDir . 'index.json';
$submissions = [];
$error = '';
$success = '';

if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile);
    $submissions = json_decode($logContent, true) ?: [];
}

// Handle delete
if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id']) && isset($_GET['token'])) {
    if (empty($_SESSION['admin_csrf']) || $_GET['token'] !== $_SESSION['admin_csrf']) {
        $error = 'Token CSRF inválido';
    } else {
        $id = $_GET['id'];
        $found = false;

        // Find and remove from submissions
        foreach ($submissions as $key => $sub) {
            if ($sub['id'] === $id) {
                $filePath = $submissionsDir . $sub['filename'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
                unset($submissions[$key]);
                $found = true;
                break;
            }
        }

        if ($found) {
            // Save updated log
            $fh = fopen($logFile, 'w');
            flock($fh, LOCK_EX);
            fwrite($fh, json_encode(array_values($submissions), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            flock($fh, LOCK_UN);
            fclose($fh);

            $success = 'Documento eliminado exitosamente';
        } else {
            $error = 'Documento no encontrado';
        }
    }
}

// Handle download
if (isset($_GET['action']) && $_GET['action'] === 'download' && isset($_GET['id'])) {
    $id = $_GET['id'];
    foreach ($submissions as $sub) {
        if ($sub['id'] === $id) {
            $filePath = $submissionsDir . $sub['filename'];
            if (file_exists($filePath)) {
                header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                header('Content-Disposition: attachment; filename="' . addslashes($sub['filename']) . '"');
                header('Content-Length: ' . filesize($filePath));
                readfile($filePath);
                exit;
            }
            break;
        }
    }
    $error = 'Archivo no encontrado';
}

// Generate CSRF token for delete operations
if (empty($_SESSION['admin_csrf'])) {
    $_SESSION['admin_csrf'] = bin2hex(random_bytes(16));
}

// Sort by date (newest first)
usort($submissions, function($a, $b) {
    return strtotime($b['fecha_submit']) - strtotime($a['fecha_submit']);
});
?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Panel Administrativo - SuperCambios JVV</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<link rel="stylesheet" href="css/clean.css">
	<style>
		.admin-header {
			background: linear-gradient(135deg, #10b981 0%, #059669 100%);
			color: white;
			padding: 30px 0;
			margin-bottom: 40px;
		}

		.admin-header h1 {
			margin: 0;
			font-size: 32px;
		}

		.admin-header-content {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.admin-stats {
			font-size: 14px;
			opacity: 0.9;
		}

		.logout-btn {
			background: rgba(255,255,255,0.2);
			color: white;
			padding: 10px 20px;
			border: 1px solid rgba(255,255,255,0.3);
			border-radius: 6px;
			text-decoration: none;
			font-size: 13px;
			cursor: pointer;
			transition: all 0.3s;
		}

		.logout-btn:hover {
			background: rgba(255,255,255,0.3);
		}

		.admin-container {
			max-width: 1000px;
			margin: 0 auto;
		}

		.alert {
			padding: 15px;
			border-radius: 8px;
			margin-bottom: 25px;
			border-left: 4px solid;
		}

		.alert-error {
			background: #fee2e2;
			color: #991b1b;
			border-left-color: #ef4444;
		}

		.alert-success {
			background: #d1fae5;
			color: #065f46;
			border-left-color: #10b981;
		}

		.submissions-table {
			width: 100%;
			background: white;
			border-radius: 12px;
			box-shadow: 0 4px 15px rgba(0,0,0,0.06);
			overflow: hidden;
			border-top: 4px solid #10b981;
		}

		.submissions-table table {
			width: 100%;
			border-collapse: collapse;
		}

		.submissions-table th {
			background: #f9fafb;
			padding: 15px;
			text-align: left;
			font-weight: 700;
			color: #1f2937;
			border-bottom: 1px solid #e5e7eb;
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.submissions-table td {
			padding: 15px;
			border-bottom: 1px solid #f3f4f6;
			font-size: 14px;
		}

		.submissions-table tr:hover {
			background: #f9fafb;
		}

		.submissions-table tr:last-child td {
			border-bottom: none;
		}

		.nombre {
			font-weight: 600;
			color: #1f2937;
		}

		.dni {
			font-family: monospace;
			color: #6b7280;
		}

		.fecha {
			color: #6b7280;
			font-size: 13px;
		}

		.actions {
			display: flex;
			gap: 8px;
		}

		.action-link {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 6px 12px;
			background: #e5e7eb;
			color: #374151;
			text-decoration: none;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			transition: all 0.3s;
		}

		.action-link:hover {
			background: #d1d5db;
		}

		.action-link.delete {
			background: #fee2e2;
			color: #991b1b;
		}

		.action-link.delete:hover {
			background: #fecaca;
		}

		.empty-state {
			text-align: center;
			padding: 60px 20px;
			color: #9ca3af;
		}

		.empty-state i {
			font-size: 48px;
			display: block;
			margin-bottom: 20px;
			opacity: 0.5;
		}

		@media (max-width: 768px) {
			.submissions-table {
				font-size: 12px;
			}

			.submissions-table th, .submissions-table td {
				padding: 10px;
			}

			.admin-header-content {
				flex-direction: column;
				gap: 15px;
				align-items: flex-start;
			}
		}
	</style>
</head>
<body>
	<!-- ADMIN HEADER -->
	<div class="admin-header">
		<div class="container">
			<div class="admin-header-content">
				<div>
					<h1><i class="fas fa-shield-alt"></i> Panel Administrativo</h1>
					<div class="admin-stats"><?php echo count($submissions); ?> documento(s) recibido(s)</div>
				</div>
				<a href="/aml-admin.php?action=logout" class="logout-btn">
					<i class="fas fa-sign-out-alt"></i> Cerrar Sesión
				</a>
			</div>
		</div>
	</div>

	<!-- CONTENT -->
	<div class="admin-container">
		<?php if ($error): ?>
			<div class="alert alert-error">
				<i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
			</div>
		<?php endif; ?>

		<?php if ($success): ?>
			<div class="alert alert-success">
				<i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
			</div>
		<?php endif; ?>

		<?php if (empty($submissions)): ?>
			<div class="submissions-table">
				<div class="empty-state">
					<i class="fas fa-inbox"></i>
					<p>No hay documentos aún</p>
					<p style="font-size: 12px;">Los documentos enviados por los clientes aparecerán aquí</p>
				</div>
			</div>
		<?php else: ?>
			<div class="submissions-table">
				<table>
					<thead>
						<tr>
							<th>Nombre</th>
							<th>DNI</th>
							<th>Email</th>
							<th>Teléfono</th>
							<th>Fecha Envío</th>
							<th>Acciones</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ($submissions as $sub): ?>
							<tr>
								<td class="nombre"><?php echo htmlspecialchars($sub['nombre'], ENT_QUOTES, 'UTF-8'); ?></td>
								<td class="dni"><?php echo htmlspecialchars($sub['dni'], ENT_QUOTES, 'UTF-8'); ?></td>
								<td><?php echo htmlspecialchars($sub['email'], ENT_QUOTES, 'UTF-8'); ?></td>
								<td><?php echo htmlspecialchars($sub['telefono'], ENT_QUOTES, 'UTF-8'); ?></td>
								<td class="fecha"><?php echo date('d/m/Y H:i', strtotime($sub['fecha_submit'])); ?></td>
								<td>
									<div class="actions">
										<a href="/aml-admin.php?action=download&id=<?php echo urlencode($sub['id']); ?>" class="action-link" download>
											<i class="fas fa-download"></i> Descargar
										</a>
										<a href="/aml-admin.php?action=delete&id=<?php echo urlencode($sub['id']); ?>&token=<?php echo $_SESSION['admin_csrf']; ?>" class="action-link delete" onclick="return confirm('¿Eliminar este documento?');">
											<i class="fas fa-trash"></i> Eliminar
										</a>
									</div>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			</div>
		<?php endif; ?>
	</div>

	<footer style="margin-top: 60px;">
		<div class="container">
			<div class="footer-content">
				<p>&copy; 2026 SuperCambios JVV. Todos los derechos reservados.</p>
			</div>
		</div>
	</footer>
</body>
</html>
<?php
