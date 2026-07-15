<?php

INCLUDE('root.php');

// JVV-02: gate all ajax actions behind the admin session (root.php starts it).
// The admin panel's XHRs carry the session cookie, so logged-in requests pass
// through transparently; any direct/unauthenticated hit gets 403.
if (EMPTY($_SESSION['supertasa_auth'])) {
	HTTP_RESPONSE_CODE(403);
	EXIT('No autorizado');
}

if (ISSET($_GET['statusChange'])) {
	$lastStatus = INTVAL($_GET['statusChange']);
	$typeSelect = $_GET['stype'];
	$rev1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $lastStatus ");
	$rev2 = $rev1->num_rows;
	if (!EMPTY($rev2)) {
		$rev3 = $rev1->fetch_array(MYSQLI_ASSOC);
		$statusActive = $rev3['status'];
		$countdownActive = $rev3['countdown'];
		$alertActive = $rev3['alertOn'];
		switch ($typeSelect) {
			case 'status':
				if ($statusActive == 0) {
					MYSQLI_QUERY($db, "UPDATE config SET status = 1 WHERE id = $lastStatus ");
				} else {
					MYSQLI_QUERY($db, "UPDATE config SET status = 0 WHERE id = $lastStatus ");
				}
				break;
			case 'countdown':
				if ($countdownActive == 0) {
					MYSQLI_QUERY($db, "UPDATE config SET countdown = 1 WHERE id = $lastStatus ");
				} else {
					MYSQLI_QUERY($db, "UPDATE config SET countdown = 0 WHERE id = $lastStatus ");
				}
				break;
			case 'alert':
				if ($alertActive == 0) {
					MYSQLI_QUERY($db, "UPDATE config SET alertOn = 1 WHERE id = $lastStatus ");
				} else {
					MYSQLI_QUERY($db, "UPDATE config SET alertOn = 0 WHERE id = $lastStatus ");
				}
				break;

			default:
				// code...
				break;
		}
		ECHO 'Correcto';
	} else {
		ECHO 'Error';
	}
}

?>
