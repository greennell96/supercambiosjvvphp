<?php

INCLUDE('root.php');

if (ISSET($_GET['statusChange'])) {
	$lastStatus = $_GET['statusChange'];
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

if (ISSET($_GET['effectChange'])) {
	$actualDB = $_GET['effectChange'];
	$type = $_GET['stype'];
	$rev1 = MYSQLI_QUERY($db, "SELECT * FROM config WHERE id = $actualDB ");
	$rev2 = $rev1->num_rows;
	if (!EMPTY($rev2)) {
		$rev3 = $rev1->fetch_array(MYSQLI_ASSOC);
		$statusActive = $rev3['ef_snow'];
		if ($statusActive == 0) {
			MYSQLI_QUERY($db, "UPDATE config SET ef_snow = 1 WHERE id = $actualDB ");
		} else {
			MYSQLI_QUERY($db, "UPDATE config SET ef_snow = 0 WHERE id = $actualDB ");
		}
		ECHO 'Correcto';
	} else {
		ECHO 'Error';
	}
}

if (ISSET($_GET['deleteCode'])) {
	$id = $_GET['deleteCode'];
	MYSQLI_QUERY($db, "DELETE FROM cupons WHERE c_id = $id ");
	ECHO 'Correcto';
}

if (ISSET($_GET['deleteCodes'])) {
	$rev1 = MYSQLI_QUERY($db, "SELECT * FROM cupons ");
	$rev2 = $rev1->num_rows;
	if (!EMPTY($rev2)) {
		while ($rev3 = $rev1->fetch_array(MYSQLI_ASSOC)) {
			$cid = $rev3['c_id'];
			$cdate = $rev3['c_date'];$ccaducity = $rev3['c_caducity'];$cuses = $rev3['c_uses'];
			if ($ccaducity > 0) {
				$newDate = date('Y-m-d H:i:s', strtotime($cdate. ' + '.$ccaducity.' hours'));
				$today = date('Y-m-d H:i:s');
				if ($newDate <= $today) { $ccaducity = 0; }
			} else if ($cuses == 0) {
				MYSQLI_QUERY($db, "DELETE FROM cupons WHERE c_id = $cid ");
			}
			if ($ccaducity == 0) {
				MYSQLI_QUERY($db, "DELETE FROM cupons WHERE c_id = $cid ");
			}
		}
		ECHO 'Correcto';
	} else {
		ECHO 'Inexistentes';
	}
	
}

if (ISSET($_GET{'udtaskc'})) {
	$tid = $_GET['taskid'];
	$uid = $_GET['userid'];
	$tc1 = MYSQLI_QUERY($db, "SELECT * FROM task_completed WHERE tc_tid = $tid AND tc_uid = $uid ");
	$tc2 = $tc1->num_rows;
	if (!EMPTY($tc2)) {
		MYSQLI_QUERY($db, "DELETE FROM task_completed WHERE tc_tid = $tid AND tc_uid = $uid");
	} else {
		MYSQLI_QUERY($db, "INSERT INTO task_completed SET tc_tid = $tid , tc_uid = $uid");
	}
	ECHO 'Correcto';
}

if (ISSET($_GET['usernum'])) {
	$tasae1=0;$tasae2=0;$tasae3=0;$tasae4=0;
	$usernum = $_GET['usernum'];
	$te1 = MYSQLI_QUERY($db, "SELECT * FROM users WHERE u_phone = '$usernum' ");
	$te2 = $te1->num_rows;
	if (!EMPTY($te2)) {
		$textoCorrecto = "Correcto";
		$te3 = $te1->fetch_array(MYSQLI_ASSOC);
		$uid = $te3['u_id'];
		$tsc1 = MYSQLI_QUERY($db, "SELECT * FROM tasks ");
		$tsc2 = $tsc1->num_rows;
		if (!EMPTY($tsc2)) {
			for ($i=0; $i < $tsc2; $i++) { 
				$tsc3 = $tsc1->fetch_array(MYSQLI_ASSOC);
				$tid = $tsc3['t_id'];
				$tc1 = MYSQLI_QUERY($db, "SELECT * FROM task_completed WHERE tc_tid = $tid AND tc_uid = $uid ");
				$tc2 = $tc1->num_rows;
				if (!EMPTY($tc2)) {
					$tasae1 += $tsc3['t_t1v'];
					$tasae2 += $tsc3['t_t2v'];
					$tasae3 += $tsc3['t_t3v'];
					$tasae4 += $tsc3['t_t4v'];
				}
			}
			ECHO $textoCorrecto.'||'.$tasae1.'||'.$tasae2.'||'.$tasae3.'||'.$tasae4;
		} else {
			ECHO 'ERNOR-AX135: NO TAREAS';
		}
	} else {
		ECHO 'ERNOR-AX140: USUARIO '.$usernum.' NO REGISTRADO, COMUNICATE CON NOSOTROS';
	}
}

if (ISSET($_GET['deleteTask'])) {
	$tid = $_GET['taskid'];
	MYSQLI_QUERY($db, "DELETE FROM tasks WHERE t_id = $tid ");
	ECHO 'Correcto';
}

?>